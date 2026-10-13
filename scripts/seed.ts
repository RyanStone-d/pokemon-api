// 從 PokeAPI 抓資料塞進四張表。
// 跑法：npm run db:seed
// 可以重跑：INSERT 都要寫 ON CONFLICT DO NOTHING，已經有的就跳過。
import "dotenv/config";
import pg from "pg";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const BASE = "https://pokeapi.co/api/v2";
const CONCURRENCY = 10; // 一次同時打幾個請求

// ---------- PokeAPI 回傳的形狀（只列我們用到的欄位） ----------

type NamedRef = { name: string; url: string }; // url 長這樣 https://pokeapi.co/api/v2/type/10/

type ListResponse = { count: number; results: NamedRef[] };

type PokemonResponse = {
  id: number;
  name: string;
  height: number; // PokeAPI 給的是公尺的 10 倍：17 代表 1.7 公尺，所以要除以 10
  weight: number; // PokeAPI 給的是公斤的 10 倍：905 代表 90.5 公斤，所以要除以 10
  types: { slot: number; type: NamedRef }[];
  stats: { base_stat: number; stat: NamedRef }[]; // stat.name 是 hp / attack / defense / special-attack / special-defense / speed
  sprites: { other: { "official-artwork": { front_default: string | null } } };
};

type SpeciesResponse = {
  generation: NamedRef; // url 長這樣 https://pokeapi.co/api/v2/generation/1/
};

// ---------- 工具 ----------

// 從 PokeAPI 的 url 取出最後那個數字：.../type/10/ → 10
function idFromUrl(url: string): number {
  const m = url.match(/\/(\d+)\/?$/);
  if (!m) throw new Error(`url 裡找不到 id：${url}`);
  return Number(m[1]);
}

// 打 PokeAPI，失敗會重試，每次多等一點
async function getJson<T>(path: string, retries = 3): Promise<T> {
  let lastStatus = 0;
  for (let attempt = 1; attempt <= retries; attempt++) {
    const res = await fetch(`${BASE}${path}`);
    if (res.ok) return (await res.json()) as T;
    lastStatus = res.status;
    await new Promise((r) => setTimeout(r, 500 * attempt)); // 失敗了等一下再試，一次比一次等久
  }
  throw new Error(`GET ${path} 失敗：${lastStatus}`);
}

// 把 items 切成每 size 個一組，一組一組跑，同一組裡的同時跑
async function inBatches<T>(
  items: T[],
  size: number,
  fn: (item: T) => Promise<void>,
) {
  for (let i = 0; i < items.length; i += size) {
    const batch = items.slice(i, i + size);
    await Promise.all(batch.map(fn));
    console.log(`  ${Math.min(i + size, items.length)} / ${items.length}`);
  }
}

// ---------- 三個階段 ----------

async function seedTypes() {
  console.log("→ types");
  const { results } = await getJson<ListResponse>("/type?limit=100");
  for (const t of results) {
    const id = idFromUrl(t.url);
    // TODO(你)：把這個 type 存進 types 表。把下面這段的 // 拿掉就能用：
    await pool.query(
      "INSERT INTO types (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING",
      [id, t.name],
    );
    // 說明：$1 對陣列第 0 個（id），$2 對第 1 個（t.name）。
    //       ON CONFLICT (id) DO NOTHING 是「id 已經有就跳過」，重跑腳本才不會炸。
  }
}

async function seedGenerations() {
  console.log("→ generations");
  const { results } = await getJson<ListResponse>("/generation");
  for (const g of results) {
    const id = idFromUrl(g.url);
    await pool.query(
      "INSERT INTO generations (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING",
      [id, g.name],
    );
  }
}

async function seedPokemon(id: number) {
  const p = await getJson<PokemonResponse>(`/pokemon/${id}`);
  const s = await getJson<SpeciesResponse>(`/pokemon-species/${id}`);

  // 先把 API 的資料整理成表的欄位
  const generationId = idFromUrl(s.generation.url);
  const image = p.sprites.other["official-artwork"].front_default;
  const stat = (name: string) =>
    p.stats.find((x) => x.stat.name === name)?.base_stat ?? 0;

  // 一隻寶可夢的 INSERT 要包在同一個 transaction：pokemon 一筆 + pokemon_types 一到兩筆，
  // 要嘛全部成功、要嘛全部不要，不能只插一半。
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 第一句：噴火龍本身，寫進 pokemon 表。陣列順序要對齊上面的欄位順序
    await client.query(
      `INSERT INTO pokemon (id, name, height, weight, image, hp, attack, defense, sp_atk, sp_def, speed, generation_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (id) DO NOTHING`,
      [
        p.id,
        p.name,
        p.height / 10,
        p.weight / 10,
        image,
        stat("hp"),
        stat("attack"),
        stat("defense"),
        stat("special-attack"),
        stat("special-defense"),
        stat("speed"),
        generationId,
      ],
    );

    // 第二句：噴火龍的屬性，寫進 pokemon_types 表。有幾個屬性就跑幾次
    for (const t of p.types) {
      await client.query(
        "INSERT INTO pokemon_types (pokemon_id, type_id, slot) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING",
        [p.id, idFromUrl(t.type.url), t.slot],
      );
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function main() {
  await seedTypes();
  await seedGenerations();

  // 全國圖鑑有幾隻，問 species 的 count 就知道，不要寫死
  const { count } = await getJson<ListResponse>("/pokemon-species?limit=1");
  // 測試的時候可以只抓前幾隻：SEED_LIMIT=20 npm run db:seed
  const total = Number(process.env.SEED_LIMIT) || count;
  console.log(`→ pokemon（共 ${total} 隻，每次 ${CONCURRENCY} 隻）`);
  const ids = Array.from({ length: total }, (_, i) => i + 1);
  await inBatches(ids, CONCURRENCY, seedPokemon);

  console.log("✓ 完成");
}

main()
  .catch((err) => {
    console.error("✗ seed 失敗：", err.message ?? err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());

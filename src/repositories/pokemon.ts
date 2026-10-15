import { pool } from "../db.js";

export async function findPokemonById(id: number) {
  // TODO(你)：自己寫 SQL。要拿到這隻寶可夢的所有欄位，加上一個 types 欄位是照 slot 排好的 type 名字陣列。
  //   網址的 id 用 $1。參考第 4 課第 6 節。
  const { rows } = await pool.query(
    `
    SELECT p.*, array_agg(t.name ORDER BY pt.slot) AS types
    FROM pokemon p
    JOIN  pokemon_types pt ON pt.pokemon_id = p.id
    JOIN types t ON pt.type_id = t.id
    WHERE p.id = $1
    GROUP BY p.id
    ORDER BY p.id
    `,
    [id],
  );
  return rows[0] ?? null;
}

export async function listPokemon({
  page,
  type,
  generation,
  search,
}: {
  page: number;
  type?: string;
  generation?: string;
  search?: string;
}) {
  const offset = (page - 1) * 30;
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (type) {
    params.push(type);
    conditions.push(
      `p.id IN (SELECT pt.pokemon_id FROM pokemon_types pt JOIN types t ON t.id = pt.type_id WHERE t.name = $${params.length})`,
    );
  }
  if (generation) {
    params.push(generation);
    conditions.push(`p.generation_id = $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    conditions.push(`p.name LIKE $${params.length}`);
  }

  const where =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const { rows } = await pool.query(
    `
  SELECT p.id, p.name, p.image, array_agg(t.name ORDER BY pt.slot) AS types
  FROM pokemon p
  JOIN pokemon_types pt ON pt.pokemon_id = p.id
  JOIN types t ON t.id = pt.type_id
  ${where}
  GROUP BY p.id
  ORDER BY p.id
  OFFSET $${params.length + 1}
  LIMIT 30
  `,
    [...params, offset],
  );

  const { rows: countRows } = await pool.query(
    `SELECT count(*) FROM pokemon p ${where}`,
    params,
  );

  const total = Number(countRows[0].count);

  return { items: rows, total };
}

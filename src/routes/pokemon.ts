// 寶可夢相關的 endpoint
import { Router } from "express";
import { pool } from "../db.js";

export const pokemonRouter = Router();

// GET /pokemon/:id → 單隻詳細頁
// 前端要的格式（以噴火龍為例）：
// {
//   "id": 6,
//   "name": "charizard",
//   "image": "https://...6.png",
//   "height": 1.7,
//   "weight": 90.5,
//   "types": ["fire", "flying"],          ← 照 slot 排好的名字陣列
//   "stats": { "hp": 78, "attack": 84, "defense": 78, "spAtk": 109, "spDef": 85, "speed": 100 },
//   "generation": 1
// }
pokemonRouter.get("/pokemon/:id", async (req, res) => {
  const id = Number(req.params.id); // 網址裡的 :id，例如 /pokemon/6 這裡就是 6

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
  const p = rows[0];
  // p 長這樣：{ id: 6, name: "charizard", height: 1.7, ..., types: ["fire", "flying"] }

  // 找不到這隻（例如 /pokemon/99999），回 404
  if (!p) {
    res.status(404).json({ error: "Pokemon not found" });
    return;
  }

  const {
    name,
    image,
    height,
    weight,
    types,
    hp,
    attack,
    defense,
    sp_atk,
    sp_def,
    speed,
    generation_id,
  } = p;

  // TODO(你)：把 p 組成上面註解那個格式回傳。
  //   大部分欄位直接搬，stats 要把 p.hp、p.attack 那六個包成一個物件，
  //   generation 對 p.generation_id
  res.json({
    id,
    name,
    image,
    height,
    weight,
    types,
    stats: {
      hp,
      attack,
      defense,
      spAtk: sp_atk,
      spDef: sp_def,
      speed,
    },
    generation: generation_id,
  });
});

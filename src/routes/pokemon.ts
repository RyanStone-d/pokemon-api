// 寶可夢相關的 endpoint
import { Router } from "express";

import { findPokemonById, listPokemon } from "../repositories/pokemon.js";

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
  if (!Number.isInteger(id) || id < 1) {
    res.status(400).json({ error: "id must be a positive integer" });
    return;
  }
  const p = await findPokemonById(id);
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

pokemonRouter.get("/pokemon", async (req, res) => {
  const page = Number(req.query.page ?? 1);
  if (!Number.isInteger(page) || page < 1) {
    res.status(400).json({ error: "page must be a positive integer" });
    return;
  }
  const type = req.query.type as string | undefined;
  const generation = req.query.generation as string | undefined;
  const search = req.query.search as string | undefined;

  const { items, total } = await listPokemon({
    page,
    type,
    generation,
    search,
  });

  res.json({
    items,
    page,
    perPage: 30,
    total,
    totalPages: Math.ceil(total / 30),
  });
});

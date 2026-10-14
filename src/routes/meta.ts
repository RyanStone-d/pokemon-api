// 給前端下拉選單用的資料：type 清單、世代清單
import { Router } from "express";
import { pool } from "../db.js";

export const metaRouter = Router();

// GET /types → 回傳 [{ id: 1, name: "normal" }, ...]，共 18 筆
metaRouter.get("/types", async (_req, res) => {
  // TODO(你)：把 queries.sql 第 8 題那句 SQL 貼進引號裡
  const { rows } = await pool.query(`
  SELECT id, name
  FROM types
  WHERE id IN (SELECT type_id FROM pokemon_types)
  ORDER BY id
  `);
  res.json(rows);
});

// GET /generations → 回傳 [{ id: 1, name: "generation-i" }, ...]，共 9 筆
metaRouter.get("/generations", async (_req, res) => {
  // TODO(你)：寫一句 SQL 拿 generations 全部的 id 和 name，照 id 排序
  const { rows } = await pool.query(`
    SELECT id, name
    FROM generations
    ORDER BY id
  `);
  res.json(rows);
});

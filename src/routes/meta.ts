// 給前端下拉選單用的 endpoint。只負責：收請求 → 呼叫 repository → 回 JSON
import { Router } from 'express';
import { listGenerations, listTypes } from '../repositories/meta.js';

export const metaRouter = Router();

// GET /types → [{ id: 1, name: "normal" }, ...]，18 筆
metaRouter.get('/types', async (_req, res) => {
  res.json(await listTypes());
});

// GET /generations → [{ id: 1, name: "generation-i" }, ...]，9 筆
metaRouter.get('/generations', async (_req, res) => {
  res.json(await listGenerations());
});

// 下拉選單用的查詢。SQL 只寫在這裡，route 不碰 SQL。
import { pool } from '../db.js';

export type Option = { id: number; name: string };

// 有寶可夢用到的 type（不含 stellar、unknown、shadow），照 id 排
export async function listTypes(): Promise<Option[]> {
  const { rows } = await pool.query<Option>(`
    SELECT id, name
    FROM types
    WHERE id IN (SELECT type_id FROM pokemon_types)
    ORDER BY id
  `);
  return rows;
}

// 全部世代，照 id 排
export async function listGenerations(): Promise<Option[]> {
  const { rows } = await pool.query<Option>(`
    SELECT id, name
    FROM generations
    ORDER BY id
  `);
  return rows;
}

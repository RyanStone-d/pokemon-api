// 最簡單的 migration runner：
// 1. 讀 db/migrations/*.sql，依檔名排序
// 2. 用 schema_migrations 表記錄哪些已經跑過
// 3. 沒跑過的逐一在 transaction 裡執行，失敗就 rollback
import 'dotenv/config';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Client } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.resolve(__dirname, '../db/migrations');

// 把 -- 註解和空白拿掉後什麼都不剩，就視為空檔案
function isEmptySql(sql: string): boolean {
  return sql.replace(/--[^\n]*/g, '').trim().length === 0;
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL 沒設定，請確認 .env');

  const client = new Client({ connectionString: url });
  await client.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name       text        PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    const { rows } = await client.query<{ name: string }>('SELECT name FROM schema_migrations');
    const applied = new Set(rows.map((r) => r.name));

    const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith('.sql')).sort();

    let count = 0;
    for (const file of files) {
      if (applied.has(file)) continue;
      const sql = await readFile(path.join(MIGRATIONS_DIR, file), 'utf8');
      if (isEmptySql(sql)) {
        console.log(`⚠ ${file} 還沒有任何 SQL，略過（不會記錄為已套用）`);
        continue;
      }
      console.log(`→ 套用 ${file}`);
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        count++;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
    }
    console.log(count === 0 ? '✓ 沒有新的 migration' : `✓ 套用了 ${count} 個 migration`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('✗ migration 失敗：', err.message ?? err);
  process.exit(1);
});

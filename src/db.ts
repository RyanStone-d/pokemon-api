// 整個 API 共用的連線池。之後所有 SQL 都從這裡的 pool 下。
import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

# 學習地圖

## 終點

PokéNexus（你的前端）現在直接打 PokeAPI，一次只能拿一隻，常常 503。
做完這個專案，它會改打你自己的 API，一次拿一頁，網址像 `https://pokemon-api.onrender.com/pokemon?type=fire&page=1`。

## 進行方式

每個里程碑都一樣的流程：

1. 我講這一步要做什麼、為什麼，問你一個問題讓你先想
2. 我開骨架（跟資料庫無關的管線、設定檔）
3. 你寫核心（SQL、API 邏輯），卡住問具體問題
4. 跑通、我 review、commit

兩個規則：
- 我改過的檔案，你要先關掉重開再改，不然會互相蓋掉
- 錯誤訊息直接貼給我，不用自己先猜

## 里程碑

### 1. 資料庫設計與建表 ✅

- 學到：需求 → 實體 → 關係 → ER 圖 → SQL 的設計流程；CREATE TABLE、主鍵、外鍵、多對多要開中間表、複合主鍵、UNIQUE、CHECK；migration 是什麼
- 你寫的：`db/DESIGN.md`、`db/migrations/001_init.sql`
- 我寫的：`scripts/migrate.ts`、`docker-compose.yml`
- 完成標準：`npm run db:reset` 過，`\dt` 看到四張表 ✅

### 2. 匯入資料 ✅

- 學到：INSERT、`$1 $2` 參數化查詢（防 SQL injection）、transaction（BEGIN / COMMIT / ROLLBACK）、ON CONFLICT 讓腳本可重跑、打外部 API 要限制併發和重試
- 你寫的：`scripts/seed.ts` 裡四個 `TODO(你)` 的 INSERT
- 我寫的：`seed.ts` 的 fetch、重試、分批、進度
- 完成標準：`npm run db:seed` 跑完，`SELECT count(*) FROM pokemon` 是 1025

### 3. 寫查詢 ← 現在在這裡

- 學到：SELECT、WHERE、JOIN（把 pokemon、pokemon_types、types 接起來）、ORDER BY、LIMIT / OFFSET 做分頁、COUNT、GROUP BY
- 你寫的：`db/queries.sql`，DESIGN.md 1.3 的五條需求各寫一句 SQL，在 psql 跑通
- 我寫的：題目和驗證答案的方法
- 完成標準：五句 SQL 都能在 psql 跑出對的結果，例如 `WHERE type = fire` 的數量跟 PokeAPI 一致

### 4. API

- 學到：Express 的 routing、query string 解析、用 zod 驗證輸入、統一的錯誤格式、把第 3 步的 SQL 包成 endpoint、CORS 讓前端打得到
- 你寫的：每個 endpoint 裡的 SQL 和回傳的 JSON 格式
- 我寫的：server 骨架、錯誤處理、`npm run dev`
- 完成標準：`curl localhost:3000/pokemon?type=fire&page=1` 回 JSON，詳細頁、type 清單、世代清單都有

### 5. 測試

- 學到：vitest + supertest 打自己的 endpoint，測正常和錯誤輸入
- 你寫的：每個 endpoint 至少一個測試
- 完成標準：`npm test` 全綠

### 6. Docker 化和 CI

- 學到：Dockerfile 把 API 包成 image、docker compose 一次起 API 加資料庫、GitHub Actions 每次 push 自動跑測試
- 完成標準：`docker compose up` 整套起來；GitHub 上看到綠色勾勾

### 7. 上線

- 學到：Neon 開雲端 PostgreSQL、Render 從 GitHub 自動部署、環境變數怎麼給、migration 和 seed 在雲端跑、health check
- 完成標準：公開網址打得到，前端改成打它

### 之後可以加

- 前端 PokéNexus 改接新 API
- 換 Drizzle 管 schema 和 migration，比較跟手寫 SQL 的差別
- Exchange 功能需要的使用者系統（註冊登入、JWT）

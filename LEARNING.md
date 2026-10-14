# 課程：從零做一個後端（寶可夢圖鑑 API）

## 這門課怎麼設計的

順序參考三個公開課程：赫爾辛基大學的 Full Stack Open（Part 3 Node/Express 與部署、Part 4 後端測試與登入）、The Odin Project 的 Node 路線（Express → PostgreSQL → API → 測試 → 登入）、roadmap.sh 的 Backend 路線。三者的順序一致：**資料庫 → 查詢 → API → 測試 → 容器與 CI → 部署 → 登入**。

每一課的內容格式照標準教案：**學完能做到 → 概念 → 示範 → 一起做 → 自己做 → 驗收**。示範是我在你的資料上做一次給你看、附輸出；一起做是骨架加填空；自己做是獨立練習；驗收是「打哪個指令、應該看到什麼」，你自己就能確認有沒有過。

## 終點

PokéNexus（你的前端，https://pokemon-seven-blush.vercel.app/）現在直接打 PokeAPI，一次只能拿一隻，常常 503。做完這門課，它改打你自己的 API，一次拿一頁，網址像 `https://pokemon-api.onrender.com/pokemon?type=fire&page=1`。

## 學完你能做到

1. 從需求設計關聯式資料庫，用 SQL 建表，用 migration 管理變更
2. 寫出篩選、搜尋、JOIN、聚合、分頁的 SQL
3. 用 Node + Express 做 REST API，正確處理輸入驗證、404、500
4. 幫 API 寫自動化測試
5. 把服務包成 Docker，設定 GitHub Actions 自動跑測試
6. 部署到雲端，讓既有前端接上

## 前置條件

- JavaScript / TypeScript 基礎（有）
- 寫過 fetch、看得懂 HTTP 請求和 JSON（有）
- 不需要任何資料庫或後端經驗

## 課程總覽

| 模組 | 課 | 學完能做到 | 驗收 | 狀態 |
|---|---|---|---|---|
| 1 資料庫設計 | `db/DESIGN.md` | 從需求推出實體、關係、ER 圖，寫 CREATE TABLE | `npm run db:reset` 過，四張表建好 | ✅ |
| 2 匯入資料 | `scripts/seed.ts` | INSERT、參數化查詢、transaction、可重跑的腳本 | pokemon 表 1025 列 | ✅ |
| 3 查詢 | `db/queries.sql` | WHERE、LIKE、分頁、JOIN、子查詢 | 8 題答案全對 | ✅ |
| 4 API | `docs/04-api.md` | Express 路由、req/res、聚合、動態條件、400/404/500 | 第 12 節七個網址全對 | ← 現在 |
| 5 測試 | `docs/05-testing.md` | vitest + supertest 測 endpoint | `npm test` 全綠 | |
| 6 容器與 CI | `docs/06-docker-ci.md` | Dockerfile、docker compose、GitHub Actions | `docker compose up` 整套起來；GitHub 綠勾 | |
| 7 部署 | `docs/07-deploy.md` | Neon、Render、環境變數、雲端跑 migration | 公開網址打得到 | |
| 8 前端接上（選） | `docs/08-frontend.md` | 改 PokéNexus 打新 API | 前端列表頁一次打一個請求 | |
| 9 登入（選） | `docs/09-auth.md` | 密碼雜湊、JWT、保護路由 | Exchange 頁需要登入 | |

模組 1 到 3 已經完成，當時沒有課程檔，內容記在 `db/DESIGN.md` 和 `db/queries.sql` 的註解裡。從模組 4 起每一課都有獨立檔案，格式固定。

## 每一課的固定格式

```
# 第 N 步：主題
學完能做到      可以驗證的目標，三到五條
要先會          前面哪幾課
概念            這一課的新東西，講是什麼、為什麼
示範            我在你的資料上做一次，附輸出
一起做          骨架加填空
自己做          獨立練習
驗收            打哪個指令或網址、應該看到什麼
常見錯誤        錯誤訊息長怎樣、代表什麼、怎麼修
```

## 進行方式

1. 先把這一課的檔案從頭讀到尾，不要邊讀邊寫
2. 照「一起做」填空，跑驗收
3. 照「自己做」寫，跑驗收
4. 驗收全過就 commit，進下一課
5. 讀到不懂的地方，說「第幾節哪一段」，我會改課的內容，不是在聊天裡補一句

兩個規則：

- 我改過的檔案，你要先關掉重開再改，不然會互相蓋掉
- 錯誤訊息直接貼給我，不用自己先猜

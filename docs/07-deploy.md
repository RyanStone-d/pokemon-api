# 第 7 步：部署

## 學完能做到

1. 說出一個後端上線需要哪幾個東西，以及它們怎麼連起來
2. 在 Neon 開一個雲端 PostgreSQL，從本機對它跑 migration 和 seed
3. 在 Render 從 GitHub repo 部署 API，設定環境變數
4. 拿到一條公開網址，前端打得到

## 要先會

第 6 步做完，程式碼在 GitHub 上，CI 綠的。

---

## 概念

### 上線需要三個東西

```
瀏覽器 ──→ Render（跑你的 API）──→ Neon（資料庫）
            從 GitHub 拉程式碼        跟本機 Docker 那個一樣，只是在雲端
```

| 東西 | 本機 | 雲端 | 免費方案 |
|---|---|---|---|
| 資料庫 | Docker 的 postgres:17 | Neon | 有，夠用 |
| API 主機 | `npm run dev` | Render Web Service | 有，閒置 15 分鐘會睡，第一次打要等幾十秒醒來 |
| 程式碼 | 你的硬碟 | GitHub | 有 |

### 環境變數是怎麼切換的

你的程式從頭到尾只認 `DATABASE_URL` 這個變數。本機 `.env` 裡是 Docker 那串，雲端在 Render 的設定頁填 Neon 那串。程式碼一個字都不用改，這就是第 1 步把連線字串放 `.env` 而不是寫死的原因。

`.env` 不進 git，所以 Render 上沒有它，一定要在 Render 的介面手動填。

### 雲端的資料庫是空的

Neon 開好是一個空的資料庫，沒有表、沒有資料。所以要在本機把 `DATABASE_URL` 暫時指到 Neon，跑一次 migrate 和 seed，表和資料就進去了。跟你第 1、2 步做的一模一樣，只是目標換成雲端。

### 服務怎麼知道 API 活著

Render 會定期打 `/health`，沒回應就重開。這就是第 4 步先放那個 endpoint 的原因。

### CORS

前端在 `pokemon-seven-blush.vercel.app`，API 在 `xxx.onrender.com`，不同網域。瀏覽器預設擋跨網域請求，API 要主動說「我允許」。第 4 步的 `app.use(cors())` 是允許全部，練習可以，正式會改成只允許你的前端網域。

---

## 示範

### 1. Neon

1. 到 https://neon.tech 註冊，用 GitHub 登入最快
2. **New Project**，名字 `pokemon`，region 選 Singapore（離台灣最近）
3. 建好會看到 **Connection string**，長這樣：
   ```
   postgresql://user:password@ep-xxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
   ```
   複製起來，密碼只顯示這一次。

### 2. 把表和資料放上去

在本機終端機，用環境變數暫時覆蓋 `.env`：

```bash
DATABASE_URL="貼 Neon 那串" npm run db:migrate
DATABASE_URL="貼 Neon 那串" npm run db:seed
```

Windows 的 PowerShell 不吃這個寫法，用 Git Bash 跑，或者先 `$env:DATABASE_URL="..."` 再跑 npm。

seed 大概幾分鐘。完成後到 Neon 的 **Tables** 頁，四張表都在，pokemon 有 1025 列。

### 3. Render

1. 到 https://render.com 註冊，用 GitHub 登入
2. **New → Web Service**，選你的 `pokemon-api` repo
3. 設定：

   | 欄位 | 填 |
   |---|---|
   | Name | pokemon-api |
   | Region | Singapore |
   | Runtime | Docker（它會自己讀你的 Dockerfile） |
   | Instance Type | Free |

4. **Environment Variables** 加一個：`DATABASE_URL` = Neon 那串
5. **Health Check Path** 填 `/health`
6. **Create Web Service**

它會開始 build，三到五分鐘。完成後頁面上方有網址，像 `https://pokemon-api-xxxx.onrender.com`。

### 4. 驗證

瀏覽器打：

- `https://你的網址.onrender.com/health` → `{"ok":true}`
- `https://你的網址.onrender.com/pokemon/6` → 噴火龍
- `https://你的網址.onrender.com/pokemon?type=fire&page=1` → 81 隻的第 1 頁

第一次打可能等三十秒，免費方案在睡覺。

---

## 一起做

### 自動部署

Render 預設 **Auto-Deploy** 是開的：push 到 main，它就重新 build 部署。試一次：

1. 改 `/health` 回傳多一個欄位 `{ ok: true, version: 2 }`
2. commit、push
3. 到 Render 頁面看它在 build，完成後打 `/health` 看到 version 2

這樣以後改程式只要 push，CI 跑測試、Render 自動部署，不用手動碰。

### 只允許自己的前端

`app.ts` 的 `cors()` 改成：

```ts
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') ?? '*',
}));
```

Render 環境變數加 `CORS_ORIGIN` = `https://pokemon-seven-blush.vercel.app,http://localhost:3000`。本機 `.env` 不設，就是允許全部。push 上去，部署完用瀏覽器 console 從別的網站 fetch 你的 API，應該被擋。

---

## 自己做

寫 `README.md` 的「部署」一節，讓別人（或三個月後的你）照著做能把這個專案重新部署一次。要包含：需要哪些帳號、環境變數有哪些、第一次部署的順序、之後怎麼更新。寫完自己照著讀一遍，有跳步就補。

---

## 驗收

- 公開網址的 `/health`、`/pokemon/6`、`/pokemon?type=fire` 都有正確回應
- push 一個 commit，Render 自動重新部署，CI 也是綠的
- README 有部署一節

全過就 commit：「加入部署說明與 CORS 設定」。

**整門課的主線到這裡結束。** 第 8、9 步是選修。

---

## 常見錯誤

| 看到 | 代表 | 修法 |
|---|---|---|
| Render build 失敗 `npm ci` 那步 | package-lock.json 沒 commit | `git add package-lock.json` 推上去 |
| 部署成功但打 `/pokemon/6` 回 500 | `DATABASE_URL` 沒設或貼錯 | Render 的 Logs 看錯誤，Environment 檢查變數 |
| `no pg_hba.conf entry` 或 SSL 錯誤 | Neon 要求 SSL | 連線字串結尾要有 `?sslmode=require` |
| `connect ETIMEDOUT ...:5432` | 公司或學校網路擋了資料庫的 5432 port，本機連不到 Neon | 改用 `.github/workflows/neon-db.yml` 在 GitHub 上跑：連線字串存進 repo 的 Secrets（`NEON_DATABASE_URL`），到 Actions 分頁手動 Run workflow |
| seed 到一半 `too many connections` | Neon 免費方案連線數有限 | `CONCURRENCY` 降到 5 |
| 前端 console 出現 CORS error | `CORS_ORIGIN` 沒包含前端網址，或網址多了結尾斜線 | 比對 origin 要完全一樣，沒有結尾 `/` |
| 第一次打超過 30 秒沒回應 | 免費方案睡著了 | 等它醒，正常；想避免就升級或用 cron 每 10 分鐘打一次 `/health` |

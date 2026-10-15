# 第 6 步：容器與 CI

## 學完能做到

1. 說出 Docker image 和 container 的差別，以及為什麼部署要用它
2. 寫一個 Dockerfile 把這個 API 包成 image
3. 用 docker compose 一個指令把 API 和資料庫一起起來
4. 設定 GitHub Actions，每次 push 自動跑測試，GitHub 上看到綠勾

## 要先會

第 5 步做完，`npm test` 全綠。GitHub 上有這個 repo（還沒推的話這一課會推）。

---

## 概念

### Docker 在解決什麼

你的 API 要跑起來需要：Node 22、npm install 過的套件、編譯好的程式碼、環境變數。換一台電腦（或雲端主機）就要全部重來一次，而且版本可能不一樣。

Docker 把這些全部打包成一個 **image**，像一個裝好所有東西的硬碟映像檔。在任何有 Docker 的機器上跑它，得到一個 **container**，裡面環境一模一樣。你第 1 步用的 `postgres:17` 就是別人打包好的 image。

| 詞 | 意思 | 類比 |
|---|---|---|
| image | 打包好的、不會變的東西 | 遊戲光碟 |
| container | image 跑起來的實體，可以開好幾個 | 開著的遊戲 |
| Dockerfile | 怎麼打包的步驟 | 食譜 |
| docker compose | 一次管好幾個 container | 一鍵開整套 |

### Dockerfile 怎麼讀

一行一個步驟，由上往下：

```dockerfile
# 從官方 Node 22 的 image 開始（alpine 是精簡版）
FROM node:22-alpine
# 之後的指令都在 /app 裡做
WORKDIR /app
# 先只複製 package.json
COPY package*.json ./
# 裝套件（ci 是照 lock 檔裝，比 install 穩）
RUN npm ci
# 再複製全部程式碼
COPY . .
# tsc 編譯成 dist/
RUN npm run build
# container 啟動時跑這個
CMD ["node", "dist/src/server.js"]
```

**注意：Dockerfile 的 `#` 只有在一行開頭才是註解。** 寫在指令後面會被當成指令的一部分，例如 `COPY a b # 說明` 會以為要複製 `#` 和 `說明` 這兩個檔案而失敗。

為什麼 package.json 要先複製、程式碼後複製？Docker 每一步都會快取，程式碼改了但 package.json 沒改，`npm ci` 那步就直接用快取，不用重裝，build 快很多。

### 多階段建置

上面那個 image 會把 TypeScript、tsx、vitest 這些開發用的套件也包進去，很肥。正式做法分兩階段：第一階段編譯，第二階段只拿編譯結果和正式套件：

```dockerfile
# 階段一：編譯
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# 階段二：只留跑起來需要的
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
# 不裝 devDependencies
RUN npm ci --omit=dev
# 從階段一拿編譯結果
COPY --from=build /app/dist ./dist
CMD ["node", "dist/src/server.js"]
```

### CI 是什麼

Continuous Integration，持續整合。意思是：每次 push 到 GitHub，自動跑測試，壞了馬上通知。做法是在 repo 裡放一個 `.github/workflows/ci.yml`，GitHub 看到就會照裡面寫的跑。

測試需要資料庫，所以 CI 裡也要起一個 Postgres，跑 migration 和 seed，再跑測試。seed 全部 1025 隻太慢，用 `SEED_LIMIT=50`，測試裡的數字要跟著調（見「自己做」）。

---

## 示範

### 1. 先讓 TypeScript 能編譯

`package.json` 加兩個 script：

```json
"build": "tsc -p .",
"start": "node dist/src/server.js"
```

跑 `npm run build`，會出現 `dist/` 資料夾。跑 `npm start`，API 起來，瀏覽器打 http://localhost:3000/health 有回應。這就是正式環境跑的方式，不用 tsx。`dist/` 已經在 `.gitignore` 裡。

### 2. 寫 Dockerfile

專案根目錄建 `Dockerfile`，內容就是上面多階段那份。再建 `.dockerignore`，跟 `.gitignore` 一樣的東西，不要把 node_modules 複製進 image：

```
node_modules
dist
.env
.git
```

打包：

```bash
docker build -t pokemon-api .
```

第一次要兩三分鐘。跑起來：

```bash
docker run --rm -p 127.0.0.1:3000:3000 -e DATABASE_URL="postgresql://pokemon:你的密碼@host.docker.internal:5433/pokemon" pokemon-api
```

「你的密碼」換成 `.env` 裡 `POSTGRES_PASSWORD` 的值，這個指令打完不要存進任何檔案。

注意 `host.docker.internal`：container 裡的 `localhost` 是 container 自己，不是你的電腦，要用這個名字才連得到電腦上的 Docker Postgres。瀏覽器打 http://localhost:3000/pokemon/6 應該有噴火龍。Ctrl+C 停掉。

### 3. docker compose 一起起

`docker-compose.yml` 的 `services` 底下加一個 `api`：

```yaml
  api:
    build: .
    ports:
      - "127.0.0.1:3000:3000"
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}
    depends_on:
      db:
        condition: service_healthy
```

幾個重點：

- `127.0.0.1:3000:3000`：只開給這台電腦。只寫 `3000:3000` 等於 `0.0.0.0:3000:3000`，同一個網路裡的人都連得進來
- `${POSTGRES_PASSWORD}`：compose 會自動讀同資料夾的 `.env`，把它換成真的值。帳密只寫在 `.env`，這個檔案會 commit，裡面只放變數名
- `@db:5432`：compose 裡的 container 可以用 service 名字互相找到，所以是 `db` 不是 localhost，port 是容器內的 5432 不是 5433
- `depends_on` 加 `service_healthy`：等資料庫 healthcheck 過了才起 API

跑：

```bash
docker compose up --build
```

兩個 container 一起起來，瀏覽器打 http://localhost:3000/health。Ctrl+C 停，`docker compose down` 清掉。

---

## 一起做

### 推到 GitHub

GitHub 開一個空 repo 叫 `pokemon-api`，不要勾任何初始化選項。然後：

```bash
git remote add origin https://github.com/你的帳號/pokemon-api.git
git push -u origin main
```

重新整理 GitHub 頁面，程式碼在上面了。

### CI 設定檔

建 `.github/workflows/ci.yml`，底線處填完：

```yaml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      db:
        image: postgres:17
        env:
          POSTGRES_USER: pokemon
          POSTGRES_DB: pokemon
          # CI 的資料庫跑完就銷毀、外面連不到，設成不需要密碼，檔案裡就不用寫密碼
          POSTGRES_HOST_AUTH_METHOD: trust
        ports:
          - 5433:5432
        options: >-
          --health-cmd "pg_isready -U pokemon"
          --health-interval 5s
          --health-timeout 3s
          --health-retries 10

    env:
      DATABASE_URL: postgresql://pokemon@localhost:5433/pokemon

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: ______          # 建表
      - run: ______          # 匯入資料，前面加 SEED_LIMIT=50
      - run: ______          # 跑測試
```

三條底線就是你本機會打的三個 npm 指令。`services` 那段是 GitHub 幫你起一個 Postgres，跟你 docker-compose 的設定一樣。

push 上去，GitHub 頁面上方的 **Actions** 分頁會看到它在跑。

---

## 自己做

CI 只 seed 50 隻，所以測試裡寫死的數字（1025、81、12、7、第 2 頁是 31 號）在 CI 會錯。兩種解法選一個：

- **A**：測試改成不寫死總數，改檢查結構，例如 `total` 是正整數、`items` 長度小於等於 30、`?type=fire` 的每一筆都含 fire
- **B**：CI 也 seed 全部 1025 隻，接受 CI 多跑幾分鐘

選了之後改到 CI 綠。

---

## 驗收

- `npm run build && npm start` 能起 API
- `docker compose up --build` 兩個 container 都起來，http://localhost:3000/pokemon/6 有資料
- GitHub repo 的 Actions 分頁最新一次是綠勾
- 故意把一個測試改壞 push 上去，變紅叉；改回來，變綠勾

全過就 commit：「加入 Dockerfile、docker compose 與 GitHub Actions CI」。

---

## 常見錯誤

| 看到 | 代表 | 修法 |
|---|---|---|
| `Cannot find module '/app/dist/src/server.js'` | build 沒產出到那個路徑 | 本機跑 `npm run build` 看 dist 裡的結構，調 CMD 的路徑 |
| container 裡 `ECONNREFUSED 127.0.0.1:5433` | 用了 localhost | 改 `host.docker.internal`（docker run）或 `db`（compose） |
| CI 卡在 seed 很久 | 1025 隻乘兩個請求 | 用 `SEED_LIMIT` |
| CI 的 seed 被 PokeAPI 擋 429 | GitHub 的機器很多人共用，被限流 | 把 `CONCURRENCY` 降到 5，或做第 2 步提過的 CSV 匯入 |
| Actions 分頁沒東西 | yml 路徑或縮排錯 | 檔案一定要在 `.github/workflows/` 底下，yml 對縮排很敏感 |

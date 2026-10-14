# 第 5 步：測試

## 學完能做到

1. 說出為什麼要寫自動化測試，以及測試在測什麼
2. 用 vitest + supertest 對一個 endpoint 發請求、檢查狀態碼和 JSON
3. 幫每個 endpoint 寫正常、400、404 三種情況的測試
4. `npm test` 一個指令跑完全部，全綠

## 要先會

第 4 步的 API 做完，三個 endpoint 都能在瀏覽器打到。

---

## 概念

### 測試在幹嘛

你現在驗證 API 的方式是開瀏覽器一個一個網址看。改了程式要再看一次，七個網址看七次，很快就懶得看，然後某天改壞了沒發現。

自動化測試就是把「打網址、看結果」寫成程式，一個指令全部跑完，幾秒鐘。改壞了馬上紅給你看。第 6 步的 CI 會在每次 push 時自動跑它。

### 一個測試長什麼樣

```ts
test('GET /types 回 18 個', async () => {
  const res = await request(app).get('/types');   // 打網址
  expect(res.status).toBe(200);                    // 檢查狀態碼
  expect(res.body).toHaveLength(18);               // 檢查 JSON
});
```

三段：發請求、檢查狀態碼、檢查內容。`expect(...).toBe(...)` 是「我預期它是這個」，不是的話這個測試就紅。

### 用到的兩個套件

- **vitest**：跑測試的工具。找所有 `*.test.ts`，執行，印綠紅。你前端如果用過 Jest，語法幾乎一樣。
- **supertest**：對 Express app 發假請求的工具。不用真的開 port，直接把 `app` 塞給它，它幫你模擬一個 HTTP 請求進去。這就是為什麼第 4 步把 `app.ts` 和 `server.ts` 拆開。

### 測試要用哪個資料庫

最簡單：直接用 Docker 那個，資料已經在裡面。測試只有 GET，不會改資料，所以沒問題。之後有 POST、DELETE 的時候再談「每次測試前重建資料庫」。

### 一個 endpoint 測哪些

每個 endpoint 至少三種：

| 情況 | 例子 | 預期 |
|---|---|---|
| 正常 | `/pokemon/6` | 200，名字是 charizard，types 是 `['fire','flying']` |
| 參數壞掉 | `/pokemon?page=0` | 400 |
| 找不到 | `/pokemon/99999` | 404 |

正常的要檢查幾個關鍵欄位，不用全部。壞掉的檢查狀態碼就好。

---

## 示範

裝套件：

```bash
npm install -D vitest supertest @types/supertest
```

`package.json` 加：

```json
"test": "vitest run"
```

建 `src/app.test.ts`：

```ts
import { afterAll, describe, expect, test } from 'vitest';
import request from 'supertest';
import { app } from './app.js';
import { pool } from './db.js';

// 全部跑完要把連線池關掉，不然 vitest 會等不到結束
afterAll(() => pool.end());

describe('GET /health', () => {
  test('回 ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});

describe('GET /types', () => {
  test('回 18 個 type，照 id 排', async () => {
    const res = await request(app).get('/types');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(18);
    expect(res.body[0]).toEqual({ id: 1, name: 'normal' });
  });
});
```

跑：

```bash
npm test
```

看到：

```
 ✓ src/app.test.ts (2 tests)
   ✓ GET /health > 回 ok
   ✓ GET /types > 回 18 個 type，照 id 排

 Test Files  1 passed (1)
      Tests  2 passed (2)
```

故意改壞看看：把 `toHaveLength(18)` 改成 `17`，再跑，會看到紅的，還告訴你預期 17 實際 18。改回來。

### 常用的 expect

| 寫法 | 檢查什麼 |
|---|---|
| `expect(x).toBe(5)` | 等於 5（數字、字串、布林） |
| `expect(obj).toEqual({ a: 1 })` | 物件內容一樣 |
| `expect(arr).toHaveLength(3)` | 陣列長度 |
| `expect(obj).toHaveProperty('name')` | 有這個 key |
| `expect(obj).toMatchObject({ name: 'charizard' })` | 物件包含這些 key，其他不管 |
| `expect(arr).toContain('fire')` | 陣列裡有這個 |

`toMatchObject` 最常用：回傳的物件有一堆欄位，你只檢查關心的幾個。

---

## 一起做

接著上面的檔案，補 `/generations` 的測試。照 `/types` 的寫法，檢查：狀態 200、9 筆、第一筆是 `{ id: 1, name: 'generation-i' }`。

跑 `npm test`，3 個綠。

---

## 自己做

幫 `/pokemon/:id` 和 `/pokemon` 寫測試，一個 endpoint 一個 `describe`：

**`/pokemon/:id`**
- `/pokemon/6`：200；`toMatchObject({ id: 6, name: 'charizard', types: ['fire', 'flying'] })`；`stats.speed` 是 100
- `/pokemon/99999`：404
- `/pokemon/abc`：404 或 400，你決定哪個合理，然後讓 API 真的回那個

**`/pokemon`**
- 不帶參數：200，`items` 長度 30，`total` 1025，`page` 1
- `?type=fire`：`total` 81，每一筆的 `types` 都包含 `'fire'`（用 `every`）
- `?type=fire&generation=1`：`total` 12
- `?search=char`：`total` 7
- `?page=2`：`items[0].id` 是 31
- `?page=0`：400
- `?page=abc`：400

---

## 驗收

```bash
npm test
```

- 至少 12 個測試，全綠
- 把 `pokemon.ts` 裡 `ORDER BY p.id` 刪掉再跑，`?page=2` 那個測試應該變紅（證明測試真的有在看）。改回來。

全過就 commit：「加入 API 測試」。

---

## 常見錯誤

| 看到 | 代表 | 修法 |
|---|---|---|
| 跑完不會結束，一直卡著 | 連線池沒關 | 檔案最上面要有 `afterAll(() => pool.end())` |
| `connect ECONNREFUSED` | Docker 的資料庫沒開 | `npm run db:up` |
| `Cannot find module './app.js'` | import 路徑寫錯 | 這個專案是 ESM，import 要寫 `.js` 結尾 |
| `expected 200, received 500` | API 自己炸了 | 看終端機 vitest 上面印的真正錯誤 |
| `toEqual` 失敗但看起來一樣 | 型別不同，`'81'` 和 `81` | count 要 `Number()` |

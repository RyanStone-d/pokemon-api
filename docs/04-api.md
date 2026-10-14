# 第 4 步：API

## 學完能做到

1. 說出一個 HTTP 請求進到 Express 之後，經過哪些東西、怎麼變成 JSON 回去
2. 從網址的路徑和 query string 拿值，安全地放進 SQL
3. 用 GROUP BY + array_agg 或子查詢，把一對多的資料塞進一筆
4. 寫出條件可有可無的動態查詢和分頁
5. 正確回 200、400、404、500

## 要先會

第 3 步的 8 題 SQL，特別是第 5 題（JOIN）、第 7 題（兩個條件）、第 8 題（子查詢）。

## 概念

先整份讀完再寫程式。這一步會碰到的東西全部在第 1 到 11 節，碰到不懂的回來查。

最後要做出三個 endpoint：

| 網址 | 給前端哪個畫面用 |
|---|---|
| `GET /pokemon/:id` | 詳細頁 |
| `GET /pokemon?type=fire&generation=1&search=char&page=2` | 列表頁，三個篩選都可有可無 |
| `GET /types`、`GET /generations` | 下拉選單（已完成） |

---

## 1. 一個 endpoint 長什麼樣

```ts
pokemonRouter.get('/pokemon/:id', async (req, res) => {
  //                 ↑ 網址          ↑ 有人打這個網址時要跑的函式
  const { rows } = await pool.query('SELECT ...', [值]);
  res.json(rows[0]);
});
```

- `req`（request）：前端送來的東西，網址、參數都在裡面
- `res`（response）：你要回給前端的東西，`res.json(...)` 就是回 JSON
- 跟 Next.js 的 API route 同一個概念，只是寫法不同

整個後端就是一堆這種函式，一個網址一個。

---

## 2. 從網址拿值

兩種位置，兩種拿法：

| 網址 | 位置 | 拿法 | 拿到的值 |
|---|---|---|---|
| `/pokemon/6` | 路徑裡 | `req.params.id` | `'6'` |
| `/pokemon?type=fire&page=2` | 問號後面 | `req.query.type`、`req.query.page` | `'fire'`、`'2'` |

兩個都要注意：

- **拿到的永遠是字串**。`req.params.id` 是 `'6'` 不是 `6`，要用數字就 `Number(req.params.id)`。
- **query 可能不存在**。前端沒帶 `?type=` 的話 `req.query.type` 是 `undefined`，要處理。

路徑裡的 `:id` 是在 `router.get('/pokemon/:id', ...)` 定義的，冒號代表「這一段是變數」。

---

## 3. 把值放進 SQL

永遠用 `$1`，值放陣列，不要串字串：

```ts
pool.query('SELECT * FROM pokemon WHERE id = $1', [id]);
pool.query('... WHERE t.name = $1 AND p.generation_id = $2', [type, gen]);
//                            ↑ 陣列第 0 個             ↑ 第 1 個
```

為什麼：串字串會被塞 SQL 進來（SQL injection），前面講過，`'; DROP TABLE pokemon; --` 那個。

一個小細節：`LIKE` 的 `%` 要放在值裡，不是 SQL 裡：

```ts
pool.query('... WHERE p.name LIKE $1', [`%${search}%`]);   // 對
pool.query("... WHERE p.name LIKE '%$1%'", [search]);       // 錯，引號裡的 $1 不會被換
```

---

## 4. SQL 回來的東西

```ts
const { rows } = await pool.query(...);
```

`rows` 永遠是陣列，一列一個物件，key 是欄位名：

```js
[
  { id: 6, name: 'charizard', height: 1.7, weight: 90.5, hp: 78, ... },
]
```

- 查單筆：`rows[0]`。找不到時 `rows` 是 `[]`，`rows[0]` 是 `undefined`。
- 查 count：`rows[0].count`，注意 pg 回的 count 是**字串** `'81'`，要 `Number()`。
- 欄位名想改：SQL 裡 `AS`，例如 `t.name AS type`，物件的 key 就變 `type`。

---

## 5. 子查詢

子查詢就是「SQL 裡面再包一句 SQL」，用括號括起來。你第 8 題已經寫過一個：

```sql
SELECT * FROM types
WHERE id IN (SELECT type_id FROM pokemon_types);
```

括號裡那句先跑，得到一串 type_id（10、3、10、11、…），外面那句再用這串當條件。**順序永遠是先裡面、再外面。**

用 JS 想：

```js
const usedIds = pokemonTypes.map((pt) => pt.type_id);        // 括號裡那句
const result = types.filter((t) => usedIds.includes(t.id));  // 外面那句
```

子查詢可以放在兩個地方，用法不一樣。

### 放在 WHERE：當名單用

```sql
WHERE 欄位 IN (子查詢)
```

子查詢回一串值，外面用 `IN` 檢查「在不在名單裡」。例子，找所有火屬性的寶可夢：

```sql
SELECT * FROM pokemon
WHERE id IN (
  SELECT pt.pokemon_id
  FROM pokemon_types pt JOIN types t ON t.id = pt.type_id
  WHERE t.name = 'fire'
);
```

括號裡：「誰有 fire」的 id 名單，81 個。外面：pokemon 表只留名單上的。

這跟你第 7 題用 JOIN 的寫法結果一樣，差別是：**JOIN 會把寶可夢的列變多**（噴火龍兩個 type 就兩列），**子查詢不會**，pokemon 表還是一隻一列。列表頁要靠這個特性。

### 放在 SELECT：當一個欄位用

```sql
SELECT 欄位, (子查詢) AS 名字
```

子查詢對外面的**每一列各跑一次**，回一個值，當成那一列的一個欄位。重點是括號裡可以用到外面那一列的值：

```sql
SELECT p.id, p.name,
       (SELECT count(*) FROM pokemon_types pt WHERE pt.pokemon_id = p.id) AS type_count
FROM pokemon p
WHERE p.id IN (4, 6);
```

結果：

```
id | name       | type_count
 4 | charmander | 1
 6 | charizard  | 2
```

跑到小火龍那列時，括號裡的 `p.id` 是 4；跑到噴火龍時是 6。像在 SELECT 裡呼叫一個函式 `countTypes(p.id)`。

把 `count(*)` 換成 `array_agg(...)`，就是下一節的解法二。

---

## 6. 一對多的資料怎麼塞進一筆

這是這一步最難的概念，慢慢看。

### 問題

噴火龍有兩個 type。用 JOIN 查會變兩列：

```
id | name      | type   | slot
 6 | charizard | fire   | 1
 6 | charizard | flying | 2
```

前端要的是一筆，type 是陣列：`{ id: 6, name: 'charizard', types: ['fire', 'flying'] }`。

### 解法一：GROUP BY + array_agg

```sql
SELECT p.id, p.name, array_agg(t.name ORDER BY pt.slot) AS types
FROM pokemon p
JOIN pokemon_types pt ON pt.pokemon_id = p.id
JOIN types t ON t.id = pt.type_id
WHERE p.id = 6
GROUP BY p.id;
```

結果：

```
id | name      | types
 6 | charizard | {fire,flying}
```

兩個關鍵字是搭檔，一起用：

- `GROUP BY p.id`：id 一樣的列合成一列
- `array_agg(t.name ORDER BY pt.slot)`：合的時候，type 這欄收成陣列，照 slot 排

用 JS 講同一件事：

```js
const rows = [
  { id: 6, name: 'charizard', type: 'fire',   slot: 1 },
  { id: 6, name: 'charizard', type: 'flying', slot: 2 },
];
const result = {
  id: 6,
  name: 'charizard',
  types: rows.sort((a, b) => a.slot - b.slot).map((r) => r.type),
  //          ↑ ORDER BY pt.slot                 ↑ array_agg(t.name)
};
```

GROUP BY 合成一列之後，SELECT 裡的每個欄位分三種情況：

| SELECT 裡的欄位 | 結果 |
|---|---|
| 在 GROUP BY 裡的（`p.id`，和跟著它走的 `p.name`） | 直接顯示 |
| 不在 GROUP BY 裡、也沒包聚合函式（`t.name`） | **報錯**：資料庫不知道兩個值要留哪個 |
| 包了聚合函式（`array_agg(t.name)`、`count(*)`） | 一組算出一個值 |

所以要 type 名字就一定要包 `array_agg`。同一家族還有 `count(*)`（算幾個）、`sum()`、`max()`，都是「一組合成一個值」。

### 解法二：子查詢

```sql
SELECT p.id, p.name,
       (SELECT array_agg(t.name ORDER BY pt.slot)
          FROM pokemon_types pt
          JOIN types t ON t.id = pt.type_id
         WHERE pt.pokemon_id = p.id) AS types
FROM pokemon p
WHERE p.id = 6;
```

就是第 5 節「放在 SELECT」那種，括號裡對每一隻去查它的 type 陣列。不用 GROUP BY，結果一樣。

### 什麼時候用哪個

- 詳細頁：兩個都可以，骨架用解法一。
- **列表頁要用解法二**，原因是下一節。

---

## 7. 篩選和聚合不能混在一起

列表頁要「只列火屬性」。如果直接在解法一加 `WHERE t.name = 'fire'`：

```sql
SELECT p.id, p.name, array_agg(t.name ORDER BY pt.slot) AS types
FROM pokemon p
JOIN pokemon_types pt ON ...
JOIN types t ON ...
WHERE t.name = 'fire'      ← 問題在這
GROUP BY p.id;
```

噴火龍會出現，但 `types` 變成 `{fire}`，**flying 不見了**。因為 WHERE 先把 flying 那列篩掉，array_agg 收的時候只剩 fire。

正確做法：篩選用第 5 節的 `IN (子查詢)`，聚合用解法二，兩邊互不干擾：

```sql
SELECT p.id, p.name, p.image,
       (SELECT array_agg(t.name ORDER BY pt.slot)
          FROM pokemon_types pt JOIN types t ON t.id = pt.type_id
         WHERE pt.pokemon_id = p.id) AS types
FROM pokemon p
WHERE p.id IN (
  SELECT pt.pokemon_id
  FROM pokemon_types pt JOIN types t ON t.id = pt.type_id
  WHERE t.name = 'fire'
)
ORDER BY p.id;
```

- `WHERE p.id IN (...)`：先找出「誰有 fire」的名單，只留名單裡的
- SELECT 裡的子查詢：每一隻的 type 完整收，不受篩選影響

噴火龍的 types 就會是 `{fire,flying}`。

---

## 8. 分頁

前端說「我要第 2 頁」，一頁 30 隻：

```ts
const perPage = 30;
const offset = (page - 1) * perPage;   // 第 1 頁跳過 0，第 2 頁跳過 30
```

```sql
... ORDER BY p.id LIMIT $1 OFFSET $2
```

還要告訴前端總共幾隻、幾頁，所以要再跑一句 count：

```sql
SELECT count(*) FROM pokemon p WHERE ...同樣的條件...
```

```ts
const total = Number(countRows[0].count);
const totalPages = Math.ceil(total / perPage);
```

列表 endpoint 固定跑兩句：一句拿這一頁的資料，一句拿總數。回傳：

```json
{
  "items": [ { "id": 4, "name": "charmander", "image": "...", "types": ["fire"] }, ... ],
  "page": 2,
  "perPage": 30,
  "total": 81,
  "totalPages": 3
}
```

---

## 9. 條件可有可無怎麼寫

前端可能只帶 type，可能只帶 search，可能都帶，可能都不帶。SQL 的 WHERE 要跟著變。做法是把條件和值分開累積：

```ts
const conditions: string[] = [];
const params: unknown[] = [];

if (type) {
  params.push(type);
  conditions.push(`p.id IN (SELECT pt.pokemon_id FROM pokemon_types pt JOIN types t ON t.id = pt.type_id WHERE t.name = $${params.length})`);
}
if (generation) {
  params.push(generation);
  conditions.push(`p.generation_id = $${params.length}`);
}
if (search) {
  params.push(`%${search}%`);
  conditions.push(`p.name LIKE $${params.length}`);
}

const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
```

`$${params.length}` 是在算「這個值是第幾個」：第一個 push 進去的是 `$1`，第二個是 `$2`。三個都帶的時候 `where` 會是：

```sql
WHERE p.id IN (...$1...) AND p.generation_id = $2 AND p.name LIKE $3
```

都不帶就是空字串，等於不篩。

這個 `where` 和 `params` 兩句 SQL（資料和 count）共用，分頁的 LIMIT、OFFSET 再接在後面：

```ts
pool.query(
  `SELECT ... FROM pokemon p ${where} ORDER BY p.id LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
  [...params, perPage, offset],
);
pool.query(`SELECT count(*) FROM pokemon p ${where}`, params);
```

注意：`where` 是我們自己組的字串，裡面只有 `$1 $2`，沒有使用者的值，所以安全。使用者的值全部在 `params` 陣列裡。

---

## 10. 檢查輸入，回 400

前端送壞東西不是你的錯，但你要擋：

```ts
const page = Number(req.query.page ?? 1);
if (!Number.isInteger(page) || page < 1) {
  res.status(400).json({ error: 'page must be a positive integer' });
  return;
}
```

`?? 1` 是沒帶就當第 1 頁。`page=abc` 會變 `NaN`，`page=0`、`page=-1` 也擋掉。

---

## 11. 狀態碼和錯誤

| 情況 | 回什麼 | 誰負責 |
|---|---|---|
| 正常 | 200 + 資料 | `res.json(...)` 預設就是 200 |
| 前端參數壞掉 | 400 | 你在 endpoint 裡 `res.status(400).json(...)` |
| 找不到 | 404 | 你在 endpoint 裡 `res.status(404).json(...)` |
| 程式炸掉 | 500 | 不用管，throw 出去，`app.ts` 最下面那個 error handler 會接，印在終端機、回前端一句 Internal Server Error |

所以 endpoint 裡只要處理 400 和 404，其他讓它炸。

---

## 12. 驗收

`npm run dev` 跑著，瀏覽器直接開網址，七個都對才算過：

- http://localhost:3000/pokemon/6 → 噴火龍
- http://localhost:3000/pokemon/99999 → 404
- http://localhost:3000/pokemon?type=fire → 火屬性第 1 頁，total 應該是 81
- http://localhost:3000/pokemon?type=fire&generation=1 → 12 隻
- http://localhost:3000/pokemon?search=char → 7 隻
- http://localhost:3000/pokemon?page=0 → 400
- http://localhost:3000/pokemon?page=2 → 第 31 到 60 號

改了檔案存檔，`npm run dev` 會自己重開。看到 500 就去終端機看真正的錯誤。

---

## 示範

`/types` 和 `/generations` 就是示範，已經做完，在 `src/routes/meta.ts`。一個 endpoint 的完整樣子就是那樣：拿值、跑 SQL、`res.json`。

## 一起做

### A. `GET /pokemon/:id`

骨架在 `src/routes/pokemon.ts`，兩個 TODO：

1. SELECT 那行的底線：第 6 節解法一的 `array_agg(...)`
2. 最後的 `res.json({...})`：把 `p` 整理成檔案最上面註解的格式。六圍包成 `stats` 物件，`generation_id` 改叫 `generation`

## 自己做

### B. `GET /pokemon`

自己從頭寫，放在同一個檔案裡，`/pokemon/:id` 的上面或下面都可以。照這個順序：

1. 從 `req.query` 拿 `type`、`generation`、`search`、`page`（第 2 節）
2. 檢查 page（第 10 節）
3. 組 `conditions` 和 `params`（第 9 節）
4. 跑兩句 SQL：資料（第 7 節的寫法加分頁）和 count（第 8 節）
5. 回傳第 8 節那個格式

寫完照第 12 節逐條測，全過就 commit：「加入 /pokemon 與 /pokemon/:id」。

---

## 常見錯誤

| 看到 | 代表 | 修法 |
|---|---|---|
| 瀏覽器 `{"error":"Internal Server Error"}` | API 炸了 | 去 `npm run dev` 的終端機看真正的錯誤 |
| `column "t.name" must appear in the GROUP BY clause` | 用了 GROUP BY 但 type 欄位沒包聚合函式 | 第 6 節，`array_agg(t.name ...)` |
| `bind message supplies 1 parameters, but prepared statement requires 0` | 陣列給了值，SQL 裡沒有 `$1` | SQL 裡的欄位比較要寫 `= $1`，不是 `= id` |
| `relation "generation" does not exist` | 表名打錯 | 四張表是 `generations`、`types`、`pokemon`、`pokemon_types` |
| 噴火龍的 `types` 只有 `["fire"]` | 篩選和聚合混在一起 | 第 7 節 |
| `total` 是字串 `"81"` | pg 的 count 回字串 | `Number(rows[0].count)` |
| 回傳的 JSON 多了 `generation_id`、`hp` 這些原始欄位 | 直接 `res.json(p)` 沒整理 | 照檔案最上面註解的格式組物件 |
| 改了檔案沒反應 | `npm run dev` 沒在跑，或存檔沒成功 | 看終端機有沒有「API 跑在」那行 |

# SQL 語法說明

第 4 課用到的每個語法，都照同一個格式講：

- **格式**：怎麼寫
- **每個部分的意思**：每個字在做什麼
- **資料庫怎麼跑**：一步一步發生什麼事
- **實際結果**：在你的資料庫跑出來的

全部用這三隻當例子：

| id | name | type |
|---|---|---|
| 4 | charmander（小火龍） | fire |
| 6 | charizard（噴火龍） | fire、flying |
| 7 | squirtle（傑尼龜） | water |

題目都一樣：**找出有 fire 的寶可夢，而且每隻的 type 要完整列出來。** 答案應該是小火龍 `{fire}`、噴火龍 `{fire,flying}`，傑尼龜不在裡面。

---

## 0. 先複習：資料庫執行的順序

你寫的順序和資料庫跑的順序不一樣。資料庫是這樣跑的：

```
1. FROM / JOIN    把表拿來、接起來
2. WHERE          一列一列篩
3. GROUP BY       分組，同組合成一列
4. HAVING         一組一組篩
5. SELECT         決定每列要顯示哪些欄位
6. ORDER BY       排序
7. LIMIT / OFFSET 切一段
```

下面很多語法的差別，都是在這個順序的哪一步做事。**WHERE 在分組之前、HAVING 在分組之後**，這點最重要。

---

## 1. 子查詢

**格式**

```sql
( SELECT ... )
```

一句完整的 SELECT 用括號包起來，放在另一句 SQL 裡面。

**每個部分的意思**

括號裡就是一句普通的 SQL，可以單獨拿出來跑。外面那句把括號的結果當成一個值、一串值、或一張表來用，看它放在哪裡。

| 放在哪 | 括號回傳 | 當成 |
|---|---|---|
| `WHERE x IN (...)` | 一欄、很多列 | 一串值（名單） |
| `SELECT (...) AS 名字` | 一欄、一列 | 一個值 |
| `FROM (...) 別名` | 很多欄、很多列 | 一張表 |

**有一種子查詢會用到外面的欄位**，例如：

```sql
SELECT p.id,
       (SELECT count(*) FROM pokemon_types pt WHERE pt.pokemon_id = p.id)
FROM pokemon p;
```

括號裡的 `p.id` 是外面那句的。這種子查詢沒辦法單獨跑，因為它不知道 `p` 是誰。資料庫會**對外面的每一列各跑一次**括號，每次把那一列的 `p.id` 帶進去。

---

## 2. IN

**格式**

```sql
WHERE 欄位 IN ( 一串值 )
```

一串值可以直接寫 `IN (4, 6, 7)`，也可以放子查詢。

**每個部分的意思**

「這一列的這個欄位，有沒有出現在那一串值裡面」。有就留，沒有就丟。

**資料庫怎麼跑**

```sql
SELECT p.id, p.name FROM pokemon p
WHERE p.id IN (
  SELECT pt.pokemon_id FROM pokemon_types pt JOIN types t ON t.id = pt.type_id
  WHERE t.name = 'fire'
);
```

第一步，先跑括號，得到名單：

```
 pokemon_id
          4
          6
```

（只看這三隻的話。全部是 81 個。）

第二步，pokemon 表一列一列檢查：

| id | 在名單裡？ | 結果 |
|---|---|---|
| 4 | 是 | 留 |
| 6 | 是 | 留 |
| 7 | 否 | 丟 |

**重點**：IN 只是在篩，pokemon 表的列數只會變少，不會變多。噴火龍在 pokemon_types 有兩列，但在 pokemon 表只有一列，所以結果還是一列。

---

## 3. EXISTS

**格式**

```sql
WHERE EXISTS ( 子查詢 )
```

**每個部分的意思**

「括號裡的子查詢，至少找得到一列嗎」。找得到就是 true，留下；一列都沒有就是 false，丟掉。

括號裡 SELECT 什麼不重要，只看有沒有列，所以習慣寫 `SELECT 1`。

**資料庫怎麼跑**

```sql
SELECT p.id, p.name FROM pokemon p
WHERE EXISTS (
  SELECT 1 FROM pokemon_types pt JOIN types t ON t.id = pt.type_id
  WHERE pt.pokemon_id = p.id AND t.name = 'fire'
);
```

括號裡用到外面的 `p.id`，所以**每一隻跑一次**：

跑到 6 號噴火龍，括號變成「找 pokemon_id = 6 而且 type 是 fire 的列」：

```
 ?column?
        1
(1 row)        ← 找到一列 → true → 留
```

跑到 7 號傑尼龜：

```
 ?column?
(0 rows)       ← 一列都沒有 → false → 丟
```

三隻的結果：

```
 id | name       | 有fire
  4 | charmander | t
  6 | charizard  | t
  7 | squirtle   | f
```

**跟 IN 的差別**：IN 是「先算出整份名單，再一個一個對」；EXISTS 是「每一隻自己去問一次」。結果一樣，想法不同。

---

## 4. GROUP BY

**格式**

```sql
GROUP BY 欄位
```

**每個部分的意思**

把「這個欄位的值一樣」的列分成同一組，**每一組最後合成一列**。

**資料庫怎麼跑**

```sql
FROM pokemon p
JOIN pokemon_types pt ON pt.pokemon_id = p.id
JOIN types t ON t.id = pt.type_id
GROUP BY p.id
```

JOIN 完是四列：

```
 id | name       | type
  4 | charmander | fire
  6 | charizard  | fire
  6 | charizard  | flying
  7 | squirtle   | water
```

`GROUP BY p.id` 把 id 一樣的放同一組：

```
組 4：  charmander | fire
組 6：  charizard  | fire
        charizard  | flying
組 7：  squirtle   | water
```

每組要合成一列。id 和 name 每組裡都一樣，直接留。但組 6 的 type 有兩個值，資料庫不知道要留哪個，所以 **type 一定要用聚合函式告訴它怎麼合**，不然報錯：

```
ERROR: column "t.name" must appear in the GROUP BY clause or be used in an aggregate function
```

---

## 5. 聚合函式：array_agg、count、bool_or

**格式**

```sql
函式名( 欄位 )
```

只能用在 GROUP BY 之後（或整張表當一組時）。

**每個部分的意思**

把**一組裡的好幾個值，合成一個值**。不同函式合的方式不一樣：

| 函式 | 怎麼合 | 噴火龍那組（fire、flying）得到 |
|---|---|---|
| `array_agg(t.name)` | 收成陣列 | `{fire,flying}` |
| `array_agg(t.name ORDER BY pt.slot)` | 照 slot 排好再收 | `{fire,flying}`，保證順序 |
| `count(*)` | 算有幾列 | `2` |
| `max(pt.slot)` | 取最大 | `2` |
| `bool_or(t.name = 'fire')` | 每列算一次條件，**有任一列是 true 就是 true** | `true` |

`bool_or` 多講一下。括號裡是一個條件，先對組裡每一列算：

```
組 6：  fire   → t.name = 'fire' 是 true
        flying → t.name = 'fire' 是 false
```

只要有一個 true，`bool_or` 就是 true。意思是「這一組裡有沒有任何一列符合」。

三隻跑出來：

```
 id | name       | types         | 組裡有fire
  4 | charmander | {fire}        | t
  6 | charizard  | {fire,flying} | t
  7 | squirtle   | {water}       | f
```

---

## 6. HAVING

**格式**

```sql
GROUP BY 欄位
HAVING 條件
```

一定接在 GROUP BY 後面。

**每個部分的意思**

篩選，但篩的是**分組合併之後的那一列**。條件裡通常有聚合函式。

**跟 WHERE 的差別**

| | 什麼時候跑 | 篩的是 | 條件裡能用聚合函式嗎 |
|---|---|---|---|
| WHERE | GROUP BY 之前 | JOIN 完的每一列 | 不能 |
| HAVING | GROUP BY 之後 | 合併後的每一組 | 能 |

**為什麼這題用 WHERE 會錯、用 HAVING 會對**

用 WHERE：

```sql
... WHERE t.name = 'fire' GROUP BY p.id
```

WHERE 先跑，一列一列篩：

```
 4 | charmander | fire     ← 留
 6 | charizard  | fire     ← 留
 6 | charizard  | flying   ← 丟！
 7 | squirtle   | water    ← 丟
```

然後才 GROUP BY，噴火龍那組只剩 fire，`array_agg` 收出 `{fire}`。**flying 在分組之前就被丟了。**

用 HAVING：

```sql
... GROUP BY p.id HAVING bool_or(t.name = 'fire')
```

先 GROUP BY，四列都還在，每組完整收成陣列：

```
 4 | {fire}        | bool_or = t   ← 留
 6 | {fire,flying} | bool_or = t   ← 留
 7 | {water}       | bool_or = f   ← 丟
```

**分組完才篩**，噴火龍的陣列已經收好了，flying 不會不見。

---

## 7. ANY

**格式**

```sql
值 = ANY( 陣列 )
```

**每個部分的意思**

「這個值等於陣列裡**任何一個**元素嗎」。

```sql
SELECT 'fire' = ANY(ARRAY['fire','flying']),   -- t
       'fire' = ANY(ARRAY['water']);            -- f
```

IN 是對「一串值」用，ANY 是對「一個陣列欄位」用。你的 types 欄位是陣列，所以要問「陣列裡有沒有 fire」就用 ANY。

---

## 8. LATERAL

**格式**

```sql
FROM 表 別名
CROSS JOIN LATERAL ( 子查詢 ) 別名
```

**每個部分的意思**

- `CROSS JOIN`：把右邊的結果接在左邊每一列旁邊
- `LATERAL`：允許右邊的子查詢用到左邊那一列的欄位

合起來：**對左邊每一列，跑一次右邊的子查詢，結果接在旁邊**。效果跟第 1 節「SELECT 裡的子查詢」很像，差別是 LATERAL 的結果可以有好幾欄，而且接上來之後 WHERE 可以直接用它。

**資料庫怎麼跑**

```sql
SELECT p.id, p.name, x.types
FROM pokemon p
CROSS JOIN LATERAL (
  SELECT array_agg(t.name ORDER BY pt.slot) AS types
  FROM pokemon_types pt JOIN types t ON t.id = pt.type_id
  WHERE pt.pokemon_id = p.id
) x
WHERE 'fire' = ANY(x.types);
```

第一步，每隻跑一次括號，接在旁邊：

```
 id | name       | x.types
  4 | charmander | {fire}
  6 | charizard  | {fire,flying}
  7 | squirtle   | {water}
```

第二步，WHERE 用 ANY 看陣列裡有沒有 fire：

```
  4 | {fire}        | 有 → 留
  6 | {fire,flying} | 有 → 留
  7 | {water}       | 沒有 → 丟
```

陣列在 WHERE 之前就收好了，所以噴火龍完整。

---

## 9. CTE（WITH）

**格式**

```sql
WITH 名字一 AS ( 子查詢 ),
     名字二 AS ( 子查詢 )
主查詢;
```

**每個部分的意思**

- `WITH`：開頭，表示要先定義幾張暫時的表
- `名字 AS ( ... )`：把括號的結果取一個名字
- 好幾個用逗號隔開，後面的可以用前面的
- 最後一定要接一句主查詢，主查詢裡把那些名字當成表來用
- 這些名字只活在這一句 SQL 裡，跑完就沒了

**資料庫怎麼跑**

```sql
WITH type_lists AS (
  SELECT pt.pokemon_id, array_agg(t.name ORDER BY pt.slot) AS types
  FROM pokemon_types pt JOIN types t ON t.id = pt.type_id
  GROUP BY pt.pokemon_id
)
SELECT p.id, p.name, tl.types
FROM pokemon p
JOIN type_lists tl ON tl.pokemon_id = p.id
WHERE 'fire' = ANY(tl.types);
```

第一步，算出 `type_lists`，一隻一列：

```
 pokemon_id | types
          4 | {fire}
          6 | {fire,flying}
          7 | {water}
```

第二步，主查詢把它當成一張普通的表 JOIN。因為 `type_lists` 一隻只有一列，JOIN 完不會變多。

第三步，WHERE 篩出陣列裡有 fire 的。

**跟子查詢的差別**：功能一樣，只是把括號拿出來放最前面、取名字。讀的時候從上往下：先看準備了哪些表，再看主查詢怎麼用。

---

## 對照：同一題五種寫法在做什麼

| 寫法 | 篩選怎麼做 | 陣列怎麼收 | 篩選在收陣列之前還之後 |
|---|---|---|---|
| IN + SELECT 子查詢 | 先算名單，看 id 在不在 | SELECT 裡每隻跑一次 | 互不影響，分開做 |
| EXISTS + SELECT 子查詢 | 每隻去問有沒有 fire | SELECT 裡每隻跑一次 | 互不影響，分開做 |
| GROUP BY + HAVING | 分組後用 bool_or 看組裡有沒有 fire | GROUP BY + array_agg | 之後 |
| LATERAL | 陣列收好後用 ANY 看 | LATERAL 每隻跑一次 | 之後 |
| CTE | 陣列收好後用 ANY 看 | WITH 裡先 GROUP BY 收好 | 之後 |
| ❌ WHERE + GROUP BY | WHERE 一列一列丟 | GROUP BY + array_agg | **之前**，所以 flying 被丟 |

所有對的寫法都有一個共通點：**篩選不能在收陣列之前把列丟掉**。要嘛分開做，要嘛收完再篩。

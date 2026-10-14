-- ============================================================
-- 第 3 步：寫查詢
-- ============================================================
-- 每一題底下空白處寫 SQL，在 psql 裡跑（npm run db:psql，把 SQL 貼進去按 Enter）。
-- 跑出來的結果跟「答案應該是」對得上，就換下一題。
-- 前面幾題是暖身，後面越來越接近前端列表頁要的那句。
-- ============================================================


-- 第 1 題：只看一張表，篩選
-- 第一世代的寶可夢有幾隻？
-- 用到：SELECT count(*) FROM 表 WHERE 欄位 = 值
-- 答案應該是：151

SELECT count(*) FROM pokemon WHERE generation_id = 1;



-- 第 2 題：模糊搜尋（前端的名字搜尋框）
-- 名字裡有 char 的有幾隻？
-- 用到：WHERE name LIKE '%char%'   （% 代表「前後可以有任何字」）
-- 答案應該是：7
SELECT * FROM pokemon WHERE name LIKE '%char%';


-- 第 3 題：分頁（前端一頁 30 隻）
-- 第一世代、照編號排序，第 2 頁的前 3 隻是誰？只要 id 和 name。
-- 用到：ORDER BY id、LIMIT 幾筆、OFFSET 跳過幾筆
-- 提示：第 2 頁要跳過第 1 頁的 30 隻
-- 答案應該是：nidoqueen、nidoran-m、nidorino（id 31、32、33）
-- （這題故意只拿 3 隻，方便你對答案，實際 API 會用 LIMIT 30）
SELECT * FROM pokemon WHERE generation_id = 1 ORDER BY  id LIMIT 3 OFFSET 30;


-- 第 4 題：JOIN 兩張表
-- 列出噴火龍（id 6）的 type_id 和 slot。
-- 只用 pokemon_types 一張表就做得到，先暖身。
-- 答案應該是：兩列，(10, 1) 和 (3, 2)
SELECT * FROM pokemon_types WHERE pokemon_id = 6;



-- 第 5 題：JOIN 三張表
-- 把上一題的 type_id 換成名字，列出噴火龍的 type 名字和 slot，照 slot 排序。
-- 用到：
--   FROM pokemon_types pt
--   JOIN types t ON t.id = pt.type_id
--   （pt、t 是幫表取的短名字，後面寫 pt.slot、t.name 就好）
-- 答案應該是：fire 1、flying 2
SELECT types.name, slot
FROM pokemon_types
INNER JOIN types ON types.id = pokemon_types.type_id
WHERE pokemon_id = 6
ORDER BY slot;


-- 第 6 題：用 type 篩寶可夢（前端的 Type 下拉）
-- 火屬性的寶可夢有幾隻？要用名字 'fire' 篩，不要寫死 10。
-- 用到：pokemon_types JOIN types，WHERE t.name = 'fire'
-- 答案應該是：81
SELECT *
FROM pokemon
JOIN pokemon_types ON pokemon_types.pokemon_id = pokemon.id
JOIN types ON types.id = pokemon_types.type_id
WHERE types.name = 'fire';



-- 第 7 題：兩個條件同時篩
-- 第一世代的火屬性有幾隻？
-- 用到：pokemon JOIN pokemon_types JOIN types，WHERE 兩個條件用 AND 接
-- 答案應該是：12
SELECT p.*
FROM pokemon AS p
JOIN pokemon_types pt ON pt.pokemon_id = p.id
JOIN types  t ON t.id = pt.type_id
WHERE t.name = 'fire' AND p.generation_id = 1
ORDER BY p.id;



-- 第 8 題：type 下拉選單要的資料
-- 列出所有 type 的 id 和 name，但不要 stellar、unknown、shadow（沒有寶可夢用的那三個）。
-- 提示：有兩種寫法。一種是 WHERE name NOT IN (...)。
--       另一種是「只留在 pokemon_types 出現過的 type」，不用寫死名字，想想看怎麼寫。
-- 答案應該是：18 列
SELECT *
FROM types
WHERE id IN (SELECT type_id FROM pokemon_types)
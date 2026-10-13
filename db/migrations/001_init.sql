-- ============================================================
-- 001_init.sql
-- ============================================================
-- 照 db/DESIGN.md 第 4 節的 ER 圖建表，四張：
--   generations (id, name)
--   types       (id, name)
--   pokemon     (id, name, height, weight, image, hp, attack, defense, sp_atk, sp_def, speed, generation_id)
--   pokemon_types (pokemon_id, type_id, slot)
--
-- 順序：被指到的表要先建。pokemon 指向 generations，pokemon_types 指向 pokemon 和 types，
-- 所以 generations、types 先，pokemon 第三，pokemon_types 最後。
--
-- 會用到的語法：
--   外鍵：      generation_id integer NOT NULL REFERENCES generations(id)
--   連動刪除：  ... REFERENCES pokemon(id) ON DELETE CASCADE
--   複合主鍵：  寫在欄位列表最後一行  PRIMARY KEY (pokemon_id, slot)
--   複合唯一：  UNIQUE (pokemon_id, type_id)
--   限制範圍：  slot smallint NOT NULL CHECK (slot IN (1, 2))
--
-- 寫完跑 npm run db:reset，再 npm run db:psql 用 \d pokemon 檢查。
-- ============================================================

CREATE TABLE types (
    id integer PRIMARY KEY,
    name text NOT NULL UNIQUE
);


CREATE TABLE generations (
    id integer PRIMARY KEY,
    name text NOT NULL UNIQUE
);

CREATE TABLE pokemon (
    id integer PRIMARY KEY,
    name text NOT NULL UNIQUE,
    height float NOT NULL,
    weight float NOT NULL,
    image text NOT NULL,
    hp integer NOT NULL,
    attack integer NOT NULL,
    defense integer NOT NULL,
    sp_atk integer NOT NULL,
    sp_def integer NOT NULL,
    speed integer NOT NULL,
    generation_id integer NOT NULL REFERENCES generations(id)
);

CREATE TABLE pokemon_types  (
    pokemon_id integer NOT NULL REFERENCES pokemon(id) ON DELETE CASCADE,
    type_id integer NOT NULL REFERENCES types(id),
    slot smallint NOT NULL CHECK (slot IN (1, 2)),
    PRIMARY KEY (pokemon_id, slot),
    UNIQUE (pokemon_id, type_id)
);

# 資料庫設計

## 1. 需求

### 1.1 這個 API 要服務誰

前端已經存在：PokéNexus（https://pokemon-seven-blush.vercel.app/），Next.js 寫的。
它現在直接打 PokeAPI，而且一次只能拿一隻，列表頁 30 張卡片就要打 30 次，常常 503。
這個專案的目標是做一個自己的 API，讓前端改打它，一次拿一頁。

### 1.2 前端現有的畫面需要什麼資料

**列表頁 `/`**

- 篩選器：Type 下拉、Generation 下拉、名字搜尋框。三個可以同時生效。
- 每張卡片：圖片（官方繪圖）、名字、背景顏色依第一屬性決定。
- 一頁 30 隻，依圖鑑編號排序。
- 底下顯示「顯示 NO.1 到 NO.30 隻寶可夢，共 N 隻」和頁碼。

**詳細頁 `/pokemon/:id`**

- 名字、編號、圖片
- 屬性（1 或 2 個，有順序）
- 身高（顯示公尺）、體重（顯示公斤）
- 六項能力值：HP、Attack、Defense、Sp. Atk、Sp. Def、Speed

**還沒做的頁面**：Profile、Exchange、Settings 現在是 404。Exchange 暗示之後會有使用者和交換功能，
這次不做，但設計時不要做出會卡死「之後加使用者」的決定。

### 1.3 整理成 API 要回答的問題

1. 給我第 N 頁的寶可夢（30 隻），可以同時指定屬性、世代、名字關鍵字。每隻要有編號、名字、圖片、屬性。還要告訴我符合條件的總共幾隻。
2. 給我某一隻的完整資料：編號、名字、圖片、屬性（含順序）、身高、體重、六圍。
3. 有哪些屬性可以選（給下拉選單用）。
4. 有哪些世代可以選（給下拉選單用）。
5. 所有資料從 PokeAPI 匯入，PokeAPI 的 id 要保留。

### 1.4 PokeAPI 給的原始資料長什麼樣

- `GET /pokemon/{id}`：id, name, height（單位是公寸，10 = 1 公尺）, weight（單位是百公克，105 = 10.5 公斤）,
  types[]（slot + type name）, stats[]（stat name + base_stat）, sprites.other.official-artwork.front_default（圖片網址）
- `GET /pokemon-species/{id}`：generation（例如 generation-i）。世代不在 /pokemon 裡，要多打一次。
- 這個專案說的「世代」一律指**第一次登場的世代**，一隻只有一個。前端的 Generation 下拉選第一世代，出來的是 1 到 151 號，就是這個意思。不是「哪幾代遊戲裡出現過」。
- 圖片網址固定是 `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/{id}.png`

## 2. 實體（Entities）

- 寶可夢：開一張表
- 身高：欄位，在寶可夢
- 名字：欄位，在寶可夢
- 編號：表 ← 欄位
- 體重：欄位，在寶可夢
- 圖片：欄位，在寶可夢
- 屬性（火、水那種 type）：開一張表
- 世代：開一張表
- HP、攻擊、防禦、特攻、特防、速度：欄位，在寶可夢

## 3. 關係（Relationships）

現在有三張表：寶可夢、type、世代。兩兩之間的關係填一下，數字填 1 或「很多」。

寶可夢 和 type：

- 一隻寶可夢可以有幾個 type？很多
- 一個 type 底下可以有幾隻寶可夢？很多
- 多對多

寶可夢 和 世代：

- 一隻寶可夢屬於幾個世代？ 一個
- 一個世代底下有幾隻寶可夢？多個 -一對多

## 4. ER 圖

表名改成英文，寫 SQL 時直接用。對照：世代 = generations、寶可夢 = pokemon、中間表 = pokemon_types、type = types。

```
generations (id, name)
   │ 1
   │
   │ N
pokemon (id, name, height, weight, image, hp, attack, defense, sp_atk, sp_def, speed, generation_id)
   │ 1
   │
   │ N
pokemon_types (pokemon_id, type_id, slot)
   │ N
   │
   │ 1
types (id, name)
```

怎麼讀：一個世代底下有 N 隻寶可夢；一隻寶可夢在 pokemon_types 有 N 列；一個 type 在 pokemon_types 有 N 列。pokemon_types 每一列只指向 1 隻寶可夢和 1 個 type。

## 5. 檢查

拿上面的圖對 1.3 的五條需求。每一條寫「要查哪幾張表」就好，一行一條。

1. 列表頁，拆成三小題：
   - 一張卡片要顯示編號、名字、圖片、type。這四樣各在哪張表？pokemon
   - 使用者選「只要火屬性」，你要去哪張表找「誰有 fire」？pokemon_types
   - 使用者選「只要第一世代」，你要看哪張表的哪個欄位？pokemon表內的世代id
2. 單隻詳細頁：pokemon、pokemon_types
3. type 下拉選單： type
4. 世代下拉選單：generation
5. PokeAPI 給每隻寶可夢、每個 type、每個世代都有自己的號碼（噴火龍 6、fire 10、第一世代 1）。我們表裡的 id 要直接抄 PokeAPI 的號碼，還是讓資料庫自己從 1 開始編？哪幾張表要抄？按照全國圖鑑編號?

## 6. 決定與取捨

三題都是二選一，沒有標準答案，選一個並寫一句為什麼。

1. 身高體重：
   - A. 存 PokeAPI 的原始值（height 17、weight 905），API 回傳前再換算成 1.7 m、90.5 kg
   - B. 存換算好的（1.7、90.5），匯入時就換算
   - 你選：B。匯入時先換算成公尺和公斤再存，表裡用 float，API 拿出來直接給前端。

2. 圖片網址（固定是 .../official-artwork/{id}.png）：
   - A. 存進 pokemon 表一個 image 欄位
   - B. 不存，API 回傳時用 id 組出來
   - 你選：A。存進 pokemon 表的 image 欄位。

3. 世代：
   - A. 開 generations 表，pokemon 用 generation_id 指過去（第 4 節的畫法）
   - B. 不開表，pokemon 直接一個 generation 欄位存 1 到 9
   - 你選：A。要開 generations 表，不然下拉選單沒有地方拿選項。

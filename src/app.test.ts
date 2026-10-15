import { afterAll, describe, expect, test } from "vitest";
import request from "supertest";
import { app } from "./app.js";
import { pool } from "./db.js";

// 全部跑完要把連線池關掉，不然 vitest 會等不到結束
afterAll(() => pool.end());

describe("GET /health", () => {
  test("回 ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});

describe("GET /types", () => {
  test("回 18 個 type，照 id 排", async () => {
    const res = await request(app).get("/types");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(18);
    expect(res.body[0]).toEqual({ id: 1, name: "normal" });
  });
});

describe("GET /generations", () => {
  test("回 9 個世代，照 id 排", async () => {
    const res = await request(app).get("/generations");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(9);
    expect(res.body[0]).toEqual({ id: 1, name: "generation-i" });
  });
});

describe("GET /pokemon/:id", () => {
  test("噴火龍：基本資料、type 照 slot 排、六圍包在 stats", async () => {
    const res = await request(app).get("/pokemon/6");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: 6,
      name: "charizard",
      height: 1.7,
      weight: 90.5,
      types: ["fire", "flying"],
      generation: 1,
    });
    expect(res.body.stats.speed).toBe(100);
  });

  test("不存在的編號回 404", async () => {
    const res = await request(app).get("/pokemon/99999");
    expect(res.status).toBe(404);
  });

  test("id 不是正整數回 400", async () => {
    for (const bad of ["abc", "0", "-1", "1.5"]) {
      const res = await request(app).get(`/pokemon/${bad}`);
      expect(res.status, `/pokemon/${bad}`).toBe(400);
    }
  });
});

describe("GET /pokemon", () => {
  test("不帶參數：第 1 頁 30 隻，總共 1025 隻", async () => {
    const res = await request(app).get("/pokemon");
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(30);
    expect(res.body).toMatchObject({ page: 1, perPage: 30, total: 1025, totalPages: 35 });
    expect(res.body.items[0]).toEqual({
      id: 1,
      name: "bulbasaur",
      image: expect.stringContaining("/1.png"),
      types: ["grass", "poison"],
    });
  });

  test("type=fire：81 隻，每隻都有 fire，雙屬性的另一個 type 沒被篩掉", async () => {
    const res = await request(app).get("/pokemon?type=fire");
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(81);
    expect(res.body.totalPages).toBe(3);
    expect(res.body.items.every((p: { types: string[] }) => p.types.includes("fire"))).toBe(true);
    const charizard = res.body.items.find((p: { id: number }) => p.id === 6);
    expect(charizard.types).toEqual(["fire", "flying"]);
  });

  test("type=fire&generation=1：12 隻", async () => {
    const res = await request(app).get("/pokemon?type=fire&generation=1");
    expect(res.body.total).toBe(12);
    expect(res.body.items).toHaveLength(12);
  });

  test("search=char：7 隻，名字都含 char", async () => {
    const res = await request(app).get("/pokemon?search=char");
    expect(res.body.total).toBe(7);
    expect(res.body.items.every((p: { name: string }) => p.name.includes("char"))).toBe(true);
  });

  test("generation=1&search=char：3 隻", async () => {
    const res = await request(app).get("/pokemon?generation=1&search=char");
    expect(res.body.total).toBe(3);
  });

  test("page=2 從 31 號開始", async () => {
    const res = await request(app).get("/pokemon?page=2");
    expect(res.body.page).toBe(2);
    expect(res.body.items[0].id).toBe(31);
  });

  test("最後一頁不滿 30 隻，超過最後一頁回空陣列", async () => {
    const last = await request(app).get("/pokemon?page=35");
    expect(last.body.items).toHaveLength(5);
    const beyond = await request(app).get("/pokemon?page=36");
    expect(beyond.status).toBe(200);
    expect(beyond.body.items).toEqual([]);
  });

  test("篩不到東西：200、空陣列、total 0", async () => {
    const res = await request(app).get("/pokemon?search=zzzz");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ items: [], total: 0, totalPages: 0 });
  });

  test("page 不是正整數回 400", async () => {
    for (const bad of ["0", "-1", "1.5", "abc"]) {
      const res = await request(app).get(`/pokemon?page=${bad}`);
      expect(res.status, `page=${bad}`).toBe(400);
    }
  });
});

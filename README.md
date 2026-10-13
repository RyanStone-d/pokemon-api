# pokemon-api

用 PokeAPI 的資料練習完整後端：PostgreSQL → REST API → 部署。

## 開發環境

```bash
npm install
npm run db:up        # 用 Docker 起一個 Postgres（localhost:5433）
npm run db:migrate   # 套用 db/migrations/*.sql
npm run db:psql      # 進 psql 看表
```

`npm run db:reset` 會砍掉資料庫重建，設計 schema 的階段可以一直重跑。

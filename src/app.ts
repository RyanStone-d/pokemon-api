// 建立 Express app。跟 server.ts 分開，是為了第 5 步寫測試時可以直接拿 app 來測，不用真的開 port。
import express from 'express';
import cors from 'cors';
import { metaRouter } from './routes/meta.js';
import { pokemonRouter } from './routes/pokemon.js';

export const app = express();

app.use(cors()); // 讓前端（不同網域）可以打這個 API
app.use(express.json());

// 健康檢查：上線後雲端平台會定期打這個，確認 server 還活著
app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.use(metaRouter);
app.use(pokemonRouter);

// 找不到路由
app.use((_req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// 任何地方 throw 出來的錯誤都會到這裡，統一回 500，不要把錯誤細節丟給前端
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Internal Server Error' });
});

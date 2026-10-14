// 真正開 port 的地方。npm run dev 跑的就是這支。
import { app } from './app.js';

const port = Number(process.env.PORT) || 3000;

app.listen(port, () => {
  console.log(`API 跑在 http://localhost:${port}`);
});

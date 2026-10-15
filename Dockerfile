# 階段一：編譯
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# 階段二：只留跑起來需要的
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
# 不裝 devDependencies
RUN npm ci --omit=dev
# 從階段一拿編譯結果
COPY --from=build /app/dist ./dist
CMD ["node", "dist/src/server.js"]

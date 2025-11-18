FROM node:20-bookworm-slim AS frontend

WORKDIR /app

# 1) package.json / lock
COPY package*.json ./

# 2) Normal dependency kurulumu
RUN npm install

# 3) Rollup’ın native paketi bu imajda optional olarak gelmiyor, biz zorla kurduruyoruz
RUN npm install @rollup/rollup-linux-x64-gnu --save-dev

# 4) Tüm frontend kodunu kopyala
COPY . .

# 5) Build
RUN npm run build

EXPOSE 4173

CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "4173"]


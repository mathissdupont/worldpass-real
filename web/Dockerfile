FROM node:20-bookworm-slim AS frontend

WORKDIR /app

# 1) package.json / lock
COPY package*.json ./

# 2) Install dependencies (with SSL workaround for build environment)
RUN npm config set strict-ssl false && \
    npm install && \
    npm config set strict-ssl true

# 3) Copy frontend code
COPY . .

# 4) Build
RUN npm run build

EXPOSE 4173

CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "4173"]

FROM node:20-bookworm-slim AS frontend

WORKDIR /app/web

# 1) package.json / lock
COPY web/package*.json ./

# 2) Install dependencies (with SSL workaround for build environment)
RUN npm config set strict-ssl false && \
    npm install && \
    npm config set strict-ssl true

# 3) Copy frontend code + shared tokens
COPY web .
COPY shared ../shared

# 4) Build
RUN npm run build

EXPOSE 4173

CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "4173"]

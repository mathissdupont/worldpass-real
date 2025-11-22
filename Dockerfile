FROM python:3.12-slim
WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
 && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV WORLD_PASS_DB=/data/worldpass.db
ENV APP_ENV=production


CMD ["uvicorn", "backend.app:app", "--host", "0.0.0.0", "--port", "8080"]


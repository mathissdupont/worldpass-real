FROM python:3.12-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

# sistem bağımlılıkları (gerekirse ekleriz)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
 && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install -r requirements.txt

COPY . .

# FastAPI app: backend/app.py içinde app = FastAPI(...)
ENV WORLD_PASS_DB=/data/worldpass.db
ENV APP_ENV=production

CMD ["uvicorn", "backend.app:app", "--host", "0.0.0.0", "--port" ${PORT:-8080}]

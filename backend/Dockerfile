FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Copy requirements
COPY requirements.txt ./requirements.txt

# Install dependencies (with SSL workaround for build environment)
RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential ca-certificates \
    && pip install --trusted-host pypi.org --trusted-host files.pythonhosted.org -r requirements.txt \
    && apt-get purge -y build-essential \
    && apt-get autoremove -y \
    && rm -rf /var/lib/apt/lists/*

# Copy application code
COPY . .

EXPOSE 8000

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]

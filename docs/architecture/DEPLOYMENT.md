# Deployment — AgriTrace Carbon

## Docker Compose (dev)

```yaml
version: '3.9'
services:
  app:
    build: .
    ports: ["3000:3000"]
    env_file: .env
    depends_on: [postgres, mongodb, redis, meilisearch]
    volumes: ["./uploads:/app/uploads"]

  postgres:
    image: postgis/postgis:16-3.4
    environment:
      POSTGRES_DB: agritrace
      POSTGRES_USER: agriuser
      POSTGRES_PASSWORD: agripass
    ports: ["5432:5432"]
    volumes: ["pgdata:/var/lib/postgresql/data"]

  mongodb:
    image: mongo:7
    ports: ["27017:27017"]
    volumes: ["mongodata:/data/db"]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
    volumes: ["redisdata:/data"]

  meilisearch:
    image: getmeili/meilisearch:v1.6
    ports: ["7700:7700"]
    environment:
      MEILI_MASTER_KEY: ${MEILI_MASTER_KEY}
    volumes: ["meilidata:/meili_data"]

volumes:
  pgdata:
  mongodata:
  redisdata:
  meilidata:
```

## Setup lần đầu

```bash
# 1. Clone và cài packages
pnpm install

# 2. Copy env
cp .env.example .env

# 3. Khởi động services
docker-compose up -d postgres mongodb redis meilisearch

# 4. Prisma migrate
pnpm prisma migrate dev --name init

# 5. Seed dữ liệu mẫu
pnpm prisma db seed

# 6. Chạy app
pnpm dev
```

## BullMQ Workers (chạy song song với app)

```bash
# Trong production, chạy workers riêng:
pnpm worker:checkvn    # node dist/workers/checkvn.worker.js
pnpm worker:carbon     # node dist/workers/carbon.worker.js
pnpm worker:ocr        # node dist/workers/ocr.worker.js
pnpm worker:export     # node dist/workers/export.worker.js
```

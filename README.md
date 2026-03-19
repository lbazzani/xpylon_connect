# Xpylon Connect

B2B mobile networking app — Expo + Express + PostgreSQL

## Prerequisites

- Node.js (LTS)
- Docker
- Expo CLI (`npx expo`)
- Expo Go app on your phone (or iOS Simulator / Android Emulator)

## Quick Start

```bash
# 1. Install dependencies
npm install --legacy-peer-deps

# 2. Start PostgreSQL
docker start xpylon-postgres
# First time only:
# docker run -d --name xpylon-postgres -e POSTGRES_USER=xpylon -e POSTGRES_PASSWORD=xpylon -e POSTGRES_DB=xpylon_connect -p 5433:5432 postgres:16-alpine

# 3. Run DB migrations
cd api
cp .env.example .env   # then edit with your credentials (or use defaults)
npx prisma migrate dev
cd ..

# 4. Start API server
cd api && npm run dev

# 5. Start mobile app (in a new terminal)
cd mobile && npm start
```

Scan the QR code with Expo Go (Android) or Camera app (iOS).

## Environment

The API `.env` file needs:
```
DATABASE_URL=postgresql://xpylon:xpylon@localhost:5433/xpylon_connect
JWT_SECRET=<any-secret>
JWT_REFRESH_SECRET=<any-secret>
TWILIO_ACCOUNT_SID=<your-sid>
TWILIO_AUTH_TOKEN=<your-token>
TWILIO_VERIFY_SERVICE_SID=<your-service-sid>
```

> OTP verification is bypassed in dev mode — any code is accepted.

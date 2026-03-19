# Xpylon Connect

## What is it
B2B mobile app for business networking. Users connect via SMS invite, chat privately, and manage business opportunities in group chats.

## Monorepo structure
- `mobile/` — Expo SDK 54, React Native 0.81, Expo Router, NativeWind, Zustand
- `api/` — Node.js, Express, Prisma, PostgreSQL, WebSocket (`ws`), JWT auth
- `shared/` — Shared TypeScript types (interfaces, enums, API/WS types)

## Commands
- `npm install --legacy-peer-deps` — install dependencies (.npmrc has legacy-peer-deps=true)
- `cd api && npm run dev` — start API server (ts-node-dev)
- `cd api && npx prisma migrate dev` — run DB migrations
- `cd api && npx prisma studio` — open Prisma Studio
- `cd mobile && npm start` — start Expo dev server

## Database
- PostgreSQL 16 on Docker: `docker start xpylon-postgres` (port 5433)
- Credentials: user=xpylon, password=xpylon, db=xpylon_connect

## Git
- Remote: `git@github-xpylon:lbazzani/xpylon_connect.git`
- Uses SSH host `github-xpylon` (key `~/.ssh/id_git_trim`, account lbazzani)

## Conventions
- **Language: ALL code, UI strings, file names, and folder names MUST be in English**
- Primary color: `#F15A24` (Xpylon orange)
- Orientation: portrait only, smartphone only
- Auth: OTP via Twilio Verify → JWT (access 15min + refresh 7d)
- Realtime: WebSocket on same Express port (`/ws?token=JWT`)
- Custom object storage for attachments/photos (image resize with sharp)
- Chat features: WhatsApp-level — reply to messages, delete, delivery/read receipts, typing indicator, online/last seen, image/file attachments

## External services
- Twilio Verify for OTP (credentials in api/.env)
- Firebase Admin SDK for push notifications (FCM)
- Deep link scheme: `xpylonconnect://`

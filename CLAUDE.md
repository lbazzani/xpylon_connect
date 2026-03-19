# Xpylon Connect

> **IMPORTANT: Any code change that impacts the architecture MUST also update this file.**

## What is it
B2B mobile app for business networking. Users connect via SMS invite, chat privately, manage business opportunities in group chats, and make voice/video calls.

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
- Orientation: portrait only, smartphone only (no tablet)
- Auth: OTP via Twilio Verify → JWT (access 15min + refresh 7d)
- Realtime: WebSocket on same Express port (`/ws?token=JWT`)

## Data model (Prisma)
- **User** — phone, firstName, lastName, bio, role, company, profileCompleted, lastSeenAt, isOnline
- **Company** — name, users[]
- **Connection** — requester, addressee, status (PENDING/ACCEPTED/DECLINED)
- **Invite** — sender, phoneTarget, token, status
- **Conversation** — type (DIRECT/OPPORTUNITY_GROUP), name, members[], messages[], calls[]
- **ConversationMember** — conversationId, userId, joinedAt
- **Message** — content, type (TEXT/IMAGE/FILE/SYSTEM), replyToId, deletedAt, attachments[], receipts[]
- **MessageReceipt** — per-user delivery/read tracking (deliveredAt, readAt)
- **Attachment** — messageId, storageObject reference, fileName, mimeType, size
- **StorageObject** — custom object storage: bucket, key, variants (thumbnail/medium/large for images)
- **Call** — conversationId, callerId, type (VOICE/VIDEO), status (RINGING/ONGOING/ENDED/MISSED/DECLINED)
- **FcmToken** — userId, token

## Chat features (WhatsApp-level)
- Reply to messages (replyToId + quoted preview)
- Message deletion (soft delete, "Message deleted" shown)
- Delivery receipts: ✓ sent, ✓✓ delivered (gray), ✓✓ read (blue)
- Typing indicator with animated dots
- Online/last seen status in header
- Date separators between days (Today/Yesterday/date)
- Long press action sheet: Reply, Copy, Delete
- Image/file attachments with custom object storage + sharp resize
- Voice and video calls with WebRTC signaling

## Object storage
- Local filesystem storage in `api/storage/` directory
- Image variants auto-generated via `sharp`: thumbnail (150x150), medium (600x600), large (1200x1200)
- Upload endpoint: `POST /storage/upload` (multer, max 20MB, up to 10 files)
- Serve endpoint: `GET /storage/:bucket/:key?variant=thumbnail|medium|large`

## WebSocket events
**Server → Client:** new_message, message_delivered, message_read, message_deleted, typing, stop_typing, user_online, user_offline, connection_request, connection_accepted, call_incoming, call_accepted, call_ended, call_declined, webrtc_offer/answer/ice_candidate

**Client → Server:** send_message (with replyToId, attachmentIds), read_message, delete_message, typing, stop_typing, call_start, call_accept, call_decline, call_end, webrtc_offer/answer/ice_candidate

## Mobile route structure
```
app/
├── _layout.tsx              ← Root layout + auth guard
├── (auth)/phone|otp|register|profile-setup
└── (app)/
    ├── messages/index|[id]  ← Conversations list + chat screen
    ├── network/index        ← Contacts + pending requests
    └── profile/index        ← User profile
```

## External services
- Twilio Verify for OTP (credentials in api/.env)
- Firebase Admin SDK for push notifications (FCM)
- Deep link scheme: `xpylonconnect://`

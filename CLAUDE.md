# Xpylon Connect

> **IMPORTANT: Any code change that impacts the architecture MUST also update this file.**

## What is it
B2B mobile app for business networking. Users connect via SMS invite, chat privately, manage business opportunities in group chats, and make voice/video calls.

## Monorepo structure
- `mobile/` — Expo SDK 54, React Native 0.81, Expo Router, NativeWind, Zustand
- `api/` — Node.js, Express, Prisma, PostgreSQL, WebSocket (`ws`), JWT auth
- `shared/` — Shared TypeScript types (interfaces, enums, API/WS types)

## Commands
- `npm run dev` — start API + Expo together (concurrently)
- `npm run setup` — start DB + migrate + launch both services
- `npm run dev:api` / `npm run dev:mobile` — start individually
- `cd api && npx prisma migrate dev` — run DB migrations
- `cd api && npx prisma studio` — open Prisma Studio

## Database
- PostgreSQL 16 on Docker: `docker start xpylon-postgres` (port 5433)
- Credentials: user=xpylon, password=xpylon, db=xpylon_connect
- Indexes on all frequently queried FKs (Connection, Message, ConversationMember, etc.)

## Git
- Remote: `git@github-xpylon:lbazzani/xpylon_connect.git`
- Uses SSH host `github-xpylon` (key `~/.ssh/id_git_trim`, account lbazzani)

## Conventions
- **Language: ALL code, UI strings, file names, and folder names MUST be in English**
- **Design system: `mobile/lib/theme.ts` is the single source of truth for ALL design tokens**
- Primary color: `#F15A24` (Xpylon orange)
- Orientation: portrait only, smartphone only (no tablet)
- Auth: OTP via Twilio Verify → JWT (access 15min + refresh 7d)
- Realtime: WebSocket on same Express port (`/ws?token=JWT`)

## Security
- All conversation endpoints verify membership before access
- Accepted connection required to create direct conversations
- Group members validated as accepted contacts
- Rate limiting on OTP endpoints (5 attempts / 15 min)
- Path traversal protection on storage
- JWT secrets validated in production (throws if missing)
- Token refresh uses mutex to prevent race conditions
- WebSocket membership verification on all operations

## Data model (Prisma)
- **User** — phone, firstName, lastName, bio, role, company, profileCompleted, lastSeenAt, isOnline
- **Company** — name, users[]
- **Connection** — requester, addressee, status (PENDING/ACCEPTED/DECLINED)
- **Invite** — sender, phoneTarget, token, status (PENDING/ACCEPTED/EXPIRED), expiresAt
- **Conversation** — type (DIRECT/OPPORTUNITY_GROUP), name, members[], messages[], calls[]
- **ConversationMember** — conversationId, userId, joinedAt
- **Message** — content, type (TEXT/IMAGE/FILE/SYSTEM), replyToId, deletedAt, attachments[], receipts[]
- **MessageReceipt** — per-user delivery/read tracking (deliveredAt, readAt)
- **Attachment** — messageId, storageObject reference, fileName, mimeType, size
- **StorageObject** — bucket, key, mimeType, size, variants (JSON with width/height/size per variant)
- **Call** — conversationId, callerId, type (VOICE/VIDEO), status (RINGING/ONGOING/ENDED/MISSED/DECLINED)
- **FcmToken** — userId, token

## Chat features (WhatsApp-level)
- Reply to messages (replyToId + quoted preview)
- Message deletion (soft delete, "Message deleted" shown)
- Delivery receipts: ✓ sent, ✓✓ delivered (gray), ✓✓ read (blue #53BDEB)
- Typing indicator with animated dots
- Online/last seen status in header
- Date separators (Today/Yesterday/date)
- Long press action sheet: Reply, Copy, Delete (iOS ActionSheet + Android Alert)
- Image/file attachments with object storage
- Voice and video calls with WebRTC signaling + professional call UI

## Object storage (`api/src/lib/storage.ts`)
- Configurable path via `STORAGE_PATH` env var (default: `api/storage/`)
- **Image pipeline**: auto-detect → EXIF rotate → strip metadata → convert to WebP (quality 82 photo / 75 graphic)
- **Variants**: thumbnail (150px, cover, q70), medium (800px, inside, q80), large (1600px, inside, q85)
- Skips variants larger than original image
- **Blurhash**: generates tiny base64 WebP placeholder for instant loading
- Passthrough for GIF (animated) and SVG
- Parallel variant generation
- Cache-Control: immutable (1 year) on served files
- Path traversal protection on all file operations
- Blocked uploads: .exe, .bat, .sh, .cmd, .msi

## Push notifications (`api/src/lib/notifications.ts`)
- Uses Expo Push API (works on both iOS and Android)
- Android channels: messages (MAX), connections (HIGH), calls (MAX)
- Notification types: new message, connection request/accepted, incoming/missed call
- Deep link routing on notification tap → correct screen
- Badge count management
- Token registration on auth, cleanup on logout

## WebSocket events
**Server → Client:** new_message, message_delivered, message_read, message_deleted, typing, stop_typing, user_online, user_offline, connection_request, connection_accepted, call_incoming, call_accepted, call_ended, call_declined, webrtc_offer/answer/ice_candidate, error

**Client → Server:** send_message (with replyToId, attachmentIds), read_message, delete_message, typing, stop_typing, call_start, call_accept, call_decline, call_end, webrtc_offer/answer/ice_candidate

## Mobile architecture
```
app/
├── _layout.tsx              ← Root layout + auth guard + push notification setup
├── (auth)/phone|otp|register|profile-setup
└── (app)/
    ├── messages/index|[id]  ← Conversations list + chat screen + call screen
    ├── network/index        ← Contacts + pending requests
    └── profile/index        ← User profile

lib/
├── theme.ts                 ← Design system tokens (colors, fonts, spacing, shadows)
├── api.ts                   ← API client with JWT refresh mutex
├── storage.ts               ← SecureStore helpers
└── notifications.ts         ← Push notification registration + deep link handling

hooks/
├── useAuth.ts               ← Auth state + token management
├── useWebSocket.ts          ← WS with exponential backoff reconnection
├── useConversations.ts      ← Conversation list fetching
└── useCall.ts               ← Call state management

components/
├── ui/Button|Avatar|Input   ← Base UI components (theme-aware)
├── chat/                    ← MessageBubble, ChatInput, ConversationItem, DateSeparator, TypingIndicator, CallScreen
└── rete/                    ← ContactRow, PendingRequestCard
```

## External services
- Twilio Verify for OTP (credentials in api/.env)
- Expo Push Notifications (replaces raw FCM — works on both iOS/Android)
- Deep link scheme: `xpylonconnect://`

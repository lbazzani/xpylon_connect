# Xpylon Connect

> **IMPORTANT: Any code change that impacts the architecture MUST also update this file.**
> **SELF-UPDATE RULE: After completing any task that introduces new features, new models, new API routes, new conventions, or changes existing behavior documented here, you MUST update this file before finishing. Add new sections, update existing ones, and ensure the document stays the single source of truth for the project architecture. This applies to ALL sessions, not just the current one.**

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
- `cd api && npx prisma db seed` — seed demo data (6 users, connections, conversations, opportunities)
- `cd mobile && npm run build:apk` — build Android APK for testing (EAS Build)
- `cd mobile && npm run build:apk-local` — APK pointing to local API (set IP in eas.json)
- `cd mobile && npm run build:ios` — build iOS for TestFlight (requires Apple Developer account)

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
- **Design quality: The app MUST look professional and enterprise-grade on BOTH web and mobile**
  - Use Ionicons (from @expo/vector-icons) for ALL icons — NEVER use emoji
  - Brand orange `#F15A24` used ONLY for primary action buttons — everything else uses neutral grays
  - Active tab icons: filled variant in gray-900, inactive: outline in gray-400
  - Header action buttons: outline style (border, gray icon), not filled orange
  - Empty states: subtle icon + heading + description + outline CTA button
  - Minimal color usage — professional neutral palette, no bright colors except for status indicators
  - Tab bar must use explicit `name="directory/index"` and hide dynamic routes with `href: null`
- Primary color: `#F15A24` (Xpylon orange) — use sparingly
- Orientation: portrait only, smartphone only (no tablet)
- Auth: OTP via Twilio Verify → JWT (access 15min + refresh 7d)
- Realtime: WebSocket on same Express port (`/ws?token=JWT`)
- **Storyboard: `storyboard/content.md` is the source of truth for all feature descriptions (tour + bot + marketing). Before any modification, back up the current version to `storyboard/history/`. Update content.md whenever features are added or changed.**

## Security
- All conversation endpoints verify membership before access
- Accepted connection required to create direct conversations
- Group members validated as accepted contacts
- Rate limiting on OTP endpoints (5 attempts / 15 min)
- Path traversal protection on storage
- JWT secrets validated in production (throws if missing)
- Token refresh uses mutex to prevent race conditions
- WebSocket membership verification on all operations
- AI content moderation on all opportunity creation (scam/fraud/illegal content detection)
- Admin-only routes protected by `isAdmin` guard middleware

## Data model (Prisma)
- **User** — phone, email, firstName, lastName, bio, role, industry, company, embedding (pgvector), profileCompleted, isAdmin, isDemo, lastSeenAt, isOnline
- **Company** — name, users[]
- **Connection** — requester, addressee, status (PENDING/ACCEPTED/DECLINED)
- **Invite** — sender, phoneTarget, token, status (PENDING/ACCEPTED/EXPIRED), expiresAt
- **Conversation** — type (DIRECT/OPPORTUNITY_GROUP), name, opportunityId?, members[], messages[], calls[]
- **ConversationMember** — conversationId, userId, joinedAt
- **Message** — content, type (TEXT/IMAGE/FILE/SYSTEM), replyToId, deletedAt, attachments[], receipts[]
- **MessageReceipt** — per-user delivery/read tracking (deliveredAt, readAt)
- **Attachment** — messageId, storageObject reference, fileName, mimeType, size
- **StorageObject** — bucket, key, mimeType, size, variants (JSON with width/height/size per variant)
- **Call** — conversationId, callerId, type (VOICE/VIDEO), status (RINGING/ONGOING/ENDED/MISSED/DECLINED)
- **Opportunity** — authorId, title, description, type (PARTNERSHIP/DISTRIBUTION/INVESTMENT/SUPPLY/ACQUISITION/OTHER), tags[], visibility (INVITE_ONLY/NETWORK/OPEN), commMode (PRIVATE/GROUP), status (ACTIVE/UNDER_REVIEW/PAUSED/CLOSED/REJECTED), embedding (pgvector), reviewNote?, reviewedById?, reviewedAt?, expiresAt?
- **OpportunityInterest** — opportunityId, userId, status (PENDING/ACCEPTED/DECLINED)
- **OpportunitySaved** — opportunityId, userId
- **FcmToken** — userId, token

## Opportunities feature
- 4th tab: Messages | Network | Opportunities | Profile
- **Discovery model**: AI-driven, not feed-based
  - Users search for opportunities via the Xpylon bot (`[SEARCH_OPPORTUNITIES:<query>]` marker)
  - Bot uses `searchOpportunitiesByQuery()` — generates embedding for query, ranks by cosine similarity against opportunity embeddings
  - Results shown in chat with inline save/bookmark buttons (`[OPP:<id>]` markers parsed by MessageBubble)
  - Push notifications sent to matching users when a new opportunity is created (`notifyMatchingUsersOfNewOpportunity`, threshold 55% similarity)
- **Opportunities tab** has 3 sub-tabs:
  - "For you" (`GET /opportunities/suggested`) — auto-matched by profile embedding similarity (min 50%)
  - "My opps" (`GET /opportunities/mine`) — author's own with stats
  - "Saved" (`GET /opportunities/saved`) — bookmarked from chat or detail screen
- Opportunity embeddings auto-generated on creation from title + description + type + tags (text-embedding-3-small)
- Visibility: INVITE_ONLY (manual share), NETWORK (matching + author approval), OPEN (direct contact)
- CommMode: PRIVATE (1:1 chats per interested) or GROUP (single group chat)
- OPEN opportunities auto-accept interest and create conversation immediately
- NETWORK opportunities require author approval before conversation is created

## Compliance Review (`api/src/lib/moderation.ts`)
- AI-powered content moderation on every opportunity creation (both manual form and bot-assisted)
- Uses OpenAI GPT-4o-mini to classify opportunities as APPROVED, UNDER_REVIEW, or REJECTED
- **APPROVED**: opportunity goes live immediately with status ACTIVE
- **UNDER_REVIEW**: opportunity is created with status UNDER_REVIEW, GROUP conversations are NOT created until approved, all admin users receive a push notification
- **REJECTED**: opportunity is not created, user gets an error with the reason
- Moderation checks for: scams, fraud, illegal content, MLM schemes, vague/suspicious descriptions, exaggerated claims
- On moderation API failure, defaults to UNDER_REVIEW (safe fallback)
- Admin users (`isAdmin: true` on User model) can review flagged opportunities

## Admin system (`api/src/routes/admin.ts`)
- All admin routes require `isAdmin: true` on the authenticated user
- **Routes** (all under `/admin`):
  - `GET /admin/opportunities/pending` — list UNDER_REVIEW opportunities
  - `GET /admin/opportunities/history` — reviewed opportunities (last 50)
  - `PATCH /admin/opportunities/:id/approve` — approve → sets ACTIVE, creates GROUP conversation if needed, notifies author
  - `PATCH /admin/opportunities/:id/reject` — reject (requires reason) → sets REJECTED, notifies author
  - `POST /admin/opportunities/:id/chat` — opens a direct conversation with the opportunity author
  - `GET /admin/stats` — dashboard stats (pending, approved today, rejected today)
- **Mobile**: admin review screen at `opportunities/review.tsx` (hidden route), accessible via "Review" button in Opportunities header (visible only to admins)
- **Push notifications**: new `moderation` channel for compliance review required, opportunity approved, opportunity rejected
- To make a user admin: `UPDATE "User" SET "isAdmin" = true WHERE phone = '+...'` (no UI for this — intentionally manual)

## Smart matching (pgvector + OpenAI)
- pgvector extension on PostgreSQL (pgvector/pgvector:pg16 Docker image)
- text-embedding-3-small for profile embeddings (1536 dimensions)
- IVFFlat index for cosine similarity search
- Embeddings auto-generated on register and profile update
- Xpylon bot suggests matches in chat with anonymized profiles
- Privacy: only role + industry + bio shown before connection accepted

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

## Voice and video calls
- **WebRTC peer-to-peer** — `react-native-webrtc` for RTCPeerConnection, getUserMedia, RTCView
- **Audio routing** — `react-native-incall-manager` for speaker/earpiece toggle, proximity sensor, audio focus
- **ICE servers** — STUN: `stun:stun.l.google.com:19302` + `stun1` (free, no TURN for now)
- **Signaling** — WebSocket relay for SDP offer/answer and ICE candidates (existing WS infrastructure)
- **Call flow**:
  1. Caller sends `call_start` → server creates Call record (RINGING), broadcasts `call_incoming`
  2. Callee sends `call_accept` → server sets ONGOING, broadcasts `call_accepted`
  3. Caller creates RTCPeerConnection + offer → sends `webrtc_offer` via WS
  4. Callee receives offer → creates answer → sends `webrtc_answer`
  5. Both exchange ICE candidates via `webrtc_ice_candidate` until connected
- **Call timeout** — 30s ringing timeout → MISSED status + push notification to callee
- **Missed call detection** — on WS disconnect during RINGING, call is marked MISSED
- **Direct only** — calls allowed only in DIRECT conversations (not groups)
- **Duplicate prevention** — user cannot start a new call if they have an active RINGING/ONGOING call
- **Permissions** — camera + microphone requested before call initiation (Android explicit, iOS via getUserMedia)
- **Call UI** (`CallScreen.tsx`):
  - Voice: dark background with avatar, pulse rings during ringing, duration timer
  - Video: fullscreen remote video (RTCView) + local PIP (120x170px, top-right, mirrored)
  - Controls: mute, speaker, camera toggle, camera flip, end call
  - Incoming: accept/decline buttons
- **Architecture**: `useWebRTC.ts` hook manages RTCPeerConnection lifecycle, `useCall.ts` orchestrates signaling + WebRTC
- **Limitations v1**: no TURN (fails ~10-20% behind strict NAT), no web support, no CallKit/full-screen intent, no group calls

## Call recording & transcription
- **Consent-gated recording** — both participants must consent before recording starts
  - User taps "Record" → `recording_request` WS event → other user sees consent modal
  - Other user accepts → `recording_consent` → server verifies all consented → `recording_started`
  - Either can decline (`recording_declined`) or stop (`recording_stop`) at any time
- **Client-side recording** — `expo-av` Audio.Recording on the initiator's device only
- **Upload on call end** — initiator uploads .m4a to `POST /calls/:id/recording`
- **Transcription pipeline** (`api/src/lib/transcription.ts`):
  1. OpenAI Whisper (whisper-1) → raw text transcription
  2. GPT-4o-mini → structured summary (topics, decisions, next steps, flagged content)
  3. Summary posted as SYSTEM message in conversation (visible to both)
  4. Bot proposes follow-up reminders for each next step
  5. Flagged content → admin notification
- **Data model**: `CallRecording` (callId, initiatorId, storageObjectId, transcription, summary JSON, status)
- **Status flow**: CONSENT_PENDING → RECORDING → UPLOADING → TRANSCRIBING → SUMMARIZING → COMPLETED

## Chat summary (on-demand)
- Summarize button (document-text-outline icon) in chat header
- `POST /conversations/:id/summarize` → analyzes last 100 TEXT messages
- Same GPT pipeline as call transcription → SYSTEM message with structured summary
- Bot proposes follow-up reminders for next steps

## Reminders (`api/src/routes/reminders.ts`)
- **Model**: `Reminder` (userId, conversationId, content, scheduledAt, status PENDING/SENT/CANCELLED)
- **CRUD**: `POST /reminders`, `GET /reminders`, `DELETE /reminders/:id`
- **Cron job** (`api/src/lib/reminderCron.ts`): checks every 60s for due reminders
  - Posts bot message in conversation: "Reminder: [content]"
  - Sends push notification (channel: `reminders`)
  - Updates status to SENT
- Follow-up reminders proposed by bot after call/chat summaries

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
- Android channels: messages (MAX), connections (HIGH), calls (MAX), moderation (HIGH)
- Notification types: new message, connection request/accepted, incoming/missed call, compliance review required, opportunity approved/rejected
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
├── (auth)/phone|otp|register|profile-setup|demo-pick
└── (app)/
    ├── messages/index|[id]       ← Conversations list + chat screen + call screen
    ├── network/index|[id]|imports ← Contacts + detail + card imports queue
    ├── opportunities/index|[id]|new|review  ← Discover/Mine/Saved + detail + create form + admin review
    └── profile/index             ← User profile

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

## Demo Mode
The application supports a fully isolated demo mode for showcasing the platform without affecting real data.

### Architecture
- **`isDemo` flag** on User model — propagates to all related data via foreign key relationships
- **JWT carries `isDemo`** — embedded in access/refresh token payload, extracted by auth middleware into `req.isDemo`
- **Data isolation** — all API routes filter by `req.isDemo` to ensure demo users only see demo data and vice versa
- **SMS suppression** — demo mode skips Twilio SMS, uses fixed OTP code (`DEMO_OTP_CODE` env var, default `116261`)
- **Push notifications still work** — demo users can register FCM tokens and receive push notifications normally

### CRITICAL RULES FOR ALL FUTURE IMPLEMENTATIONS
> **Every new feature, route, or query MUST work correctly in both demo and real modes.** Specifically:
> 1. **Data isolation**: Any query that returns users, connections, conversations, opportunities, or other user-linked data MUST filter by `req.isDemo` (or the user's `isDemo` flag) to prevent cross-contamination
> 2. **No SMS/email to demo users**: Never send real SMS, email, or external messages to demo accounts. Push notifications (Expo) are OK
> 3. **Connection validation**: When creating connections, conversations, or interactions between users, verify both users have the same `isDemo` value
> 4. **Matching isolation**: Smart matching (`findSimilarUsers`) filters by `isDemo` — demo users only match with other demo users
> 5. **Test with both modes**: When modifying auth, connections, conversations, or opportunities, verify the feature works for both `isDemo: true` and `isDemo: false` users

### Demo data (`api/prisma/seed.ts`)
- 6 demo users with realistic B2B profiles (phones: `+1555000000X`)
- 6 companies across tech, distribution, finance, manufacturing, food, consulting
- 15 connections (fully connected network)
- 5 conversations with realistic business discussion messages
- 4 opportunities (partnership, distribution, investment, supply)
- 3 opportunity interests (mix of accepted/pending)
- Seed is idempotent: cleans existing demo data before re-creating

### Mobile UI
- **Login screen**: "Try Demo Mode" button below the phone input
- **Demo picker** (`(auth)/demo-pick.tsx`): Lists available demo accounts for one-tap login, or create a new demo account
- **OTP screen**: Shows demo code hint banner when in demo mode, hides "Resend" button
- **App layout**: Persistent "DEMO MODE" banner at the top when in demo mode
- **Auth store**: `isDemo` persisted in Zustand + SecureStore, cleared on logout

### API endpoints
- `GET /auth/demo-users` — public endpoint, returns demo users for the picker
- All existing auth endpoints accept `isDemo: true` in the request body

## Website (`api/web/`)
- Static HTML + Tailwind CSS (CDN) served by the same Express server
- **No build step** — plain HTML files in `api/web/`
- `WEB_URL` env var: `http://localhost:3000` (dev), `https://connect.xpylon.com` (prod)
- **Landing page** (`/`) — explains the platform, features, download CTA
- **Install page** (`/install`) — APK download for Android with step-by-step guide, TestFlight info for iOS, web note
- **Invite redirect** (`/invite/:token`) — shows sender info, tries to open app via deep link, fallback to store download
- Static assets in `api/web/assets/` (logo, APK file)
- Content sourced from `storyboard/content.md`
- APK file: build with `cd mobile && npm run build:apk`, place in `api/web/assets/xpylon-connect.apk`

## Build & Distribution
- **EAS Build profiles** (in `mobile/eas.json`):
  - `preview` — APK for Android testing (API: connect.xpylon.com)
  - `preview-local` — APK pointing to local API (set your IP in eas.json)
  - `production` — AAB for Play Store + iOS for App Store
- **Android testing**: build APK → place in `api/web/assets/xpylon-connect.apk` → users download from `/install`
- **iOS testing**: requires Apple Developer account ($99/yr) → build + upload to TestFlight → invite testers by email

## Invite system
- `POST /invites` — creates invite with token, sends SMS via Twilio with web URL link (skipped in demo mode)
- `GET /invites/:token` — public endpoint for resolving invite (used by web page)
- `POST /invites/:token/accept` — accept invite, creates ACCEPTED connection, notifies sender
- **SMS link**: `{WEB_URL}/invite/{token}` → web page tries deep link `xpylonconnect://invite/{token}` → fallback to app store
- **Auto-accept on register**: when a new user registers, `autoAcceptInvites()` finds PENDING invites for their phone and auto-accepts them
- Prevents duplicate invites and self-invites
- **Mobile**: Network tab "+" button → invite modal with phone input, contact tap → detail screen with shared opportunities/conversations

## Business card scan (`api/src/lib/cardScan.ts`)
- **Batch import**: user selects multiple business card photos → uploaded to server → queued for processing
- **Sequential AI extraction**: `cardImportQueue.ts` processes 1 card at a time (avoids OpenAI rate limits)
- **GPT-4o Vision**: extracts firstName, lastName, role, company, phone, email from card image
- **Status flow**: QUEUED → PROCESSING → EXTRACTED → (user confirms) → CONFIRMED
- **User review**: mobile screen (`network/imports.tsx`) shows real-time progress with 3s polling
- **Confirm & invite**: user edits extracted data → sends invite (same invite flow as manual)
- **Card image preserved**: stored in object storage (bucket: `business-cards`), viewable from contact detail
- **Data model**: `CardImport` (userId, storageObjectId, extractedData JSON, status, inviteId)
- **API endpoints**:
  - `POST /invites/scan` — batch upload (multipart, up to 20 images)
  - `GET /invites/imports` — list imports with status
  - `POST /invites/imports/:id/confirm` — confirm & send invite
  - `POST /invites/imports/:id/skip` — skip this card
  - `GET /invites/sent` — pending sent invites (for network display)

## External services
- Twilio Verify for OTP + Twilio SMS for invites (credentials in api/.env)
- Expo Push Notifications (replaces raw FCM — works on both iOS/Android)
- Deep link scheme: `xpylonconnect://`

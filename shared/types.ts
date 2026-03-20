// ── Enums ──

export enum ConnectionStatus {
  PENDING = "PENDING",
  ACCEPTED = "ACCEPTED",
  DECLINED = "DECLINED",
}

export enum InviteStatus {
  PENDING = "PENDING",
  ACCEPTED = "ACCEPTED",
  EXPIRED = "EXPIRED",
}

export enum ConversationType {
  DIRECT = "DIRECT",
  OPPORTUNITY_GROUP = "OPPORTUNITY_GROUP",
}

export enum ConversationTopic {
  GENERAL = "GENERAL",
  PROFILING = "PROFILING",
  OPPORTUNITY_CREATION = "OPPORTUNITY_CREATION",
  OPPORTUNITY_DISCUSSION = "OPPORTUNITY_DISCUSSION",
  SUGGESTIONS = "SUGGESTIONS",
}

export enum MessageType {
  TEXT = "TEXT",
  IMAGE = "IMAGE",
  FILE = "FILE",
  SYSTEM = "SYSTEM",
}

export enum CallType {
  VOICE = "VOICE",
  VIDEO = "VIDEO",
}

export enum CallStatus {
  RINGING = "RINGING",
  ONGOING = "ONGOING",
  ENDED = "ENDED",
  MISSED = "MISSED",
  DECLINED = "DECLINED",
}

// ── Models ──

export interface User {
  id: string;
  phone: string;
  email?: string;
  firstName: string;
  lastName: string;
  companyId?: string;
  company?: Company;
  bio?: string;
  role?: string;
  industry?: string;
  profileCompleted: boolean;
  lastSeenAt?: string;
  isOnline?: boolean;
  createdAt: string;
}

export interface Company {
  id: string;
  name: string;
}

export interface Connection {
  id: string;
  requesterId: string;
  addresseeId: string;
  status: ConnectionStatus;
  createdAt: string;
  requester?: User;
  addressee?: User;
}

export interface Invite {
  id: string;
  senderId: string;
  phoneTarget: string;
  token: string;
  status: InviteStatus;
  createdAt: string;
  sender?: User;
}

export interface Conversation {
  id: string;
  type: ConversationType;
  topic: ConversationTopic;
  name?: string;
  opportunityName?: string;
  opportunityId?: string;
  createdById: string;
  createdAt: string;
  members?: ConversationMember[];
  lastMessage?: Message;
  unreadCount?: number;
}

// Grouped conversations by contact for the messages list
export interface ContactThread {
  contactId: string;
  contact: User;
  conversations: Conversation[];
  threadCount: number;
  lastActivityAt: string;
}

export interface ConversationMember {
  conversationId: string;
  userId: string;
  joinedAt: string;
  user?: User;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content?: string;
  type: MessageType;
  replyToId?: string;
  replyTo?: Message;
  deletedAt?: string;
  createdAt: string;
  sender?: User;
  attachments?: Attachment[];
  receipts?: MessageReceipt[];
}

export interface MessageReceipt {
  id: string;
  messageId: string;
  userId: string;
  deliveredAt: string;
  readAt?: string;
  user?: User;
}

export interface Attachment {
  id: string;
  messageId: string;
  objectId: string;
  fileName: string;
  mimeType: string;
  size: number;
  createdAt: string;
  storageObject?: StorageObject;
}

export interface StorageObject {
  id: string;
  bucket: string;
  key: string;
  mimeType: string;
  size: number;
  originalName: string;
  variants?: Record<string, ImageVariant>;
  blurhash?: string;
  createdAt: string;
}

export interface ImageVariant {
  key: string;
  width: number;
  height: number;
  size: number;
}

// Backward compat alias
export type ImageVariants = Record<string, ImageVariant>;

export interface Call {
  id: string;
  conversationId: string;
  callerId: string;
  type: CallType;
  status: CallStatus;
  startedAt?: string;
  endedAt?: string;
  createdAt: string;
}

export interface FcmToken {
  id: string;
  userId: string;
  token: string;
  createdAt: string;
}

// ── API Request / Response types ──

export interface RequestOtpBody {
  phone: string;
}

export interface VerifyOtpBody {
  phone: string;
  code: string;
}

export interface VerifyOtpResponse {
  accessToken: string;
  refreshToken: string;
  isNewUser: boolean;
}

export interface RefreshTokenBody {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
}

export interface RegisterBody {
  firstName: string;
  lastName: string;
  email: string;
  companyName: string;
}

export interface ProfileUpdateBody {
  bio?: string;
  role?: string;
}

export interface ConnectionRequestBody {
  addresseeId: string;
}

export interface InviteCreateBody {
  phoneTarget: string;
}

export interface CreateDirectConversationBody {
  contactId: string;
}

export interface CreateGroupConversationBody {
  name: string;
  memberIds: string[];
}

export interface RenameConversationBody {
  name: string;
}

export interface AddMemberBody {
  userId: string;
}

export interface FcmTokenBody {
  token: string;
}

// ── WebSocket events ──

export type WsServerEvent =
  | { type: "new_message"; conversationId: string; message: Message }
  | { type: "message_delivered"; conversationId: string; messageId: string; userId: string; deliveredAt: string }
  | { type: "message_read"; conversationId: string; messageId: string; userId: string; readAt: string }
  | { type: "message_deleted"; conversationId: string; messageId: string }
  | { type: "typing"; conversationId: string; userId: string; firstName: string }
  | { type: "stop_typing"; conversationId: string; userId: string }
  | { type: "user_online"; userId: string }
  | { type: "user_offline"; userId: string; lastSeenAt: string }
  | {
      type: "connection_request";
      from: { id: string; firstName: string; lastName: string; company?: Company };
    }
  | {
      type: "connection_accepted";
      by: { id: string; firstName: string; lastName: string };
    }
  | { type: "call_incoming"; call: Call; callerName: string }
  | { type: "call_accepted"; callId: string; userId: string }
  | { type: "call_ended"; callId: string; reason: string }
  | { type: "call_declined"; callId: string; userId: string }
  | { type: "webrtc_offer"; callId: string; sdp: string; userId: string }
  | { type: "webrtc_answer"; callId: string; sdp: string; userId: string }
  | { type: "webrtc_ice_candidate"; callId: string; candidate: string; userId: string };

export type WsClientEvent =
  | { type: "send_message"; conversationId: string; content?: string; replyToId?: string; attachmentIds?: string[] }
  | { type: "read_message"; conversationId: string; messageId: string }
  | { type: "delete_message"; conversationId: string; messageId: string }
  | { type: "typing"; conversationId: string }
  | { type: "stop_typing"; conversationId: string }
  | { type: "call_start"; conversationId: string; callType: CallType }
  | { type: "call_accept"; callId: string }
  | { type: "call_decline"; callId: string }
  | { type: "call_end"; callId: string }
  | { type: "webrtc_offer"; callId: string; sdp: string }
  | { type: "webrtc_answer"; callId: string; sdp: string }
  | { type: "webrtc_ice_candidate"; callId: string; candidate: string };

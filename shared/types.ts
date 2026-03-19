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

// ── Models ──

export interface User {
  id: string;
  phone: string;
  firstName: string;
  lastName: string;
  companyId?: string;
  company?: Company;
  bio?: string;
  role?: string;
  profileCompleted: boolean;
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
  name?: string;
  opportunityName?: string;
  createdById: string;
  createdAt: string;
  members?: ConversationMember[];
  lastMessage?: Message;
  unreadCount?: number;
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
  content: string;
  createdAt: string;
  readAt?: string;
  sender?: User;
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
  | { type: "message_read"; conversationId: string; messageId: string }
  | {
      type: "connection_request";
      from: { id: string; firstName: string; lastName: string; company?: Company };
    }
  | {
      type: "connection_accepted";
      by: { id: string; firstName: string; lastName: string };
    };

export type WsClientEvent =
  | { type: "send_message"; conversationId: string; content: string }
  | { type: "read_message"; conversationId: string; messageId: string };

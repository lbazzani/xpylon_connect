import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import { verifyAccessToken } from "./lib/jwt";
import prisma from "./lib/prisma";

interface AuthenticatedSocket extends WebSocket {
  userId?: string;
}

const clients = new Map<string, AuthenticatedSocket>();

const MESSAGE_INCLUDE = {
  sender: { include: { company: true } },
  attachments: { include: { storageObject: true } },
  receipts: { include: { user: true } },
  replyTo: {
    include: {
      sender: { include: { company: true } },
      attachments: { include: { storageObject: true } },
    },
  },
};

async function broadcastToConversation(conversationId: string, event: string, excludeUserId?: string) {
  const members = await prisma.conversationMember.findMany({
    where: { conversationId },
  });
  for (const member of members) {
    if (excludeUserId && member.userId === excludeUserId) continue;
    const client = clients.get(member.userId);
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(event);
    }
  }
}

async function broadcastToContacts(userId: string, event: string) {
  const connections = await prisma.connection.findMany({
    where: {
      status: "ACCEPTED",
      OR: [{ requesterId: userId }, { addresseeId: userId }],
    },
  });
  for (const conn of connections) {
    const contactId = conn.requesterId === userId ? conn.addresseeId : conn.requesterId;
    const client = clients.get(contactId);
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(event);
    }
  }
}

export function setupWebSocket(server: http.Server) {
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", async (ws: AuthenticatedSocket, req) => {
    const url = new URL(req.url || "", `http://${req.headers.host}`);
    const token = url.searchParams.get("token");

    if (!token) {
      ws.close(1008, "Missing token");
      return;
    }

    let userId: string;
    try {
      const payload = verifyAccessToken(token);
      userId = payload.userId;
      ws.userId = userId;
      clients.set(userId, ws);
    } catch {
      ws.close(1008, "Invalid token");
      return;
    }

    // Set user online
    await prisma.user.update({
      where: { id: userId },
      data: { isOnline: true, lastSeenAt: new Date() },
    });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user) {
      await broadcastToContacts(userId, JSON.stringify({
        type: "user_online",
        userId,
      }));
    }

    ws.on("message", async (raw) => {
      try {
        const data = JSON.parse(raw.toString());

        // ── Send message ──
        if (data.type === "send_message") {
          const messageData: any = {
            conversationId: data.conversationId,
            senderId: ws.userId!,
            content: data.content || null,
            type: data.attachmentIds?.length ? "IMAGE" : "TEXT",
          };

          if (data.replyToId) {
            messageData.replyToId = data.replyToId;
          }

          if (data.attachmentIds?.length) {
            // Fetch storage objects to populate attachment metadata
            const storageObjects = await prisma.storageObject.findMany({
              where: { id: { in: data.attachmentIds } },
            });
            messageData.attachments = {
              create: storageObjects.map((obj: any) => ({
                objectId: obj.id,
                fileName: obj.originalName,
                mimeType: obj.mimeType,
                size: obj.size,
              })),
            };
          }

          const message = await prisma.message.create({
            data: messageData,
            include: MESSAGE_INCLUDE,
          });

          // Create delivery receipts for online members
          const members = await prisma.conversationMember.findMany({
            where: { conversationId: data.conversationId },
          });

          for (const member of members) {
            if (member.userId === ws.userId) continue;
            const client = clients.get(member.userId);
            if (client && client.readyState === WebSocket.OPEN) {
              await prisma.messageReceipt.create({
                data: { messageId: message.id, userId: member.userId },
              });
            }
          }

          // Re-fetch with receipts
          const fullMessage = await prisma.message.findUnique({
            where: { id: message.id },
            include: MESSAGE_INCLUDE,
          });

          await broadcastToConversation(
            data.conversationId,
            JSON.stringify({ type: "new_message", conversationId: data.conversationId, message: fullMessage })
          );
        }

        // ── Read message ──
        if (data.type === "read_message") {
          const receipt = await prisma.messageReceipt.upsert({
            where: { messageId_userId: { messageId: data.messageId, userId: ws.userId! } },
            create: { messageId: data.messageId, userId: ws.userId!, readAt: new Date() },
            update: { readAt: new Date() },
          });

          const message = await prisma.message.findUnique({ where: { id: data.messageId } });
          if (message) {
            const senderClient = clients.get(message.senderId);
            if (senderClient && senderClient.readyState === WebSocket.OPEN) {
              senderClient.send(JSON.stringify({
                type: "message_read",
                conversationId: data.conversationId,
                messageId: data.messageId,
                userId: ws.userId!,
                readAt: receipt.readAt!.toISOString(),
              }));
            }
          }
        }

        // ── Delete message ──
        if (data.type === "delete_message") {
          const message = await prisma.message.findUnique({ where: { id: data.messageId } });
          if (!message || message.senderId !== ws.userId) return;

          await prisma.message.update({
            where: { id: data.messageId },
            data: { deletedAt: new Date() },
          });

          await broadcastToConversation(
            data.conversationId,
            JSON.stringify({ type: "message_deleted", conversationId: data.conversationId, messageId: data.messageId })
          );
        }

        // ── Typing ──
        if (data.type === "typing") {
          const typingUser = await prisma.user.findUnique({ where: { id: ws.userId! } });
          if (typingUser) {
            await broadcastToConversation(
              data.conversationId,
              JSON.stringify({
                type: "typing",
                conversationId: data.conversationId,
                userId: ws.userId!,
                firstName: typingUser.firstName,
              }),
              ws.userId!
            );
          }
        }

        if (data.type === "stop_typing") {
          await broadcastToConversation(
            data.conversationId,
            JSON.stringify({
              type: "stop_typing",
              conversationId: data.conversationId,
              userId: ws.userId!,
            }),
            ws.userId!
          );
        }

        // ── Call start ──
        if (data.type === "call_start") {
          const callerUser = await prisma.user.findUnique({ where: { id: ws.userId! } });
          if (!callerUser) return;

          const call = await prisma.call.create({
            data: {
              conversationId: data.conversationId,
              callerId: ws.userId!,
              type: data.callType,
            },
          });

          // Notify other members
          const members = await prisma.conversationMember.findMany({
            where: { conversationId: data.conversationId },
          });

          for (const member of members) {
            if (member.userId === ws.userId) continue;
            const client = clients.get(member.userId);
            if (client && client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                type: "call_incoming",
                call,
                callerName: `${callerUser.firstName} ${callerUser.lastName}`,
              }));
            }
          }

          // Confirm call creation to caller
          ws.send(JSON.stringify({
            type: "call_incoming",
            call,
            callerName: `${callerUser.firstName} ${callerUser.lastName}`,
          }));
        }

        // ── Call accept ──
        if (data.type === "call_accept") {
          await prisma.call.update({
            where: { id: data.callId },
            data: { status: "ONGOING", startedAt: new Date() },
          });

          const call = await prisma.call.findUnique({ where: { id: data.callId } });
          if (!call) return;

          await broadcastToConversation(
            call.conversationId,
            JSON.stringify({ type: "call_accepted", callId: data.callId, userId: ws.userId! })
          );
        }

        // ── Call decline ──
        if (data.type === "call_decline") {
          const call = await prisma.call.findUnique({ where: { id: data.callId } });
          if (!call) return;

          await prisma.call.update({
            where: { id: data.callId },
            data: { status: "DECLINED", endedAt: new Date() },
          });

          await broadcastToConversation(
            call.conversationId,
            JSON.stringify({ type: "call_declined", callId: data.callId, userId: ws.userId! })
          );
        }

        // ── Call end ──
        if (data.type === "call_end") {
          const call = await prisma.call.findUnique({ where: { id: data.callId } });
          if (!call) return;

          await prisma.call.update({
            where: { id: data.callId },
            data: { status: "ENDED", endedAt: new Date() },
          });

          await broadcastToConversation(
            call.conversationId,
            JSON.stringify({ type: "call_ended", callId: data.callId, reason: "ended" })
          );
        }

        // ── WebRTC signaling ──
        if (data.type === "webrtc_offer" || data.type === "webrtc_answer" || data.type === "webrtc_ice_candidate") {
          const call = await prisma.call.findUnique({ where: { id: data.callId } });
          if (!call) return;

          const members = await prisma.conversationMember.findMany({
            where: { conversationId: call.conversationId },
          });

          const event = JSON.stringify({
            type: data.type,
            callId: data.callId,
            ...(data.sdp ? { sdp: data.sdp } : {}),
            ...(data.candidate ? { candidate: data.candidate } : {}),
            userId: ws.userId!,
          });

          for (const member of members) {
            if (member.userId === ws.userId) continue;
            const client = clients.get(member.userId);
            if (client && client.readyState === WebSocket.OPEN) {
              client.send(event);
            }
          }
        }
      } catch (err) {
        console.error("WebSocket message error:", err);
      }
    });

    ws.on("close", async () => {
      if (ws.userId) {
        clients.delete(ws.userId);
        const now = new Date();
        await prisma.user.update({
          where: { id: ws.userId },
          data: { isOnline: false, lastSeenAt: now },
        });
        await broadcastToContacts(ws.userId, JSON.stringify({
          type: "user_offline",
          userId: ws.userId,
          lastSeenAt: now.toISOString(),
        }));
      }
    });
  });
}

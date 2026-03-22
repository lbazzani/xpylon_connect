import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import { verifyAccessToken } from "./lib/jwt";
import prisma from "./lib/prisma";
import { notifyNewMessage, notifyIncomingCall, notifyMissedCall } from "./lib/notifications";
import { isBotConversation, generateBotReply, getBotUserId } from "./lib/bot";

interface AuthenticatedSocket extends WebSocket {
  userId?: string;
}

const clients = new Map<string, AuthenticatedSocket>();
const callTimeouts = new Map<string, NodeJS.Timeout>();
const recordingConsents = new Map<string, Set<string>>(); // callId -> Set of userId who consented
const CALL_RING_TIMEOUT = 30000; // 30 seconds

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

async function verifyMembership(conversationId: string, userId: string): Promise<boolean> {
  const member = await prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId } }
  });
  return !!member;
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
          if (!(await verifyMembership(data.conversationId, ws.userId!))) return;

          // Determine message type
          let msgType = "TEXT";

          const messageData: any = {
            conversationId: data.conversationId,
            senderId: ws.userId!,
            content: data.content || null,
            type: msgType,
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
            const firstObj = storageObjects[0];
            messageData.type = firstObj?.mimeType.startsWith("image/") ? "IMAGE" : "FILE";
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

          // Send push notification to offline members
          const conv = await prisma.conversation.findUnique({ where: { id: data.conversationId } });
          const senderUser = await prisma.user.findUnique({ where: { id: ws.userId! }, include: { company: true } });
          if (conv && senderUser) {
            notifyNewMessage(
              data.conversationId,
              ws.userId!,
              `${senderUser.firstName} ${senderUser.lastName}`,
              data.content || null,
              conv.type,
              conv.name || undefined
            ).catch(console.error);
          }

          // ── Bot auto-reply ──
          const isBot = await isBotConversation(data.conversationId);
          if (isBot && data.content) {
            // Reply asynchronously so we don't block the user
            (async () => {
              try {
                const botId = await getBotUserId();
                if (ws.userId === botId) return; // Don't reply to self

                const reply = await generateBotReply(data.conversationId, ws.userId!, data.content);

                const botMessage = await prisma.message.create({
                  data: {
                    conversationId: data.conversationId,
                    senderId: botId,
                    content: reply,
                    type: "TEXT",
                  },
                  include: MESSAGE_INCLUDE,
                });

                await broadcastToConversation(
                  data.conversationId,
                  JSON.stringify({ type: "new_message", conversationId: data.conversationId, message: botMessage })
                );
              } catch (err) {
                console.error("Bot reply error:", err);
              }
            })();
          }
        }

        // ── Read message ──
        if (data.type === "read_message") {
          const msgToRead = await prisma.message.findUnique({ where: { id: data.messageId } });
          if (!msgToRead || !(await verifyMembership(msgToRead.conversationId, ws.userId!))) return;

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
          if (!(await verifyMembership(data.conversationId, ws.userId!))) return;
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
          if (!(await verifyMembership(data.conversationId, ws.userId!))) return;
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
          if (!(await verifyMembership(data.conversationId, ws.userId!))) return;

          // Only allow calls in DIRECT conversations
          const conv = await prisma.conversation.findUnique({ where: { id: data.conversationId } });
          if (!conv || conv.type !== "DIRECT") {
            ws.send(JSON.stringify({ type: "error", message: "Calls are only available in direct conversations" }));
            return;
          }

          // Prevent duplicate calls — check if user already has an active call
          const existingCall = await prisma.call.findFirst({
            where: {
              status: { in: ["RINGING", "ONGOING"] },
              conversation: { members: { some: { userId: ws.userId! } } },
            },
          });
          if (existingCall) {
            ws.send(JSON.stringify({ type: "error", message: "You already have an active call" }));
            return;
          }

          const callerUser = await prisma.user.findUnique({ where: { id: ws.userId! } });
          if (!callerUser) return;

          const call = await prisma.call.create({
            data: {
              conversationId: data.conversationId,
              callerId: ws.userId!,
              type: data.callType,
            },
          });

          const callerName = `${callerUser.firstName} ${callerUser.lastName}`;

          // Notify other members
          const members = await prisma.conversationMember.findMany({
            where: { conversationId: data.conversationId },
          });

          for (const member of members) {
            if (member.userId === ws.userId) continue;
            const client = clients.get(member.userId);
            if (client && client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({ type: "call_incoming", call, callerName }));
            }
          }

          // Confirm call creation to caller
          ws.send(JSON.stringify({ type: "call_incoming", call, callerName }));

          // Send push notification for incoming call
          notifyIncomingCall(data.conversationId, ws.userId!, callerName, data.callType).catch(console.error);

          // Set 30s ringing timeout
          const timeoutId = setTimeout(async () => {
            callTimeouts.delete(call.id);
            try {
              const currentCall = await prisma.call.findUnique({ where: { id: call.id } });
              if (currentCall && currentCall.status === "RINGING") {
                await prisma.call.update({
                  where: { id: call.id },
                  data: { status: "MISSED", endedAt: new Date() },
                });

                await broadcastToConversation(
                  call.conversationId,
                  JSON.stringify({ type: "call_ended", callId: call.id, reason: "timeout" })
                );

                // Send missed call notifications
                for (const member of members) {
                  if (member.userId === call.callerId) continue;
                  notifyMissedCall(member.userId, callerName, data.callType).catch(console.error);
                }
              }
            } catch (err) {
              console.error("Call timeout error:", err);
            }
          }, CALL_RING_TIMEOUT);

          callTimeouts.set(call.id, timeoutId);
        }

        // ── Call accept ──
        if (data.type === "call_accept") {
          const call = await prisma.call.findUnique({ where: { id: data.callId } });
          if (!call) return;
          if (!(await verifyMembership(call.conversationId, ws.userId!))) return;

          // Clear ringing timeout
          const acceptTimeout = callTimeouts.get(data.callId);
          if (acceptTimeout) { clearTimeout(acceptTimeout); callTimeouts.delete(data.callId); }

          await prisma.call.update({
            where: { id: data.callId },
            data: { status: "ONGOING", startedAt: new Date() },
          });

          await broadcastToConversation(
            call.conversationId,
            JSON.stringify({ type: "call_accepted", callId: data.callId, userId: ws.userId! })
          );
        }

        // ── Call decline ──
        if (data.type === "call_decline") {
          const call = await prisma.call.findUnique({ where: { id: data.callId } });
          if (!call) return;
          if (!(await verifyMembership(call.conversationId, ws.userId!))) return;

          // Clear ringing timeout
          const declineTimeout = callTimeouts.get(data.callId);
          if (declineTimeout) { clearTimeout(declineTimeout); callTimeouts.delete(data.callId); }

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
          if (!(await verifyMembership(call.conversationId, ws.userId!))) return;

          // Clear ringing timeout
          const endTimeout = callTimeouts.get(data.callId);
          if (endTimeout) { clearTimeout(endTimeout); callTimeouts.delete(data.callId); }

          await prisma.call.update({
            where: { id: data.callId },
            data: { status: "ENDED", endedAt: new Date() },
          });

          await broadcastToConversation(
            call.conversationId,
            JSON.stringify({ type: "call_ended", callId: data.callId, reason: "ended" })
          );
        }

        // ── Recording consent flow ──
        if (data.type === "recording_request") {
          const call = await prisma.call.findUnique({ where: { id: data.callId } });
          if (!call || call.status !== "ONGOING") return;
          if (!(await verifyMembership(call.conversationId, ws.userId!))) return;

          // Create CallRecording record
          await prisma.callRecording.create({
            data: {
              callId: data.callId,
              conversationId: call.conversationId,
              initiatorId: ws.userId!,
              status: "CONSENT_PENDING",
            },
          }).catch(() => {}); // Ignore if already exists

          // Initiator auto-consents
          const consents = new Set<string>([ws.userId!]);
          recordingConsents.set(data.callId, consents);

          const reqUser = await prisma.user.findUnique({ where: { id: ws.userId! } });
          const userName = reqUser ? `${reqUser.firstName} ${reqUser.lastName}` : "Someone";

          // Send request to other members
          await broadcastToConversation(
            call.conversationId,
            JSON.stringify({ type: "recording_request", callId: data.callId, userId: ws.userId!, userName }),
            ws.userId!
          );
        }

        if (data.type === "recording_consent") {
          const consents = recordingConsents.get(data.callId);
          if (!consents) return;
          const call = await prisma.call.findUnique({ where: { id: data.callId } });
          if (!call) return;

          consents.add(ws.userId!);

          // Check if all conversation members have consented
          const members = await prisma.conversationMember.findMany({
            where: { conversationId: call.conversationId },
          });
          const allConsented = members.every((m) => consents.has(m.userId));

          if (allConsented) {
            await prisma.callRecording.updateMany({
              where: { callId: data.callId },
              data: { status: "RECORDING" },
            });
            recordingConsents.delete(data.callId);

            await broadcastToConversation(
              call.conversationId,
              JSON.stringify({ type: "recording_started", callId: data.callId })
            );
          } else {
            // Notify that this user consented (so requester knows)
            await broadcastToConversation(
              call.conversationId,
              JSON.stringify({ type: "recording_consent", callId: data.callId, userId: ws.userId! }),
              ws.userId!
            );
          }
        }

        if (data.type === "recording_declined") {
          const call = await prisma.call.findUnique({ where: { id: data.callId } });
          if (!call) return;
          recordingConsents.delete(data.callId);

          await prisma.callRecording.updateMany({
            where: { callId: data.callId },
            data: { status: "CONSENT_DECLINED" },
          });

          await broadcastToConversation(
            call.conversationId,
            JSON.stringify({ type: "recording_declined", callId: data.callId, userId: ws.userId! })
          );
        }

        if (data.type === "recording_stop") {
          const call = await prisma.call.findUnique({ where: { id: data.callId } });
          if (!call) return;

          await prisma.callRecording.updateMany({
            where: { callId: data.callId, status: "RECORDING" },
            data: { status: "UPLOADING" },
          });

          await broadcastToConversation(
            call.conversationId,
            JSON.stringify({ type: "recording_stopped", callId: data.callId })
          );
        }

        // ── WebRTC signaling ──
        if (data.type === "webrtc_offer" || data.type === "webrtc_answer" || data.type === "webrtc_ice_candidate") {
          const call = await prisma.call.findUnique({ where: { id: data.callId } });
          if (!call) return;
          if (!(await verifyMembership(call.conversationId, ws.userId!))) return;

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
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "error", message: "Operation failed" }));
        }
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

        // Handle active calls on disconnect
        try {
          // Find any RINGING or ONGOING calls involving this user
          const activeCalls = await prisma.call.findMany({
            where: {
              status: { in: ["RINGING", "ONGOING"] },
              conversation: { members: { some: { userId: ws.userId } } },
            },
            include: { conversation: { include: { members: true } } },
          });

          for (const call of activeCalls) {
            const newStatus = call.status === "RINGING" ? "MISSED" : "ENDED";
            await prisma.call.update({
              where: { id: call.id },
              data: { status: newStatus, endedAt: now },
            });

            // Clear timeout if exists
            const timeout = callTimeouts.get(call.id);
            if (timeout) { clearTimeout(timeout); callTimeouts.delete(call.id); }

            await broadcastToConversation(
              call.conversationId,
              JSON.stringify({ type: "call_ended", callId: call.id, reason: "disconnected" })
            );

            // Send missed call notification if it was ringing
            if (newStatus === "MISSED") {
              const caller = await prisma.user.findUnique({ where: { id: call.callerId } });
              if (caller) {
                for (const member of call.conversation.members) {
                  if (member.userId === call.callerId) continue;
                  notifyMissedCall(
                    member.userId,
                    `${caller.firstName} ${caller.lastName}`,
                    call.type
                  ).catch(console.error);
                }
              }
            }
          }
        } catch (err) {
          console.error("Call cleanup on disconnect error:", err);
        }
      }
    });
  });
}

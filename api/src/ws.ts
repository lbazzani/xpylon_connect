import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import { verifyAccessToken } from "./lib/jwt";
import prisma from "./lib/prisma";

interface AuthenticatedSocket extends WebSocket {
  userId?: string;
}

const clients = new Map<string, AuthenticatedSocket>();

export function setupWebSocket(server: http.Server) {
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws: AuthenticatedSocket, req) => {
    const url = new URL(req.url || "", `http://${req.headers.host}`);
    const token = url.searchParams.get("token");

    if (!token) {
      ws.close(1008, "Missing token");
      return;
    }

    try {
      const { userId } = verifyAccessToken(token);
      ws.userId = userId;
      clients.set(userId, ws);
    } catch {
      ws.close(1008, "Invalid token");
      return;
    }

    ws.on("message", async (raw) => {
      try {
        const data = JSON.parse(raw.toString());

        if (data.type === "send_message") {
          const message = await prisma.message.create({
            data: {
              conversationId: data.conversationId,
              senderId: ws.userId!,
              content: data.content,
            },
            include: { sender: { include: { company: true } } },
          });

          // Broadcast to all conversation members
          const members = await prisma.conversationMember.findMany({
            where: { conversationId: data.conversationId },
          });

          const event = JSON.stringify({
            type: "new_message",
            conversationId: data.conversationId,
            message,
          });

          for (const member of members) {
            const client = clients.get(member.userId);
            if (client && client.readyState === WebSocket.OPEN) {
              client.send(event);
            }
          }
        }

        if (data.type === "read_message") {
          await prisma.message.update({
            where: { id: data.messageId },
            data: { readAt: new Date() },
          });

          // Notify the sender
          const message = await prisma.message.findUnique({ where: { id: data.messageId } });
          if (message) {
            const senderClient = clients.get(message.senderId);
            if (senderClient && senderClient.readyState === WebSocket.OPEN) {
              senderClient.send(JSON.stringify({
                type: "message_read",
                conversationId: data.conversationId,
                messageId: data.messageId,
              }));
            }
          }
        }
      } catch (err) {
        console.error("WebSocket message error:", err);
      }
    });

    ws.on("close", () => {
      if (ws.userId) clients.delete(ws.userId);
    });
  });
}

import "dotenv/config";
import express from "express";
import http from "http";
import path from "path";
import cors from "cors";
import helmet from "helmet";
import { authRouter } from "./routes/auth";
import { usersRouter } from "./routes/users";
import { connectionsRouter } from "./routes/connections";
import { invitesRouter } from "./routes/invites";
import { conversationsRouter } from "./routes/conversations";
import { storageRouter } from "./routes/storage";
import { suggestionsRouter } from "./routes/suggestions";
import { opportunitiesRouter } from "./routes/opportunities";
import { adminRouter } from "./routes/admin";
import { callsRouter } from "./routes/calls";
import { remindersRouter } from "./routes/reminders";
import { setupWebSocket } from "./ws";
import { startReminderCron } from "./lib/reminderCron";

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(helmet({
  contentSecurityPolicy: false, // Allow Tailwind CDN + Google Fonts on web pages
}));
app.use(express.json());

// API routes
app.use("/auth", authRouter);
app.use("/users", usersRouter);
app.use("/connections", connectionsRouter);
app.use("/invites", invitesRouter);
app.use("/conversations", conversationsRouter);
app.use("/storage", storageRouter);
app.use("/suggestions", suggestionsRouter);
app.use("/opportunities", opportunitiesRouter);
app.use("/admin", adminRouter);
app.use("/calls", callsRouter);
app.use("/reminders", remindersRouter);
app.use("/files", express.static("uploads"));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Web pages — static files + invite redirect
const webDir = path.join(__dirname, "../web");

// Serve static assets (logo, css, etc.)
app.use("/assets", express.static(path.join(webDir, "assets")));

// Invite redirect page — serves the invite.html for any /invite/:token URL
app.get("/invite/:token", (_req, res) => {
  res.sendFile(path.join(webDir, "invite.html"));
});

// Install/download page
app.get("/install", (_req, res) => {
  res.sendFile(path.join(webDir, "install.html"));
});

// Privacy policy
app.get("/privacy", (_req, res) => {
  res.sendFile(path.join(webDir, "privacy.html"));
});

// Landing page — serve index.html for root
app.get("/", (_req, res) => {
  res.sendFile(path.join(webDir, "index.html"));
});

setupWebSocket(server);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Web: ${process.env.WEB_URL || `http://localhost:${PORT}`}`);
  startReminderCron();
});

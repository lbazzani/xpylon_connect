import "dotenv/config";
import express from "express";
import http from "http";
import cors from "cors";
import helmet from "helmet";
import { authRouter } from "./routes/auth";
import { usersRouter } from "./routes/users";
import { connectionsRouter } from "./routes/connections";
import { invitesRouter } from "./routes/invites";
import { conversationsRouter } from "./routes/conversations";
import { storageRouter } from "./routes/storage";
import { suggestionsRouter } from "./routes/suggestions";
import { setupWebSocket } from "./ws";

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(helmet());
app.use(express.json());

app.use("/auth", authRouter);
app.use("/users", usersRouter);
app.use("/connections", connectionsRouter);
app.use("/invites", invitesRouter);
app.use("/conversations", conversationsRouter);
app.use("/storage", storageRouter);
app.use("/suggestions", suggestionsRouter);
app.use("/files", express.static("uploads"));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

setupWebSocket(server);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

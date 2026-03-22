import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import prisma from "../lib/prisma";
import { authMiddleware } from "../middleware/auth";
import { transcribeAudio, summarizeText, postSummaryToConversation } from "../lib/transcription";

const router = Router();
router.use(authMiddleware);

// Configure multer for audio upload
const storagePath = process.env.STORAGE_PATH || "./storage";
const recordingsDir = path.join(storagePath, "recordings");
if (!fs.existsSync(recordingsDir)) {
  fs.mkdirSync(recordingsDir, { recursive: true });
}

const upload = multer({
  dest: recordingsDir,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB max
  fileFilter: (_req, file, cb) => {
    const allowed = [".m4a", ".mp3", ".wav", ".ogg", ".webm", ".mp4"];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  },
});

// POST /calls/:id/recording — Upload audio recording
router.post("/:id/recording", upload.single("audio"), async (req, res) => {
  try {
    const callId = req.params.id as string;
    const recording = await prisma.callRecording.findUnique({ where: { callId } });

    if (!recording) {
      res.status(404).json({ error: "No recording found for this call" });
      return;
    }
    if (recording.initiatorId !== req.userId) {
      res.status(403).json({ error: "Only the recording initiator can upload" });
      return;
    }
    if (!req.file) {
      res.status(400).json({ error: "Audio file is required" });
      return;
    }

    // Create storage object for the audio file
    const storageObject = await prisma.storageObject.create({
      data: {
        bucket: "recordings",
        key: `recordings/${req.file.filename}`,
        mimeType: req.file.mimetype,
        size: req.file.size,
        originalName: req.file.originalname,
        uploadedById: req.userId!,
      },
    });

    await prisma.callRecording.update({
      where: { callId },
      data: { storageObjectId: storageObject.id, status: "TRANSCRIBING" },
    });

    res.json({ success: true, recordingId: recording.id });

    // Trigger transcription pipeline asynchronously
    processTranscription(callId, req.file.path).catch((err) => {
      console.error("Transcription pipeline error:", err);
      prisma.callRecording.update({
        where: { callId },
        data: { status: "FAILED" },
      }).catch(console.error);
    });
  } catch (err) {
    console.error("Recording upload error:", err);
    res.status(500).json({ error: "Failed to upload recording" });
  }
});

// Internal: process transcription + summary pipeline
async function processTranscription(callId: string, filePath: string): Promise<void> {
  const recording = await prisma.callRecording.findUnique({
    where: { callId },
    include: { call: true },
  });
  if (!recording) return;

  // Step 1: Transcribe with Whisper
  const transcription = await transcribeAudio(filePath);

  await prisma.callRecording.update({
    where: { callId },
    data: { transcription, status: "SUMMARIZING" },
  });

  // Step 2: Summarize with GPT
  const summary = await summarizeText(transcription, "call");

  // Calculate call duration for the summary header
  const call = recording.call;
  let durationStr = "call";
  if (call.startedAt && call.endedAt) {
    const durationMs = new Date(call.endedAt).getTime() - new Date(call.startedAt).getTime();
    const mins = Math.round(durationMs / 60000);
    durationStr = `${mins} min call`;
  }

  await prisma.callRecording.update({
    where: { callId },
    data: { summary: summary as any, status: "COMPLETED", completedAt: new Date() },
  });

  // Step 3: Post summary to conversation
  await postSummaryToConversation(recording.conversationId, summary, "call", durationStr);

  // Clean up the temporary audio file
  try {
    fs.unlinkSync(filePath);
  } catch {}
}

export { router as callsRouter };

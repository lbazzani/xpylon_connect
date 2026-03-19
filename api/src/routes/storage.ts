import { Router, Request, Response } from "express";
import multer from "multer";
import { authMiddleware } from "../middleware/auth";
import { uploadFile, getFileInfo } from "../lib/storage";
import prisma from "../lib/prisma";

const router = Router();

// Use disk storage for large files to avoid RAM pressure
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB max
  fileFilter: (_req, file, cb) => {
    // Block executable files
    const blocked = [".exe", ".bat", ".sh", ".cmd", ".msi"];
    const ext = file.originalname.toLowerCase().split(".").pop();
    if (ext && blocked.includes(`.${ext}`)) {
      cb(new Error("File type not allowed"));
      return;
    }
    cb(null, true);
  },
});

function paramStr(val: string | string[] | undefined): string {
  if (Array.isArray(val)) return val.join("/");
  return val || "";
}

// POST /storage/upload — upload file(s), returns storage object IDs
router.post("/upload", authMiddleware, upload.array("files", 10), async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files?.length) {
      res.status(400).json({ error: "No files provided" });
      return;
    }

    const results = await Promise.all(
      files.map((file) =>
        uploadFile(file.buffer, file.originalname, file.mimetype, req.userId!)
      )
    );

    res.status(201).json({ files: results });
  } catch (err) {
    res.status(500).json({ error: "Upload failed" });
  }
});

// GET /storage/:bucket/* — serve file (supports nested key paths like 2026/03/19/hash.webp)
router.get("/:bucket/*", authMiddleware, async (req: Request, res: Response) => {
  try {
    const bucket = paramStr(req.params.bucket);
    const rawKey = req.params[0];
    const key = Array.isArray(rawKey) ? rawKey.join("/") : (rawKey || "");

    if (!key) {
      res.status(400).json({ error: "Key is required" });
      return;
    }

    const variant = typeof req.query.variant === "string" ? req.query.variant : undefined;

    let fileKey = key;
    if (variant && ["thumbnail", "medium", "large"].includes(variant)) {
      const obj = await prisma.storageObject.findUnique({ where: { key } });
      if (obj?.variants && typeof obj.variants === "object") {
        const variants = obj.variants as Record<string, { key: string } | string>;
        const v = variants[variant];
        const variantKey = typeof v === "string" ? v : v?.key;
        if (variantKey) fileKey = variantKey;
      }
    }

    const fileInfo = await getFileInfo(bucket, fileKey);

    // Cache immutable files for 1 year (keys contain random hashes)
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.setHeader("Content-Type", fileInfo.mimeType);
    res.sendFile(fileInfo.path);
  } catch {
    res.status(404).json({ error: "File not found" });
  }
});

export { router as storageRouter };

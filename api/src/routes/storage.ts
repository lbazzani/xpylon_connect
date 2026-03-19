import { Router, Request, Response } from "express";
import multer from "multer";
import { authMiddleware } from "../middleware/auth";
import { uploadFile, getFilePath } from "../lib/storage";
import prisma from "../lib/prisma";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB max
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

// GET /storage/:bucket/:key — serve file
router.get("/:bucket/:key", async (req: Request, res: Response) => {
  try {
    const bucket = paramStr(req.params.bucket);
    const key = paramStr(req.params.key);
    const variant = typeof req.query.variant === "string" ? req.query.variant : undefined;

    let fileKey = key;
    if (variant && ["thumbnail", "medium", "large"].includes(variant)) {
      const obj = await prisma.storageObject.findUnique({ where: { key } });
      if (obj?.variants && typeof obj.variants === "object") {
        const variants = obj.variants as Record<string, string>;
        if (variants[variant]) {
          fileKey = variants[variant];
        }
      }
    }

    const filePath = await getFilePath(bucket, fileKey);
    res.sendFile(filePath);
  } catch {
    res.status(404).json({ error: "File not found" });
  }
});

export { router as storageRouter };

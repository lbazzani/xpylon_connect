import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import sharp from "sharp";
import prisma from "./prisma";

// ─── Configuration ──────────────────────────────────────────────

export const STORAGE_ROOT = path.resolve(
  process.env.STORAGE_PATH || path.join(__dirname, "../../storage")
);

const IMAGE_QUALITY = {
  webp: { photo: 82, graphic: 75 },   // photos vs graphics (PNG with few colors)
  avif: { photo: 65, graphic: 55 },   // AVIF if supported in future
};

const IMAGE_VARIANTS_CONFIG = {
  thumbnail: { width: 150, height: 150, fit: "cover" as const, quality: 70 },
  medium: { width: 800, height: 800, fit: "inside" as const, quality: 80 },
  large: { width: 1600, height: 1600, fit: "inside" as const, quality: 85 },
};

const CONVERTIBLE_MIMES = new Set([
  "image/jpeg", "image/png", "image/heic", "image/heif",
  "image/tiff", "image/bmp", "image/webp",
]);

const PASSTHROUGH_MIMES = new Set(["image/gif", "image/svg+xml"]);

const MIME_MAP: Record<string, string> = {
  ".webp": "image/webp", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".png": "image/png", ".gif": "image/gif", ".svg": "image/svg+xml",
  ".pdf": "application/pdf", ".mp4": "video/mp4", ".mp3": "audio/mpeg",
  ".doc": "application/msword", ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel", ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".zip": "application/zip", ".csv": "text/csv", ".txt": "text/plain",
};

// ─── Object Storage Layer ───────────────────────────────────────

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

function generateKey(ext: string): string {
  const hash = crypto.randomBytes(16).toString("hex");
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "/");
  return `${date}/${hash}${ext}`;
}

function resolvePath(bucket: string, key: string): string {
  const filePath = path.resolve(STORAGE_ROOT, bucket, key);
  if (!filePath.startsWith(STORAGE_ROOT)) {
    throw new Error("Invalid path — traversal detected");
  }
  return filePath;
}

async function writeObject(bucket: string, key: string, data: Buffer): Promise<void> {
  const filePath = resolvePath(bucket, key);
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, data);
}

async function readObjectPath(bucket: string, key: string): Promise<string> {
  const filePath = resolvePath(bucket, key);
  await fs.access(filePath);
  return filePath;
}

async function deleteObject(bucket: string, key: string): Promise<void> {
  try {
    const filePath = resolvePath(bucket, key);
    await fs.unlink(filePath);
  } catch {
    // file already gone — ok
  }
}

export function getMimeType(key: string): string {
  const ext = path.extname(key).toLowerCase();
  return MIME_MAP[ext] || "application/octet-stream";
}

// ─── Image Processing Layer ─────────────────────────────────────

interface ImageMeta {
  width: number;
  height: number;
  format: string;
  hasAlpha: boolean;
  isAnimated: boolean;
  size: number;
}

async function analyzeImage(buffer: Buffer): Promise<ImageMeta> {
  const meta = await sharp(buffer).metadata();
  return {
    width: meta.width || 0,
    height: meta.height || 0,
    format: meta.format || "unknown",
    hasAlpha: meta.hasAlpha || false,
    isAnimated: (meta.pages || 1) > 1,
    size: buffer.length,
  };
}

function shouldConvert(mimeType: string, meta: ImageMeta): boolean {
  if (PASSTHROUGH_MIMES.has(mimeType)) return false;
  if (meta.isAnimated) return false; // don't flatten animated GIFs/WebPs
  return CONVERTIBLE_MIMES.has(mimeType);
}

async function optimizeOriginal(buffer: Buffer, meta: ImageMeta): Promise<Buffer> {
  const quality = meta.hasAlpha ? IMAGE_QUALITY.webp.graphic : IMAGE_QUALITY.webp.photo;

  return sharp(buffer)
    .rotate()             // auto-rotate based on EXIF
    .withMetadata({ orientation: undefined }) // strip EXIF but keep color profile
    .webp({ quality, effort: 4 })
    .toBuffer();
}

interface VariantInfo {
  key: string;
  width: number;
  height: number;
  size: number;
}

async function generateVariant(
  buffer: Buffer,
  bucket: string,
  baseName: string,
  variantName: string,
  config: { width: number; height: number; fit: "cover" | "inside"; quality: number },
  toWebp: boolean
): Promise<VariantInfo> {
  const ext = toWebp ? ".webp" : path.extname(baseName);
  const variantKey = baseName.replace(/(\.[^.]+)$/, `_${variantName}${ext}`);

  let pipeline = sharp(buffer)
    .rotate() // EXIF auto-rotate
    .resize(config.width, config.height, {
      fit: config.fit,
      withoutEnlargement: true,
    });

  if (toWebp) {
    pipeline = pipeline.webp({ quality: config.quality, effort: 4 });
  }

  const outputPath = resolvePath(bucket, variantKey);
  await ensureDir(path.dirname(outputPath));
  const result = await pipeline.toFile(outputPath);

  return {
    key: variantKey,
    width: result.width,
    height: result.height,
    size: result.size,
  };
}

async function generateBlurHash(buffer: Buffer): Promise<string> {
  // Generate a tiny 16x16 base64 placeholder for instant loading
  const tiny = await sharp(buffer)
    .resize(16, 16, { fit: "inside" })
    .webp({ quality: 20 })
    .toBuffer();
  return `data:image/webp;base64,${tiny.toString("base64")}`;
}

// ─── Public API ─────────────────────────────────────────────────

export interface UploadResult {
  id: string;
  key: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  blurhash?: string;
  variants?: Record<string, VariantInfo>;
}

export async function uploadFile(
  buffer: Buffer,
  originalName: string,
  mimeType: string,
  uploadedById: string,
  bucket: string = "attachments"
): Promise<UploadResult> {
  const isImg = mimeType.startsWith("image/") && !PASSTHROUGH_MIMES.has(mimeType);

  if (!isImg) {
    // ── Generic file: store as-is ──
    const ext = path.extname(originalName);
    const key = generateKey(ext);
    await writeObject(bucket, key, buffer);

    const obj = await prisma.storageObject.create({
      data: { bucket, key, mimeType, size: buffer.length, originalName, uploadedById },
    });

    return { id: obj.id, key, mimeType, size: buffer.length };
  }

  // ── Image pipeline ──
  const meta = await analyzeImage(buffer);
  const convert = shouldConvert(mimeType, meta);
  const outputExt = convert ? ".webp" : path.extname(originalName);
  const key = generateKey(outputExt);

  // 1. Optimize and store original
  let finalBuffer: Buffer;
  let finalMime: string;

  if (convert) {
    finalBuffer = await optimizeOriginal(buffer, meta);
    finalMime = "image/webp";
  } else {
    finalBuffer = buffer;
    finalMime = mimeType;
  }

  await writeObject(bucket, key, finalBuffer);

  // 2. Generate variants + blurhash in parallel
  const [variantResults, blurhash] = await Promise.all([
    Promise.all(
      Object.entries(IMAGE_VARIANTS_CONFIG).map(async ([name, config]) => {
        // Skip variants larger than original
        if (meta.width <= config.width && meta.height <= config.height && name !== "thumbnail") {
          return null;
        }
        const info = await generateVariant(buffer, bucket, key, name, config, convert);
        return [name, info] as const;
      })
    ),
    generateBlurHash(buffer),
  ]);

  const variants: Record<string, VariantInfo> = {};
  for (const entry of variantResults) {
    if (entry) variants[entry[0]] = entry[1];
  }

  // 3. Save to DB
  const obj = await prisma.storageObject.create({
    data: {
      bucket,
      key,
      mimeType: finalMime,
      size: finalBuffer.length,
      originalName,
      variants: Object.keys(variants).length > 0 ? JSON.parse(JSON.stringify(variants)) : undefined,
      uploadedById,
    },
  });

  return {
    id: obj.id,
    key,
    mimeType: finalMime,
    size: finalBuffer.length,
    width: meta.width,
    height: meta.height,
    blurhash,
    variants,
  };
}

export async function getFileInfo(
  bucket: string,
  key: string
): Promise<{ path: string; mimeType: string }> {
  const filePath = await readObjectPath(bucket, key);
  return { path: filePath, mimeType: getMimeType(key) };
}

export async function getFilePath(bucket: string, key: string): Promise<string> {
  return readObjectPath(bucket, key);
}

export async function deleteFile(objectId: string): Promise<void> {
  const obj = await prisma.storageObject.findUnique({ where: { id: objectId } });
  if (!obj) return;

  // Delete original + all variants in parallel
  const deletions: Promise<void>[] = [deleteObject(obj.bucket, obj.key)];

  if (obj.variants && typeof obj.variants === "object") {
    const variants = obj.variants as Record<string, VariantInfo | string>;
    for (const v of Object.values(variants)) {
      const variantKey = typeof v === "string" ? v : v.key;
      deletions.push(deleteObject(obj.bucket, variantKey));
    }
  }

  await Promise.all(deletions);
  await prisma.storageObject.delete({ where: { id: objectId } });
}

export async function getStorageStats(): Promise<{
  totalFiles: number;
  totalSize: number;
  byBucket: Record<string, { count: number; size: number }>;
}> {
  const objects = await prisma.storageObject.groupBy({
    by: ["bucket"],
    _count: true,
    _sum: { size: true },
  });

  const byBucket: Record<string, { count: number; size: number }> = {};
  let totalFiles = 0;
  let totalSize = 0;

  for (const entry of objects) {
    byBucket[entry.bucket] = {
      count: entry._count,
      size: entry._sum.size || 0,
    };
    totalFiles += entry._count;
    totalSize += entry._sum.size || 0;
  }

  return { totalFiles, totalSize, byBucket };
}

import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import sharp from "sharp";
import prisma from "./prisma";

export const STORAGE_ROOT = path.resolve(
  process.env.STORAGE_PATH || path.join(__dirname, "../../storage")
);

// Image variant configs
const IMAGE_VARIANTS = {
  thumbnail: { width: 150, height: 150, fit: "cover" as const },
  medium: { width: 600, height: 600, fit: "inside" as const },
  large: { width: 1200, height: 1200, fit: "inside" as const },
};

// Formats we convert to WebP for size savings
const CONVERTIBLE_FORMATS = new Set([
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/heif",
  "image/tiff",
  "image/bmp",
  "image/webp", // re-encode at lower quality
]);

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

function generateKey(originalName: string, ext?: string): string {
  const finalExt = ext || path.extname(originalName);
  const hash = crypto.randomBytes(16).toString("hex");
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "/");
  return `${date}/${hash}${finalExt}`;
}

function isImage(mimeType: string): boolean {
  return mimeType.startsWith("image/") && !mimeType.includes("svg");
}

function isConvertible(mimeType: string): boolean {
  return CONVERTIBLE_FORMATS.has(mimeType);
}

interface VariantResult {
  key: string;
  width: number;
  height: number;
  size: number;
}

async function generateVariant(
  buffer: Buffer,
  bucket: string,
  originalKey: string,
  variantName: string,
  dims: { width: number; height: number; fit: "cover" | "inside" },
  outputFormat: "webp" | "original",
  mimeType: string
): Promise<VariantResult> {
  const ext = outputFormat === "webp" ? ".webp" : path.extname(originalKey);
  const variantKey = originalKey.replace(/(\.[^.]+)$/, `_${variantName}${ext}`);
  const variantPath = path.join(STORAGE_ROOT, bucket, variantKey);
  await ensureDir(path.dirname(variantPath));

  let pipeline = sharp(buffer).resize(dims.width, dims.height, {
    fit: dims.fit,
    withoutEnlargement: true,
  });

  if (outputFormat === "webp") {
    pipeline = pipeline.webp({ quality: 80 });
  }

  const result = await pipeline.toFile(variantPath);

  return {
    key: variantKey,
    width: result.width,
    height: result.height,
    size: result.size,
  };
}

export interface UploadResult {
  id: string;
  key: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  variants?: Record<string, { key: string; width: number; height: number; size: number }>;
}

export async function uploadFile(
  buffer: Buffer,
  originalName: string,
  mimeType: string,
  uploadedById: string,
  bucket: string = "attachments"
): Promise<UploadResult> {
  const isImg = isImage(mimeType);
  const convertToWebp = isImg && isConvertible(mimeType);

  // For convertible images, store the original as WebP too
  const storageExt = convertToWebp ? ".webp" : undefined;
  const key = generateKey(originalName, storageExt);
  const filePath = path.join(STORAGE_ROOT, bucket, key);
  await ensureDir(path.dirname(filePath));

  let finalBuffer = buffer;
  let finalMimeType = mimeType;
  let width: number | undefined;
  let height: number | undefined;

  if (isImg) {
    const metadata = await sharp(buffer).metadata();
    width = metadata.width;
    height = metadata.height;

    if (convertToWebp) {
      finalBuffer = await sharp(buffer).webp({ quality: 85 }).toBuffer();
      finalMimeType = "image/webp";
    }
  }

  await fs.writeFile(filePath, finalBuffer);

  // Generate image variants in parallel
  let variantsData: Record<string, { key: string; width: number; height: number; size: number }> | undefined;

  if (isImg) {
    const outputFormat = convertToWebp ? "webp" as const : "original" as const;
    const variantPromises = Object.entries(IMAGE_VARIANTS).map(([name, dims]) =>
      generateVariant(buffer, bucket, key, name, dims, outputFormat, mimeType).then(
        (result) => [name, result] as const
      )
    );

    const results = await Promise.all(variantPromises);
    variantsData = Object.fromEntries(results);
  }

  // Store variant keys for backward compat (simple key map)
  const variantKeys = variantsData
    ? Object.fromEntries(Object.entries(variantsData).map(([name, v]) => [name, v.key]))
    : undefined;

  const storageObject = await prisma.storageObject.create({
    data: {
      bucket,
      key,
      mimeType: finalMimeType,
      size: finalBuffer.length,
      originalName,
      variants: variantsData || undefined,
      uploadedById,
    },
  });

  return {
    id: storageObject.id,
    key,
    mimeType: finalMimeType,
    size: finalBuffer.length,
    width,
    height,
    variants: variantsData,
  };
}

export async function getFilePath(bucket: string, key: string): Promise<string> {
  const filePath = path.resolve(STORAGE_ROOT, bucket, key);
  if (!filePath.startsWith(STORAGE_ROOT)) {
    throw new Error("Invalid path");
  }
  try {
    await fs.access(filePath);
    return filePath;
  } catch {
    throw new Error("File not found");
  }
}

export async function getFileInfo(bucket: string, key: string): Promise<{ path: string; mimeType: string }> {
  const filePath = await getFilePath(bucket, key);
  // Detect mime from extension
  const ext = path.extname(key).toLowerCase();
  const mimeMap: Record<string, string> = {
    ".webp": "image/webp",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xls": "application/vnd.ms-excel",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".mp4": "video/mp4",
    ".mp3": "audio/mpeg",
  };
  return { path: filePath, mimeType: mimeMap[ext] || "application/octet-stream" };
}

export async function deleteFile(objectId: string): Promise<void> {
  const obj = await prisma.storageObject.findUnique({ where: { id: objectId } });
  if (!obj) return;

  const mainPath = path.join(STORAGE_ROOT, obj.bucket, obj.key);
  await fs.unlink(mainPath).catch(() => {});

  if (obj.variants && typeof obj.variants === "object") {
    const variants = obj.variants as Record<string, { key: string } | string>;
    const deletePromises = Object.values(variants).map((v) => {
      const variantKey = typeof v === "string" ? v : v.key;
      const variantPath = path.join(STORAGE_ROOT, obj.bucket, variantKey);
      return fs.unlink(variantPath).catch(() => {});
    });
    await Promise.all(deletePromises);
  }

  await prisma.storageObject.delete({ where: { id: objectId } });
}

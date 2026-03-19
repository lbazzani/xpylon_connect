import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import sharp from "sharp";
import prisma from "./prisma";

const STORAGE_ROOT = path.resolve(__dirname, "../../storage");
const BUCKETS = ["attachments", "avatars"] as const;

// Image variant dimensions
const IMAGE_VARIANTS = {
  thumbnail: { width: 150, height: 150, fit: "cover" as const },
  medium: { width: 600, height: 600, fit: "inside" as const },
  large: { width: 1200, height: 1200, fit: "inside" as const },
};

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

function generateKey(originalName: string): string {
  const ext = path.extname(originalName);
  const hash = crypto.randomBytes(16).toString("hex");
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "/");
  return `${date}/${hash}${ext}`;
}

function isImage(mimeType: string): boolean {
  return mimeType.startsWith("image/") && !mimeType.includes("svg");
}

export async function uploadFile(
  buffer: Buffer,
  originalName: string,
  mimeType: string,
  uploadedById: string,
  bucket: string = "attachments"
): Promise<{ id: string; key: string; variants?: Record<string, string> }> {
  const key = generateKey(originalName);
  const filePath = path.join(STORAGE_ROOT, bucket, key);
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, buffer);

  let variants: Record<string, string> | undefined;

  if (isImage(mimeType)) {
    variants = {};
    for (const [name, dims] of Object.entries(IMAGE_VARIANTS)) {
      const variantKey = key.replace(/(\.[^.]+)$/, `_${name}$1`);
      const variantPath = path.join(STORAGE_ROOT, bucket, variantKey);
      await ensureDir(path.dirname(variantPath));
      await sharp(buffer)
        .resize(dims.width, dims.height, { fit: dims.fit, withoutEnlargement: true })
        .toFile(variantPath);
      variants[name] = variantKey;
    }
  }

  const storageObject = await prisma.storageObject.create({
    data: {
      bucket,
      key,
      mimeType,
      size: buffer.length,
      originalName,
      variants: variants || undefined,
      uploadedById,
    },
  });

  return { id: storageObject.id, key, variants };
}

export async function getFilePath(bucket: string, key: string): Promise<string> {
  const filePath = path.join(STORAGE_ROOT, bucket, key);
  try {
    await fs.access(filePath);
    return filePath;
  } catch {
    throw new Error("File not found");
  }
}

export async function deleteFile(objectId: string): Promise<void> {
  const obj = await prisma.storageObject.findUnique({ where: { id: objectId } });
  if (!obj) return;

  // Delete main file
  const mainPath = path.join(STORAGE_ROOT, obj.bucket, obj.key);
  await fs.unlink(mainPath).catch(() => {});

  // Delete variants
  if (obj.variants && typeof obj.variants === "object") {
    const variants = obj.variants as Record<string, string>;
    for (const variantKey of Object.values(variants)) {
      const variantPath = path.join(STORAGE_ROOT, obj.bucket, variantKey);
      await fs.unlink(variantPath).catch(() => {});
    }
  }

  await prisma.storageObject.delete({ where: { id: objectId } });
}

export function getFileUrl(bucket: string, key: string): string {
  return `/storage/${bucket}/${key}`;
}

export { STORAGE_ROOT };

import prisma from "./prisma";
import { extractBusinessCard } from "./cardScan";
import path from "path";

const queue: string[] = [];
let processing = false;

const STORAGE_PATH = process.env.STORAGE_PATH || "./storage";

export function enqueueCardImports(importIds: string[]): void {
  queue.push(...importIds);
  if (!processing) {
    processNext();
  }
}

async function processNext(): Promise<void> {
  if (queue.length === 0) {
    processing = false;
    return;
  }

  processing = true;
  const importId = queue.shift()!;

  try {
    const cardImport = await prisma.cardImport.findUnique({
      where: { id: importId },
      include: { storageObject: true },
    });

    if (!cardImport || cardImport.status !== "QUEUED") {
      processNext();
      return;
    }

    // Mark as processing
    await prisma.cardImport.update({
      where: { id: importId },
      data: { status: "PROCESSING" },
    });

    // Resolve the file path from the storage object
    const filePath = path.join(STORAGE_PATH, cardImport.storageObject.key);

    // Extract data using GPT-4o Vision
    const extractedData = await extractBusinessCard(filePath);

    // Update with extracted data
    await prisma.cardImport.update({
      where: { id: importId },
      data: {
        extractedData: extractedData as any,
        status: "EXTRACTED",
        processedAt: new Date(),
      },
    });
  } catch (err) {
    console.error(`Card import ${importId} failed:`, err);
    await prisma.cardImport.update({
      where: { id: importId },
      data: {
        status: "FAILED",
        error: err instanceof Error ? err.message : "Unknown error",
        processedAt: new Date(),
      },
    }).catch(console.error);
  }

  // Process next in queue
  processNext();
}

export function getQueueStatus(): { queueLength: number; processing: boolean } {
  return { queueLength: queue.length, processing };
}

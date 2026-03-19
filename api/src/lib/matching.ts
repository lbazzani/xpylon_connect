import OpenAI from "openai";
import prisma from "./prisma";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORGANIZATION,
});

const EMBEDDING_MODEL = "text-embedding-3-small";

function buildProfileText(user: {
  firstName: string;
  lastName: string;
  role?: string | null;
  bio?: string | null;
  industry?: string | null;
  company?: { name: string } | null;
}): string {
  const parts = [
    user.role && `Role: ${user.role}`,
    user.industry && `Industry: ${user.industry}`,
    user.company && `Company: ${user.company.name}`,
    user.bio && `About: ${user.bio}`,
  ].filter(Boolean);
  return parts.join(". ") || "Professional on Xpylon Connect";
}

export async function generateAndSaveEmbedding(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { company: true },
  });
  if (!user) return;

  const text = buildProfileText(user);

  try {
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text,
    });

    const embedding = response.data[0].embedding;
    const vectorStr = `[${embedding.join(",")}]`;

    await prisma.$executeRawUnsafe(
      `UPDATE "User" SET "embedding" = $1::vector WHERE "id" = $2`,
      vectorStr,
      userId
    );
  } catch (err) {
    console.error("Embedding generation error:", err);
  }
}

export interface SuggestionProfile {
  id: string;
  role: string | null;
  industry: string | null;
  bio: string | null;
  companyName: string | null;
  similarity: number;
}

export async function findSimilarUsers(
  userId: string,
  limit: number = 10
): Promise<SuggestionProfile[]> {
  // Get users similar by embedding, excluding:
  // - the user themselves
  // - users already connected (accepted, pending)
  // - the bot user
  const results = await prisma.$queryRawUnsafe<Array<{
    id: string;
    role: string | null;
    industry: string | null;
    bio: string | null;
    company_name: string | null;
    similarity: number;
  }>>(
    `SELECT
      u."id",
      u."role",
      u."industry",
      u."bio",
      c."name" as company_name,
      1 - (u."embedding" <=> (SELECT "embedding" FROM "User" WHERE "id" = $1)) as similarity
    FROM "User" u
    LEFT JOIN "Company" c ON u."companyId" = c."id"
    WHERE u."id" != $1
      AND u."embedding" IS NOT NULL
      AND u."firstName" != ''
      AND u."phone" != $3
      AND u."id" NOT IN (
        SELECT "addresseeId" FROM "Connection" WHERE "requesterId" = $1
        UNION
        SELECT "requesterId" FROM "Connection" WHERE "addresseeId" = $1
      )
    ORDER BY u."embedding" <=> (SELECT "embedding" FROM "User" WHERE "id" = $1)
    LIMIT $2`,
    userId,
    limit,
    process.env.XPYLON_BOT_PHONE || "+10000000000"
  );

  return results.map((r) => ({
    id: r.id,
    role: r.role,
    industry: r.industry,
    bio: r.bio,
    companyName: r.company_name,
    similarity: Number(r.similarity),
  }));
}

export function anonymizeProfile(profile: SuggestionProfile): {
  id: string;
  description: string;
  similarity: number;
} {
  const parts = [
    profile.role,
    profile.industry && `in ${profile.industry}`,
  ].filter(Boolean);

  const description = parts.length > 0
    ? parts.join(" ")
    : "Business professional";

  return {
    id: profile.id,
    description,
    similarity: profile.similarity,
  };
}

export function formatSuggestionForBot(profiles: SuggestionProfile[]): string {
  if (profiles.length === 0) {
    return "I don't have enough data to suggest matches yet. Try adding more details to your profile — your industry and what kind of opportunities you're looking for would really help!";
  }

  const lines = profiles.slice(0, 3).map((p, i) => {
    const parts = [p.role, p.industry && `in ${p.industry}`].filter(Boolean);
    const desc = parts.join(" ") || "Business professional";
    const match = Math.round(p.similarity * 100);
    return `${i + 1}. **${desc}** — ${match}% match${p.bio ? ` · "${p.bio}"` : ""}`;
  });

  return `I found some professionals who might be a good fit:\n\n${lines.join("\n")}\n\nWould you like to connect with any of them? Just tell me the number.`;
}

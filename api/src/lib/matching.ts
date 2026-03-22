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

// ── Opportunity embeddings ──

function buildOpportunityText(opp: {
  title: string;
  description: string;
  type: string;
  tags: string[];
}): string {
  const parts = [
    `Title: ${opp.title}`,
    `Type: ${opp.type}`,
    opp.description && `Description: ${opp.description}`,
    opp.tags.length > 0 && `Tags: ${opp.tags.join(", ")}`,
  ].filter(Boolean);
  return parts.join(". ");
}

export async function generateOpportunityEmbedding(opportunityId: string): Promise<void> {
  const opp = await prisma.opportunity.findUnique({ where: { id: opportunityId } });
  if (!opp) return;

  const text = buildOpportunityText(opp);

  try {
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text,
    });

    const embedding = response.data[0].embedding;
    const vectorStr = `[${embedding.join(",")}]`;

    await prisma.$executeRawUnsafe(
      `UPDATE "Opportunity" SET "embedding" = $1::vector WHERE "id" = $2`,
      vectorStr,
      opportunityId
    );
  } catch (err) {
    console.error("Opportunity embedding error:", err);
  }
}

export async function findRelevantOpportunities(
  userId: string,
  limit: number = 20,
  isDemo: boolean = false,
  cursor?: string
): Promise<Array<{ id: string; similarity: number }>> {
  // Rank opportunities by cosine similarity to the user's profile embedding
  // Only ACTIVE, NETWORK/OPEN, not authored by user, same demo mode
  const cursorClause = cursor
    ? `AND o."id" != '${cursor}'`
    : "";

  const results = await prisma.$queryRawUnsafe<Array<{
    id: string;
    similarity: number;
  }>>(
    `SELECT
      o."id",
      CASE
        WHEN u_embed."embedding" IS NOT NULL AND o."embedding" IS NOT NULL
        THEN 1 - (o."embedding" <=> u_embed."embedding")
        ELSE 0
      END as similarity
    FROM "Opportunity" o
    JOIN "User" author ON o."authorId" = author."id"
    LEFT JOIN "User" u_embed ON u_embed."id" = $1
    WHERE o."status" = 'ACTIVE'
      AND o."authorId" != $1
      AND o."visibility" IN ('NETWORK', 'OPEN')
      AND author."isDemo" = $3
      ${cursorClause}
    ORDER BY
      CASE
        WHEN u_embed."embedding" IS NOT NULL AND o."embedding" IS NOT NULL
        THEN o."embedding" <=> u_embed."embedding"
        ELSE 1
      END ASC,
      o."createdAt" DESC
    LIMIT $2`,
    userId,
    limit,
    isDemo
  );

  return results.map((r) => ({
    id: r.id,
    similarity: Number(r.similarity),
  }));
}

// ── Query-based opportunity search (for bot) ──

export interface OpportunitySearchResult {
  id: string;
  title: string;
  description: string;
  type: string;
  tags: string[];
  visibility: string;
  authorFirstName: string;
  authorLastName: string;
  companyName: string | null;
  similarity: number;
}

export async function searchOpportunitiesByQuery(
  userId: string,
  query: string,
  limit: number = 5,
  isDemo: boolean = false
): Promise<OpportunitySearchResult[]> {
  // Generate embedding for the search query
  let queryEmbedding: number[];
  try {
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: query,
    });
    queryEmbedding = response.data[0].embedding;
  } catch (err) {
    console.error("Query embedding error:", err);
    return [];
  }

  const vectorStr = `[${queryEmbedding.join(",")}]`;

  const results = await prisma.$queryRawUnsafe<Array<{
    id: string;
    title: string;
    description: string;
    type: string;
    tags: string[];
    visibility: string;
    author_first_name: string;
    author_last_name: string;
    company_name: string | null;
    similarity: number;
  }>>(
    `SELECT
      o."id", o."title", o."description", o."type", o."tags", o."visibility",
      u."firstName" as author_first_name, u."lastName" as author_last_name,
      c."name" as company_name,
      1 - (o."embedding" <=> $1::vector) as similarity
    FROM "Opportunity" o
    JOIN "User" u ON o."authorId" = u."id"
    LEFT JOIN "Company" c ON u."companyId" = c."id"
    WHERE o."status" = 'ACTIVE'
      AND o."authorId" != $2
      AND o."visibility" IN ('NETWORK', 'OPEN')
      AND o."embedding" IS NOT NULL
      AND u."isDemo" = $4
    ORDER BY o."embedding" <=> $1::vector ASC
    LIMIT $3`,
    vectorStr,
    userId,
    limit,
    isDemo
  );

  return results.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    type: r.type,
    tags: r.tags,
    visibility: r.visibility,
    authorFirstName: r.author_first_name,
    authorLastName: r.author_last_name,
    companyName: r.company_name,
    similarity: Number(r.similarity),
  }));
}

export function formatOpportunitySearchForBot(results: OpportunitySearchResult[]): string {
  if (results.length === 0) {
    return "I couldn't find any opportunities matching your search right now. Try broadening your criteria, or I can notify you when something relevant comes up.";
  }

  const lines = results.map((r, i) => {
    const match = Math.round(r.similarity * 100);
    const author = `${r.authorFirstName} ${r.authorLastName}`;
    const company = r.companyName ? ` · ${r.companyName}` : "";
    const tags = r.tags.length > 0 ? `\n   Tags: ${r.tags.slice(0, 4).join(", ")}` : "";
    const desc = r.description ? `\n   ${r.description.substring(0, 120)}${r.description.length > 120 ? "..." : ""}` : "";
    return `${i + 1}. **${r.title}** — ${r.type} · ${match}% match${desc}${tags}\n   By ${author}${company}\n   [OPP:${r.id}]`;
  });

  return `I found ${results.length} opportunities that match:\n\n${lines.join("\n\n")}\n\nTap the bookmark icon to save any of these, or ask me for more details about a specific one.`;
}

// ── Notify matching users when a new opportunity is created ──

export async function findUsersMatchingOpportunity(
  opportunityId: string,
  threshold: number = 0.55,
  limit: number = 20,
  isDemo: boolean = false
): Promise<Array<{ userId: string; similarity: number }>> {
  const results = await prisma.$queryRawUnsafe<Array<{
    userId: string;
    similarity: number;
  }>>(
    `SELECT
      u."id" as "userId",
      1 - (u."embedding" <=> o."embedding") as similarity
    FROM "User" u, "Opportunity" o
    WHERE o."id" = $1
      AND u."id" != o."authorId"
      AND u."embedding" IS NOT NULL
      AND o."embedding" IS NOT NULL
      AND u."isDemo" = $3
      AND u."phone" != $4
      AND (1 - (u."embedding" <=> o."embedding")) > $5
    ORDER BY u."embedding" <=> o."embedding" ASC
    LIMIT $2`,
    opportunityId,
    limit,
    isDemo,
    process.env.XPYLON_BOT_PHONE || "+10000000000",
    threshold
  );

  return results.map((r) => ({
    userId: r.userId,
    similarity: Number(r.similarity),
  }));
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
  limit: number = 10,
  isDemo: boolean = false
): Promise<SuggestionProfile[]> {
  // Get users similar by embedding, excluding:
  // - the user themselves
  // - users already connected (accepted, pending)
  // - the bot user
  // - users in a different mode (demo vs real)
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
      AND u."isDemo" = $4
      AND u."id" NOT IN (
        SELECT "addresseeId" FROM "Connection" WHERE "requesterId" = $1
        UNION
        SELECT "requesterId" FROM "Connection" WHERE "addresseeId" = $1
      )
    ORDER BY u."embedding" <=> (SELECT "embedding" FROM "User" WHERE "id" = $1)
    LIMIT $2`,
    userId,
    limit,
    process.env.XPYLON_BOT_PHONE || "+10000000000",
    isDemo
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

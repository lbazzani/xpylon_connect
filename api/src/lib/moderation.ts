import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORGANIZATION,
});

export type ModerationResult = {
  decision: "APPROVED" | "UNDER_REVIEW" | "REJECTED";
  reason: string;
};

const MODERATION_PROMPT = `You are a compliance reviewer for Xpylon Connect, a B2B professional networking platform. Your job is to evaluate business opportunities posted by users.

APPROVED opportunities are legitimate business proposals such as:
- Partnerships, distribution deals, supply contracts, acquisitions
- Investment opportunities, joint ventures, licensing deals
- Professional services, consulting, hiring

REJECTED opportunities are clearly:
- Scams, fraud schemes, pyramid/ponzi schemes, get-rich-quick schemes
- Illegal activities (drugs, weapons, money laundering, human trafficking)
- Adult content, gambling, counterfeit goods
- Harassment, hate speech, discrimination
- Personal ads or non-business content

UNDER_REVIEW opportunities have red flags but are not clearly illegal:
- Vague descriptions that could hide illegitimate intent
- Unusually high returns promised with no clear business model
- Requests for upfront payments or personal financial information
- Cryptocurrency/NFT schemes without clear legitimate business purpose
- Multi-level marketing or aggressive referral structures
- Content that seems designed to exploit or deceive other users
- Claims that seem exaggerated or unverifiable

Respond with ONLY a JSON object:
{
  "decision": "APPROVED" | "UNDER_REVIEW" | "REJECTED",
  "reason": "Brief explanation (1-2 sentences)"
}`;

export async function moderateOpportunity(
  title: string,
  description: string,
  type: string,
  tags: string[]
): Promise<ModerationResult> {
  try {
    const content = `Title: ${title}\nType: ${type}\nDescription: ${description}\nTags: ${tags.join(", ")}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: MODERATION_PROMPT },
        { role: "user", content },
      ],
      max_tokens: 150,
      temperature: 0,
    });

    const reply = completion.choices[0]?.message?.content?.trim();
    if (!reply) return { decision: "UNDER_REVIEW", reason: "Unable to evaluate content" };

    const parsed = JSON.parse(reply);
    if (!["APPROVED", "UNDER_REVIEW", "REJECTED"].includes(parsed.decision)) {
      return { decision: "UNDER_REVIEW", reason: "Unable to evaluate content" };
    }

    return { decision: parsed.decision, reason: parsed.reason };
  } catch (err) {
    console.error("Moderation error:", err);
    // On failure, flag for human review rather than blocking
    return { decision: "UNDER_REVIEW", reason: "Automated review unavailable — requires manual review" };
  }
}

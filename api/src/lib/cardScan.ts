import OpenAI from "openai";
import fs from "fs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORGANIZATION,
});

export interface BusinessCardData {
  firstName: string;
  lastName: string;
  role: string;
  company: string;
  phone: string;
  email: string;
}

const EXTRACTION_PROMPT = `You are a business card data extractor. Analyze the image of a business card and extract the following information. Return ONLY a valid JSON object with these fields:

{
  "firstName": "First name",
  "lastName": "Last name",
  "role": "Job title or role",
  "company": "Company name",
  "phone": "Phone number with international prefix if visible",
  "email": "Email address"
}

Rules:
- If a field is not visible or readable, use an empty string ""
- For phone numbers, include the country code if visible (e.g., +1, +39, +44)
- If only a full name is visible, split it into firstName and lastName
- Do not guess or fabricate data — only extract what is clearly visible
- Return ONLY the JSON object, no other text`;

export async function extractBusinessCard(filePath: string): Promise<BusinessCardData> {
  const imageBuffer = fs.readFileSync(filePath);
  const base64 = imageBuffer.toString("base64");
  const mimeType = filePath.endsWith(".png") ? "image/png" : "image/jpeg";

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: EXTRACTION_PROMPT },
      {
        role: "user",
        content: [
          { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}`, detail: "high" } },
        ],
      },
    ],
    max_tokens: 300,
    temperature: 0,
  });

  const reply = response.choices[0]?.message?.content?.trim();
  if (!reply) {
    return { firstName: "", lastName: "", role: "", company: "", phone: "", email: "" };
  }

  try {
    // Strip markdown code blocks if present
    const cleaned = reply.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    console.error("Card extraction parse error:", reply);
    return { firstName: "", lastName: "", role: "", company: "", phone: "", email: "" };
  }
}

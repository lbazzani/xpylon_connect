import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Fixed UUIDs for idempotent seeding
const IDS = {
  companies: {
    techVentures: "d0000001-0000-0000-0000-000000000001",
    alpineDistribution: "d0000001-0000-0000-0000-000000000002",
    pacificCapital: "d0000001-0000-0000-0000-000000000003",
    nordicComponents: "d0000001-0000-0000-0000-000000000004",
    mediterraneanFoods: "d0000001-0000-0000-0000-000000000005",
    weberPartners: "d0000001-0000-0000-0000-000000000006",
  },
  users: {
    marco: "d0000002-0000-0000-0000-000000000001",
    elena: "d0000002-0000-0000-0000-000000000002",
    james: "d0000002-0000-0000-0000-000000000003",
    sofia: "d0000002-0000-0000-0000-000000000004",
    luca: "d0000002-0000-0000-0000-000000000005",
    anna: "d0000002-0000-0000-0000-000000000006",
  },
  opportunities: {
    aiQuality: "d0000003-0000-0000-0000-000000000001",
    italianFood: "d0000003-0000-0000-0000-000000000002",
    iotInvestment: "d0000003-0000-0000-0000-000000000003",
    supplyChain: "d0000003-0000-0000-0000-000000000004",
  },
};

const DEMO_USERS = [
  {
    id: IDS.users.marco,
    phone: "+15550000001",
    email: "marco.rossi@demo.xpylon.com",
    firstName: "Marco",
    lastName: "Rossi",
    bio: "Serial entrepreneur focused on AI and automation solutions for manufacturing. Built two successful exits in industrial tech.",
    role: "CEO",
    industry: "Technology",
    companyId: IDS.companies.techVentures,
    isDemo: true,
    profileCompleted: true,
  },
  {
    id: IDS.users.elena,
    phone: "+15550000002",
    email: "elena.fischer@demo.xpylon.com",
    firstName: "Elena",
    lastName: "Fischer",
    bio: "Building distribution networks across Southern Europe for premium brands. 15 years in B2B logistics.",
    role: "Head of Business Development",
    industry: "Distribution",
    companyId: IDS.companies.alpineDistribution,
    isDemo: true,
    profileCompleted: true,
  },
  {
    id: IDS.users.james,
    phone: "+15550000003",
    email: "james.chen@demo.xpylon.com",
    firstName: "James",
    lastName: "Chen",
    bio: "Focused on Series A/B investments in B2B SaaS and industrial tech. Managing $200M+ portfolio.",
    role: "Investment Director",
    industry: "Finance",
    companyId: IDS.companies.pacificCapital,
    isDemo: true,
    profileCompleted: true,
  },
  {
    id: IDS.users.sofia,
    phone: "+15550000004",
    email: "sofia.andersson@demo.xpylon.com",
    firstName: "Sofia",
    lastName: "Andersson",
    bio: "Optimizing supply chains for electronics manufacturers in the EU. Specialist in just-in-time delivery systems.",
    role: "Supply Chain Manager",
    industry: "Manufacturing",
    companyId: IDS.companies.nordicComponents,
    isDemo: true,
    profileCompleted: true,
  },
  {
    id: IDS.users.luca,
    phone: "+15550000005",
    email: "luca.moretti@demo.xpylon.com",
    firstName: "Luca",
    lastName: "Moretti",
    bio: "Looking for distribution partners and investment for premium Italian food exports to Northern Europe and the US.",
    role: "COO",
    industry: "Food & Beverage",
    companyId: IDS.companies.mediterraneanFoods,
    isDemo: true,
    profileCompleted: true,
  },
  {
    id: IDS.users.anna,
    phone: "+15550000006",
    email: "anna.weber@demo.xpylon.com",
    firstName: "Anna",
    lastName: "Weber",
    bio: "Helping mid-market companies with M&A, strategic partnerships, and market entry across DACH region.",
    role: "Managing Director",
    industry: "Consulting",
    companyId: IDS.companies.weberPartners,
    isDemo: true,
    profileCompleted: true,
  },
];

const DEMO_COMPANIES = [
  { id: IDS.companies.techVentures, name: "TechVentures srl" },
  { id: IDS.companies.alpineDistribution, name: "Alpine Distribution GmbH" },
  { id: IDS.companies.pacificCapital, name: "Pacific Capital Partners" },
  { id: IDS.companies.nordicComponents, name: "Nordic Components AB" },
  { id: IDS.companies.mediterraneanFoods, name: "Mediterranean Foods SpA" },
  { id: IDS.companies.weberPartners, name: "Weber & Partners Consulting" },
];

const DEMO_OPPORTUNITIES = [
  {
    id: IDS.opportunities.aiQuality,
    authorId: IDS.users.marco,
    title: "AI-Powered Quality Control System — Seeking Partners",
    description:
      "We've developed an AI-based visual inspection system for manufacturing lines that reduces defect rates by 40%. Looking for integration partners and pilot customers in automotive and electronics manufacturing.",
    type: "PARTNERSHIP" as const,
    tags: ["ai", "manufacturing", "quality-control", "automation"],
    visibility: "OPEN" as const,
    commMode: "GROUP" as const,
    status: "ACTIVE" as const,
  },
  {
    id: IDS.opportunities.italianFood,
    authorId: IDS.users.luca,
    title: "Premium Italian Food Products — Distribution Partners Wanted",
    description:
      "Mediterranean Foods produces award-winning olive oils, pasta sauces, and cured meats. We're looking for established distributors in Germany, Scandinavia, and the UK to expand our B2B presence.",
    type: "DISTRIBUTION" as const,
    tags: ["food", "export", "italy", "europe", "premium"],
    visibility: "NETWORK" as const,
    commMode: "PRIVATE" as const,
    status: "ACTIVE" as const,
  },
  {
    id: IDS.opportunities.iotInvestment,
    authorId: IDS.users.james,
    title: "Series A Investment in Industrial IoT Platform",
    description:
      "Pacific Capital is leading a $5M Series A round for a promising industrial IoT startup. The platform connects legacy factory equipment to cloud analytics. Looking for co-investors and strategic partners.",
    type: "INVESTMENT" as const,
    tags: ["iot", "investment", "series-a", "industrial-tech"],
    visibility: "NETWORK" as const,
    commMode: "PRIVATE" as const,
    status: "ACTIVE" as const,
  },
  {
    id: IDS.opportunities.supplyChain,
    authorId: IDS.users.sofia,
    title: "Electronics Supply Chain Optimization — Joint Venture",
    description:
      "Nordic Components is seeking partners for a joint venture to build a shared warehousing and logistics network for electronics components across the EU, reducing lead times by 50%.",
    type: "SUPPLY" as const,
    tags: ["electronics", "supply-chain", "eu", "logistics", "warehousing"],
    visibility: "OPEN" as const,
    commMode: "GROUP" as const,
    status: "ACTIVE" as const,
  },
];

// All pairs of 6 users = 15 connections (fully connected network)
function generateConnections(): { requesterId: string; addresseeId: string }[] {
  const userIds = Object.values(IDS.users);
  const pairs: { requesterId: string; addresseeId: string }[] = [];
  for (let i = 0; i < userIds.length; i++) {
    for (let j = i + 1; j < userIds.length; j++) {
      pairs.push({ requesterId: userIds[i], addresseeId: userIds[j] });
    }
  }
  return pairs;
}

// Demo conversations with messages
const DEMO_CONVERSATIONS = [
  {
    participants: [IDS.users.marco, IDS.users.elena],
    messages: [
      { senderId: IDS.users.marco, content: "Hi Elena, I saw your profile — your distribution network across Southern Europe sounds impressive. We're looking for exactly that kind of reach for our AI quality control system." },
      { senderId: IDS.users.elena, content: "Thanks Marco! I've been following the AI manufacturing space. What kind of products would need distribution?" },
      { senderId: IDS.users.marco, content: "Primarily hardware units with embedded cameras and software licenses. Think industrial-grade inspection stations. We handle installation and training." },
      { senderId: IDS.users.elena, content: "That's interesting — we already work with several automotive parts manufacturers. Let me review our coverage map and get back to you with a proposal." },
    ],
  },
  {
    participants: [IDS.users.james, IDS.users.luca],
    messages: [
      { senderId: IDS.users.james, content: "Luca, Mediterranean Foods caught our attention. Pacific Capital is interested in the premium food export space. Could you share your current revenue figures?" },
      { senderId: IDS.users.luca, content: "Sure, James. We did 4.2M last year with 35% margins. Growth has been 25% YoY for the past three years, mostly organic through word-of-mouth." },
      { senderId: IDS.users.james, content: "Those are solid numbers. We typically invest at the Series A stage — are you looking for capital to scale the distribution network?" },
      { senderId: IDS.users.luca, content: "Exactly. We need to build out our cold chain logistics and hire dedicated sales teams for the DACH and Nordic markets. Happy to share our full deck." },
    ],
  },
  {
    participants: [IDS.users.sofia, IDS.users.anna],
    messages: [
      { senderId: IDS.users.sofia, content: "Anna, I heard Weber & Partners has experience with cross-border logistics partnerships. We're exploring a joint venture for shared EU warehousing." },
      { senderId: IDS.users.anna, content: "Yes, we structured a similar deal last year for a client in the semiconductor space. The regulatory considerations across EU markets can be tricky but manageable." },
      { senderId: IDS.users.sofia, content: "That's exactly the kind of expertise we need. Could you advise on the partnership structure?" },
    ],
  },
  {
    participants: [IDS.users.marco, IDS.users.james],
    messages: [
      { senderId: IDS.users.marco, content: "James, I saw you're investing in industrial IoT. Our AI quality control system has a strong IoT component — would love to discuss potential synergies." },
      { senderId: IDS.users.james, content: "Absolutely, Marco. We believe AI + IoT in manufacturing is a massive opportunity. Let's set up a call next week — I'd like to understand your technology stack better." },
    ],
  },
  {
    participants: [IDS.users.elena, IDS.users.luca],
    messages: [
      { senderId: IDS.users.luca, content: "Elena, Alpine Distribution seems like a perfect fit for our products. We're looking for someone who understands the premium food segment in German-speaking markets." },
      { senderId: IDS.users.elena, content: "We've distributed Italian specialty products before, actually. Our network covers 2,000+ retail points in Germany, Austria, and Switzerland." },
      { senderId: IDS.users.luca, content: "That sounds great. I'd love to send you some samples and discuss volume pricing. When would be a good time for a video call?" },
      { senderId: IDS.users.elena, content: "How about Thursday afternoon? I'll have our logistics team join as well to discuss supply chain requirements." },
    ],
  },
];

async function seed() {
  console.log("Seeding demo data...");

  // Clean existing demo data
  console.log("Cleaning existing demo data...");
  const existingDemoUsers = await prisma.user.findMany({
    where: { isDemo: true },
    select: { id: true },
  });
  const demoUserIds = existingDemoUsers.map((u) => u.id);

  if (demoUserIds.length > 0) {
    // Clean up in dependency order
    await prisma.messageReceipt.deleteMany({
      where: { message: { conversation: { members: { some: { userId: { in: demoUserIds } } } } } },
    });
    await prisma.message.deleteMany({
      where: { conversation: { members: { some: { userId: { in: demoUserIds } } } } },
    });
    await prisma.conversationMember.deleteMany({
      where: { conversation: { members: { some: { userId: { in: demoUserIds } } } } },
    });
    await prisma.conversation.deleteMany({
      where: { OR: [{ createdById: { in: demoUserIds } }] },
    });
    await prisma.opportunityInterest.deleteMany({
      where: { OR: [{ userId: { in: demoUserIds } }, { opportunity: { authorId: { in: demoUserIds } } }] },
    });
    await prisma.opportunitySaved.deleteMany({
      where: { OR: [{ userId: { in: demoUserIds } }, { opportunity: { authorId: { in: demoUserIds } } }] },
    });
    await prisma.opportunity.deleteMany({
      where: { authorId: { in: demoUserIds } },
    });
    await prisma.connection.deleteMany({
      where: { OR: [{ requesterId: { in: demoUserIds } }, { addresseeId: { in: demoUserIds } }] },
    });
    await prisma.fcmToken.deleteMany({
      where: { userId: { in: demoUserIds } },
    });
    await prisma.user.deleteMany({ where: { isDemo: true } });
  }

  // Create companies
  console.log("Creating demo companies...");
  for (const company of DEMO_COMPANIES) {
    await prisma.company.upsert({
      where: { id: company.id },
      update: { name: company.name },
      create: company,
    });
  }

  // Create users
  console.log("Creating demo users...");
  for (const user of DEMO_USERS) {
    await prisma.user.create({ data: user });
  }

  // Create connections (fully connected)
  console.log("Creating demo connections...");
  const connections = generateConnections();
  for (const conn of connections) {
    await prisma.connection.create({
      data: { ...conn, status: "ACCEPTED" },
    });
  }

  // Create conversations with messages
  console.log("Creating demo conversations with messages...");
  for (const conv of DEMO_CONVERSATIONS) {
    const conversation = await prisma.conversation.create({
      data: {
        type: "DIRECT",
        createdById: conv.participants[0],
        members: {
          create: conv.participants.map((userId) => ({ userId })),
        },
      },
    });

    // Create messages with slight time offsets for natural ordering
    const baseTime = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000); // 3 days ago
    for (let i = 0; i < conv.messages.length; i++) {
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderId: conv.messages[i].senderId,
          content: conv.messages[i].content,
          type: "TEXT",
          createdAt: new Date(baseTime.getTime() + i * 45 * 60 * 1000), // 45 min apart
        },
      });
    }
  }

  // Create opportunities
  console.log("Creating demo opportunities...");
  for (const opp of DEMO_OPPORTUNITIES) {
    const opportunity = await prisma.opportunity.create({ data: opp });

    // Create GROUP conversations for GROUP mode opportunities
    if (opp.commMode === "GROUP") {
      await prisma.conversation.create({
        data: {
          type: "OPPORTUNITY_GROUP",
          topic: "OPPORTUNITY_DISCUSSION",
          name: opp.title,
          opportunityName: opp.title,
          opportunityId: opportunity.id,
          createdById: opp.authorId,
          members: { create: [{ userId: opp.authorId }] },
        },
      });
    }
  }

  // Create some cross-interests
  console.log("Creating demo interests...");
  // Elena interested in Luca's food distribution (ACCEPTED)
  await prisma.opportunityInterest.create({
    data: {
      opportunityId: IDS.opportunities.italianFood,
      userId: IDS.users.elena,
      status: "ACCEPTED",
    },
  });
  // Marco interested in James's investment (PENDING)
  await prisma.opportunityInterest.create({
    data: {
      opportunityId: IDS.opportunities.iotInvestment,
      userId: IDS.users.marco,
      status: "PENDING",
    },
  });
  // Anna interested in Sofia's supply chain (ACCEPTED)
  await prisma.opportunityInterest.create({
    data: {
      opportunityId: IDS.opportunities.supplyChain,
      userId: IDS.users.anna,
      status: "ACCEPTED",
    },
  });
  // Add Anna to the supply chain group conversation
  const supplyGroupConv = await prisma.conversation.findFirst({
    where: { opportunityId: IDS.opportunities.supplyChain },
  });
  if (supplyGroupConv) {
    await prisma.conversationMember.create({
      data: { conversationId: supplyGroupConv.id, userId: IDS.users.anna },
    }).catch(() => {}); // ignore if already member
  }

  console.log("Demo data seeded successfully!");
  console.log(`  - ${DEMO_COMPANIES.length} companies`);
  console.log(`  - ${DEMO_USERS.length} users`);
  console.log(`  - ${connections.length} connections`);
  console.log(`  - ${DEMO_CONVERSATIONS.length} conversations with messages`);
  console.log(`  - ${DEMO_OPPORTUNITIES.length} opportunities`);
  console.log(`  - 3 opportunity interests`);
  console.log(`\nDemo OTP code: ${process.env.DEMO_OTP_CODE || "116261"}`);
}

seed()
  .catch((err) => {
    console.error("Seed error:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

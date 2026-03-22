import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ── Helpers ──
function daysAgo(days: number, hoursOffset = 0): Date {
  return new Date(Date.now() - (days * 24 + hoursOffset) * 60 * 60 * 1000);
}

// ── Fixed UUIDs for idempotent seeding ──
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

const BOT_PHONE = process.env.XPYLON_BOT_PHONE || "+10000000000";

// ── Companies ──
const DEMO_COMPANIES = [
  { id: IDS.companies.techVentures, name: "TechVentures srl" },
  { id: IDS.companies.alpineDistribution, name: "Alpine Distribution GmbH" },
  { id: IDS.companies.pacificCapital, name: "Pacific Capital Partners" },
  { id: IDS.companies.nordicComponents, name: "Nordic Components AB" },
  { id: IDS.companies.mediterraneanFoods, name: "Mediterranean Foods SpA" },
  { id: IDS.companies.weberPartners, name: "Weber & Partners Consulting" },
];

// ── Users ──
const DEMO_USERS = [
  { id: IDS.users.marco, phone: "+15550000001", email: "marco.rossi@demo.xpylon.com", firstName: "Marco", lastName: "Rossi", bio: "Serial entrepreneur focused on AI and automation solutions for manufacturing. Built two successful exits in industrial tech.", role: "CEO", industry: "Technology", companyId: IDS.companies.techVentures, isDemo: true, profileCompleted: true },
  { id: IDS.users.elena, phone: "+15550000002", email: "elena.fischer@demo.xpylon.com", firstName: "Elena", lastName: "Fischer", bio: "Building distribution networks across Southern Europe for premium brands. 15 years in B2B logistics.", role: "Head of Business Development", industry: "Distribution", companyId: IDS.companies.alpineDistribution, isDemo: true, profileCompleted: true },
  { id: IDS.users.james, phone: "+15550000003", email: "james.chen@demo.xpylon.com", firstName: "James", lastName: "Chen", bio: "Focused on Series A/B investments in B2B SaaS and industrial tech. Managing $200M+ portfolio.", role: "Investment Director", industry: "Finance", companyId: IDS.companies.pacificCapital, isDemo: true, profileCompleted: true },
  { id: IDS.users.sofia, phone: "+15550000004", email: "sofia.andersson@demo.xpylon.com", firstName: "Sofia", lastName: "Andersson", bio: "Optimizing supply chains for electronics manufacturers in the EU. Specialist in just-in-time delivery.", role: "Supply Chain Manager", industry: "Manufacturing", companyId: IDS.companies.nordicComponents, isDemo: true, profileCompleted: true },
  { id: IDS.users.luca, phone: "+15550000005", email: "luca.moretti@demo.xpylon.com", firstName: "Luca", lastName: "Moretti", bio: "Looking for distribution partners and investment for premium Italian food exports to Northern Europe and the US.", role: "COO", industry: "Food & Beverage", companyId: IDS.companies.mediterraneanFoods, isDemo: true, profileCompleted: true },
  { id: IDS.users.anna, phone: "+15550000006", email: "anna.weber@demo.xpylon.com", firstName: "Anna", lastName: "Weber", bio: "Helping mid-market companies with M&A, strategic partnerships, and market entry across DACH region.", role: "Managing Director", industry: "Consulting", companyId: IDS.companies.weberPartners, isDemo: true, profileCompleted: true },
];

// ── Opportunities ──
const DEMO_OPPORTUNITIES = [
  { id: IDS.opportunities.aiQuality, authorId: IDS.users.marco, title: "AI-Powered Quality Control System — Seeking Partners", description: "We've developed an AI-based visual inspection system for manufacturing lines that reduces defect rates by 40%. Looking for integration partners and pilot customers in automotive and electronics manufacturing.", type: "PARTNERSHIP" as const, tags: ["ai", "manufacturing", "quality-control", "automation"], visibility: "OPEN" as const, commMode: "GROUP" as const, status: "ACTIVE" as const, createdAt: daysAgo(7) },
  { id: IDS.opportunities.italianFood, authorId: IDS.users.luca, title: "Premium Italian Food Products — Distribution Partners Wanted", description: "Mediterranean Foods produces award-winning olive oils, pasta sauces, and cured meats. Looking for established distributors in Germany, Scandinavia, and the UK.", type: "DISTRIBUTION" as const, tags: ["food", "export", "italy", "europe", "premium"], visibility: "NETWORK" as const, commMode: "PRIVATE" as const, status: "ACTIVE" as const, createdAt: daysAgo(6) },
  { id: IDS.opportunities.iotInvestment, authorId: IDS.users.james, title: "Series A Investment in Industrial IoT Platform", description: "Pacific Capital is leading a $5M Series A round for a promising industrial IoT startup. Looking for co-investors and strategic partners.", type: "INVESTMENT" as const, tags: ["iot", "investment", "series-a", "industrial-tech"], visibility: "NETWORK" as const, commMode: "PRIVATE" as const, status: "ACTIVE" as const, createdAt: daysAgo(6) },
  { id: IDS.opportunities.supplyChain, authorId: IDS.users.sofia, title: "Electronics Supply Chain Optimization — Joint Venture", description: "Nordic Components is seeking partners for a joint venture to build a shared warehousing and logistics network for electronics components across the EU.", type: "SUPPLY" as const, tags: ["electronics", "supply-chain", "eu", "logistics"], visibility: "OPEN" as const, commMode: "GROUP" as const, status: "ACTIVE" as const, createdAt: daysAgo(5) },
];

// ── Bot profiling conversations (1 per user) ──
function profilingConversations(botId: string) {
  return DEMO_USERS.map((u, idx) => ({
    topic: "PROFILING" as const,
    createdById: botId,
    participants: [botId, u.id],
    baseTime: daysAgo(14 - idx, 10),
    messages: [
      { senderId: botId, content: `Hi ${u.firstName}! 👋 I'm Xpylon, your networking assistant.` },
      { senderId: botId, content: `I'm here to help you get the most out of Xpylon Connect — from setting up your profile to finding the right business connections.` },
      { senderId: botId, content: `To get started, what's your role at ${DEMO_COMPANIES.find(c => c.id === u.companyId)?.name}?` },
      { senderId: u.id, content: `I'm ${u.role}. ${u.bio?.split('.')[0]}.` },
      { senderId: botId, content: `Great! I've optimized your profile for smart matching. You'll start getting relevant suggestions soon.` },
      { senderId: botId, content: `In the meantime, you can invite contacts from your network or ask me to find professionals in your industry.` },
    ],
  }));
}

// ── Bot opportunity creation conversations (1 per opportunity) ──
function opportunityCreationConversations(botId: string) {
  const TYPE_LABELS: Record<string, string> = { PARTNERSHIP: "partnership", DISTRIBUTION: "distribution deal", INVESTMENT: "investment opportunity", SUPPLY: "supply contract" };

  return DEMO_OPPORTUNITIES.map((opp) => ({
    topic: "OPPORTUNITY_CREATION" as const,
    name: opp.title,
    opportunityId: opp.id,
    createdById: botId,
    participants: [botId, opp.authorId],
    baseTime: new Date(opp.createdAt.getTime() - 30 * 60 * 1000), // 30 min before opp creation
    messages: [
      { senderId: botId, content: `Hi! Let's create a new business opportunity. What kind of opportunity are you looking to share?` },
      { senderId: opp.authorId, content: `I'd like to post a ${TYPE_LABELS[opp.type] || 'business opportunity'}.` },
      { senderId: botId, content: `Great! What title would you give it?` },
      { senderId: opp.authorId, content: opp.title.replace(/ — .*/, '') },
      { senderId: botId, content: `Nice. Can you describe it in a few sentences?` },
      { senderId: opp.authorId, content: opp.description.split('.').slice(0, 2).join('.') + '.' },
      { senderId: botId, content: `Here's a summary of your opportunity:\n\n- **Type:** ${opp.type}\n- **Title:** ${opp.title}\n- **Visibility:** ${opp.visibility}\n- **Communication:** ${opp.commMode === 'GROUP' ? 'Group chat' : 'Private chats'}\n\nShall I publish it?` },
      { senderId: opp.authorId, content: `Yes, publish it.` },
      { senderId: botId, content: `Your opportunity "${opp.title}" has been published! It's now visible to ${opp.visibility === 'OPEN' ? 'everyone' : 'matching professionals in the network'}. You can manage it from the Opportunities tab.` },
    ],
  }));
}

// ── Direct themed conversations between users ──
const DIRECT_CONVERSATIONS = [
  {
    name: "AI Quality Control Distribution",
    participants: [IDS.users.marco, IDS.users.elena],
    baseTime: daysAgo(5, 8),
    messages: [
      { senderId: IDS.users.marco, content: "Hi Elena, I saw your profile — your distribution network across Southern Europe sounds impressive. We're looking for exactly that kind of reach for our AI quality control system." },
      { senderId: IDS.users.elena, content: "Thanks Marco! I've been following the AI manufacturing space. What kind of products would need distribution?" },
      { senderId: IDS.users.marco, content: "Primarily hardware units with embedded cameras and software licenses. Think industrial-grade inspection stations." },
      { senderId: IDS.users.elena, content: "That's interesting — we already work with several automotive parts manufacturers. Let me review our coverage map and get back to you with a proposal." },
    ],
  },
  {
    name: "DACH Market Entry",
    participants: [IDS.users.marco, IDS.users.elena],
    baseTime: daysAgo(2, 4),
    messages: [
      { senderId: IDS.users.marco, content: "Elena, I've been thinking — we should also discuss a broader DACH market entry strategy. Not just distribution, but local partnerships." },
      { senderId: IDS.users.elena, content: "Good idea. Germany is our strongest market. We have offices in Munich and Hamburg." },
      { senderId: IDS.users.marco, content: "Perfect. Could we set up a call next week to map out the plan? I'd like to involve our VP of Sales." },
      { senderId: IDS.users.elena, content: "Sure, how about Wednesday afternoon? I'll prepare an overview of our German partner network." },
    ],
  },
  {
    name: "Investment in Mediterranean Foods",
    participants: [IDS.users.james, IDS.users.luca],
    baseTime: daysAgo(5, 6),
    messages: [
      { senderId: IDS.users.james, content: "Luca, Mediterranean Foods caught our attention. Pacific Capital is interested in the premium food export space. Could you share your current revenue figures?" },
      { senderId: IDS.users.luca, content: "Sure, James. We did €4.2M last year with 35% margins. Growth has been 25% YoY for the past three years." },
      { senderId: IDS.users.james, content: "Those are solid numbers. We typically invest at the Series A stage — are you looking for capital to scale distribution?" },
      { senderId: IDS.users.luca, content: "Exactly. We need to build out our cold chain logistics and hire dedicated sales teams for the DACH and Nordic markets." },
    ],
  },
  {
    name: "Revenue Growth Strategy",
    participants: [IDS.users.james, IDS.users.luca],
    baseTime: daysAgo(3, 2),
    messages: [
      { senderId: IDS.users.james, content: "Luca, following up on our investment discussion — what's your customer acquisition strategy for the next 18 months?" },
      { senderId: IDS.users.luca, content: "We're focused on B2B channels: food service distributors, specialty retailers, and hotel chains. We've already secured trials with two Michelin-star restaurant groups." },
      { senderId: IDS.users.james, content: "That's a great channel. We should discuss unit economics — what's your CAC and LTV look like?" },
      { senderId: IDS.users.luca, content: "I'll prepare a full breakdown for our next call. The short version: LTV:CAC ratio is about 5:1, which we think can improve with scale." },
    ],
  },
  {
    name: "AI + IoT Synergies",
    participants: [IDS.users.marco, IDS.users.james],
    baseTime: daysAgo(4, 5),
    messages: [
      { senderId: IDS.users.marco, content: "James, I saw you're investing in industrial IoT. Our AI quality control system has a strong IoT component — would love to discuss potential synergies." },
      { senderId: IDS.users.james, content: "Absolutely, Marco. We believe AI + IoT in manufacturing is a massive opportunity. Let's set up a call next week." },
      { senderId: IDS.users.marco, content: "Great. We could also explore a strategic investment angle if the portfolio company needs AI capabilities." },
    ],
  },
  {
    name: "Italian Food Distribution",
    participants: [IDS.users.elena, IDS.users.luca],
    baseTime: daysAgo(5, 3),
    messages: [
      { senderId: IDS.users.luca, content: "Elena, Alpine Distribution seems like a perfect fit for our products. We're looking for someone who understands premium food in German-speaking markets." },
      { senderId: IDS.users.elena, content: "We've distributed Italian specialty products before. Our network covers 2,000+ retail points in Germany, Austria, and Switzerland." },
      { senderId: IDS.users.luca, content: "That sounds great. I'd love to send you samples and discuss volume pricing. When's good for a video call?" },
      { senderId: IDS.users.elena, content: "How about Thursday afternoon? I'll have our logistics team join to discuss cold chain requirements." },
      { senderId: IDS.users.luca, content: "Thursday works. I'll also prepare a pricing sheet for different volume tiers." },
      { senderId: IDS.users.elena, content: "Exactly. We need to build out our cold chain logistics and understand minimum order quantities." },
    ],
  },
  {
    name: "EU Warehousing JV Structure",
    participants: [IDS.users.sofia, IDS.users.anna],
    baseTime: daysAgo(4, 7),
    messages: [
      { senderId: IDS.users.sofia, content: "Anna, I heard Weber & Partners has experience with cross-border logistics partnerships. We're exploring a joint venture for shared EU warehousing." },
      { senderId: IDS.users.anna, content: "Yes, we structured a similar deal last year in the semiconductor space. The regulatory considerations across EU markets can be tricky." },
      { senderId: IDS.users.sofia, content: "That's exactly the kind of expertise we need. Could you advise on the partnership structure?" },
      { senderId: IDS.users.anna, content: "Of course. I'll draft a preliminary framework — there are two main models: equity JV or contractual alliance. Each has different tax implications." },
    ],
  },
  {
    name: "Quality Control for Electronics",
    participants: [IDS.users.sofia, IDS.users.marco],
    baseTime: daysAgo(3, 6),
    messages: [
      { senderId: IDS.users.sofia, content: "Marco, I saw your AI quality control opportunity. We have exactly the kind of manufacturing lines that could benefit from visual inspection." },
      { senderId: IDS.users.marco, content: "That's great to hear, Sofia! What kind of components do you inspect currently?" },
      { senderId: IDS.users.sofia, content: "Mostly PCBs and connector assemblies. Our current defect rate is around 2.5% — if your system can cut that by 40%, it would save us hundreds of thousands annually." },
      { senderId: IDS.users.marco, content: "We've seen similar results with electronics manufacturers. I'd love to set up a pilot — we can start with one production line." },
    ],
  },
  {
    name: "M&A Advisory",
    participants: [IDS.users.anna, IDS.users.james],
    baseTime: daysAgo(2, 3),
    messages: [
      { senderId: IDS.users.james, content: "Anna, Pacific Capital is looking at a potential acquisition in the logistics-tech space. Would Weber & Partners be interested in an advisory mandate?" },
      { senderId: IDS.users.anna, content: "Definitely. We've closed three logistics M&A deals in the past two years. What's the target profile?" },
      { senderId: IDS.users.james, content: "Mid-market, €10-30M revenue, strong DACH presence. We want a company with last-mile delivery technology." },
      { senderId: IDS.users.anna, content: "I know the space well. Let me pull together a shortlist of potential targets and we can discuss terms for the advisory engagement." },
    ],
  },
];

// ── All connections (fully connected) ──
function generateConnections() {
  const userIds = Object.values(IDS.users);
  const pairs: { requesterId: string; addresseeId: string }[] = [];
  for (let i = 0; i < userIds.length; i++) {
    for (let j = i + 1; j < userIds.length; j++) {
      pairs.push({ requesterId: userIds[i], addresseeId: userIds[j] });
    }
  }
  return pairs;
}

// ── Seed function ──
async function seed() {
  console.log("Seeding demo data...\n");

  // ── Cleanup ──
  console.log("Cleaning existing demo data...");
  const existingDemoUsers = await prisma.user.findMany({ where: { isDemo: true }, select: { id: true } });
  const demoUserIds = existingDemoUsers.map((u) => u.id);

  if (demoUserIds.length > 0) {
    // Find all conversations with demo members to delete dependent records
    const demoConvs = await prisma.conversation.findMany({
      where: { OR: [{ createdById: { in: demoUserIds } }] },
      select: { id: true },
    });
    const demoConvIds = demoConvs.map((c) => c.id);
    if (demoConvIds.length > 0) {
      await prisma.callRecording.deleteMany({ where: { call: { conversationId: { in: demoConvIds } } } }).catch(() => {});
      await prisma.call.deleteMany({ where: { conversationId: { in: demoConvIds } } }).catch(() => {});
      await prisma.reminder.deleteMany({ where: { conversationId: { in: demoConvIds } } }).catch(() => {});
    }
    await prisma.cardImport.deleteMany({ where: { userId: { in: demoUserIds } } }).catch(() => {});
    await prisma.messageReceipt.deleteMany({ where: { message: { conversation: { members: { some: { userId: { in: demoUserIds } } } } } } });
    await prisma.message.deleteMany({ where: { conversation: { members: { some: { userId: { in: demoUserIds } } } } } });
    await prisma.conversationMember.deleteMany({ where: { conversation: { members: { some: { userId: { in: demoUserIds } } } } } });
    await prisma.conversation.deleteMany({ where: { OR: [{ createdById: { in: demoUserIds } }] } });
    await prisma.opportunityInterest.deleteMany({ where: { OR: [{ userId: { in: demoUserIds } }, { opportunity: { authorId: { in: demoUserIds } } }] } });
    await prisma.opportunitySaved.deleteMany({ where: { OR: [{ userId: { in: demoUserIds } }, { opportunity: { authorId: { in: demoUserIds } } }] } });
    await prisma.opportunity.deleteMany({ where: { authorId: { in: demoUserIds } } });
    await prisma.connection.deleteMany({ where: { OR: [{ requesterId: { in: demoUserIds } }, { addresseeId: { in: demoUserIds } }] } });
    await prisma.fcmToken.deleteMany({ where: { userId: { in: demoUserIds } } });
    await prisma.user.deleteMany({ where: { isDemo: true } });
  }

  // ── Companies ──
  console.log("Creating companies...");
  for (const c of DEMO_COMPANIES) {
    await prisma.company.upsert({ where: { id: c.id }, update: { name: c.name }, create: c });
  }

  // ── Users ──
  console.log("Creating demo users...");
  for (const u of DEMO_USERS) {
    await prisma.user.create({ data: u });
  }

  // ── Bot user ──
  console.log("Ensuring bot user exists...");
  let bot = await prisma.user.findUnique({ where: { phone: BOT_PHONE } });
  if (!bot) {
    bot = await prisma.user.create({
      data: { phone: BOT_PHONE, firstName: "Xpylon", lastName: "Assistant", bio: "Your AI-powered networking assistant", role: "AI Assistant", profileCompleted: true, isOnline: true },
    });
  }
  const botId = bot.id;

  // ── Connections ──
  console.log("Creating connections (fully connected)...");
  const connections = generateConnections();
  for (const conn of connections) {
    await prisma.connection.create({ data: { ...conn, status: "ACCEPTED" } });
  }

  // ── Opportunities ──
  console.log("Creating opportunities...");
  for (const opp of DEMO_OPPORTUNITIES) {
    await prisma.opportunity.create({ data: opp });
    if (opp.commMode === "GROUP") {
      await prisma.conversation.create({
        data: {
          type: "OPPORTUNITY_GROUP", topic: "OPPORTUNITY_DISCUSSION",
          name: opp.title, opportunityName: opp.title, opportunityId: opp.id,
          createdById: opp.authorId,
          members: { create: [{ userId: opp.authorId }] },
        },
      });
    }
  }

  // ── Helper to create a conversation with messages ──
  async function createConv(opts: {
    type?: string; topic?: string; name?: string; opportunityId?: string;
    createdById: string; participants: string[];
    baseTime: Date; messages: { senderId: string; content: string }[];
  }) {
    const conv = await prisma.conversation.create({
      data: {
        type: (opts.type || "DIRECT") as any,
        topic: (opts.topic || "GENERAL") as any,
        name: opts.name || null,
        opportunityId: opts.opportunityId || null,
        createdById: opts.createdById,
        members: { create: opts.participants.map((userId) => ({ userId })) },
      },
    });
    for (let i = 0; i < opts.messages.length; i++) {
      await prisma.message.create({
        data: {
          conversationId: conv.id,
          senderId: opts.messages[i].senderId,
          content: opts.messages[i].content,
          type: "TEXT",
          createdAt: new Date(opts.baseTime.getTime() + i * 20 * 60 * 1000), // 20 min apart
        },
      });
    }
    return conv;
  }

  // ── Bot profiling conversations ──
  console.log("Creating bot profiling conversations...");
  const profilingConvs = profilingConversations(botId);
  for (const pc of profilingConvs) {
    await createConv(pc);
  }

  // ── Bot opportunity creation conversations ──
  console.log("Creating bot opportunity creation conversations...");
  const oppCreationConvs = opportunityCreationConversations(botId);
  for (const oc of oppCreationConvs) {
    await createConv(oc);
  }

  // ── Direct themed conversations ──
  console.log("Creating themed direct conversations...");
  for (const dc of DIRECT_CONVERSATIONS) {
    await createConv({
      createdById: dc.participants[0],
      participants: dc.participants,
      name: dc.name,
      baseTime: dc.baseTime,
      messages: dc.messages,
    });
  }

  // ── Opportunity interests + group members + group messages ──
  console.log("Creating opportunity interests and group discussions...");

  // --- AI Quality Control (GROUP, by Marco) ---
  // Elena, Sofia, James interested
  await prisma.opportunityInterest.create({ data: { opportunityId: IDS.opportunities.aiQuality, userId: IDS.users.elena, status: "ACCEPTED" } });
  await prisma.opportunityInterest.create({ data: { opportunityId: IDS.opportunities.aiQuality, userId: IDS.users.sofia, status: "ACCEPTED" } });
  await prisma.opportunityInterest.create({ data: { opportunityId: IDS.opportunities.aiQuality, userId: IDS.users.james, status: "PENDING" } });

  const aiGroupConv = await prisma.conversation.findFirst({ where: { opportunityId: IDS.opportunities.aiQuality } });
  if (aiGroupConv) {
    // Add accepted members to group
    await prisma.conversationMember.create({ data: { conversationId: aiGroupConv.id, userId: IDS.users.elena } }).catch(() => {});
    await prisma.conversationMember.create({ data: { conversationId: aiGroupConv.id, userId: IDS.users.sofia } }).catch(() => {});

    // Group messages
    const aiGroupMsgs = [
      { senderId: IDS.users.marco, content: "Welcome everyone! This group is for discussing the AI Quality Control partnership opportunity. Let me give you a quick overview.", time: daysAgo(5, 6) },
      { senderId: IDS.users.marco, content: "Our system uses computer vision to detect manufacturing defects in real-time. We've achieved 40% defect reduction in pilot programs with two automotive suppliers.", time: daysAgo(5, 5) },
      { senderId: IDS.users.elena, content: "This is very interesting, Marco. From a distribution standpoint, how do you handle installation and maintenance across different countries?", time: daysAgo(5, 4) },
      { senderId: IDS.users.marco, content: "Great question. We have a certified installer network, but we're looking to expand it. That's one area where a distribution partner could add real value.", time: daysAgo(5, 3) },
      { senderId: IDS.users.sofia, content: "From our side at Nordic Components, we'd be interested as a pilot customer. Our PCB inspection line runs 24/7 and current manual checks are a bottleneck.", time: daysAgo(4, 8) },
      { senderId: IDS.users.marco, content: "Sofia, that's a perfect use case. PCB inspection is one of our strongest verticals. We could set up a 30-day pilot at no cost.", time: daysAgo(4, 7) },
      { senderId: IDS.users.elena, content: "If the pilot goes well with Nordic Components, we could use that as a reference case for the DACH market. I have 15 manufacturing clients who would be interested.", time: daysAgo(4, 6) },
      { senderId: IDS.users.sofia, content: "That makes sense. Let's coordinate the pilot timeline — we'd want to run it on our Malmö production line first.", time: daysAgo(3, 5) },
      { senderId: IDS.users.marco, content: "Perfect. I'll prepare a technical spec document and share it here. We can schedule the installation for next month if the timeline works.", time: daysAgo(3, 4) },
      { senderId: IDS.users.elena, content: "Sounds like a plan. I'll also draft a distribution partnership proposal in the meantime so we can move fast once the pilot results are in.", time: daysAgo(2, 6) },
      { senderId: IDS.users.sofia, content: "One more thing — our quality team will need training on the system. How long does that typically take?", time: daysAgo(2, 5) },
      { senderId: IDS.users.marco, content: "Usually 2 days of on-site training. We also provide remote support for the first 3 months. I'll add the training plan to the spec document.", time: daysAgo(2, 4) },
    ];
    for (const msg of aiGroupMsgs) {
      await prisma.message.create({
        data: { conversationId: aiGroupConv.id, senderId: msg.senderId, content: msg.content, type: "TEXT", createdAt: msg.time },
      });
    }
  }

  // --- Italian Food (PRIVATE, by Luca) ---
  await prisma.opportunityInterest.create({ data: { opportunityId: IDS.opportunities.italianFood, userId: IDS.users.elena, status: "ACCEPTED" } });
  await prisma.opportunityInterest.create({ data: { opportunityId: IDS.opportunities.italianFood, userId: IDS.users.anna, status: "PENDING" } });

  // --- IoT Investment (PRIVATE, by James) ---
  await prisma.opportunityInterest.create({ data: { opportunityId: IDS.opportunities.iotInvestment, userId: IDS.users.marco, status: "PENDING" } });
  await prisma.opportunityInterest.create({ data: { opportunityId: IDS.opportunities.iotInvestment, userId: IDS.users.sofia, status: "ACCEPTED" } });

  // --- Supply Chain (GROUP, by Sofia) ---
  // Anna, Marco, Elena interested
  await prisma.opportunityInterest.create({ data: { opportunityId: IDS.opportunities.supplyChain, userId: IDS.users.anna, status: "ACCEPTED" } });
  await prisma.opportunityInterest.create({ data: { opportunityId: IDS.opportunities.supplyChain, userId: IDS.users.marco, status: "ACCEPTED" } });
  await prisma.opportunityInterest.create({ data: { opportunityId: IDS.opportunities.supplyChain, userId: IDS.users.elena, status: "PENDING" } });

  const supplyGroupConv = await prisma.conversation.findFirst({ where: { opportunityId: IDS.opportunities.supplyChain } });
  if (supplyGroupConv) {
    await prisma.conversationMember.create({ data: { conversationId: supplyGroupConv.id, userId: IDS.users.anna } }).catch(() => {});
    await prisma.conversationMember.create({ data: { conversationId: supplyGroupConv.id, userId: IDS.users.marco } }).catch(() => {});

    const supplyGroupMsgs = [
      { senderId: IDS.users.sofia, content: "Welcome to the Supply Chain Optimization group! The goal is to build a shared warehousing network for electronics components across the EU.", time: daysAgo(4, 10) },
      { senderId: IDS.users.sofia, content: "Currently, most electronics manufacturers maintain their own warehouses in each country. By pooling resources, we can cut lead times by 50% and reduce costs by 30%.", time: daysAgo(4, 9) },
      { senderId: IDS.users.anna, content: "I've worked on similar JV structures in the semiconductor space. The key legal question is whether to go with an equity JV or a contractual alliance.", time: daysAgo(4, 8) },
      { senderId: IDS.users.marco, content: "From TechVentures' perspective, we'd benefit from faster component delivery for our AI inspection hardware. We currently wait 3-4 weeks for some parts.", time: daysAgo(4, 7) },
      { senderId: IDS.users.sofia, content: "Exactly the problem we want to solve. With shared regional hubs in the Netherlands, Germany, and Poland, we could get that down to 3-4 days.", time: daysAgo(3, 8) },
      { senderId: IDS.users.anna, content: "I'd recommend starting with a contractual alliance — less regulatory burden, faster to set up. We can always convert to equity JV later if it works well.", time: daysAgo(3, 7) },
      { senderId: IDS.users.marco, content: "That sounds pragmatic. What about the capital requirements? Each hub would need significant inventory investment.", time: daysAgo(3, 6) },
      { senderId: IDS.users.sofia, content: "I've modeled it out — roughly €2M per hub for initial inventory, with each partner contributing proportionally to their usage volume.", time: daysAgo(3, 5) },
      { senderId: IDS.users.anna, content: "The financing structure is important. I'd suggest looking at EU grants for cross-border logistics infrastructure — there are several programs available.", time: daysAgo(2, 8) },
      { senderId: IDS.users.sofia, content: "Great idea, Anna. Can you share some links to the relevant programs? We should factor that into the business case.", time: daysAgo(2, 7) },
      { senderId: IDS.users.marco, content: "I can also check if our IoT sensors could be used for inventory tracking in the shared hubs. That would add a tech angle for the EU grants.", time: daysAgo(2, 6) },
      { senderId: IDS.users.anna, content: "Perfect. I'll prepare a draft alliance agreement and share it here by Friday. Then we can review together and adjust the terms.", time: daysAgo(1, 4) },
      { senderId: IDS.users.sofia, content: "Sounds like a plan. Let's also schedule a video call next week to align on the location shortlist for the first hub.", time: daysAgo(1, 3) },
    ];
    for (const msg of supplyGroupMsgs) {
      await prisma.message.create({
        data: { conversationId: supplyGroupConv.id, senderId: msg.senderId, content: msg.content, type: "TEXT", createdAt: msg.time },
      });
    }
  }

  // ── Summary ──
  const totalConvs = profilingConvs.length + oppCreationConvs.length + DIRECT_CONVERSATIONS.length + 2; // +2 for opportunity groups
  const totalMsgs = profilingConvs.reduce((s, c) => s + c.messages.length, 0)
    + oppCreationConvs.reduce((s, c) => s + c.messages.length, 0)
    + DIRECT_CONVERSATIONS.reduce((s, c) => s + c.messages.length, 0);

  console.log("\nDemo data seeded successfully!");
  console.log(`  - ${DEMO_COMPANIES.length} companies`);
  console.log(`  - ${DEMO_USERS.length} users`);
  console.log(`  - ${connections.length} connections`);
  console.log(`  - ${totalConvs} conversations (${profilingConvs.length} profiling + ${oppCreationConvs.length} opp creation + ${DIRECT_CONVERSATIONS.length} direct + 2 groups)`);
  console.log(`  - ${totalMsgs} messages`);
  console.log(`  - ${DEMO_OPPORTUNITIES.length} opportunities`);
  console.log(`  - 3 opportunity interests`);
  console.log(`\nDemo OTP code: ${process.env.DEMO_OTP_CODE || "116261"}`);
}

seed()
  .catch((err) => { console.error("Seed error:", err); process.exit(1); })
  .finally(() => prisma.$disconnect());

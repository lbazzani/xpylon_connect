-- CreateEnum
CREATE TYPE "OpportunityType" AS ENUM ('PARTNERSHIP', 'DISTRIBUTION', 'INVESTMENT', 'SUPPLY', 'ACQUISITION', 'OTHER');
CREATE TYPE "OpportunityVisibility" AS ENUM ('INVITE_ONLY', 'NETWORK', 'OPEN');
CREATE TYPE "CommMode" AS ENUM ('PRIVATE', 'GROUP');
CREATE TYPE "OpportunityStatus" AS ENUM ('ACTIVE', 'PAUSED', 'CLOSED');
CREATE TYPE "InterestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

-- CreateTable Opportunity
CREATE TABLE "Opportunity" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "OpportunityType" NOT NULL,
    "tags" TEXT[],
    "visibility" "OpportunityVisibility" NOT NULL,
    "commMode" "CommMode" NOT NULL,
    "status" "OpportunityStatus" NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Opportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable OpportunityInterest
CREATE TABLE "OpportunityInterest" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "InterestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OpportunityInterest_pkey" PRIMARY KEY ("id")
);

-- CreateTable OpportunitySaved
CREATE TABLE "OpportunitySaved" (
    "opportunityId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OpportunitySaved_pkey" PRIMARY KEY ("opportunityId","userId")
);

-- Add opportunityId to Conversation
ALTER TABLE "Conversation" ADD COLUMN "opportunityId" TEXT;

-- CreateIndexes
CREATE INDEX "Opportunity_authorId_idx" ON "Opportunity"("authorId");
CREATE INDEX "Opportunity_status_idx" ON "Opportunity"("status");
CREATE INDEX "Opportunity_type_idx" ON "Opportunity"("type");
CREATE UNIQUE INDEX "OpportunityInterest_opportunityId_userId_key" ON "OpportunityInterest"("opportunityId", "userId");
CREATE INDEX "OpportunityInterest_opportunityId_idx" ON "OpportunityInterest"("opportunityId");
CREATE INDEX "OpportunityInterest_userId_idx" ON "OpportunityInterest"("userId");

-- AddForeignKeys
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OpportunityInterest" ADD CONSTRAINT "OpportunityInterest_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OpportunityInterest" ADD CONSTRAINT "OpportunityInterest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OpportunitySaved" ADD CONSTRAINT "OpportunitySaved_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OpportunitySaved" ADD CONSTRAINT "OpportunitySaved_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

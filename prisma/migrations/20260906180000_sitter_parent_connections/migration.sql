-- CreateTable
CREATE TABLE "Connection" (
    "id" TEXT NOT NULL,
    "sitterId" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "respondedAt" TIMESTAMP(3),
    CONSTRAINT "Connection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invite" (
    "token" TEXT NOT NULL,
    "sitterId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    CONSTRAINT "Invite_pkey" PRIMARY KEY ("token")
);

-- CreateIndex
CREATE UNIQUE INDEX "Connection_sitterId_parentId_key" ON "Connection"("sitterId", "parentId");

-- CreateIndex
CREATE INDEX "Connection_parentId_idx" ON "Connection"("parentId");

-- CreateIndex
CREATE INDEX "Invite_sitterId_idx" ON "Invite"("sitterId");

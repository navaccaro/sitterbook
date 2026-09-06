-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Booking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "availabilityId" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "sitterId" TEXT NOT NULL,
    "start" DATETIME NOT NULL,
    "end" DATETIME NOT NULL,
    "status" TEXT NOT NULL,
    "parentName" TEXT NOT NULL,
    "notes" TEXT NOT NULL DEFAULT ''
);
INSERT INTO "new_Booking" ("availabilityId", "end", "id", "parentId", "parentName", "sitterId", "start", "status") SELECT "availabilityId", "end", "id", "parentId", "parentName", "sitterId", "start", "status" FROM "Booking";
DROP TABLE "Booking";
ALTER TABLE "new_Booking" RENAME TO "Booking";
CREATE TABLE "new_RegistrationRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "primaryContactName" TEXT NOT NULL DEFAULT '',
    "primaryPhone" TEXT NOT NULL DEFAULT '',
    "secondaryContactName" TEXT NOT NULL DEFAULT '',
    "secondaryPhone" TEXT NOT NULL DEFAULT '',
    "addressLine1" TEXT NOT NULL DEFAULT '',
    "addressLine2" TEXT NOT NULL DEFAULT '',
    "city" TEXT NOT NULL DEFAULT '',
    "state" TEXT NOT NULL DEFAULT '',
    "postalCode" TEXT NOT NULL DEFAULT '',
    "additionalInfo" TEXT NOT NULL DEFAULT '',
    "requestedAt" DATETIME NOT NULL
);
INSERT INTO "new_RegistrationRequest" ("email", "id", "name", "provider", "requestedAt", "status") SELECT "email", "id", "name", "provider", "requestedAt", "status" FROM "RegistrationRequest";
DROP TABLE "RegistrationRequest";
ALTER TABLE "new_RegistrationRequest" RENAME TO "RegistrationRequest";
CREATE UNIQUE INDEX "RegistrationRequest_email_key" ON "RegistrationRequest"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

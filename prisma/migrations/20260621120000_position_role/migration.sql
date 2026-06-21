-- Position constructor: each job title carries an access level + colour.
ALTER TABLE "Position" ADD COLUMN "role" "Role" NOT NULL DEFAULT 'MEMBER';
ALTER TABLE "Position" ADD COLUMN "color" TEXT NOT NULL DEFAULT 'gray';

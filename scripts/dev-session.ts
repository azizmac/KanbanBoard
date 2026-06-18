// Dev utility: create a session for a user and print the cookie token.
//   npx tsx scripts/dev-session.ts [username]
import "dotenv/config";
import { randomBytes } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
  const username = process.argv[2] ?? "anna";
  const user = await prisma.user.findFirst({ where: { username } });
  if (!user) {
    console.error(`No user with username "${username}"`);
    process.exit(1);
  }
  const token = randomBytes(32).toString("hex");
  await prisma.session.create({
    data: { token, userId: user.id, expiresAt: new Date(Date.now() + 86_400_000) },
  });
  console.log(token);
}

main().finally(async () => {
  await prisma.$disconnect();
});

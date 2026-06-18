// Dev utility: print the Telegram deep-link that connects a chat to an app user.
//   npx tsx scripts/dev-link.ts [username]
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { makeLinkToken } from "../src/lib/telegram-link";

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
  const bot = process.env.TELEGRAM_BOT_USERNAME;
  const token = makeLinkToken(user.id);
  console.log(`${user.name} (@${username}, role ${user.role})`);
  console.log(`https://t.me/${bot}?start=${token}`);
}

main().finally(() => prisma.$disconnect());

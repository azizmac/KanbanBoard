import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

function daysFromNow(n: number) {
  return new Date(Date.now() + n * 24 * 60 * 60 * 1000);
}

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Demo seed is disabled in production (it would create test users and wipe data). " +
        "Use the admin panel to add real users instead.",
    );
  }

  console.log("Clearing existing data…");
  await prisma.notification.deleteMany();
  await prisma.mention.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.task.deleteMany();
  await prisma.column.deleteMany();
  await prisma.board.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();

  console.log("Creating users…");
  const anna = await prisma.user.create({
    data: { name: "Анна Ковалёва", username: "anna", role: "ADMIN", position: "CEO / Founder" },
  });
  const dmitry = await prisma.user.create({
    data: { name: "Дмитрий Соколов", username: "dmitry", role: "MANAGER", position: "Tech Lead", managerId: anna.id },
  });
  const elena = await prisma.user.create({
    data: { name: "Елена Морозова", username: "elena", role: "MANAGER", position: "Product Manager", managerId: anna.id },
  });

  const memberSpecs: Array<[string, string, string, string]> = [
    ["Игорь Волков", "igor", "Backend Developer", dmitry.id],
    ["Мария Новикова", "maria", "Frontend Developer", dmitry.id],
    ["Павел Лебедев", "pavel", "QA Engineer", dmitry.id],
    ["Сергей Попов", "sergey", "Mobile Developer", dmitry.id],
    ["Алексей Смирнов", "alexey", "DevOps Engineer", dmitry.id],
    ["Ольга Зайцева", "olga", "UX/UI Designer", elena.id],
    ["Наталья Орлова", "natalia", "Marketing Manager", elena.id],
  ];

  const members = [];
  for (const [name, username, position, managerId] of memberSpecs) {
    members.push(
      await prisma.user.create({
        data: { name, username, position, role: "MEMBER", managerId },
      }),
    );
  }
  const [igor, maria, pavel, sergey, alexey, olga, natalia] = members;

  console.log("Creating board & columns…");
  const board = await prisma.board.create({
    data: {
      name: "Главная доска",
      columns: {
        create: [
          { name: "Бэклог", position: 0 },
          { name: "В работе", position: 1 },
          { name: "На проверке", position: 2 },
          { name: "Готово", position: 3 },
        ],
      },
    },
    include: { columns: { orderBy: { position: "asc" } } },
  });
  const [backlog, inProgress, review, done] = board.columns;

  console.log("Creating sample tasks…");
  const tasks: Array<Parameters<typeof prisma.task.create>[0]["data"]> = [
    {
      title: "Сверстать страницу логина",
      description: "Минималистичный экран входа через Telegram.",
      columnId: backlog.id, position: 0, creatorId: elena.id, assigneeId: maria.id,
      priority: "NORMAL", dueDate: daysFromNow(5),
    },
    {
      title: "Настроить CI/CD пайплайн",
      description: "Автодеплой на staging при пуше в main.",
      columnId: backlog.id, position: 1, creatorId: dmitry.id, assigneeId: alexey.id,
      priority: "LOW",
    },
    {
      title: "API для задач (CRUD)",
      description: "Эндпоинты создания, обновления и перемещения задач.",
      columnId: inProgress.id, position: 0, creatorId: dmitry.id, assigneeId: igor.id,
      priority: "HIGH", dueDate: daysFromNow(2),
    },
    {
      title: "Дизайн канбан-доски",
      description: "Колонки, карточки, состояния перетаскивания.",
      columnId: inProgress.id, position: 1, creatorId: elena.id, assigneeId: olga.id,
      priority: "NORMAL",
    },
    {
      title: "Push-уведомления в Telegram",
      description: "Уведомлять об упоминаниях и назначениях.",
      columnId: review.id, position: 0, creatorId: dmitry.id, assigneeId: sergey.id,
      priority: "URGENT", dueDate: daysFromNow(1),
    },
    {
      title: "Тест-кейсы для авторизации",
      columnId: review.id, position: 1, creatorId: pavel.id, assigneeId: pavel.id,
      priority: "NORMAL",
    },
    {
      title: "Лендинг и анонс продукта",
      description: "Подготовить маркетинговую страницу к релизу.",
      columnId: done.id, position: 0, creatorId: elena.id, assigneeId: natalia.id,
      priority: "LOW",
    },
  ];

  for (const data of tasks) {
    await prisma.task.create({ data });
  }

  console.log(`✅ Seed done: ${3 + members.length} users, 1 board, ${tasks.length} tasks.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

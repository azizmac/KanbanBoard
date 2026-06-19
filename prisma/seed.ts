import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

function daysFromNow(n: number) {
  return new Date(Date.now() + n * 24 * 60 * 60 * 1000);
}

const COLUMNS = ["Бэклог", "В работе", "На ревью", "Готово"];

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
  await prisma.checklistItem.deleteMany();
  await prisma.task.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.column.deleteMany();
  await prisma.group.deleteMany();
  await prisma.board.deleteMany();
  await prisma.region.deleteMany();
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
      await prisma.user.create({ data: { name, username, position, role: "MEMBER", managerId } }),
    );
  }
  const [igor, maria, pavel, sergey, alexey, olga, natalia] = members;

  console.log("Creating regions…");
  const sever = await prisma.region.create({
    data: { name: "Север", color: "blue", managers: { connect: [{ id: dmitry.id }] } },
  });
  const yug = await prisma.region.create({
    data: { name: "Юг", color: "amber", managers: { connect: [{ id: elena.id }] } },
  });

  async function makeBoard(name: string, color: string, regionId: string) {
    const board = await prisma.board.create({
      data: {
        name,
        color,
        regionId,
        columns: { create: COLUMNS.map((n, position) => ({ name: n, position })) },
      },
      include: { columns: { orderBy: { position: "asc" } } },
    });
    const [backlog, inProgress, review, done] = board.columns;
    return { board, backlog, inProgress, review, done };
  }

  console.log("Creating boards…");
  const dev = await makeBoard("Разработка платформы", "iris", sever.id);

  // tags for the dev board
  const tPay = await prisma.tag.create({ data: { name: "Платежи", color: "pink", boardId: dev.board.id } });
  const tDesign = await prisma.tag.create({ data: { name: "Дизайн", color: "amber", boardId: dev.board.id } });
  const tApi = await prisma.tag.create({ data: { name: "API", color: "blue", boardId: dev.board.id } });

  const payTask = await prisma.task.create({
    data: {
      title: "Интеграция платёжного шлюза ЮKassa",
      description: "Подключить приём платежей и вебхуки. Согласовать с @dmitry лимиты.",
      columnId: dev.inProgress.id, position: 0, creatorId: dmitry.id, assigneeId: sergey.id,
      priority: "URGENT", dueDate: daysFromNow(1), tags: { connect: [{ id: tPay.id }] },
      checklist: {
        create: [
          { text: "Завести тестовый аккаунт ЮKassa", done: true, position: 0 },
          { text: "Реализовать создание платежа", done: true, position: 1 },
          { text: "Обработка вебхуков статуса", done: false, position: 2 },
          { text: "Покрыть тестами", done: false, position: 3 },
        ],
      },
    },
  });
  void payTask;

  const devTasks: Array<Parameters<typeof prisma.task.create>[0]["data"]> = [
    {
      title: "Email-рассылка по реактивации спящих клиентов",
      columnId: dev.backlog.id, position: 0, creatorId: elena.id, assigneeId: natalia.id, priority: "LOW",
    },
    {
      title: "Push-уведомления в мобильном приложении",
      columnId: dev.backlog.id, position: 1, creatorId: dmitry.id, assigneeId: igor.id, priority: "NORMAL",
      tags: { connect: [{ id: tApi.id }] },
    },
    {
      title: "Редизайн страницы оформления заказа",
      columnId: dev.inProgress.id, position: 1, creatorId: elena.id, assigneeId: olga.id,
      priority: "HIGH", dueDate: daysFromNow(4), tags: { connect: [{ id: tDesign.id }] },
    },
    {
      title: "Сценарии автотестов для корзины",
      columnId: dev.inProgress.id, position: 2, creatorId: pavel.id, assigneeId: pavel.id,
      priority: "HIGH", dueDate: daysFromNow(2),
    },
    {
      title: "API для задач (CRUD)",
      columnId: dev.review.id, position: 0, creatorId: dmitry.id, assigneeId: igor.id,
      priority: "NORMAL", tags: { connect: [{ id: tApi.id }] },
    },
    {
      title: "Настроить CI/CD пайплайн",
      columnId: dev.done.id, position: 0, creatorId: dmitry.id, assigneeId: alexey.id, priority: "LOW",
    },
    {
      title: "Сверстать экран входа через Telegram",
      columnId: dev.done.id, position: 1, creatorId: elena.id, assigneeId: maria.id, priority: "NORMAL",
    },
  ];
  for (const data of devTasks) await prisma.task.create({ data });

  // Second board — Marketing
  const mkt = await makeBoard("Маркетинг Q3", "pink", yug.id);
  const mktTasks: Array<Parameters<typeof prisma.task.create>[0]["data"]> = [
    { title: "Контент-план на сентябрь", columnId: mkt.backlog.id, position: 0, creatorId: elena.id, assigneeId: natalia.id, priority: "NORMAL" },
    { title: "Запуск рекламной кампании", columnId: mkt.inProgress.id, position: 0, creatorId: natalia.id, assigneeId: natalia.id, priority: "HIGH", dueDate: daysFromNow(3) },
    { title: "Бриф для дизайнера баннеров", columnId: mkt.done.id, position: 0, creatorId: elena.id, assigneeId: olga.id, priority: "LOW" },
  ];
  for (const data of mktTasks) await prisma.task.create({ data });

  // Third board — Support
  const sup = await makeBoard("Поддержка клиентов", "green", sever.id);
  const supTasks: Array<Parameters<typeof prisma.task.create>[0]["data"]> = [
    { title: "База знаний: топ-20 вопросов", columnId: sup.inProgress.id, position: 0, creatorId: elena.id, assigneeId: pavel.id, priority: "NORMAL" },
    { title: "Шаблоны ответов в поддержке", columnId: sup.done.id, position: 0, creatorId: anna.id, assigneeId: maria.id, priority: "LOW" },
  ];
  for (const data of supTasks) await prisma.task.create({ data });

  console.log("Creating access groups…");
  await prisma.group.create({
    data: {
      name: "Команда разработки",
      regionId: sever.id,
      members: { connect: [{ id: igor.id }, { id: maria.id }, { id: pavel.id }] },
      boards: { connect: [{ id: dev.board.id }] },
    },
  });
  await prisma.group.create({
    data: {
      name: "Маркетинг",
      regionId: yug.id,
      members: { connect: [{ id: olga.id }, { id: natalia.id }] },
      boards: { connect: [{ id: mkt.board.id }] },
    },
  });

  console.log(`✅ Seed done: ${3 + members.length} users, 3 boards, 2 regions, 2 groups.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

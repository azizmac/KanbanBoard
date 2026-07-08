import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getChatPeople, getChatTargets, getConversation } from "@/lib/chat-data";
import { Conversation } from "./Conversation";

export const dynamic = "force-dynamic";

export default async function ChatDialogPage({
  params,
}: {
  params: Promise<{ chatId: string }>;
}) {
  const { chatId } = await params;
  const user = await requireUser();
  const [conv, targets, people] = await Promise.all([
    getConversation(chatId, user.id),
    getChatTargets(user.id),
    getChatPeople(user.id),
  ]);
  if (!conv) notFound();

  // key: смена чата полностью сбрасывает состояние композера/меню
  return <Conversation key={conv.id} conv={conv} targets={targets} people={people} />;
}

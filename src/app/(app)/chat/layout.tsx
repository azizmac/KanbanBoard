import { requireUser } from "@/lib/auth";
import { getChatList, getChatPeople } from "@/lib/chat-data";
import { ChatListPane } from "./ChatListPane";
import { ChatLiveProvider } from "./ChatLive";

export const dynamic = "force-dynamic";

// Messenger shell: the chat list lives in the layout so it stays mounted while
// navigating between dialogs; SSE «change» pings refresh it via router.refresh.
export default async function ChatLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const [chats, people] = await Promise.all([getChatList(user.id), getChatPeople(user.id)]);

  return (
    <ChatLiveProvider>
      <div className="flex h-[calc(100dvh_-_72px_-_env(safe-area-inset-top))] md:h-[calc(100dvh_-_env(safe-area-inset-top))]">
        <ChatListPane chats={chats} people={people} />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </ChatLiveProvider>
  );
}

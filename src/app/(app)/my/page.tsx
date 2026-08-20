import { requireUser } from "@/lib/auth";
import { getCalendarRegions, getDeadlines } from "@/lib/calendar-data";
import { getInbox } from "@/lib/notify-data";
import { getMyWork } from "@/lib/task-data";
import { MyHub, type MyTab } from "./MyHub";

export const dynamic = "force-dynamic";

function parseTab(raw: string | undefined): MyTab {
  if (raw === "calendar" || raw === "inbox") return raw;
  return "tasks";
}

export default async function MyPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await requireUser();
  const { tab: raw } = await searchParams;
  const tab = parseTab(raw);

  const [work, deadlines, regions, inbox] = await Promise.all([
    getMyWork(user.id),
    getDeadlines(user),
    getCalendarRegions(user),
    getInbox(user.id),
  ]);

  return (
    <MyHub
      tab={tab}
      assigned={work.assigned}
      mentioned={work.mentioned}
      deadlines={deadlines}
      regions={regions}
      inbox={inbox}
      inboxUnread={inbox.filter((n) => !n.read).length}
    />
  );
}

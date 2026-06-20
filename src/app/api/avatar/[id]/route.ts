import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { readStoredFile } from "@/lib/storage";

export const runtime = "nodejs";

// Streams a user's stored Telegram avatar (avatars/<userId>.jpg). The ?v=
// query in the URL just busts the browser cache when the avatar is re-synced.
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const viewer = await getCurrentUser();
  if (!viewer) return new NextResponse(null, { status: 401 });

  const { id } = await ctx.params;
  try {
    const data = await readStoredFile(`avatars/${id}.jpg`);
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}

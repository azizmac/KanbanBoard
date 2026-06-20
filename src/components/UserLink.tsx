import Link from "next/link";

/** Wraps any content in a link to a colleague's profile (/u/<id>). */
export function UserLink({
  id,
  className = "",
  title,
  children,
}: {
  id: string;
  className?: string;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={`/u/${id}`} className={className} title={title}>
      {children}
    </Link>
  );
}

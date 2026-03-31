import { redirect } from "next/navigation";

export default function LegacySettingsRedirect({
  searchParams
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const line = Array.isArray(searchParams?.line) ? searchParams?.line[0] : searchParams?.line;
  const target = line
    ? `/profile/settings?tab=notifications&line=${encodeURIComponent(line)}`
    : "/profile/settings?tab=manage";
  redirect(target);
}

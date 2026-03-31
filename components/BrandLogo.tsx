import Link from "next/link";

type Size = "sm" | "md";

function iconClass(size: Size) {
  if (size === "sm") {
    return "h-8 w-8 rounded-lg text-xs";
  }
  return "h-10 w-10 rounded-xl text-lg";
}

export function BrandIcon({ size = "md" }: { size?: Size }) {
  return (
    <div
      className={`flex items-center justify-center bg-gradient-to-br from-[#10b981] to-teal-400 font-bold text-white shadow-lg shadow-[#10b981]/30 ${iconClass(
        size
      )}`}
    >
      AO
    </div>
  );
}

export default function BrandLogo({
  href = "/home",
  size = "md",
  textClassName = "text-xl font-bold tracking-tight text-slate-900"
}: {
  href?: string;
  size?: Size;
  textClassName?: string;
}) {
  return (
    <Link href={href} className="flex items-center gap-3">
      <BrandIcon size={size} />
      <span className={textClassName}>ユニブリ</span>
    </Link>
  );
}

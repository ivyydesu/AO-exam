import Link from "next/link";
import Image from "next/image";

type Size = "sm" | "md";

function iconClass(size: Size) {
  if (size === "sm") {
    return "h-8 w-8 rounded-lg text-xs";
  }
  return "h-10 w-10 rounded-xl text-lg";
}

export function BrandIcon({ size = "md" }: { size?: Size }) {
  const dim = size === "sm" ? 32 : 40;
  return (
    <div className={`relative overflow-hidden bg-white shadow-lg shadow-[#10b981]/20 ${iconClass(size)}`}>
      <Image
        src="/brand/unibridge-icon.png"
        alt="UniBridge icon"
        fill
        sizes={`${dim}px`}
        className="object-cover"
        priority={size === "sm"}
      />
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
    <Link href={href} className="flex shrink-0 items-center gap-3 whitespace-nowrap">
      <BrandIcon size={size} />
      <span className={`inline-block shrink-0 whitespace-nowrap break-keep [word-break:keep-all] [text-orientation:mixed] [writing-mode:horizontal-tb] ${textClassName}`}>ユニブリ</span>
    </Link>
  );
}

import { Mic2 } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

export function VoiceActionLink({
  className,
  description,
  href,
  label = "Continuer à la voix",
}: {
  className?: string;
  description?: string;
  href: string;
  label?: string;
}) {
  return (
    <Link
      className={cn(
        "group inline-flex min-h-11 items-center gap-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-500 px-4 py-3 text-left text-white shadow-sm transition hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2",
        className,
      )}
      href={href}
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white/15">
        <Mic2 className="size-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{label}</span>
        {description ? <span className="mt-0.5 block text-xs text-white/80">{description}</span> : null}
      </span>
    </Link>
  );
}

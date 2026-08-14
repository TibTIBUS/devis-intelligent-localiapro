import { FileText } from "lucide-react";
import Link from "next/link";

export function AppBrand({ href = "/tableau-de-bord", compact = false }: { href?: string; compact?: boolean }) {
  return (
    <Link className="inline-flex items-center gap-3" href={href}>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-sm">
        <FileText className="size-5" />
      </span>
      <span className="min-w-0 leading-tight">
        <span className="block truncate text-sm font-semibold tracking-tight sm:text-base">Devis Intelligent</span>
        {!compact ? <span className="block text-[11px] text-muted-foreground">by Localiapro.fr</span> : null}
      </span>
    </Link>
  );
}

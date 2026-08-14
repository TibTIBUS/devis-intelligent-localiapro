import Link from "next/link";

function NaltoMark({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M8 6H18V44H14V58H8V6Z" fill="currentColor" />
      <path d="M18 18L46 39V49L18 28V18Z" fill="currentColor" />
      <path d="M46 6H56V58H46V6Z" fill="currentColor" />
      <path d="M15 45H18V58H15V45Z" fill="#E8672E" />
    </svg>
  );
}

export function AppBrand({
  href = "/tableau-de-bord",
  compact = false,
  variant = "default",
}: {
  href?: string;
  compact?: boolean;
  variant?: "default" | "inverse";
}) {
  const inverse = variant === "inverse";

  return (
    <Link
      aria-label="Nalto"
      className={`inline-flex items-center ${compact ? "gap-2" : "gap-3"}`}
      href={href}
    >
      <NaltoMark className={compact ? "h-8 w-8 shrink-0" : "h-10 w-10 shrink-0"} />
      <span className="min-w-0 leading-none">
        <span
          className={`block truncate text-base font-semibold uppercase tracking-[0.28em] sm:text-lg ${
            inverse ? "text-[#F5F1E8]" : "text-[#17382D]"
          }`}
        >
          NALTO
        </span>
        {!compact ? (
          <span className={`mt-1.5 block text-[10px] tracking-[0.08em] ${inverse ? "text-[#F5F1E8]/60" : "text-muted-foreground"}`}>
            par Localia
          </span>
        ) : null}
      </span>
    </Link>
  );
}

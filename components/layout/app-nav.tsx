"use client";

import {
  BookOpen,
  BriefcaseBusiness,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { AppBrand } from "@/components/layout/app-brand";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth/actions";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/tableau-de-bord", icon: LayoutDashboard, label: "Tableau de bord" },
  { href: "/devis", icon: FileText, label: "Devis" },
  { href: "/clients", icon: Users, label: "Clients" },
  { href: "/catalogue", icon: BookOpen, label: "Catalogue" },
  { href: "/entreprise/informations-legales", icon: BriefcaseBusiness, label: "Entreprise" },
] as const;

function isActivePath(pathname: string, href: string) {
  if (href === "/tableau-de-bord") return pathname === href;
  if (href === "/entreprise/informations-legales") return pathname.startsWith("/entreprise");
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({
  href,
  icon: Icon,
  label,
  onNavigate,
}: {
  href: string;
  icon: (typeof NAV_LINKS)[number]["icon"];
  label: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const active = isActivePath(pathname, href);

  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-emerald-500/15 text-emerald-300"
          : "text-slate-300 hover:bg-white/10 hover:text-white",
      )}
      href={href}
      onClick={onNavigate}
    >
      <Icon className="size-4" />
      <span>{label}</span>
    </Link>
  );
}

export function AppNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950 text-white shadow-sm">
      <div className="mx-auto flex min-h-16 w-full max-w-[1600px] items-center gap-4 px-4 sm:px-6 lg:px-8">
        <div className="shrink-0 [&_span:last-child]:text-slate-400">
          <AppBrand />
        </div>

        <nav aria-label="Navigation principale" className="hidden min-w-0 flex-1 items-center justify-center gap-1 lg:flex">
          {NAV_LINKS.map((link) => (
            <NavLink href={link.href} icon={link.icon} key={link.href} label={link.label} />
          ))}
        </nav>

        <div className="ml-auto hidden items-center gap-2 lg:flex">
          <Link
            className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-400"
            href="/devis/nouveau"
          >
            <Plus className="size-4" />
            Nouveau devis
          </Link>
          <form action={signOut}>
            <Button className="border-slate-700 bg-transparent text-slate-200 hover:bg-white/10 hover:text-white" size="sm" type="submit" variant="outline">
              <LogOut className="size-4" />
              <span className="sr-only xl:not-sr-only">Se déconnecter</span>
            </Button>
          </form>
        </div>

        <Button
          aria-controls="mobile-nav"
          aria-expanded={open}
          aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
          className="ml-auto text-white hover:bg-white/10 hover:text-white lg:hidden"
          onClick={() => setOpen((current) => !current)}
          size="icon"
          type="button"
          variant="ghost"
        >
          {open ? <X /> : <Menu />}
        </Button>
      </div>

      {open ? (
        <nav aria-label="Navigation principale (mobile)" className="border-t border-slate-800 px-4 py-4 lg:hidden" id="mobile-nav">
          <div className="mx-auto max-w-xl space-y-1">
            {NAV_LINKS.map((link) => (
              <NavLink href={link.href} icon={link.icon} key={link.href} label={link.label} onNavigate={() => setOpen(false)} />
            ))}
            <Link
              className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-3 py-2.5 text-sm font-semibold text-white"
              href="/devis/nouveau"
              onClick={() => setOpen(false)}
            >
              <Plus className="size-4" />
              Nouveau devis
            </Link>
            <form action={signOut} className="pt-2">
              <Button className="w-full border-slate-700 bg-transparent text-slate-200 hover:bg-white/10 hover:text-white" size="sm" type="submit" variant="outline">
                <LogOut className="size-4" />
                Se déconnecter
              </Button>
            </form>
          </div>
        </nav>
      ) : null}
    </header>
  );
}

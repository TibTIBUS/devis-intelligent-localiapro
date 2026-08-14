"use client";

import {
  BookOpen,
  BriefcaseBusiness,
  ChevronDown,
  FileBadge2,
  FileText,
  Image,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  ShieldCheck,
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
] as const;

const COMPANY_LINKS = [
  { href: "/entreprise/informations-legales", icon: FileBadge2, label: "Informations légales" },
  { href: "/entreprise/assurances", icon: ShieldCheck, label: "Assurances" },
  { href: "/entreprise/logo", icon: Image, label: "Logo" },
] as const;

function isActivePath(pathname: string, href: string) {
  if (href === "/tableau-de-bord") return pathname === href;
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
          ? "bg-white/12 text-[#F5F1E8]"
          : "text-[#F5F1E8]/72 hover:bg-white/8 hover:text-[#F5F1E8]",
      )}
      href={href}
      onClick={onNavigate}
    >
      <Icon className={cn("size-4", active && "text-[#E8672E]")} />
      <span>{label}</span>
    </Link>
  );
}

export function AppNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const companyActive = pathname.startsWith("/entreprise");

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#17382D] text-[#F5F1E8] shadow-sm">
      <div className="mx-auto flex min-h-16 w-full max-w-[1600px] items-center gap-4 px-4 sm:px-6 lg:px-8">
        <div className="shrink-0">
          <AppBrand variant="inverse" />
        </div>

        <nav aria-label="Navigation principale" className="hidden min-w-0 flex-1 items-center justify-center gap-1 xl:flex">
          {NAV_LINKS.map((link) => (
            <NavLink href={link.href} icon={link.icon} key={link.href} label={link.label} />
          ))}
          <details className="group relative">
            <summary
              className={cn(
                "flex cursor-pointer list-none items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors [&::-webkit-details-marker]:hidden",
                companyActive
                  ? "bg-white/12 text-[#F5F1E8]"
                  : "text-[#F5F1E8]/72 hover:bg-white/8 hover:text-[#F5F1E8]",
              )}
            >
              <BriefcaseBusiness className={cn("size-4", companyActive && "text-[#E8672E]")} />
              Entreprise
              <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" />
            </summary>
            <div className="absolute left-0 top-full mt-2 w-56 rounded-2xl border border-white/10 bg-[#17382D] p-2 shadow-xl">
              {COMPANY_LINKS.map(({ href, icon: Icon, label }) => (
                <Link
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[#F5F1E8]/80 hover:bg-white/8 hover:text-[#F5F1E8]"
                  href={href}
                  key={href}
                >
                  <Icon className="size-4 text-[#E8672E]" />
                  {label}
                </Link>
              ))}
            </div>
          </details>
        </nav>

        <div className="ml-auto hidden items-center gap-2 xl:flex">
          <Link
            className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-[#E8672E] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#D95E27]"
            href="/devis/nouveau"
          >
            <Plus className="size-4" /> Nouveau devis
          </Link>
          <form action={signOut}>
            <Button
              className="border-white/15 bg-transparent text-[#F5F1E8]/80 hover:bg-white/8 hover:text-[#F5F1E8]"
              size="sm"
              type="submit"
              variant="outline"
            >
              <LogOut className="size-4" />
              <span className="sr-only 2xl:not-sr-only">Se déconnecter</span>
            </Button>
          </form>
        </div>

        <Button
          aria-controls="mobile-nav"
          aria-expanded={open}
          aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
          className="ml-auto text-[#F5F1E8] hover:bg-white/8 hover:text-[#F5F1E8] xl:hidden"
          onClick={() => setOpen((current) => !current)}
          size="icon"
          type="button"
          variant="ghost"
        >
          {open ? <X /> : <Menu />}
        </Button>
      </div>

      {open ? (
        <nav
          aria-label="Navigation principale (mobile et tablette)"
          className="max-h-[calc(100svh-4rem)] overflow-y-auto border-t border-white/10 px-4 py-4 xl:hidden"
          id="mobile-nav"
        >
          <div className="mx-auto max-w-xl space-y-1">
            {NAV_LINKS.map((link) => (
              <NavLink
                href={link.href}
                icon={link.icon}
                key={link.href}
                label={link.label}
                onNavigate={() => setOpen(false)}
              />
            ))}
            <div className="pt-2">
              <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-[#F5F1E8]/45">Entreprise</p>
              {COMPANY_LINKS.map(({ href, icon: Icon, label }) => (
                <Link
                  className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-[#F5F1E8]/72 hover:bg-white/8 hover:text-[#F5F1E8]"
                  href={href}
                  key={href}
                  onClick={() => setOpen(false)}
                >
                  <Icon className="size-4 text-[#E8672E]" />
                  {label}
                </Link>
              ))}
            </div>
            <Link
              className="mt-3 flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#E8672E] px-3 py-2.5 text-sm font-semibold text-white"
              href="/devis/nouveau"
              onClick={() => setOpen(false)}
            >
              <Plus className="size-4" /> Nouveau devis
            </Link>
            <form action={signOut} className="pt-2">
              <Button
                className="min-h-11 w-full border-white/15 bg-transparent text-[#F5F1E8]/80 hover:bg-white/8 hover:text-[#F5F1E8]"
                size="sm"
                type="submit"
                variant="outline"
              >
                <LogOut className="size-4" /> Se déconnecter
              </Button>
            </form>
          </div>
        </nav>
      ) : null}
    </header>
  );
}

"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { signOut } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/tableau-de-bord", label: "Tableau de bord" },
  { href: "/devis", label: "Devis" },
  { href: "/devis/nouveau", label: "Nouveau devis" },
  { href: "/clients", label: "Clients" },
  { href: "/catalogue", label: "Catalogue" },
  { href: "/entreprise/informations-legales", label: "Informations légales" },
  { href: "/entreprise/assurances", label: "Assurances" },
  { href: "/entreprise/logo", label: "Logo" },
] as const;

function NavLink({ href, label, onNavigate }: { href: string; label: string; onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = pathname === href;

  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={cn(
        "rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
        active ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
      href={href}
      onClick={onNavigate}
    >
      {label}
    </Link>
  );
}

export function AppNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="border-b border-border">
      <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link className="text-sm font-semibold" href="/tableau-de-bord">Localiapro.fr</Link>

        <nav aria-label="Navigation principale" className="hidden flex-1 flex-wrap items-center gap-1 sm:flex">
          {NAV_LINKS.map((link) => <NavLink href={link.href} key={link.href} label={link.label} />)}
        </nav>

        <form action={signOut} className="hidden sm:block">
          <Button size="sm" type="submit" variant="outline">Se déconnecter</Button>
        </form>

        <Button
          aria-controls="mobile-nav"
          aria-expanded={open}
          aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
          className="sm:hidden"
          onClick={() => setOpen((current) => !current)}
          size="icon"
          type="button"
          variant="ghost"
        >
          {open ? <X /> : <Menu />}
        </Button>
      </div>

      {open ? (
        <nav aria-label="Navigation principale (mobile)" className="flex flex-col gap-1 border-t border-border px-4 py-3 sm:hidden" id="mobile-nav">
          {NAV_LINKS.map((link) => (
            <NavLink href={link.href} key={link.href} label={link.label} onNavigate={() => setOpen(false)} />
          ))}
          <form action={signOut} className="pt-2">
            <Button className="w-full" size="sm" type="submit" variant="outline">Se déconnecter</Button>
          </form>
        </nav>
      ) : null}
    </header>
  );
}

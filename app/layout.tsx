import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Instrument_Sans, Inter } from "next/font/google";

import { cn } from "@/lib/utils";
import "./globals.css";

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-display",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  applicationName: "Nalto",
  title: {
    default: "Nalto",
    template: "%s | Nalto",
  },
  description: "Du chantier au devis, sans repasser au bureau.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" className={cn("font-sans", instrumentSans.variable, inter.variable)}>
      <body className="min-h-svh antialiased">{children}</body>
    </html>
  );
}

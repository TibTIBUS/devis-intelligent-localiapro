import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { SimpleCustomerForm } from "@/components/customers/simple-customer-form";
import { saveSimpleCustomer } from "@/lib/customers/actions";

export default function NewCustomerPage() {
  return (
    <main className="min-h-svh bg-[#F5F1E8] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <section className="mx-auto w-full max-w-3xl space-y-6">
        <header className="space-y-3">
          <Link className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-[#17382D]" href="/clients">
            <ArrowLeft className="size-4" /> Retour aux clients
          </Link>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#E8672E]">NALTO</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#17382D]">Nouveau client</h1>
            <p className="mt-1 text-sm text-muted-foreground">Nom, coordonnées, adresse. C’est tout.</p>
          </div>
        </header>

        <SimpleCustomerForm action={saveSimpleCustomer} />
      </section>
    </main>
  );
}

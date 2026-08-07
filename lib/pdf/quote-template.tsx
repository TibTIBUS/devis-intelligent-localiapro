import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

import { calculateQuoteTotals } from "@/lib/calculations/quotes";
import {
  formatEuroCents,
  formatIsoDate,
  formatPercentageBasisPoints,
  formatQuantity,
} from "@/lib/pdf/formatting/quote-formatting";
import type { QuotePdfData, QuotePdfLine } from "@/lib/pdf/quote-snapshot";

const colors = {
  border: "#dbe3ec",
  muted: "#526173",
  navy: "#102a43",
  pale: "#f4f7fb",
  text: "#172b4d",
};

const styles = StyleSheet.create({
  page: {
    color: colors.text,
    fontFamily: "Helvetica",
    fontSize: 9,
    paddingBottom: 42,
    paddingHorizontal: 42,
    paddingTop: 36,
  },
  header: {
    alignItems: "flex-start",
    backgroundColor: colors.navy,
    borderRadius: 6,
    color: "#ffffff",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 22,
    padding: 18,
  },
  brand: { fontSize: 16, fontWeight: 700 },
  headerMeta: { alignItems: "flex-end", fontSize: 9 },
  headerNumber: { fontSize: 14, fontWeight: 700, marginBottom: 5 },
  twoColumns: { flexDirection: "row", gap: 14, marginBottom: 18 },
  column: { flex: 1 },
  panel: { border: `1 solid ${colors.border}`, borderRadius: 4, padding: 12 },
  panelTitle: { color: colors.muted, fontSize: 8, fontWeight: 700, marginBottom: 6, textTransform: "uppercase" },
  strong: { fontWeight: 700 },
  muted: { color: colors.muted },
  line: { lineHeight: 1.35 },
  title: { color: colors.navy, fontSize: 17, fontWeight: 700, marginBottom: 5 },
  subtitle: { color: colors.muted, fontSize: 9, marginBottom: 16 },
  table: { border: `1 solid ${colors.border}`, borderRadius: 4, marginBottom: 18 },
  tableHeader: { backgroundColor: colors.pale, color: colors.muted, flexDirection: "row", fontSize: 7, fontWeight: 700, padding: 7 },
  tableRow: { borderTop: `1 solid ${colors.border}`, flexDirection: "row", minHeight: 26, padding: 7 },
  sectionRow: { backgroundColor: "#eef3f8", borderTop: `1 solid ${colors.border}`, fontSize: 8, fontWeight: 700, padding: 6 },
  description: { color: colors.muted, fontSize: 8, marginTop: 3 },
  designation: { flex: 4, paddingRight: 6 },
  unit: { flex: 1, textAlign: "center" },
  quantity: { flex: 1, textAlign: "right" },
  price: { flex: 1.35, textAlign: "right" },
  total: { flex: 1.45, textAlign: "right" },
  vat: { flex: 0.9, textAlign: "right" },
  totalsLayout: { flexDirection: "row", justifyContent: "flex-end", marginBottom: 18 },
  totals: { width: 265 },
  totalLine: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  totalFinal: { borderTop: `1 solid ${colors.navy}`, color: colors.navy, fontSize: 11, fontWeight: 700, marginTop: 4, paddingTop: 7 },
  compliance: { backgroundColor: colors.pale, borderRadius: 4, marginBottom: 18, padding: 11 },
  complianceTitle: { color: colors.navy, fontSize: 9, fontWeight: 700, marginBottom: 5 },
  quoteText: { border: `1 solid ${colors.border}`, borderRadius: 4, marginBottom: 12, padding: 11 },
  signatures: { flexDirection: "row", gap: 14, marginTop: 16 },
  signature: { border: `1 solid ${colors.border}`, flex: 1, height: 65, padding: 9 },
  footer: { bottom: 20, color: colors.muted, fontSize: 7, left: 42, position: "absolute", right: 42, textAlign: "center" },
});

function Address({ address }: { address: QuotePdfData["snapshot"]["customer"]["workAddress"] }) {
  const lines = [
    address.addressLine1,
    ...(address.addressLine2 ? [address.addressLine2] : []),
    `${address.postalCode} ${address.city}`,
    ...(address.countryCode && address.countryCode !== "FR" ? [address.countryCode] : []),
  ];

  return (
    <View style={styles.line}>{lines.map((line) => <Text key={line}>{line}</Text>)}</View>
  );
}

function LineRow({ line }: { line: QuotePdfLine }) {
  const lineTotal = calculateQuoteTotals([
    {
      quantityMilliunits: line.quantityMilliunits,
      unitPriceHtCents: line.unitPriceHtCents,
      vatRateBasisPoints: line.vatRateBasisPoints,
    },
  ]);
  const total = lineTotal.isComplete ? lineTotal.subtotalHtCents : 0n;

  return (
    <View style={styles.tableRow} wrap={false}>
      <View style={styles.designation}>
        <Text>{line.label}</Text>
        {line.description ? <Text style={styles.description}>{line.description}</Text> : null}
      </View>
      <Text style={styles.unit}>{line.unit}</Text>
      <Text style={styles.quantity}>{formatQuantity(line.quantityMilliunits)}</Text>
      <Text style={styles.price}>{formatEuroCents(line.unitPriceHtCents ?? 0n)}</Text>
      <Text style={styles.total}>{formatEuroCents(total)}</Text>
      <Text style={styles.vat}>{formatPercentageBasisPoints(line.vatRateBasisPoints ?? 0)} %</Text>
    </View>
  );
}

function LinesTable({ data }: { data: QuotePdfData }) {
  const sections = new Map(data.snapshot.sections.map((section) => [section.id, section]));
  const grouped = new Map<string | null, QuotePdfLine[]>();
  for (const line of data.snapshot.lines) {
    const current = grouped.get(line.sectionId) ?? [];
    current.push(line);
    grouped.set(line.sectionId, current);
  }
  const groups = [...grouped.entries()].sort(([left], [right]) => {
    if (left === null) return 1;
    if (right === null) return -1;
    return (sections.get(left)?.position ?? 0) - (sections.get(right)?.position ?? 0);
  });

  return (
    <View style={styles.table}>
      <View style={styles.tableHeader}>
        <Text style={styles.designation}>Désignation</Text>
        <Text style={styles.unit}>Unité</Text>
        <Text style={styles.quantity}>Qté</Text>
        <Text style={styles.price}>PU HT</Text>
        <Text style={styles.total}>Total HT</Text>
        <Text style={styles.vat}>TVA</Text>
      </View>
      {groups.map(([sectionId, lines]) => (
        <View key={sectionId ?? "unsectioned"} wrap={false}>
          {sectionId ? <Text style={styles.sectionRow}>{sections.get(sectionId)?.title ?? "Section"}</Text> : null}
          {lines.map((line) => <LineRow key={line.id} line={line} />)}
        </View>
      ))}
    </View>
  );
}

function Totals({ data }: { data: QuotePdfData }) {
  const totals = calculateQuoteTotals(
    data.snapshot.lines.map((line) => ({
      quantityMilliunits: line.quantityMilliunits,
      unitPriceHtCents: line.unitPriceHtCents,
      vatRateBasisPoints: line.vatRateBasisPoints,
    })),
    data.snapshot.quote.discountRateBasisPoints,
    data.snapshot.quote.depositRateBasisPoints,
  );

  if (!totals.isComplete) return null;

  return (
    <View style={styles.totalsLayout}>
      <View style={styles.totals}>
        <View style={styles.totalLine}><Text>Sous-total HT</Text><Text>{formatEuroCents(totals.subtotalHtCents)}</Text></View>
        <View style={styles.totalLine}><Text>Remise HT ({formatPercentageBasisPoints(data.snapshot.quote.discountRateBasisPoints)} %)</Text><Text>- {formatEuroCents(totals.discountHtCents)}</Text></View>
        <View style={styles.totalLine}><Text>Total HT</Text><Text>{formatEuroCents(totals.totalHtCents)}</Text></View>
        {totals.vatBreakdown.map((vat) => <View key={vat.vatRateBasisPoints} style={styles.totalLine}><Text>TVA {formatPercentageBasisPoints(vat.vatRateBasisPoints)} %</Text><Text>{formatEuroCents(vat.vatCents)}</Text></View>)}
        <View style={[styles.totalLine, styles.totalFinal]}><Text>Total TTC</Text><Text>{formatEuroCents(totals.totalTtcCents)}</Text></View>
        <View style={styles.totalLine}><Text>Acompte demandé ({formatPercentageBasisPoints(data.snapshot.quote.depositRateBasisPoints)} %)</Text><Text>{formatEuroCents(totals.depositCents)}</Text></View>
      </View>
    </View>
  );
}

function ComplianceBlock({ data }: { data: QuotePdfData }) {
  const { complianceSnapshot: compliance } = data;
  const fee = data.snapshot.quote.isFree
    ? "Devis gratuit"
    : `Devis payant : ${formatEuroCents(compliance.preparationFeeHtCents ?? 0n)} HT, TVA ${formatPercentageBasisPoints(compliance.preparationFeeVatRateBasisPoints ?? 0)} %`;
  const insurance = compliance.professionalInsuranceRequired
    ? compliance.insurances.map((item) => `${item.insurance_type} - ${item.insurer_name}, police ${item.policy_number}, couverture ${item.geographic_coverage}`).join("\n")
    : "Aucune assurance professionnelle obligatoire déclarée pour cette activité.";

  return (
    <View style={styles.compliance} wrap={false}>
      <Text style={styles.complianceTitle}>Informations réglementaires</Text>
      <Text style={styles.line}>{fee}</Text>
      <Text style={styles.line}>Frais de déplacement : {compliance.travelFeeApplicable ? "applicables et détaillés dans les lignes" : "aucun"}.</Text>
      <Text style={styles.line}>Assurance professionnelle : {insurance}</Text>
    </View>
  );
}

function QuoteTexts({ data }: { data: QuotePdfData }) {
  const { note, paymentTerms } = data.snapshot.quote;
  if (!note && !paymentTerms) return null;
  return (
    <View style={styles.quoteText} wrap={false}>
      {paymentTerms ? <><Text style={styles.complianceTitle}>Conditions de paiement</Text><Text style={styles.line}>{paymentTerms}</Text></> : null}
      {note ? <><Text style={[styles.complianceTitle, { marginTop: paymentTerms ? 8 : 0 }]}>Note du devis</Text><Text style={styles.line}>{note}</Text></> : null}
    </View>
  );
}

export function QuoteDocument({ data }: { data: QuotePdfData }) {
  const company = data.snapshot.company;
  const customer = data.snapshot.customer;

  return (
    <Document title={`Devis ${data.snapshot.quote.number}`} author="Localiapro.fr" language="fr-FR">
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.header} fixed>
          <View><Text style={styles.brand}>Localiapro.fr</Text><Text>Devis professionnel</Text></View>
          <View style={styles.headerMeta}><Text style={styles.headerNumber}>{data.snapshot.quote.number}</Text><Text>Émis le {formatIsoDate(data.snapshot.quote.issuedOn)}</Text><Text>Valide jusqu’au {formatIsoDate(data.snapshot.quote.validUntil)}</Text></View>
        </View>

        <View style={styles.twoColumns}>
          <View style={[styles.column, styles.panel]}><Text style={styles.panelTitle}>Entreprise</Text><Text style={styles.strong}>{company.legalName}</Text><Text>{company.legalForm}</Text><Text>{company.addressLine1}{company.addressLine2 ? `\n${company.addressLine2}` : ""}{`\n${company.postalCode} ${company.city}`}</Text><Text style={styles.muted}>SIREN {company.siren} - SIRET {company.siret}</Text>{company.vatNumber ? <Text style={styles.muted}>TVA intracommunautaire {company.vatNumber}</Text> : null}{company.registrationCity ? <Text style={styles.muted}>Immatriculation {company.registrationCity}</Text> : null}{company.shareCapitalCents !== null ? <Text style={styles.muted}>Capital social {formatEuroCents(company.shareCapitalCents)}</Text> : null}</View>
          <View style={[styles.column, styles.panel]}><Text style={styles.panelTitle}>Client et lieu d’exécution</Text><Text style={styles.strong}>{customer.displayName}</Text><Address address={customer.workAddress} /></View>
        </View>

        <Text style={styles.title}>Devis de travaux</Text>
        <Text style={styles.subtitle}>Offre détaillée de prestations et fournitures</Text>
        <LinesTable data={data} />
        <Totals data={data} />
        <QuoteTexts data={data} />
        <ComplianceBlock data={data} />

        <View style={styles.signatures} wrap={false}>
          <View style={styles.signature}><Text style={styles.strong}>Signature du professionnel</Text></View>
          <View style={styles.signature}><Text style={styles.strong}>Signature du client</Text></View>
        </View>
        <Text fixed style={styles.footer} render={({ pageNumber, totalPages }) => `Localiapro.fr - ${data.snapshot.quote.number} - Page ${pageNumber} / ${totalPages}`} />
      </Page>
    </Document>
  );
}

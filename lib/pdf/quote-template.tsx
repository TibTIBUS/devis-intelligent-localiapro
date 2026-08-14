import {
  Document,
  Image,
  Page,
  Path,
  StyleSheet,
  Svg,
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
  border: "#DCD8CF",
  copper: "#E8672E",
  copperPale: "#F8E8DE",
  forge: "#17382D",
  forgeSoft: "#315247",
  limestone: "#F5F1E8",
  muted: "#626A64",
  pale: "#FAF8F3",
  text: "#18201C",
  white: "#FFFFFF",
};

const styles = StyleSheet.create({
  page: {
    backgroundColor: colors.white,
    color: colors.text,
    fontFamily: "Helvetica",
    fontSize: 8.5,
    paddingBottom: 54,
    paddingHorizontal: 34,
    paddingTop: 32,
  },
  header: {
    alignItems: "stretch",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  brandBlock: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    paddingRight: 16,
  },
  logo: {
    height: 46,
    marginRight: 12,
    objectFit: "contain",
    width: 62,
  },
  brandName: {
    color: colors.forge,
    fontSize: 20,
    fontWeight: 700,
  },
  brandSubtitle: {
    color: colors.muted,
    fontSize: 8.5,
    marginTop: 3,
  },
  documentLabel: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  documentLabelText: {
    color: colors.forge,
    fontSize: 19,
    fontWeight: 700,
    letterSpacing: 0.8,
  },
  documentLabelRule: {
    backgroundColor: colors.copper,
    height: 2,
    marginTop: 6,
    width: 60,
  },
  headerMeta: {
    backgroundColor: colors.forge,
    borderRadius: 7,
    color: colors.limestone,
    minWidth: 166,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  headerNumber: {
    fontSize: 14,
    fontWeight: 700,
    marginBottom: 7,
  },
  headerMetaLine: {
    color: colors.limestone,
    fontSize: 8,
    marginTop: 3,
  },
  revisionBadge: {
    backgroundColor: colors.copperPale,
    borderRadius: 4,
    color: colors.copper,
    fontSize: 7.5,
    fontWeight: 700,
    marginTop: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    textAlign: "center",
  },
  twoColumns: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 18,
  },
  panel: {
    backgroundColor: colors.pale,
    border: `1 solid ${colors.border}`,
    borderRadius: 7,
    flex: 1,
    minHeight: 104,
    padding: 12,
  },
  panelTitle: {
    color: colors.forge,
    fontSize: 8,
    fontWeight: 700,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  strong: { fontWeight: 700 },
  muted: { color: colors.muted },
  line: { lineHeight: 1.4 },
  titleRow: {
    alignItems: "flex-end",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 11,
  },
  title: {
    color: colors.forge,
    fontSize: 16,
    fontWeight: 700,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 8.5,
    marginTop: 4,
  },
  table: {
    border: `1 solid ${colors.border}`,
    borderRadius: 7,
    marginBottom: 17,
    overflow: "hidden",
  },
  tableHeader: {
    backgroundColor: colors.forge,
    color: colors.limestone,
    flexDirection: "row",
    fontSize: 7,
    fontWeight: 700,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  tableRow: {
    borderTop: `1 solid ${colors.border}`,
    flexDirection: "row",
    minHeight: 31,
    paddingHorizontal: 8,
    paddingVertical: 7,
  },
  sectionRow: {
    backgroundColor: colors.limestone,
    borderTop: `1 solid ${colors.border}`,
    color: colors.forge,
    fontSize: 8,
    fontWeight: 700,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  description: {
    color: colors.muted,
    fontSize: 7,
    lineHeight: 1.35,
    marginTop: 3,
  },
  designation: { flex: 4.3, paddingRight: 6 },
  unit: { flex: 1, textAlign: "center" },
  quantity: { flex: 0.8, textAlign: "right" },
  price: { flex: 1.35, textAlign: "right" },
  total: { flex: 1.4, textAlign: "right" },
  vat: { flex: 0.75, textAlign: "right" },
  totalsLayout: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 18,
  },
  totalsCard: {
    border: `1 solid ${colors.border}`,
    borderRadius: 7,
    overflow: "hidden",
    width: 245,
  },
  totalsTitle: {
    backgroundColor: colors.limestone,
    color: colors.forge,
    fontSize: 8.5,
    fontWeight: 700,
    paddingHorizontal: 11,
    paddingVertical: 9,
  },
  totalsBody: { padding: 11 },
  totalLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3.5,
  },
  totalHt: {
    borderTop: `1 solid ${colors.border}`,
    fontWeight: 700,
    marginTop: 4,
    paddingTop: 7,
  },
  totalFinal: {
    backgroundColor: colors.forge,
    borderRadius: 5,
    color: colors.limestone,
    flexDirection: "row",
    fontSize: 11.5,
    fontWeight: 700,
    justifyContent: "space-between",
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  deposit: {
    backgroundColor: colors.copperPale,
    color: colors.forge,
    flexDirection: "row",
    fontWeight: 700,
    justifyContent: "space-between",
    marginBottom: -11,
    marginHorizontal: -11,
    marginTop: 9,
    paddingHorizontal: 11,
    paddingVertical: 9,
  },
  infoStrip: {
    backgroundColor: colors.limestone,
    borderRadius: 7,
    flexDirection: "row",
    marginBottom: 16,
    paddingHorizontal: 9,
    paddingVertical: 10,
  },
  infoItem: { flex: 1, paddingHorizontal: 7 },
  infoItemBorder: { borderLeft: `1 solid ${colors.border}` },
  infoTitle: {
    color: colors.forge,
    fontSize: 7.5,
    fontWeight: 700,
    marginBottom: 3,
  },
  executionBlock: {
    border: `1 solid ${colors.border}`,
    borderRadius: 7,
    flexDirection: "row",
    marginBottom: 12,
    padding: 11,
  },
  executionItem: { flex: 1 },
  executionDivider: {
    borderLeft: `1 solid ${colors.border}`,
    flex: 1,
    paddingLeft: 12,
  },
  quoteText: {
    border: `1 solid ${colors.border}`,
    borderRadius: 7,
    marginBottom: 12,
    padding: 11,
  },
  blockTitle: {
    color: colors.forge,
    fontSize: 8.5,
    fontWeight: 700,
    marginBottom: 5,
  },
  compliance: {
    borderTop: `1 solid ${colors.border}`,
    marginTop: 3,
    paddingTop: 11,
  },
  signatures: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  signature: {
    backgroundColor: colors.pale,
    border: `1 solid ${colors.border}`,
    borderRadius: 7,
    flex: 1,
    height: 76,
    padding: 10,
  },
  footer: {
    alignItems: "center",
    borderTop: `1 solid ${colors.border}`,
    bottom: 17,
    color: colors.muted,
    flexDirection: "row",
    fontSize: 7,
    justifyContent: "space-between",
    left: 34,
    paddingTop: 7,
    position: "absolute",
    right: 34,
  },
  footerBrand: {
    alignItems: "center",
    flexDirection: "row",
  },
  naltoMark: {
    height: 14,
    marginRight: 5,
    width: 14,
  },
  naltoName: {
    color: colors.forge,
    fontSize: 7,
    fontWeight: 700,
    letterSpacing: 1.1,
  },
  footerMeta: {
    color: colors.muted,
    fontSize: 7,
  },
});

function NaltoMark() {
  return (
    <Svg style={styles.naltoMark} viewBox="0 0 64 64">
      <Path d="M8 6H18V44H14V58H8V6Z" fill={colors.forge} />
      <Path d="M18 18L46 39V49L18 28V18Z" fill={colors.forge} />
      <Path d="M46 6H56V58H46V6Z" fill={colors.forge} />
      <Path d="M15 45H18V58H15V45Z" fill={colors.copper} />
    </Svg>
  );
}

function Address({ address }: { address: QuotePdfData["snapshot"]["customer"]["workAddress"] }) {
  const lines = [
    address.addressLine1,
    ...(address.addressLine2 ? [address.addressLine2] : []),
    `${address.postalCode} ${address.city}`,
    ...(address.countryCode && address.countryCode !== "FR" ? [address.countryCode] : []),
  ];

  return <View style={styles.line}>{lines.map((line) => <Text key={line}>{line}</Text>)}</View>;
}

function contactValue(data: QuotePdfData, key: "email" | "phone") {
  for (const contact of data.snapshot.customer.contacts) {
    const value = contact[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function LineRow({ line }: { line: QuotePdfLine }) {
  const lineTotal = calculateQuoteTotals([{
    quantityMilliunits: line.quantityMilliunits,
    unitPriceHtCents: line.unitPriceHtCents,
    vatRateBasisPoints: line.vatRateBasisPoints,
  }]);
  const total = lineTotal.isComplete ? lineTotal.subtotalHtCents : 0n;

  return (
    <View style={styles.tableRow} wrap={false}>
      <View style={styles.designation}>
        <Text style={styles.strong}>{line.label}</Text>
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
      <View style={styles.tableHeader} fixed>
        <Text style={styles.designation}>DÉSIGNATION</Text>
        <Text style={styles.unit}>UNITÉ</Text>
        <Text style={styles.quantity}>QTÉ</Text>
        <Text style={styles.price}>PU HT</Text>
        <Text style={styles.total}>TOTAL HT</Text>
        <Text style={styles.vat}>TVA</Text>
      </View>
      {groups.map(([sectionId, lines]) => (
        <View key={sectionId ?? "unsectioned"}>
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
    <View style={styles.totalsLayout} wrap={false}>
      <View style={styles.totalsCard}>
        <Text style={styles.totalsTitle}>RÉCAPITULATIF</Text>
        <View style={styles.totalsBody}>
          <View style={styles.totalLine}><Text>Sous-total HT</Text><Text>{formatEuroCents(totals.subtotalHtCents)}</Text></View>
          <View style={styles.totalLine}><Text>Remise HT ({formatPercentageBasisPoints(data.snapshot.quote.discountRateBasisPoints)} %)</Text><Text>- {formatEuroCents(totals.discountHtCents)}</Text></View>
          <View style={[styles.totalLine, styles.totalHt]}><Text>Total HT</Text><Text>{formatEuroCents(totals.totalHtCents)}</Text></View>
          {totals.vatBreakdown.map((vat) => (
            <View key={vat.vatRateBasisPoints} style={styles.totalLine}>
              <Text>TVA {formatPercentageBasisPoints(vat.vatRateBasisPoints)} %</Text>
              <Text>{formatEuroCents(vat.vatCents)}</Text>
            </View>
          ))}
          <View style={styles.totalFinal}><Text>Total TTC</Text><Text>{formatEuroCents(totals.totalTtcCents)}</Text></View>
          <View style={styles.deposit}>
            <Text>Acompte demandé ({formatPercentageBasisPoints(data.snapshot.quote.depositRateBasisPoints)} %)</Text>
            <Text>{formatEuroCents(totals.depositCents)}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function QuoteTexts({ data }: { data: QuotePdfData }) {
  const { note, paymentTerms } = data.snapshot.quote;
  if (!note && !paymentTerms) return null;

  return (
    <View style={styles.quoteText} wrap={false}>
      {paymentTerms ? (
        <>
          <Text style={styles.blockTitle}>Conditions de règlement</Text>
          <Text style={styles.line}>{paymentTerms}</Text>
        </>
      ) : null}
      {note ? (
        <>
          <Text style={[styles.blockTitle, { marginTop: paymentTerms ? 8 : 0 }]}>Note du devis</Text>
          <Text style={styles.line}>{note}</Text>
        </>
      ) : null}
    </View>
  );
}

function ComplianceBlock({ data }: { data: QuotePdfData }) {
  const compliance = data.complianceSnapshot;
  const insurance = compliance.professionalInsuranceRequired
    ? compliance.insurances
        .map((item) => `${item.insurance_type} - ${item.insurer_name}, police ${item.policy_number}, couverture ${item.geographic_coverage}`)
        .join("\n")
    : "Aucune assurance professionnelle obligatoire déclarée pour cette activité.";

  return (
    <View style={styles.compliance} wrap={false}>
      <Text style={styles.blockTitle}>Mentions légales et réglementaires</Text>
      <Text style={styles.line}>Devis : {data.snapshot.quote.isFree ? "gratuit" : "payant"}.</Text>
      <Text style={styles.line}>Frais de déplacement : {compliance.travelFeeApplicable ? "applicables et détaillés dans le devis" : "aucun"}.</Text>
      <Text style={styles.line}>Assurance professionnelle : {insurance}</Text>
    </View>
  );
}

export function QuoteDocument({ data, logoDataUrl }: { data: QuotePdfData; logoDataUrl?: string | null }) {
  const company = data.snapshot.company;
  const customer = data.snapshot.customer;
  const customerEmail = contactValue(data, "email");
  const customerPhone = contactValue(data, "phone");
  const revisionNumber = data.snapshot.quote.revisionNumber ?? 1;
  const executionStartDate = data.snapshot.quote.executionStartDate;
  const executionDuration = data.snapshot.quote.executionDuration;

  return (
    <Document title={`Devis ${data.snapshot.quote.number}`} author={company.legalName} language="fr-FR">
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.header} fixed>
          <View style={styles.brandBlock}>
            {logoDataUrl ? <Image src={logoDataUrl} style={styles.logo} /> : null}
            <View>
              <Text style={styles.brandName}>{company.legalName}</Text>
              <Text style={styles.brandSubtitle}>Devis professionnel</Text>
            </View>
          </View>

          <View style={styles.documentLabel}>
            <Text style={styles.documentLabelText}>DEVIS</Text>
            <View style={styles.documentLabelRule} />
            {revisionNumber > 1 ? <Text style={styles.revisionBadge}>RÉVISION {revisionNumber}</Text> : null}
          </View>

          <View style={styles.headerMeta}>
            <Text style={styles.headerNumber}>{data.snapshot.quote.number}</Text>
            <Text style={styles.headerMetaLine}>Émis le {formatIsoDate(data.snapshot.quote.issuedOn)}</Text>
            <Text style={styles.headerMetaLine}>Valide jusqu’au {formatIsoDate(data.snapshot.quote.validUntil)}</Text>
          </View>
        </View>

        <View style={styles.twoColumns}>
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Entreprise</Text>
            <Text style={styles.strong}>{company.legalName}</Text>
            <Text>{company.legalForm}</Text>
            <Text>{company.addressLine1}</Text>
            {company.addressLine2 ? <Text>{company.addressLine2}</Text> : null}
            <Text>{company.postalCode} {company.city}</Text>
            <Text style={[styles.muted, { marginTop: 4 }]}>SIREN {company.siren} - SIRET {company.siret}</Text>
            {company.vatNumber ? <Text style={styles.muted}>TVA intracommunautaire {company.vatNumber}</Text> : null}
            {company.registrationCity ? <Text style={styles.muted}>Immatriculation {company.registrationCity}</Text> : null}
          </View>

          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Client et lieu d’exécution</Text>
            <Text style={styles.strong}>{customer.displayName}</Text>
            <Address address={customer.workAddress} />
            {customerPhone ? <Text style={[styles.muted, { marginTop: 5 }]}>Tél. {customerPhone}</Text> : null}
            {customerEmail ? <Text style={styles.muted}>{customerEmail}</Text> : null}
          </View>
        </View>

        <View style={styles.titleRow}>
          <View>
            <Text style={styles.title}>Devis de travaux</Text>
            <Text style={styles.subtitle}>Offre détaillée de prestations et fournitures</Text>
          </View>
        </View>

        <LinesTable data={data} />
        <Totals data={data} />

        {executionStartDate || executionDuration ? (
          <View style={styles.executionBlock} wrap={false}>
            <View style={styles.executionItem}>
              <Text style={styles.blockTitle}>Début prévu des travaux</Text>
              <Text>{executionStartDate ? formatIsoDate(executionStartDate) : "À définir"}</Text>
            </View>
            <View style={styles.executionDivider}>
              <Text style={styles.blockTitle}>Durée / délai estimé</Text>
              <Text>{executionDuration || "À définir"}</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.infoStrip} wrap={false}>
          <View style={styles.infoItem}>
            <Text style={styles.infoTitle}>{data.snapshot.quote.isFree ? "Devis gratuit" : "Devis payant"}</Text>
            <Text style={styles.muted}>{data.snapshot.quote.isFree ? "Sans frais de préparation." : "Les frais de préparation figurent dans les mentions."}</Text>
          </View>
          <View style={[styles.infoItem, styles.infoItemBorder]}>
            <Text style={styles.infoTitle}>Validité du devis</Text>
            <Text style={styles.muted}>Valable jusqu’au {formatIsoDate(data.snapshot.quote.validUntil)}.</Text>
          </View>
          <View style={[styles.infoItem, styles.infoItemBorder]}>
            <Text style={styles.infoTitle}>Acompte</Text>
            <Text style={styles.muted}>{formatPercentageBasisPoints(data.snapshot.quote.depositRateBasisPoints)} % demandé selon les conditions du devis.</Text>
          </View>
        </View>

        <QuoteTexts data={data} />
        <ComplianceBlock data={data} />

        <View style={styles.signatures} wrap={false}>
          <View style={styles.signature}><Text style={styles.blockTitle}>Signature du professionnel</Text></View>
          <View style={styles.signature}>
            <Text style={styles.blockTitle}>Signature et acceptation du client</Text>
            <Text style={styles.muted}>Bon pour accord, date et signature</Text>
          </View>
        </View>

        <View fixed style={styles.footer}>
          <View style={styles.footerBrand}>
            <NaltoMark />
            <Text style={styles.naltoName}>NALTO</Text>
            <Text style={[styles.footerMeta, { marginLeft: 5 }]}>- document généré avec Nalto</Text>
          </View>
          <Text
            style={styles.footerMeta}
            render={({ pageNumber, totalPages }) => `${company.legalName} - ${data.snapshot.quote.number}${revisionNumber > 1 ? ` - Révision ${revisionNumber}` : ""} - Page ${pageNumber} / ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}

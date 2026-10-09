import { TECH_PACKET } from "./docsContent";
import { PdfDocument } from "./pdfDocument";
import { AFC_COMPANY_NAME } from "../utils/qrLabels";

export function exportTechPacketPdf({ hospitalName } = {}) {
  const hospital = hospitalName || "Hospital";
  const when = new Date().toISOString().slice(0, 10);
  const doc = new PdfDocument({
    title: TECH_PACKET.title,
    subject: `${TECH_PACKET.id} for ${hospital}`,
    headerLeft: `${AFC_COMPANY_NAME}  |  ${TECH_PACKET.id}`,
    headerRight: `v${TECH_PACKET.version}`,
    footer: TECH_PACKET.classification,
  });

  doc.title(TECH_PACKET.title);
  doc.paragraph(
    "Vendor technical packet for hospital Information Security, Privacy, Clinical Engineering, and Facilities. Not legal advice. Not an accreditation instrument."
  );
  doc.kvTable([
    ["Document ID", TECH_PACKET.id],
    ["Version", TECH_PACKET.version],
    ["Hospital", hospital],
    ["Effective", when],
    ["Owner", TECH_PACKET.owner],
    ["Audience", TECH_PACKET.audience],
    ["Classification", TECH_PACKET.classification],
    ["Contact", TECH_PACKET.phone],
  ]);

  for (const section of TECH_PACKET.sections) {
    doc.heading(section.title);
    for (const p of section.paragraphs || []) doc.paragraph(p);
    if (section.table) doc.table(section.table.headers, section.table.rows);
    if (section.bullets?.length) doc.bullets(section.bullets);
    for (const p of section.paragraphsAfter || []) doc.paragraph(p);
  }

  const slug = String(hospital)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  doc.download(`afc-hospital-portal-technical-packet-${slug || "hospital"}.pdf`);
}

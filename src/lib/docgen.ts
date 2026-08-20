import { parseSegments, segmentRo } from "@/lib/fiber";
import { metersByMethod, money, totalRouteMeters, type DevizItem, type JobBundle } from "@/lib/deviz";

export type DevizExportLine = { item: DevizItem; quantity: number };

function ro(n: number, one: string, many: string) {
  return n === 1 ? `o ${one}` : `${n} ${many}`;
}

function fmtM(m: number) {
  return `${Math.round(m)}m`;
}

/** Join a list the Romanian way: "a, b si c". */
function joinRo(parts: string[]) {
  if (parts.length <= 1) return parts.join("");
  return `${parts.slice(0, -1).join(", ")} si ${parts[parts.length - 1]}`;
}

/** Build the bullet lines of the acceptance report, grouped by section. */
export function buildReportSections(job: JobBundle) {
  const { installation: i, routes, closures, splices, speedTests } = job;

  const site: string[] = [];
  if (i.switch_port && i.switch_name) {
    site.push(`S-a cablat portul ${i.switch_port} din switch ${i.switch_name}`);
  } else if (i.switch_name) {
    site.push(`S-a cablat in switch ${i.switch_name}`);
  }
  if (i.odf_name) {
    site.push(
      i.odf_port
        ? `S-a terminat fibra in ODF ${i.odf_name}, portul ${i.odf_port}`
        : `S-a terminat fibra in ODF ${i.odf_name}`,
    );
  }
  if (i.vlan) site.push(`S-a configurat VLAN ${i.vlan}`);

  const traseu: string[] = [];
  for (const r of routes) {
    const segments = parseSegments(r.segments);
    const total = segments.reduce((s, x) => s + (Number(x.length_m) || 0), 0) || Number(r.length_m) || 0;
    const from = r.from_point?.trim() || closures[0]?.code || closures[0]?.name || "punctul de racord";
    const to = r.to_point?.trim() || "locatia clientului";
    const cable = r.cable_type?.trim() ? `FO ${r.cable_type.trim()}` : "FO";
    const fibers = r.fiber_count ? ` cu ${r.fiber_count} fire` : "";
    const breakdown = segments.length
      ? `, din care ${joinRo(segments.map((s) => `${fmtM(s.length_m)} ${segmentRo(s.method)}`))}`
      : r.installation_method?.trim()
        ? `, ${segmentRo(r.installation_method.trim())}`
        : "";
    traseu.push(
      `S-a instalat un cablu ${cable}${fibers}, intre ${from} si ${to}, in lungime de ${fmtM(total)}${breakdown}`,
    );
  }
  for (const c of closures) {
    const n = splices.filter((s) => s.closure_id === c.id).length;
    if (!n) continue;
    traseu.push(`S-a executat ${ro(n, "sudura FO", "suduri FO")} in ${c.code || c.name}`);
  }
  if (!routes.length && !closures.length) traseu.push("Nu au fost documentate trasee de cablu.");

  const client: string[] = [];
  if (i.cpe_model) client.push(`S-a instalat si configurat un router ${i.cpe_model}`);
  if (i.sfp_installed) client.push(`S-a instalat un SFP optic${i.sfp_model ? ` ${i.sfp_model}` : ""}`);
  if (i.media_converter_installed)
    client.push(
      `S-a instalat un media convertor${i.media_converter_model ? ` ${i.media_converter_model}` : ""}`,
    );
  if (i.terminal_box_installed)
    client.push(`S-a instalat un terminal box${i.terminal_box_type ? ` ${i.terminal_box_type}` : ""}`);
  if (i.rx_power_dbm != null || i.tx_power_dbm != null) {
    const parts: string[] = [];
    if (i.rx_power_dbm != null) parts.push(`Rx ${i.rx_power_dbm} dBm`);
    if (i.tx_power_dbm != null) parts.push(`Tx ${i.tx_power_dbm} dBm`);
    client.push(`Nivel optic masurat la client: ${parts.join(", ")}`);
  }
  if (!client.length) client.push("Nu au fost documentate echipamente la client.");

  const teste: string[] = speedTests.map((t) => {
    const parts: string[] = [];
    if (t.download_mbps != null) parts.push(`download ${t.download_mbps} Mbps`);
    if (t.upload_mbps != null) parts.push(`upload ${t.upload_mbps} Mbps`);
    if (t.latency_ms != null) parts.push(`latenta ${t.latency_ms} ms`);
    if (t.jitter_ms != null) parts.push(`jitter ${t.jitter_ms} ms`);
    if (t.packet_loss_pct != null) parts.push(`pierderi ${t.packet_loss_pct}%`);
    return `${t.service_name}: ${parts.join(", ") || "fara valori"} — ${t.passed ? "PASS" : "FAIL"}`;
  });

  return { site, traseu, client, teste };
}

export function reportFileName(job: JobBundle) {
  const base = (job.installation.work_order || job.installation.client_name || "raport")
    .replace(/[^\w\-]+/g, "_")
    .slice(0, 40);
  return `Raport_acceptanta_${base}.docx`;
}

export function devizFileName(job: JobBundle) {
  const base = (job.installation.work_order || job.installation.client_name || "deviz")
    .replace(/[^\w\-]+/g, "_")
    .slice(0, 40);
  return `Deviz_final_${base}.xlsx`;
}

/** Generates the Romanian acceptance report as a .docx blob (browser only). */
export async function buildAcceptanceDocx(job: JobBundle): Promise<Blob> {
  const { AlignmentType, Document, HeadingLevel, LevelFormat, Packer, Paragraph, TextRun } =
    await import("docx");
  const s = buildReportSections(job);
  const i = job.installation;

  const bullet = (text: string) =>
    new Paragraph({ numbering: { reference: "report-bullets", level: 0 }, children: [new TextRun(text)] });
  const heading = (text: string) =>
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text, bold: true })],
    });

  const children: InstanceType<typeof Paragraph>[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: "Raport acceptanta", bold: true, size: 36 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: `Site ${i.site_name || i.client_name}${i.work_order ? ` · WO ${i.work_order}` : ""}`,
          size: 26,
        }),
      ],
    }),
    new Paragraph({ children: [new TextRun("")] }),
  ];

  if (i.address) children.push(new Paragraph({ children: [new TextRun(`Adresa: ${i.address}`)] }));
  if (i.contact_person)
    children.push(
      new Paragraph({
        children: [
          new TextRun(
            `Contact: ${i.contact_person}${i.contact_phone ? ` · ${i.contact_phone}` : ""}`,
          ),
        ],
      }),
    );
  if (i.service_package)
    children.push(new Paragraph({ children: [new TextRun(`Serviciu: ${i.service_package}`)] }));

  if (s.site.length) {
    children.push(heading("Site"), ...s.site.map(bullet));
  }
  children.push(heading("Traseu"), ...s.traseu.map(bullet));
  children.push(heading("Client"), ...s.client.map(bullet));
  if (s.teste.length) children.push(heading("Teste de viteza"), ...s.teste.map(bullet));
  if (i.notes) children.push(heading("Observatii"), new Paragraph({ children: [new TextRun(i.notes)] }));

  children.push(
    new Paragraph({ children: [new TextRun("")] }),
    new Paragraph({
      children: [
        new TextRun(`Data: ${new Date().toLocaleDateString("ro-RO")}`),
      ],
    }),
    new Paragraph({ children: [new TextRun("Executant: ______________________")] }),
    new Paragraph({ children: [new TextRun("Beneficiar: ______________________")] }),
  );

  const doc = new Document({
    styles: {
      default: { document: { run: { font: "Arial", size: 22 } } },
      paragraphStyles: [
        {
          id: "Heading1",
          name: "Heading 1",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 28, bold: true, font: "Arial" },
          paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 0 },
        },
      ],
    },
    numbering: {
      config: [
        {
          reference: "report-bullets",
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: "\u2022",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 720, hanging: 360 } } },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 },
          },
        },
        children,
      },
    ],
  });

  return Packer.toBlob(doc);
}

/** Generates the final cost estimate (deviz) as an .xlsx blob (browser only). */
export async function buildDevizXlsx(job: JobBundle, lines: DevizExportLine[]): Promise<Blob> {
  const ExcelJS = (await import("exceljs/dist/exceljs.min.js")).default ?? (await import("exceljs/dist/exceljs.min.js"));
  const wb = new ExcelJS.Workbook();
  wb.creator = "FiberField";
  const ws = wb.addWorksheet("Anexa");
  ws.columns = [
    { width: 8 },
    { width: 70 },
    { width: 8 },
    { width: 14 },
    { width: 12 },
    { width: 16 },
  ];

  const i = job.installation;
  const titleRow = ws.addRow(["Deviz final"]);
  titleRow.font = { name: "Arial", bold: true, size: 14 };
  ws.addRow([`Client: ${i.client_name}`]);
  ws.addRow([`Site: ${i.site_name ?? "-"}`]);
  ws.addRow([`Comanda / WO: ${i.work_order ?? "-"}`]);
  ws.addRow([`Adresa: ${i.address ?? "-"}`]);
  ws.addRow([`Data: ${new Date().toLocaleDateString("ro-RO")}`]);
  ws.addRow([`Lungime totala traseu: ${Math.round(totalRouteMeters(job.routes))} m`]);
  const methods = metersByMethod(job.routes);
  const methodSummary = Object.entries(methods)
    .map(([m, v]) => `${segmentRo(m)}: ${Math.round(v)} m`)
    .join(" · ");
  if (methodSummary) ws.addRow([methodSummary]);
  ws.addRow([]);

  const thin = { style: "thin" as const, color: { argb: "FFB0B0B0" } };
  const borders = { top: thin, left: thin, bottom: thin, right: thin };

  function sectionHeader(label: string) {
    const r = ws.addRow(["Nr.crt.", label, "UM", "Pret euro fara TVA", "Cantitate", "Total euro fara TVA"]);
    r.font = { name: "Arial", bold: true };
    r.eachCell((c) => {
      c.border = borders;
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD5E8F0" } };
      c.alignment = { vertical: "middle", wrapText: true };
    });
  }

  let grand = 0;

  for (const category of ["manopera", "materiale"] as const) {
    const group = lines
      .filter((l) => l.item.category === category && l.quantity > 0)
      .sort((a, b) => a.item.item_no - b.item.item_no);
    if (!group.length) continue;

    sectionHeader(category === "manopera" ? "Denumire Lucrare (RO)" : "Materiale");
    const first = ws.rowCount + 1;
    let sectionTotal = 0;
    for (const l of group) {
      const total = money(Number(l.item.unit_price_eur) * l.quantity);
      const row = ws.addRow([
        l.item.item_no,
        l.item.name_ro,
        l.item.um ?? "",
        Number(l.item.unit_price_eur),
        l.quantity,
        null,
      ]);
      row.getCell(6).value = { formula: `D${row.number}*E${row.number}`, result: total };
      row.getCell(2).alignment = { wrapText: true, vertical: "top" };
      row.getCell(4).numFmt = "#,##0.0000";
      row.getCell(6).numFmt = "#,##0.00";
      row.eachCell((c) => (c.border = borders));
      sectionTotal += total;
    }
    grand += sectionTotal;
    const last = ws.rowCount;
    const totalRow = ws.addRow([
      null,
      `Total Euro fara TVA (${category})`,
      null,
      null,
      null,
      null,
    ]);
    totalRow.getCell(6).value = { formula: `SUM(F${first}:F${last})`, result: money(sectionTotal) };
    totalRow.getCell(6).numFmt = "#,##0.00";
    totalRow.font = { name: "Arial", bold: true };
    totalRow.eachCell((c) => (c.border = borders));
    ws.addRow([]);
  }

  const generalRow = ws.addRow([null, "TOTAL GENERAL (manopera+material)", null, null, null, money(grand)]);
  generalRow.font = { name: "Arial", bold: true, size: 12 };
  generalRow.getCell(6).numFmt = "#,##0.00";

  ws.eachRow((row) => {
    row.eachCell((cell) => {
      cell.font = { name: "Arial", ...(cell.font ?? {}) };
    });
  });

  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
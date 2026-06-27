const stripInlineMarkdown = (value: string) =>
  value
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/\*([^*\n]+)\*/g, "$1")
    .replace(/_([^_\n]+)_/g, "$1")
    .replace(/^\s*>\s?/gm, "")
    .replace(/\\([#*_`>])/g, "$1")
    .replace(/[ \t]+$/gm, "");

export function cleanGeneratedText(raw: string) {
  const normalized = raw
    .replace(/\r\n?/g, "\n")
    .replace(/```[a-zA-Z0-9-]*\n?/g, "")
    .replace(/```/g, "");

  const cleanedLines = normalized.split("\n").map((line) => {
    if (/^\s*[-=_*#]{3,}\s*$/.test(line)) return "";
    if (/^\s*\|?\s*:?-{3,}/.test(line)) return "";

    const withoutHeadingMarker = line.replace(/^\s{0,3}#{1,6}\s*/, "");
    const withoutListMarker = withoutHeadingMarker.replace(/^\s*[-*+]\s+/, "• ");
    const withoutNumberNoise = withoutListMarker.replace(/^\s*(\d+)\)\s+/, "$1. ");
    const withoutTableEdges = withoutNumberNoise.replace(/^\s*\|/, "").replace(/\|\s*$/, "").replace(/\s*\|\s*/g, " · ");
    const withoutDecorativeQuotes = withoutTableEdges.replace(/^"([^"\n]+)"$/, "$1");
    return stripInlineMarkdown(withoutDecorativeQuotes).trimEnd();
  });

  return cleanedLines
    .join("\n")
    .replace(/(^|\s)[#*`]{1,3}(?=\s|$)/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function formatGeneratedDocumentText(raw: string, title: string) {
  const date = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date());
  const body = cleanGeneratedText(raw);

  return ["CENA STUDIO", title.toUpperCase(), `Gerado em ${date}`, "", body].filter(Boolean).join("\n");
}

type DocumentBlock = { type: "heading" | "bullet" | "paragraph" | "space"; text: string };

function documentBlocks(raw: string): DocumentBlock[] {
  return cleanGeneratedText(raw).split("\n").map((line) => {
    const text = line.trim();
    if (!text) return { type: "space", text: "" };
    if (text.startsWith("• ")) return { type: "bullet", text: text.slice(2).trim() };

    const looksLikeHeading =
      text.length <= 90 &&
      (text.endsWith(":") || (/[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ]/.test(text) && text === text.toLocaleUpperCase("pt-BR")));
    return { type: looksLikeHeading ? "heading" : "paragraph", text };
  });
}

function safeFilename(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "documento";
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function downloadGeneratedDocx(raw: string, title: string) {
  const {
    AlignmentType,
    BorderStyle,
    Document,
    Footer,
    HeadingLevel,
    Packer,
    PageNumber,
    Paragraph,
    TextRun,
  } = await import("docx");

  const date = new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(new Date());
  const children = [
    new Paragraph({
      children: [new TextRun({ text: "CENA STUDIO", bold: true, color: "FF4D00", size: 20, characterSpacing: 80 })],
      spacing: { after: 260 },
      border: { bottom: { color: "FF4D00", style: BorderStyle.SINGLE, size: 10, space: 10 } },
    }),
    new Paragraph({
      text: title,
      heading: HeadingLevel.TITLE,
      spacing: { before: 220, after: 140 },
    }),
    new Paragraph({
      children: [new TextRun({ text: `Documento gerado em ${date}`, color: "666666", size: 18 })],
      spacing: { after: 420 },
    }),
    ...documentBlocks(raw).map((block) => {
      if (block.type === "space") return new Paragraph({ spacing: { after: 100 } });
      if (block.type === "heading") {
        return new Paragraph({
          children: [new TextRun({ text: block.text.replace(/:$/, ""), bold: true, color: "222222", size: 25 })],
          spacing: { before: 260, after: 100 },
          keepNext: true,
        });
      }
      if (block.type === "bullet") {
        return new Paragraph({
          text: block.text,
          bullet: { level: 0 },
          spacing: { after: 90, line: 330 },
        });
      }
      return new Paragraph({
        children: [new TextRun({ text: block.text, color: "262626", size: 22 })],
        spacing: { after: 130, line: 360 },
      });
    }),
  ];

  const doc = new Document({
    sections: [{
      properties: { page: { margin: { top: 1100, right: 1100, bottom: 1000, left: 1100 } } },
      children,
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({ text: "Cena Studio  ·  ", color: "777777", size: 16 }),
              new TextRun({ children: [PageNumber.CURRENT], color: "777777", size: 16 }),
            ],
          })],
        }),
      },
    }],
  });

  downloadBlob(await Packer.toBlob(doc), `cena-studio-${safeFilename(title)}.docx`);
}

export async function downloadGeneratedPdf(raw: string, title: string) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = 22;

  const ensureSpace = (height: number) => {
    if (y + height <= pageHeight - 18) return;
    pdf.addPage();
    y = 22;
  };

  pdf.setTextColor(255, 77, 0);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.text("CENA STUDIO", margin, y);
  y += 5;
  pdf.setDrawColor(255, 77, 0);
  pdf.setLineWidth(0.6);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 13;

  pdf.setTextColor(25, 25, 25);
  pdf.setFontSize(22);
  const titleLines = pdf.splitTextToSize(title, contentWidth);
  pdf.text(titleLines, margin, y);
  y += titleLines.length * 8 + 3;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(105, 105, 105);
  pdf.text(`Gerado em ${new Intl.DateTimeFormat("pt-BR").format(new Date())}`, margin, y);
  y += 12;

  for (const block of documentBlocks(raw)) {
    if (block.type === "space") {
      y += 3;
      continue;
    }

    const isHeading = block.type === "heading";
    const prefix = block.type === "bullet" ? "•  " : "";
    pdf.setFont("helvetica", isHeading ? "bold" : "normal");
    pdf.setFontSize(isHeading ? 12 : 10.5);
    pdf.setTextColor(isHeading ? 30 : 45, isHeading ? 30 : 45, isHeading ? 30 : 45);
    const lines = pdf.splitTextToSize(`${prefix}${block.text.replace(/:$/, "")}`, contentWidth);
    const lineHeight = isHeading ? 5.8 : 5.3;
    ensureSpace(lines.length * lineHeight + (isHeading ? 6 : 3));
    if (isHeading) y += 4;
    pdf.text(lines, margin, y);
    y += lines.length * lineHeight + (isHeading ? 3 : 2);
  }

  const totalPages = pdf.getNumberOfPages();
  for (let page = 1; page <= totalPages; page += 1) {
    pdf.setPage(page);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(125, 125, 125);
    pdf.text(`Cena Studio  ·  ${page}/${totalPages}`, pageWidth - margin, pageHeight - 10, { align: "right" });
  }

  pdf.save(`cena-studio-${safeFilename(title)}.pdf`);
}

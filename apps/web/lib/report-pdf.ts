export interface ReportPdfInput {
  scoreLabel: string;
  monthlyOverspendLabel: string;
  investmentGainLabel: string;
  executiveSummary: string;
  financialReview?: string;
  topPatternDetails?: string[];
  recoverySteps: string[];
  interceptSummaries: string[];
  sources?: string[];
  privacyNote: string;
  logoDataUrl?: string;
}

type JsPdfDocument = {
  addImage?: (imageData: string, format: string, x: number, y: number, width: number, height: number) => unknown;
  line?: (x1: number, y1: number, x2: number, y2: number) => unknown;
  roundedRect?: (x: number, y: number, width: number, height: number, rx: number, ry: number, style?: string) => unknown;
  addPage?: () => unknown;
  setDrawColor?: (...color: number[]) => unknown;
  setFillColor?: (...color: number[]) => unknown;
  setFont?: (fontName: string, fontStyle?: string) => unknown;
  setFontSize: (size: number) => unknown;
  setLineWidth?: (width: number) => unknown;
  setTextColor?: (...color: number[]) => unknown;
  text: (text: string | string[], x: number, y: number) => unknown;
  splitTextToSize: (text: string, maxWidth: number) => string[];
  save: (filename: string) => unknown;
  output?: (type: "arraybuffer") => ArrayBuffer;
};
type JsPdfConstructor = new () => JsPdfDocument;

export async function exportReportPdf(
  input: ReportPdfInput,
  jsPdfLoader: () => Promise<{ jsPDF: JsPdfConstructor }> = () => import("jspdf") as Promise<{ jsPDF: JsPdfConstructor }>
): Promise<void> {
  const { jsPDF } = await jsPdfLoader();
  const doc = await buildReportPdfDocument(input, jsPDF);

  doc.save("drift-scan-report.pdf");
}

export async function createReportPdfBase64(
  input: ReportPdfInput,
  jsPdfLoader: () => Promise<{ jsPDF: JsPdfConstructor }> = () => import("jspdf") as Promise<{ jsPDF: JsPdfConstructor }>
): Promise<string> {
  const { jsPDF } = await jsPdfLoader();
  const doc = await buildReportPdfDocument(input, jsPDF);
  const arrayBuffer = doc.output?.("arraybuffer");

  if (!arrayBuffer) {
    throw new Error("PDF generator cannot output an attachment.");
  }

  return Buffer.from(arrayBuffer).toString("base64");
}

async function buildReportPdfDocument(input: ReportPdfInput, jsPDF: JsPdfConstructor): Promise<JsPdfDocument> {
  const doc = new jsPDF();
  const logoDataUrl = input.logoDataUrl ?? await loadLogoDataUrl();
  let y = 18;

  paintHeader(doc, logoDataUrl);
  y += 44;

  paintMetricCards(doc, [
    { label: "Drift Score", value: input.scoreLabel },
    { label: "Monthly Overspend", value: input.monthlyOverspendLabel },
    { label: "What-if Growth", value: input.investmentGainLabel }
  ], y);
  y += 33;

  y = writeSection(doc, "Executive Summary", normalizePdfLines([input.executiveSummary]), y + 6);
  if (input.financialReview?.trim()) {
    y = writeSection(doc, "Financial AI Review", normalizePdfLines([input.financialReview]), y + 2);
  }
  if (input.topPatternDetails?.length) {
    y = writeSection(doc, "Pattern Details", normalizePdfLines(input.topPatternDetails), y + 2);
  }
  y = writeSection(doc, "30-Day Recovery Path", normalizePdfLines(input.recoverySteps), y + 2);
  y = writeSection(
    doc,
    "Intercept Result",
    normalizePdfLines(input.interceptSummaries.length > 0 ? input.interceptSummaries : ["No intercept decisions saved yet."]),
    y + 2
  );
  if (input.sources?.length) {
    y = writeSection(doc, "Report Sources", normalizePdfLines(input.sources.map((source) => `- ${source}`)), y + 2);
  }
  writeSection(doc, "Privacy Note", normalizePdfLines([input.privacyNote]), y + 2);

  return doc;
}

function paintHeader(doc: JsPdfDocument, logoDataUrl: string | null) {
  doc.setFillColor?.(248, 250, 252);
  doc.roundedRect?.(14, 12, 182, 36, 4, 4, "F");

  if (logoDataUrl) {
    doc.addImage?.(logoDataUrl, "JPEG", 20, 16, 16, 16);
  } else {
    doc.setFillColor?.(16, 185, 129);
    doc.roundedRect?.(20, 16, 16, 16, 3, 3, "F");
    doc.setTextColor?.(255, 255, 255);
    doc.setFont?.("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("D", 25.5, 26.5);
  }

  doc.setTextColor?.(15, 23, 42);
  doc.setFont?.("helvetica", "bold");
  doc.setFontSize(17);
  doc.text("Drift Scan Report", 42, 22);
  doc.setFont?.("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor?.(71, 85, 105);
  doc.text("Private lifestyle drift audit", 42, 29);
}

function paintMetricCards(
  doc: JsPdfDocument,
  metrics: Array<{ label: string; value: string }>,
  y: number
) {
  metrics.forEach((metric, index) => {
    const x = 14 + index * 61;

    doc.setFillColor?.(255, 255, 255);
    doc.setDrawColor?.(226, 232, 240);
    doc.roundedRect?.(x, y, 56, 24, 3, 3, "FD");
    doc.setTextColor?.(100, 116, 139);
    doc.setFont?.("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text(metric.label.toUpperCase(), x + 4, y + 7);
    doc.setTextColor?.(15, 23, 42);
    doc.setFontSize(15);
    doc.text(metric.value, x + 4, y + 18);
  });
}

function writeSection(
  doc: Pick<JsPdfDocument, "setFontSize" | "text" | "splitTextToSize">,
  title: string,
  lines: string[],
  y: number
): number {
  const richDoc = doc as JsPdfDocument;
  const sectionStartY = ensurePageSpace(richDoc, y, 18);

  richDoc.setDrawColor?.(226, 232, 240);
  richDoc.setLineWidth?.(0.2);
  richDoc.line?.(14, sectionStartY - 5, 196, sectionStartY - 5);
  richDoc.setTextColor?.(15, 23, 42);
  richDoc.setFont?.("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(title, 14, sectionStartY);
  richDoc.setFont?.("helvetica", "normal");
  richDoc.setTextColor?.(51, 65, 85);
  doc.setFontSize(9.5);

  return writeLines(doc, lines, sectionStartY + 7);
}

function writeLines(
  doc: Pick<JsPdfDocument, "text" | "splitTextToSize">,
  lines: string[],
  y: number
): number {
  let cursorY = y;
  const richDoc = doc as JsPdfDocument;

  for (const line of lines) {
    const isBullet = line.startsWith("- ");
    const cleanLine = isBullet ? line.slice(2) : line;
    const wrapped = doc.splitTextToSize(cleanLine, isBullet ? 168 : 176) as string[];
    const lineHeight = wrapped.length * 5.2 + 2.4;

    cursorY = ensurePageSpace(richDoc, cursorY, lineHeight);

    if (isBullet) {
      doc.text("•", 16, cursorY);
      doc.text(wrapped, 21, cursorY);
    } else {
      doc.text(wrapped, 14, cursorY);
    }

    cursorY += lineHeight;
  }

  return cursorY;
}

function ensurePageSpace(doc: JsPdfDocument, y: number, neededHeight: number): number {
  const bottomMargin = 282;

  if (y + neededHeight <= bottomMargin) {
    return y;
  }

  doc.addPage?.();
  return 18;
}

function normalizePdfLines(lines: string[]): string[] {
  return lines
    .flatMap((line) => line.split("\n"))
    .map((line) => line.trim())
    .filter((line) => line && line !== "---")
    .map((line) => line.replace(/^#{1,6}\s+/, ""))
    .map((line) => line.replace(/#{1,6}\s*/g, ""))
    .map((line) => line.replace(/^\d+[.)]\s+/, "- "))
    .map((line) => line.replace(/^[-*]\s+/, "- "))
    .map((line) => line.replace(/\*\*([^*]+)\*\*/g, "$1"))
    .filter((line) => !/^behavior tag:?$/i.test(line))
    .filter((line) => !/^recovery path:?$/i.test(line));
}

async function loadLogoDataUrl(): Promise<string | null> {
  try {
    if (typeof window !== "undefined") {
      const response = await fetch("/drift-ai.jpeg");
      const blob = await response.blob();

      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
      });
    }

    const [{ readFile }, path] = await Promise.all([
      import("node:fs/promises"),
      import("node:path")
    ]);
    const logoBuffer = await readFile(path.join(process.cwd(), "public", "drift-ai.jpeg"));

    return `data:image/jpeg;base64,${Buffer.from(logoBuffer).toString("base64")}`;
  } catch {
    return null;
  }
}

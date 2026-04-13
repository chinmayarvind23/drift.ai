export interface ReportPdfInput {
  scoreLabel: string;
  monthlyOverspendLabel: string;
  investmentGainLabel: string;
  executiveSummary: string;
  recoverySteps: string[];
  interceptSummaries: string[];
  privacyNote: string;
}

type JsPdfDocument = {
  setFontSize: (size: number) => unknown;
  text: (text: string | string[], x: number, y: number) => unknown;
  splitTextToSize: (text: string, maxWidth: number) => string[];
  save: (filename: string) => unknown;
};
type JsPdfConstructor = new () => JsPdfDocument;

export async function exportReportPdf(
  input: ReportPdfInput,
  jsPdfLoader: () => Promise<{ jsPDF: JsPdfConstructor }> = () => import("jspdf") as Promise<{ jsPDF: JsPdfConstructor }>
): Promise<void> {
  const { jsPDF } = await jsPdfLoader();
  const doc = new jsPDF();
  let y = 20;

  doc.setFontSize(18);
  doc.text("Drift Scan Report", 20, y);
  y += 12;

  doc.setFontSize(11);
  y = writeLines(doc, [
    `Drift Score: ${input.scoreLabel}`,
    `Monthly overspend: ${input.monthlyOverspendLabel}`,
    `What-if growth: ${input.investmentGainLabel}`
  ], y);

  y = writeSection(doc, "Executive summary", [input.executiveSummary], y + 4);
  y = writeSection(doc, "30-day recovery path", input.recoverySteps, y + 4);
  y = writeSection(
    doc,
    "Intercept result",
    input.interceptSummaries.length > 0 ? input.interceptSummaries : ["No intercept decisions saved yet."],
    y + 4
  );
  writeSection(doc, "Privacy note", [input.privacyNote], y + 4);

  doc.save("drift-scan-report.pdf");
}

function writeSection(
  doc: Pick<JsPdfDocument, "setFontSize" | "text" | "splitTextToSize">,
  title: string,
  lines: string[],
  y: number
): number {
  doc.setFontSize(13);
  doc.text(title, 20, y);
  doc.setFontSize(10);

  return writeLines(doc, lines, y + 8);
}

function writeLines(
  doc: Pick<JsPdfDocument, "text" | "splitTextToSize">,
  lines: string[],
  y: number
): number {
  let cursorY = y;

  for (const line of lines) {
    const wrapped = doc.splitTextToSize(line, 170) as string[];
    doc.text(wrapped, 20, cursorY);
    cursorY += wrapped.length * 6 + 2;
  }

  return cursorY;
}

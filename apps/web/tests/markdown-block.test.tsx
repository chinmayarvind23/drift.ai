import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MarkdownBlock, parseMarkdownNodes } from "../components/markdown-block";

describe("MarkdownBlock", () => {
  it("renders ordered lists and bold text instead of one long paragraph", () => {
    const html = renderToStaticMarkup(
      <MarkdownBlock text={"1. **Keep one planned dinner**\n2. Move the rest before Friday."} />
    );

    expect(html).toContain("<ol");
    expect(html).toContain("<strong");
    expect(html).toContain("Keep one planned dinner");
  });

  it("renders bracketed data citations with emphasis", () => {
    const html = renderToStaticMarkup(
      <MarkdownBlock text={"Dining changed [Dining old $13 recent $40]."} />
    );

    expect(html).toContain("[Dining old $13 recent $40]");
  });

  it("renders mixed headings, bullets, and numbered lines as separate markdown blocks", () => {
    const markdown = [
      "### What changed:",
      "- Monthly overspend: $27",
      "- Pattern fact: [Dining old $13 recent $40]",
      "",
      "### What to do next:",
      "1. Keep one planned dinner.",
      "2. Move the repeat spend before Friday."
    ].join("\n");
    const html = renderToStaticMarkup(<MarkdownBlock text={markdown} />);

    expect(html).toContain("<h3");
    expect(html).toContain("<ul");
    expect(html).toContain("<ol");
    expect(html).toContain("[Dining old $13 recent $40]");
  });

  it("parses markdown nodes line by line instead of requiring one pure block type", () => {
    expect(parseMarkdownNodes("### A\n1. One\n2. Two\nPlain text")).toEqual([
      { type: "heading", text: "A" },
      { type: "ordered", items: ["One", "Two"] },
      { type: "paragraph", text: "Plain text" }
    ]);
  });
});

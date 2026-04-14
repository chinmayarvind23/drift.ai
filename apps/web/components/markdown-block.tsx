import type { ReactNode } from "react";

type MarkdownNode =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "ordered"; items: string[] }
  | { type: "unordered"; items: string[] };

export function MarkdownBlock({ text }: { text: string }) {
  const nodes = parseMarkdownNodes(text);

  return (
    <div className="space-y-3 text-sm leading-6 text-muted-foreground">
      {nodes.map((node, index) => {
        if (node.type === "heading") {
          return (
            <h3 key={`${node.text}-${index}`} className="pt-1 text-base font-semibold text-foreground">
              {renderInlineMarkdown(node.text)}
            </h3>
          );
        }

        if (node.type === "ordered") {
          return (
            <ol key={`${node.items.join("|")}-${index}`} className="list-decimal space-y-1 pl-5">
              {node.items.map((item) => (
                <li key={item}>{renderInlineMarkdown(item)}</li>
              ))}
            </ol>
          );
        }

        if (node.type === "unordered") {
          return (
            <ul key={`${node.items.join("|")}-${index}`} className="list-disc space-y-1 pl-5">
              {node.items.map((item) => (
                <li key={item}>{renderInlineMarkdown(item)}</li>
              ))}
            </ul>
          );
        }

        return (
          <p key={`${node.text}-${index}`}>
            {renderInlineMarkdown(node.text)}
          </p>
        );
      })}
    </div>
  );
}

export function parseMarkdownNodes(text: string): MarkdownNode[] {
  const nodes: MarkdownNode[] = [];
  const lines = text.split("\n").map((line) => line.trim());
  let paragraph: string[] = [];
  let orderedItems: string[] = [];
  let unorderedItems: string[] = [];

  function flushParagraph() {
    if (paragraph.length > 0) {
      nodes.push({ type: "paragraph", text: paragraph.join(" ") });
      paragraph = [];
    }
  }

  function flushOrdered() {
    if (orderedItems.length > 0) {
      nodes.push({ type: "ordered", items: orderedItems });
      orderedItems = [];
    }
  }

  function flushUnordered() {
    if (unorderedItems.length > 0) {
      nodes.push({ type: "unordered", items: unorderedItems });
      unorderedItems = [];
    }
  }

  function flushAll() {
    flushParagraph();
    flushOrdered();
    flushUnordered();
  }

  for (const line of lines) {
    if (!line) {
      flushAll();
      continue;
    }

    const heading = line.match(/^#{1,3}\s+(.+)$/);
    if (heading) {
      flushAll();
      nodes.push({ type: "heading", text: heading[1] });
      continue;
    }

    const ordered = line.match(/^\d+[.)]\s+(.+)$/);
    if (ordered) {
      flushParagraph();
      flushUnordered();
      orderedItems.push(ordered[1]);
      continue;
    }

    const unordered = line.match(/^[-*]\s+(.+)$/);
    if (unordered) {
      flushParagraph();
      flushOrdered();
      unorderedItems.push(unordered[1]);
      continue;
    }

    flushOrdered();
    flushUnordered();
    paragraph.push(line);
  }

  flushAll();
  return nodes;
}

function renderInlineMarkdown(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|\[[^\]]+\])/g).filter(Boolean).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={`${part}-${index}`} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>;
    }

    if (part.startsWith("[") && part.endsWith("]")) {
      return <span key={`${part}-${index}`} className="font-medium text-foreground">{part}</span>;
    }

    return part;
  });
}

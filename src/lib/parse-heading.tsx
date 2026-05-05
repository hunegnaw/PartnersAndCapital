import React from "react";

/**
 * Converts markdown-style *italic* text to gold <em> elements
 * and literal newlines to block-level <span> wrappers.
 */
export function parseHeading(text: string): React.ReactNode {
  if (!text) return null;

  // Split on newlines first to create line breaks
  const lines = text.split("\n");

  return lines.map((line, lineIndex) => {
    // Split on *...* patterns for italic gold text
    const parts = line.split(/(\*[^*]+\*)/g);
    const nodes = parts.map((part, partIndex) => {
      if (part.startsWith("*") && part.endsWith("*")) {
        return (
          <em
            key={`${lineIndex}-${partIndex}`}
            style={{ color: "#E8D5B0", fontStyle: "italic" }}
          >
            {part.slice(1, -1)}
          </em>
        );
      }
      return part;
    });

    if (lines.length === 1) {
      return <React.Fragment key={lineIndex}>{nodes}</React.Fragment>;
    }

    return (
      <span key={lineIndex} className="block">
        {nodes}
      </span>
    );
  });
}

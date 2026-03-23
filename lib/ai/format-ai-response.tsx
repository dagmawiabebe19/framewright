import React from "react";

const TC = /\b\d{2}:\d{2}:\d{2}:\d{2}\b/g;

function formatTcSegment(s: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  const re = new RegExp(TC.source, "g");
  let i = 0;
  while ((m = re.exec(s)) !== null) {
    if (m.index > last) {
      nodes.push(
        <span key={`${keyPrefix}-t-${i++}`}>{s.slice(last, m.index)}</span>
      );
    }
    nodes.push(
      <code
        key={`${keyPrefix}-tc-${i++}`}
        className="rounded bg-[#1a1a24] px-1 font-mono text-[13px] text-[#c4b5fd]"
      >
        {m[0]}
      </code>
    );
    last = m.index + m[0].length;
  }
  if (last < s.length) {
    nodes.push(<span key={`${keyPrefix}-t-${i++}`}>{s.slice(last)}</span>);
  }
  return nodes.length ? nodes : [s];
}

function formatLine(line: string, lineKey: number): React.ReactNode {
  const parts = line.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, j) => {
        const m = part.match(/^\*\*([^*]+)\*\*$/);
        if (m) {
          return (
            <strong
              key={`${lineKey}-${j}`}
              className="font-semibold text-[#f1f0f0]"
            >
              {m[1]}
            </strong>
          );
        }
        return (
          <span key={`${lineKey}-${j}`}>
            {formatTcSegment(part, `${lineKey}-${j}-s`)}
          </span>
        );
      })}
    </>
  );
}

export function formatAiResponseToNodes(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  return lines.map((line, i) => {
    const isBullet = /^\s*[-•]\s+/.test(line);
    const content = isBullet ? line.replace(/^\s*[-•]\s+/, "") : line;
    return (
      <span key={`row-${i}`} className={isBullet ? "block pl-3" : "block"}>
        {isBullet ? "• " : null}
        {formatLine(content, i)}
      </span>
    );
  });
}

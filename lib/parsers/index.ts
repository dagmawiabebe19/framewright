import type { ParseResult } from "../types";
import { parseAle } from "./ale";
import { parseEdl } from "./edl";
import { parseFcpxml } from "./fcpxml";
import { parsePremiereXml } from "./xml";

export function parseSequenceFile(
  fileName: string,
  text: string
): ParseResult {
  const lower = fileName.toLowerCase();
  const head = text.slice(0, 400).toLowerCase();

  if (lower.endsWith(".edl")) {
    return parseEdl(text);
  }

  if (lower.endsWith(".fcpxml") || head.includes("fcpxml")) {
    return parseFcpxml(text);
  }

  if (lower.endsWith(".ale")) {
    return parseAle(text);
  }

  if (lower.endsWith(".xml")) {
    if (
      head.includes("xmeml") ||
      head.includes("<clipitem") ||
      head.includes("premiere")
    ) {
      return parsePremiereXml(text);
    }
    if (head.includes("fcpxml")) {
      return parseFcpxml(text);
    }
    return parsePremiereXml(text);
  }

  throw new Error(
    "Unrecognized sequence format. Use .edl, .xml, .fcpxml, or .ale."
  );
}

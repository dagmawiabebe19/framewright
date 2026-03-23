import ExcelJS from "exceljs";
import type { ShowMeta, VfxShot } from "./types";
import { showIdForDownload } from "./shotId";

const HEADER_BG = "FF1a1a2e";
const ALT_ROW = "FFF8f8f8";
const STANDARD_ID_BG = "FFF0EEFF";
const STANDARD_ID_TEXT = "FF3C3489";

const DEFAULT_HANDLES = 8;

function applyPriorityDataValidation(cell: ExcelJS.Cell): void {
  cell.dataValidation = {
    type: "list",
    allowBlank: true,
    formulae: ['"High,Medium,Low"'],
    showErrorMessage: true,
    errorTitle: "Invalid value",
    error: "Please select High, Medium, or Low",
  };
}

function stylePriorityValue(cell: ExcelJS.Cell, value: string): void {
  if (value === "High") {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFFE0E0" },
    };
    cell.font = { name: "Calibri", color: { argb: "FF8B0000" } };
  } else if (value === "Medium") {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFFF4CC" },
    };
    cell.font = { name: "Calibri", color: { argb: "FF7A5200" } };
  } else if (value === "Low") {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE8F5E9" },
    };
    cell.font = { name: "Calibri", color: { argb: "FF1B5E20" } };
  }
}

export function buildDownloadFileName(meta: ShowMeta): string {
  const id = showIdForDownload(meta);
  const d = meta.date || new Date().toISOString().slice(0, 10);
  return `${id}_vfxsheet_${d}.xlsx`.toLowerCase();
}

export async function buildVfxExcel(
  meta: ShowMeta,
  shots: VfxShot[],
  thumbnails: (Uint8Array | null)[]
): Promise<ArrayBuffer> {
  const phRes =
    typeof fetch !== "undefined" ? await fetch("/placeholder.jpg") : null;
  const placeholder = phRes?.ok
    ? new Uint8Array(await phRes.arrayBuffer())
    : new Uint8Array();

  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet("VFX Shot Sheet", {
    views: [{ showGridLines: true }],
  });

  sheet.mergeCells("A1:M1");
  const title = sheet.getCell("A1");
  title.value = meta.showName?.trim() || "VFX Shot Sheet";
  title.font = { bold: true, size: 16, name: "Calibri" };
  title.alignment = { vertical: "middle", horizontal: "center" };

  sheet.getCell("A2").value = "Episode:";
  sheet.getCell("B2").value = meta.episode;
  sheet.getCell("C2").value = "Cut:";
  sheet.getCell("D2").value = meta.cutVersion;
  sheet.getCell("E2").value = "Date:";
  sheet.getCell("F2").value = meta.date;
  sheet.getCell("G2").value = "VFX Supervisor:";
  sheet.getCell("H2").value = meta.vfxSupervisor;

  sheet.getCell("A3").value = "Editor:";
  sheet.getCell("B3").value = meta.editor;

  sheet.getRow(4).height = 8;

  const headers = [
    "THUMB",
    "SHOT ID",
    "SCENE",
    "REEL / CLIP",
    "TC IN (REC)",
    "TC OUT (REC)",
    "SRC TC IN",
    "SRC TC OUT",
    "FRAMES / DUR",
    "HANDLES",
    "VFX DESCRIPTION",
    "PRIORITY",
    "STANDARD ID",
  ];
  const headerRow = sheet.getRow(5);
  headers.forEach((h, i) => {
    const c = headerRow.getCell(i + 1);
    c.value = h;
    c.font = { bold: true, color: { argb: "FFFFFFFF" }, name: "Calibri" };
    c.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: HEADER_BG },
    };
    c.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  });
  headerRow.height = 22;

  const colWidths = [22, 14, 10, 20, 14, 14, 14, 14, 14, 10, 40, 12, 36];
  colWidths.forEach((w, i) => {
    sheet.getColumn(i + 1).width = w;
  });

  const totalFrames = shots.reduce((a, s) => a + (s.framesDuration || 0), 0);

  for (let i = 0; i < shots.length; i++) {
    const rowIndex = 6 + i;
    const row = sheet.getRow(rowIndex);
    row.height = 90;

    const shot = shots[i];
    const raw = thumbnails[i];
    const thumb = raw && raw.byteLength ? raw : placeholder;

    row.getCell(2).value = shot.shotId ?? "";
    row.getCell(2).font = { bold: true, name: "Calibri" };
    row.getCell(3).value = shot.scene ?? "";
    row.getCell(4).value = shot.reel;
    row.getCell(5).value = shot.tcInRec;
    row.getCell(6).value = shot.tcOutRec;
    row.getCell(7).value = shot.tcInSrc;
    row.getCell(8).value = shot.tcOutSrc;
    row.getCell(9).value = shot.framesDuration;
    row.getCell(10).value = shot.handleFrames ?? DEFAULT_HANDLES;
    row.getCell(11).value = shot.vfxDescription;

    const priorityVal = shot.priority ?? "";
    row.getCell(12).value = priorityVal;
    applyPriorityDataValidation(row.getCell(12));
    if (priorityVal === "High" || priorityVal === "Medium" || priorityVal === "Low") {
      stylePriorityValue(row.getCell(12), priorityVal);
    }

    row.getCell(13).value = shot.standardId ?? "";
    row.getCell(13).font = { name: "Courier New", size: 9, color: { argb: STANDARD_ID_TEXT } };
    row.getCell(13).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: STANDARD_ID_BG },
    };

    for (let c = 2; c <= 13; c++) {
      if (c === 12 || c === 13) continue;
      const cell = row.getCell(c);
      cell.alignment = {
        vertical: "middle",
        horizontal: c === 11 ? "left" : "center",
        wrapText: c === 11,
      };
    }
    row.getCell(12).alignment = { vertical: "middle", horizontal: "center" };
    row.getCell(13).alignment = { vertical: "middle", horizontal: "left", wrapText: true };

    for (const c of [5, 6, 7, 8]) {
      row.getCell(c).font = { name: "Courier New", size: 10 };
    }

    const zebraFill =
      i % 2 === 1
        ? {
            type: "pattern" as const,
            pattern: "solid" as const,
            fgColor: { argb: ALT_ROW },
          }
        : undefined;

    for (let c = 1; c <= 13; c++) {
      if (c === 12 && (priorityVal === "High" || priorityVal === "Medium" || priorityVal === "Low")) {
        continue;
      }
      if (c === 13) {
        continue;
      }
      if (zebraFill) row.getCell(c).fill = zebraFill;
    }

    if (thumb.byteLength) {
      const imgId = wb.addImage({
        buffer: thumb as unknown as ExcelJS.Buffer,
        extension: "jpeg",
      });
      const r0 = rowIndex - 1;
      sheet.addImage(imgId, {
        tl: { col: 0, row: r0 },
        br: { col: 1, row: r0 + 1 },
        editAs: "oneCell",
      } as ExcelJS.ImageRange & { editAs: string });
    }
  }

  const sumRow = 6 + shots.length;
  const total = sheet.getRow(sumRow);
  total.getCell(2).value = `TOTAL VFX SHOTS: ${shots.length}`;
  total.getCell(2).font = { bold: true };
  total.getCell(9).value = `TOTAL FRAMES: ${totalFrames}`;
  total.getCell(9).font = { bold: true };

  const summary = wb.addWorksheet("Summary");
  const sh = ["SHOT ID", "TC IN (REC)", "TC OUT (REC)", "DURATION", "DESCRIPTION"];
  sh.forEach((h, idx) => {
    const c = summary.getRow(1).getCell(idx + 1);
    c.value = h;
    c.font = { bold: true };
  });
  summary.getColumn(1).width = 16;
  summary.getColumn(2).width = 16;
  summary.getColumn(3).width = 16;
  summary.getColumn(4).width = 12;
  summary.getColumn(5).width = 50;

  shots.forEach((s, i) => {
    const r = summary.getRow(i + 2);
    r.getCell(1).value = s.shotId ?? "";
    r.getCell(1).font = { bold: true };
    r.getCell(2).value = s.tcInRec;
    r.getCell(3).value = s.tcOutRec;
    r.getCell(4).value = s.framesDuration;
    r.getCell(5).value = s.vfxDescription;
    r.getCell(5).alignment = { wrapText: true, vertical: "top" };
  });

  const buf = await wb.xlsx.writeBuffer();
  return buf as ArrayBuffer;
}

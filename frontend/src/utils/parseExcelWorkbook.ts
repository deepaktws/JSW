import * as XLSX from 'xlsx';

export type ParsedSheetRow = Record<string, string>;

export type ParsedSheet = {
  sheetName: string;
  columns: string[];
  rows: ParsedSheetRow[];
  rowCount: number;
};

export type ParsedWorkbook = {
  sheets: ParsedSheet[];
};

/** Parses all worksheets from an Excel file in the browser. */
export async function parseExcelWorkbook(file: File): Promise<ParsedWorkbook> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  if (!workbook.SheetNames?.length) {
    throw new Error('Workbook has no sheets');
  }

  const sheets: ParsedSheet[] = workbook.SheetNames.map((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
      throw new Error(`Missing worksheet: ${sheetName}`);
    }
    const rows = XLSX.utils.sheet_to_json<ParsedSheetRow>(sheet, { defval: '', raw: false });
    const columns = rows.length > 0 ? Object.keys(rows[0] ?? {}) : [];
    return {
      sheetName,
      columns,
      rows: rows.map((r) => ({ ...r })),
      rowCount: rows.length,
    };
  });

  return { sheets };
}


import * as XLSX from 'xlsx';

/** Parses all worksheets from an Excel file in the browser. */
export function parseExcelWorkbook(file) {
  return file.arrayBuffer().then((buffer) => {
    const workbook = XLSX.read(buffer, { type: 'array' });
    if (!workbook.SheetNames?.length) {
      throw new Error('Workbook has no sheets');
    }

    const sheets = workbook.SheetNames.map((sheetName) => {
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
      const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
      return {
        sheetName,
        columns,
        rows: rows.map((r) => ({ ...r })),
        rowCount: rows.length,
      };
    });

    return { sheets };
  });
}

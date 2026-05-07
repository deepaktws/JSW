import * as XLSX from 'xlsx';
import type { Request, Response, NextFunction } from 'express';

/**
 * Parses the uploaded spreadsheet (first sheet) into header keys + row objects.
 */
export function uploadExcel(req: Request, res: Response, next: NextFunction): void {
  try {
    if (!req.file?.buffer) {
      res.status(400).json({ message: 'No file uploaded' });
      return;
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      res.status(400).json({ message: 'Workbook has no sheets' });
      return;
    }

    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: '',
      raw: false,
    });

    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

    res.json({
      sheetName,
      columns,
      rows,
      rowCount: rows.length,
    });
  } catch (err) {
    next(err);
  }
}

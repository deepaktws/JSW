import * as XLSX from 'xlsx';

/**
 * Parses the uploaded spreadsheet (first sheet) into header keys + row objects.
 */
export function uploadExcel(req, res, next) {
  try {
    if (!req.file?.buffer) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return res.status(400).json({ message: 'Workbook has no sheets' });
    }

    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });

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

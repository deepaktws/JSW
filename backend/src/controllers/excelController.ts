import type { Request, Response, NextFunction } from 'express';
import { forwardExcelBufferToMl } from '../lib/excelMlForward.js';

/**
 * Forwards the uploaded spreadsheet to FastAPI and streams the processed workbook back.
 */
export async function uploadExcel(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.file?.buffer) {
      res.status(400).json({ message: 'No file uploaded' });
      return;
    }

    const ml = await forwardExcelBufferToMl(req.file.buffer, req.file.originalname);
    if (ml.kind === 'success') {
      res.setHeader('Content-Type', ml.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${ml.attachmentFileName}"`);
      res.send(ml.buffer);
      return;
    }
    if (ml.kind === 'fastapi_error') {
      res.status(502).json({
        message: 'FastAPI processing failed',
        detail: ml.detail,
      });
      return;
    }
    res.status(504).json({ message: 'FastAPI processing timed out' });
  } catch (err) {
    next(err);
  }
}

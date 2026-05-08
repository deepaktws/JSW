import type { Request, Response, NextFunction } from 'express';
import { config } from '../config/env.js';

function getDownloadFilename(contentDisposition: string | null | undefined): string {
  const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(contentDisposition ?? '');
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  const plainMatch = /filename="?([^"]+)"?/i.exec(contentDisposition ?? '');
  if (plainMatch?.[1]) {
    return plainMatch[1];
  }

  return 'processed.xlsx';
}

/**
 * Forwards the uploaded spreadsheet to FastAPI and streams the processed workbook back.
 */
export async function uploadExcel(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  try {
    if (!req.file?.buffer) {
      res.status(400).json({ message: 'No file uploaded' });
      return;
    }

    const formData = new FormData();
    const fileBytes = new Uint8Array(req.file.buffer);
    formData.append('file', new Blob([fileBytes]), req.file.originalname);

    const controller = new AbortController();
    timeout = setTimeout(() => controller.abort(), config.fastApiTimeoutMs);

    const mlResponse = await fetch(`${config.fastApiUrl}/process-excel`, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });
    clearTimeout(timeout);
    timeout = undefined;

    if (!mlResponse.ok) {
      const detail = await mlResponse.text();
      res.status(502).json({
        message: 'FastAPI processing failed',
        detail: detail || `FastAPI responded with ${mlResponse.status}`,
      });
      return;
    }

    const responseBuffer = Buffer.from(await mlResponse.arrayBuffer());
    const contentType =
      mlResponse.headers.get('content-type') ??
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    const fileName = getDownloadFilename(mlResponse.headers.get('content-disposition'));

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(responseBuffer);
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      res.status(504).json({ message: 'FastAPI processing timed out' });
      return;
    }
    next(err);
  } finally {
    if (timeout !== undefined) {
      clearTimeout(timeout);
    }
  }
}

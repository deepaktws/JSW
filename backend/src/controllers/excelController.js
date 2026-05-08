import { config } from '../config/env.js';

function getDownloadFilename(contentDisposition) {
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

export async function uploadExcel(req, res, next) {
  let timeout;
  try {
    if (!req.file?.buffer) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const formData = new FormData();
    formData.append('file', new Blob([req.file.buffer]), req.file.originalname);

    const controller = new AbortController();
    timeout = setTimeout(() => controller.abort(), config.fastApiTimeoutMs);

    const mlResponse = await fetch(`${config.fastApiUrl}/process-excel`, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!mlResponse.ok) {
      const detail = await mlResponse.text();
      return res.status(502).json({
        message: 'FastAPI processing failed',
        detail: detail || `FastAPI responded with ${mlResponse.status}`,
      });
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
    if (err.name === 'AbortError') {
      return res.status(504).json({ message: 'FastAPI processing timed out' });
    }
    next(err);
  } finally {
    clearTimeout(timeout);
  }
}

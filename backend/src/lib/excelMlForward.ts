import { config } from '../config/env.js';

/** Matches spreadsheet extensions used for chunk-upload ML handoff and excel routes. */
export function isSpreadsheetOriginalName(originalName: string): boolean {
  return /\.xlsx?$/i.test(originalName);
}

export function attachmentFilenameFromContentDisposition(
  contentDisposition: string | null | undefined,
): string {
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

export type ExcelMlForwardResult =
  | { kind: 'success'; buffer: Buffer; contentType: string; attachmentFileName: string }
  | { kind: 'fastapi_error'; detail: string }
  | { kind: 'timeout' };

/**
 * POST workbook bytes to FastAPI /process-excel and return the processed file buffer (or error kinds).
 * Does not touch Express — callers map results to HTTP.
 */
export async function forwardExcelBufferToMl(
  buffer: Buffer,
  originalFilename: string,
): Promise<ExcelMlForwardResult> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const formData = new FormData();
    const fileBytes = new Uint8Array(buffer);
    formData.append('file', new Blob([fileBytes]), originalFilename);

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
      return {
        kind: 'fastapi_error',
        detail: detail || `FastAPI responded with ${mlResponse.status}`,
      };
    }

    const responseBuffer = Buffer.from(await mlResponse.arrayBuffer());
    const contentType =
      mlResponse.headers.get('content-type') ??
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    const attachmentFileName = attachmentFilenameFromContentDisposition(
      mlResponse.headers.get('content-disposition'),
    );

    return { kind: 'success', buffer: responseBuffer, contentType, attachmentFileName };
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return { kind: 'timeout' };
    }
    throw err;
  } finally {
    if (timeout !== undefined) {
      clearTimeout(timeout);
    }
  }
}

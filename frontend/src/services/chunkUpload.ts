import { API_BASE_URL } from './api';

export type ChunkUploadProgress = {
  chunkIndex: number;
  totalChunks: number;
  percentage: number;
};

export type ChunkUploadResult =
  | { completed: true; fileId: string; file: unknown }
  | { completed: false; fileId: string };

function getErrorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const maybeMessage = (payload as { message?: unknown }).message;
  return typeof maybeMessage === 'string' ? maybeMessage : null;
}

export async function uploadFileInChunks(args: {
  file: File;
  token: string;
  fileId?: string;
  chunkSizeBytes?: number;
  onProgress?: (p: ChunkUploadProgress) => void;
}): Promise<ChunkUploadResult> {
  const { file, token, onProgress } = args;
  const fileId = args.fileId ?? crypto.randomUUID();
  // Keep chunk size well below backend's per-request limit (1MB) so normal files visibly upload in chunks.
  const chunkSizeBytes = args.chunkSizeBytes ?? 256 * 1024;

  const totalChunks = Math.max(1, Math.ceil(file.size / chunkSizeBytes));

  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex += 1) {
    const start = chunkIndex * chunkSizeBytes;
    const end = Math.min(file.size, start + chunkSizeBytes);
    const chunk = file.slice(start, end);

    const form = new FormData();
    form.append('data', chunk, file.name);
    form.append('file_id', fileId);
    form.append('chunk_index', String(chunkIndex));
    form.append('total_chunks', String(totalChunks));
    form.append('original_name', file.name);
    form.append('mime_type', file.type || 'application/octet-stream');

    const resp = await fetch(`${API_BASE_URL}/files/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: form,
    });

    const payload = (await resp.json().catch(() => null)) as unknown;
    if (!resp.ok) {
      throw new Error(getErrorMessage(payload) ?? `Chunk upload failed (HTTP ${resp.status})`);
    }

    const percentage = Math.round(((chunkIndex + 1) / totalChunks) * 100);
    onProgress?.({ chunkIndex, totalChunks, percentage });

    if (resp.status === 201) {
      const fileObj = (payload as { file?: unknown } | null)?.file;
      return { completed: true, fileId, file: fileObj };
    }
  }

  return { completed: false, fileId };
}


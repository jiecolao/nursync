import { mkdirSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { diskStorage } from 'multer';

const defaultMaxUploadSize = 1024 * 1024 * 1024;
const configuredMaxUploadSize = Number(process.env.DOCUMENT_UPLOAD_MAX_BYTES);

export const maxDocumentUploadSize =
  Number.isSafeInteger(configuredMaxUploadSize) &&
  configuredMaxUploadSize > 0
    ? configuredMaxUploadSize
    : defaultMaxUploadSize;

export const documentUploadStorage = diskStorage({
  destination: (_request, _file, callback) => {
    const directory = path.join(os.tmpdir(), 'nursync-document-uploads');
    mkdirSync(directory, { recursive: true });
    callback(null, directory);
  },
  filename: (_request, _file, callback) => {
    callback(null, randomUUID());
  },
});

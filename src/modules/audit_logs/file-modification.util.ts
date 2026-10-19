import path from 'node:path';

type DocumentState = {
  filename?: unknown;
};

type FileModificationState = {
  oldState?: DocumentState | null;
  newState?: DocumentState | null;
};

function isDocumentState(value: unknown): value is DocumentState {
  return typeof value === 'object' && value !== null;
}

export function getFileModificationFilename(fileModified: string, fileLoc: string): string {
  try {
    const state = JSON.parse(fileModified) as FileModificationState;
    const filename =
      (isDocumentState(state.newState) && state.newState.filename) ||
      (isDocumentState(state.oldState) && state.oldState.filename);

    if (typeof filename === 'string' && filename) {
      return filename;
    }
  } catch {
    // Older records may contain a plain filename instead of JSON.
  }

  return path.basename(fileLoc.replace(/\\/g, '/'));
}

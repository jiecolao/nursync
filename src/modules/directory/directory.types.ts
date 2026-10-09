export type DirectoryEntryType = 'file' | 'directory';

export interface DirectoryEntry {
  name: string;
  path: string;
  type: DirectoryEntryType;
  size: number;
  extension: string;
  modifiedAt: string;
  children?: DirectoryEntry[];
}

export type DirectoryEventType = 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir';

export interface DirectoryEvent {
  type: DirectoryEventType;
  path: string;
  entry?: DirectoryEntry;
  timestamp: string;
}

export interface DirectorySnapshot {
  root: string;
  tree: DirectoryEntry[];
  generatedAt: string;
}
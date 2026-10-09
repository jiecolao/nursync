import { create } from 'zustand';

export type DirectoryEntry = {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size: number;
  extension: string;
  modifiedAt: string;
  children?: DirectoryEntry[];
};

export type DirectoryEvent = {
  type: 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir';
  path: string;
  entry?: DirectoryEntry;
  timestamp: string;
};

type DirectoryState = {
  root: string;
  tree: DirectoryEntry[];
  connected: boolean;
  lastEventAt: string | null;
  setConnected: (connected: boolean) => void;
  setSnapshot: (snapshot: { root: string; tree: DirectoryEntry[] }) => void;
  applyEvent: (event: DirectoryEvent) => void;
};

function updateTree(
  tree: DirectoryEntry[],
  event: DirectoryEvent,
): DirectoryEntry[] {
  const parentPath = event.path.includes('/') ? event.path.slice(0, event.path.lastIndexOf('/')) : '';
  const name = event.path.split('/').pop() ?? event.path;
  const remove = event.type === 'unlink' || event.type === 'unlinkDir';
  const isDirectory = event.type === 'addDir' || event.type === 'unlinkDir';

  if (!parentPath) {
    const without = tree.filter((item) => item.path !== event.path);
    if (remove || !event.entry) return without;
    return [...without, event.entry].sort(sortEntries);
  }

  let parentFound = false;
  const walk = (items: DirectoryEntry[]): DirectoryEntry[] =>
    items.map((item) => {
      if (item.path === parentPath && item.type === 'directory') {
        parentFound = true;
        const children = item.children ?? [];
        const without = children.filter((child) => child.path !== event.path);
        const nextChildren = remove || !event.entry
          ? without
          : [...without, event.entry].sort(sortEntries);
        return { ...item, children: nextChildren };
      }
      if (item.type === 'directory' && item.children) {
        return { ...item, children: walk(item.children) };
      }
      return item;
    });

  const next = walk(tree);
  // A watcher may report a child before its parent has appeared in the tree.
  // Ignore that event; the parent's addDir event or next snapshot will reconcile it.
  void parentFound;
  void name;
  void isDirectory;
  return next;
}

function sortEntries(a: DirectoryEntry, b: DirectoryEntry) {
  if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
  return a.name.localeCompare(b.name);
}

export const useDirectoryStore = create<DirectoryState>((set) => ({
  root: '',
  tree: [],
  connected: false,
  lastEventAt: null,
  setConnected: (connected) => set({ connected }),
  setSnapshot: (snapshot) => set({ root: snapshot.root, tree: snapshot.tree }),
  applyEvent: (event) =>
    set((state) => ({
      tree: updateTree(state.tree, event),
      lastEventAt: event.timestamp,
    })),
}));
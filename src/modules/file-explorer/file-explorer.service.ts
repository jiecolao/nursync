import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Subject } from 'rxjs';
import chokidar, { FSWatcher } from 'chokidar';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';

export type FileNode = { name: string; path: string; type: 'file' | 'directory'; size: number; extension: string; modifiedAt: string; children?: FileNode[] };
export type FileEvent = { event: 'add' | 'unlink' | 'change' | 'addDir' | 'unlinkDir'; path: string; node?: FileNode };

@Injectable()
export class FileExplorerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(FileExplorerService.name);
  private watcher?: FSWatcher;
  readonly events = new Subject<FileEvent>();
  readonly root = path.resolve(process.env.FILE_EXPLORER_ROOT || path.join(process.cwd(), 'uploads'));

  async onModuleInit() {
    await fs.mkdir(this.root, { recursive: true });
    this.watcher = chokidar.watch(this.root, { ignoreInitial: true, persistent: true, awaitWriteFinish: { stabilityThreshold: 250, pollInterval: 100 } });
    for (const event of ['add', 'unlink', 'change', 'addDir', 'unlinkDir'] as const) {
      this.watcher.on(event, async (absolutePath) => {
        const relativePath = path.relative(this.root, absolutePath).split(path.sep).join('/');
        if (!relativePath || relativePath.startsWith('../') || path.isAbsolute(relativePath)) return;
        let node: FileNode | undefined;
        if (event === 'add' || event === 'change' || event === 'addDir') {
          try { node = await this.readNode(absolutePath, event === 'addDir'); } catch { /* A file may disappear during the event. */ }
        }
        this.events.next({ event, path: relativePath, node });
      });
    }
    this.watcher.on('error', (error) => this.logger.error('Filesystem watcher error', error));
  }

  async onModuleDestroy() { await this.watcher?.close(); this.events.complete(); }

  private async readNode(absolutePath: string, isDirectory?: boolean): Promise<FileNode> {
    const stats = await fs.stat(absolutePath);
    const directory = isDirectory ?? stats.isDirectory();
    const name = path.basename(absolutePath);
    return { name, path: path.relative(this.root, absolutePath).split(path.sep).join('/'), type: directory ? 'directory' : 'file', size: directory ? 0 : stats.size, extension: directory ? '' : path.extname(name).slice(1).toLowerCase(), modifiedAt: stats.mtime.toISOString() };
  }

  async tree(): Promise<FileNode> {
    const build = async (absolutePath: string): Promise<FileNode> => {
      const node = await this.readNode(absolutePath, true);
      const entries = await fs.readdir(absolutePath, { withFileTypes: true });
      node.children = (await Promise.all(entries.map(async (entry) => {
        const full = path.join(absolutePath, entry.name);
        try {
          if (entry.isSymbolicLink()) return undefined;
          return entry.isDirectory() ? build(full) : this.readNode(full, false);
        } catch { return undefined; }
      }))).filter((item): item is FileNode => Boolean(item));
      node.children.sort((a, b) => a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'directory' ? -1 : 1);
      return node;
    };
    return build(this.root);
  }
}

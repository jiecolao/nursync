import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import chokidar, { FSWatcher } from 'chokidar';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import {
  DirectoryEntry,
  DirectoryEvent,
  DirectoryScope,
  DirectorySnapshot,
} from './directory.types';

@Injectable()
export class DirectoryService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DirectoryService.name);
  private readonly watchers = new Map<DirectoryScope, FSWatcher>();
  private readonly roots: Record<DirectoryScope, string> = {
    students: path.resolve(process.env.DIRECTORY_WATCH_PATH || './Database/Students'),
    trash: path.resolve(process.env.TRASH_DIRECTORY_WATCH_PATH || './Database/Trash'),
  };

  onModuleInit() {
    for (const scope of Object.keys(this.roots) as DirectoryScope[]) {
      void this.startWatcher(scope);
    }
  }

  async onModuleDestroy() {
    await Promise.all([...this.watchers.values()].map((watcher) => watcher.close()));
  }

  getRoot(scope: DirectoryScope = 'students') {
    return this.roots[scope];
  }

  resolveScope(value?: string): DirectoryScope {
    if (value === 'trash') return 'trash';
    if (!value || value === 'students') return 'students';
    throw new BadRequestException(`Unknown directory scope: ${value}`);
  }

  async getSnapshot(scope: DirectoryScope = 'students'): Promise<DirectorySnapshot> {
    const root = this.getRoot(scope);
    try {
      await fs.access(root);
    } catch {
      throw new ServiceUnavailableException(
        `Watched directory is unavailable: ${root}. Create it or set the directory watch path.`,
      );
    }

    return {
      root,
      tree: await this.readDirectory(root, scope),
      generatedAt: new Date().toISOString(),
    };
  }

  async getEntry(relativePath: string, scope: DirectoryScope = 'students'): Promise<DirectoryEntry | undefined> {
    const absolute = this.resolveInsideRoot(relativePath, scope);
    try {
      const stat = await fs.stat(absolute);
      const name = path.basename(absolute);
      const directory = stat.isDirectory();
      const entry: DirectoryEntry = {
        name,
        path: this.toRelative(scope, absolute),
        type: directory ? 'directory' : 'file',
        size: directory ? 0 : stat.size,
        extension: directory ? '' : path.extname(name).slice(1).toLowerCase(),
        modifiedAt: stat.mtime.toISOString(),
      };
      if (directory) entry.children = await this.readDirectory(absolute, scope);
      return entry;
    } catch {
      return undefined;
    }
  }

  private async startWatcher(scope: DirectoryScope) {
    const root = this.getRoot(scope);
    try {
      await fs.mkdir(root, { recursive: true });
      const watcher = chokidar.watch(root, {
        ignoreInitial: true,
        awaitWriteFinish: { stabilityThreshold: 250, pollInterval: 100 },
        atomic: true,
        followSymlinks: false,
      });
      this.watchers.set(scope, watcher);

      for (const type of ['add', 'change', 'unlink', 'addDir', 'unlinkDir'] as const) {
        watcher.on(type, (absolutePath) => {
          void this.publish(scope, type, absolutePath);
        });
      }
      watcher.on('error', (error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`Directory watcher error: ${message}`);
      });
      await new Promise<void>((resolve, reject) => {
        watcher.once('ready', resolve);
        watcher.once('error', reject);
      });
      this.logger.log(`Watching ${root}`);
    } catch (error) {
      this.logger.error(
        `Could not start directory watcher: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async publish(scope: DirectoryScope, type: DirectoryEvent['type'], absolutePath: string) {
    const eventPath = this.toRelative(scope, absolutePath);
    const entry = type === 'unlink' || type === 'unlinkDir'
      ? undefined
      : await this.getEntry(eventPath, scope);
    const event: DirectoryEvent = {
      scope,
      type,
      path: eventPath,
      ...(entry ? { entry } : {}),
      timestamp: new Date().toISOString(),
    };
    this.onEvent?.(event);
  }

  private onEvent?: (event: DirectoryEvent) => void;

  setEventHandler(handler: (event: DirectoryEvent) => void) {
    this.onEvent = handler;
  }

  private async readDirectory(absolutePath: string, scope: DirectoryScope = 'students'): Promise<DirectoryEntry[]> {
    const items = await fs.readdir(absolutePath, { withFileTypes: true });
    const entries = await Promise.all(
      items.map(async (item): Promise<DirectoryEntry> => {
        const fullPath = path.join(absolutePath, item.name);
        const stat = await fs.stat(fullPath);
        const directory = item.isDirectory();
        const entry: DirectoryEntry = {
          name: item.name,
          path: this.toRelative(scope, fullPath),
          type: directory ? 'directory' : 'file',
          size: directory ? 0 : stat.size,
          extension: directory ? '' : path.extname(item.name).slice(1).toLowerCase(),
          modifiedAt: stat.mtime.toISOString(),
        };
        if (directory) entry.children = await this.readDirectory(fullPath, scope);
        return entry;
      }),
    );
    return entries.sort((a, b) =>
      a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'directory' ? -1 : 1,
    );
  }

  private resolveInsideRoot(relativePath: string, scope: DirectoryScope = 'students') {
    const root = this.getRoot(scope);
    const absolute = path.resolve(root, relativePath || '.');
    if (absolute !== root && !absolute.startsWith(root + path.sep)) {
      throw new ServiceUnavailableException('Path is outside the watched directory.');
    }
    return absolute;
  }

  private toRelative(scope: DirectoryScope, absolutePath: string) {
    return path.relative(this.getRoot(scope), absolutePath).split(path.sep).join('/');
  }
}
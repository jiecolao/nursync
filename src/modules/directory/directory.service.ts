import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import chokidar, { FSWatcher } from 'chokidar';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { DirectoryEntry, DirectoryEvent, DirectorySnapshot } from './directory.types';

@Injectable()
export class DirectoryService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DirectoryService.name);
  private watcher?: FSWatcher;
  private readonly root = path.resolve(process.env.DIRECTORY_WATCH_PATH || './storage');

  onModuleInit() {
    void this.startWatcher();
  }

  async onModuleDestroy() {
    await this.watcher?.close();
  }

  getRoot() {
    return this.root;
  }

  async getSnapshot(): Promise<DirectorySnapshot> {
    try {
      await fs.access(this.root);
    } catch {
      throw new ServiceUnavailableException(
        `Watched directory is unavailable: ${this.root}. Create it or set DIRECTORY_WATCH_PATH.`,
      );
    }

    return {
      root: this.root,
      tree: await this.readDirectory(this.root),
      generatedAt: new Date().toISOString(),
    };
  }

  async getEntry(relativePath: string): Promise<DirectoryEntry | undefined> {
    const absolute = this.resolveInsideRoot(relativePath);
    try {
      const stat = await fs.stat(absolute);
      const name = path.basename(absolute);
      const directory = stat.isDirectory();
      const entry: DirectoryEntry = {
        name,
        path: this.toRelative(absolute),
        type: directory ? 'directory' : 'file',
        size: directory ? 0 : stat.size,
        extension: directory ? '' : path.extname(name).slice(1).toLowerCase(),
        modifiedAt: stat.mtime.toISOString(),
      };
      if (directory) entry.children = await this.readDirectory(absolute);
      return entry;
    } catch {
      return undefined;
    }
  }

  private async startWatcher() {
    try {
      await fs.mkdir(this.root, { recursive: true });
      this.watcher = chokidar.watch(this.root, {
        ignoreInitial: true,
        awaitWriteFinish: { stabilityThreshold: 250, pollInterval: 100 },
        atomic: true,
        followSymlinks: false,
      });

      for (const type of ['add', 'change', 'unlink', 'addDir', 'unlinkDir'] as const) {
        this.watcher.on(type, (absolutePath) => {
          void this.publish(type, absolutePath);
        });
      }
      this.watcher.on('error', (error) =>
        this.logger.error(`Directory watcher error: ${error.message}`),
      );
      await new Promise<void>((resolve, reject) => {
        this.watcher!.once('ready', resolve);
        this.watcher!.once('error', reject);
      });
      this.logger.log(`Watching ${this.root}`);
    } catch (error) {
      this.logger.error(
        `Could not start directory watcher: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async publish(type: DirectoryEvent['type'], absolutePath: string) {
    const eventPath = this.toRelative(absolutePath);
    const entry = type === 'unlink' || type === 'unlinkDir'
      ? undefined
      : await this.getEntry(eventPath);
    const event: DirectoryEvent = {
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

  private async readDirectory(absolutePath: string): Promise<DirectoryEntry[]> {
    const items = await fs.readdir(absolutePath, { withFileTypes: true });
    const entries = await Promise.all(
      items.map(async (item): Promise<DirectoryEntry> => {
        const fullPath = path.join(absolutePath, item.name);
        const stat = await fs.stat(fullPath);
        const directory = item.isDirectory();
        const entry: DirectoryEntry = {
          name: item.name,
          path: this.toRelative(fullPath),
          type: directory ? 'directory' : 'file',
          size: directory ? 0 : stat.size,
          extension: directory ? '' : path.extname(item.name).slice(1).toLowerCase(),
          modifiedAt: stat.mtime.toISOString(),
        };
        if (directory) entry.children = await this.readDirectory(fullPath);
        return entry;
      }),
    );
    return entries.sort((a, b) =>
      a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'directory' ? -1 : 1,
    );
  }

  private resolveInsideRoot(relativePath: string) {
    const absolute = path.resolve(this.root, relativePath || '.');
    if (absolute !== this.root && !absolute.startsWith(this.root + path.sep)) {
      throw new ServiceUnavailableException('Path is outside the watched directory.');
    }
    return absolute;
  }

  private toRelative(absolutePath: string) {
    return path.relative(this.root, absolutePath).split(path.sep).join('/');
  }
}
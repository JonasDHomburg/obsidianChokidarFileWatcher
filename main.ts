import {Plugin} from 'obsidian';
import * as chokidar from 'chokidar';

export default class FileWatcherPlugin extends Plugin {
  root_path: string = this.app.vault.adapter.basePath;
  last_modified: Map<String, any> = new Map();
  async onload() {
    console.log('Loading file watcher plugin');

    // Initialize Chokidar watcher
    const watcher = chokidar.watch(this.root_path, {
      ignored: /(^|[\/\\])\../, // ignore dotfiles
      persistent: true,
      ignoreInitial: true,
      usePolling: true,
      awaitWriteFinish: true,
      cwd: this.root_path,
    });

    // Add event listeners
    watcher
      .on('add', (path:any , stats:any ) => this.file_modified('add', path, stats))
      .on('change', (path:any, stats:any) => this.file_modified('change', path, stats))
      .on('unlink', (path:any, stats:any) => this.file_modified('unlink', path, stats));

    // Stop watching when the plugin is unloaded
    this.register(() => {
      watcher.close().then(() => console.log('Watcher closed'));
    });
    console.log('file watcher plugin loaded!');
  }

  onunload() {
    console.log('Unloading file watcher plugin');
  }

  async file_modified(event:string, path: string, stats: any) {
    try {
      if (this.last_modified.get(path) != stats.mtime) {
        this.last_modified.set(path, stats.mtime);
        const base_watcher = this.app.vault.adapter.watchers['/'];
        if (base_watcher) {
          try {
            base_watcher.watcher['_handle'].onchange(0, event, path)
          } catch(error) {
          }
        }
      }
    } catch(error) {
    }
  }
}
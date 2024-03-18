import {Plugin} from 'obsidian';
import * as chokidar from 'chokidar';

export default class FileWatcherPlugin extends Plugin {
  async onload() {
    console.log('Loading file watcher plugin');
    console.log(this.app.vault.getRoot().name);
    console.log(this.app.vault.adapter);
    console.log(this.app.vault);

    // Initialize Chokidar watcher
    const watcher = chokidar.watch(this.app.vault.adapter.basePath, {
      ignored: /(^|[\/\\])\../, // ignore dotfiles
      persistent: true
    });

    // Add event listeners
    watcher
      .on('add', path => this.file_modified(path, 'add'))
      .on('change', path => this.file_modified(path, 'change'))
      .on('unlink', path => this.file_modified(path, 'unlink'));

    // Stop watching when the plugin is unloaded
    this.register(() => {
      watcher.close().then(() => console.log('Watcher closed'));
    });
  }

  onunload() {
    console.log('Unloading file watcher plugin');
  }

  file_modified(path: string, event: string) {
    console.log(`File ${path} has event: ${event}`)
  }
}
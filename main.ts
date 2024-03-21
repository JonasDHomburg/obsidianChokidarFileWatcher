import {App, Plugin, PluginSettingTab, Setting} from 'obsidian';
import * as chokidar from 'chokidar';

interface FileWatcherSettings {
  followSymlinks: boolean;
  disableGlobbing: boolean;
  usePolling: boolean;
  interval: number;
  binaryInterval: number;
  awaitWriteFinish: boolean;
  awaitWriteFinish_stabilityThreshold: number;
  awaitWriteFinish_pollInterval: number;
}

const DEFAULT_SETTINGS: FileWatcherSettings = {
	followSymlinks: true,
  disableGlobbing: false,
  usePolling: true,
  interval: 100,
  binaryInterval: 300,
  awaitWriteFinish: true,
  awaitWriteFinish_stabilityThreshold: 2000,
  awaitWriteFinish_pollInterval: 100,
}

export default class FileWatcherPlugin extends Plugin {
  settings: FileWatcherSettings;
  root_path: string = this.app.vault.adapter.basePath;
  last_modified: Map<String, any> = new Map();
  watcher: chokidar.FSWatcher;
  async onload() {
    console.log('Loading file watcher plugin');

    await this.loadSettings();
    this.addSettingTab(new FileWatcherSettingTab(this.app, this));

    // Initialize Chokidar watcher
    this.watcher = this.create_watcher();

    // Stop watching when the plugin is unloaded
    this.register(() => {
      this.watcher.close().then(() => console.log('Watcher closed'));
    });
    console.log('file watcher plugin loaded!');
  }

  create_watcher(): chokidar.FSWatcher {
    const watcher = chokidar.watch(this.root_path, {
      ignored: /(^|[\/\\])\../, // ignore dotfiles
      persistent: true,
      ignoreInitial: true,
      // usePolling: true,
      // awaitWriteFinish: true,
      cwd: this.root_path,
      // config
      followSymlinks: this.settings.followSymlinks,
      disableGlobbing: this.settings.disableGlobbing,
      usePolling: this.settings.usePolling,
      interval: this.settings.interval,
      binaryInterval: this.settings.binaryInterval,
      awaitWriteFinish: this.settings.awaitWriteFinish?{
        stabilityThreshold: this.settings.awaitWriteFinish_stabilityThreshold,
        pollInterval: this.settings.awaitWriteFinish_pollInterval,
      }:false,

    });

    // Add event listeners
    watcher
      .on('add', (path:any , stats:any ) => this.file_modified('add', path, stats))
      .on('change', (path:any, stats:any) => this.file_modified('change', path, stats))
      .on('unlink', (path:any, stats:any) => this.file_modified('unlink', path, stats));
    
      return watcher;
  }

  onunload() {
    console.log('Unloading file watcher plugin');
  }

  async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
    const new_watcher = this.create_watcher()
    this.watcher.close().then(() => this.watcher = new_watcher);
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

class FileWatcherSettingTab extends PluginSettingTab {
	plugin: FileWatcherPlugin;
  update_interval_value: (value: number) => void;
  update_binaryInterval_value: (value: number) => void;
  update_awaitWriteFinish_stabilityThreshold_value: (value: number) => void;
  update_awaitWriteFinish_pollInterval_value: (value: number) => void;

	constructor(app: App, plugin: FileWatcherPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();
    containerEl.createEl('h2', { text: 'Chokidar Settings'});

		new Setting(containerEl)
			.setName('followSymlinks')
			.setDesc('followSymlinks')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.followSymlinks)
        .onChange(async value => {
          this.plugin.settings.followSymlinks = value;
          await this.plugin.saveSettings();
        })
      );
    
    new Setting(containerEl)
      .setName('disableGlobbing')
      .setDesc('disableGlobbing')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.disableGlobbing)
        .onChange(async value => {
          this.plugin.settings.disableGlobbing = value;
          await this.plugin.saveSettings();
        })
      );
    
    new Setting(containerEl)
      .setName('usePolling')
      .setDesc('usePolling')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.usePolling)
        .onChange(async value => {
          this.plugin.settings.usePolling = value;
          await this.plugin.saveSettings();
        })
      );
    
    new Setting(containerEl)
      .setName('interval')
      .setDesc('polling interval for non binary files')
      .addSlider(slider => slider
        .setValue(this.plugin.settings.interval)
        .setLimits(100, 60000, 100)
        .onChange(async value => {
          this.plugin.settings.interval = value;
          this.update_interval_value(value);
          await this.plugin.saveSettings();
        })
      );
    let interval_value = containerEl.createSpan(`Value: ${this.plugin.settings.interval}`);
    this.update_interval_value = (value: number) => {
      interval_value.setText(`Value: ${value}`);
    }
    this.update_interval_value(this.plugin.settings.interval);

    new Setting(containerEl)
      .setName('binaryInterval')
      .setDesc('polling interval for binary files')
      .addSlider(slider => slider
        .setValue(this.plugin.settings.binaryInterval)
        .setLimits(100, 60000, 100)
        .onChange(async value => {
          this.plugin.settings.binaryInterval = value;
          this.update_binaryInterval_value(value);
          await this.plugin.saveSettings();
        })
      );
    let binaryInterval_value = containerEl.createSpan(`Value: ${this.plugin.settings.binaryInterval}`);
    this.update_binaryInterval_value = (value: number) => {
      binaryInterval_value.setText(`Value: ${value}`);
    }
    this.update_binaryInterval_value(this.plugin.settings.binaryInterval);

    new Setting(containerEl)
      .setName('awaitWriteFinish')
      .setDesc('awaitWriteFinish')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.awaitWriteFinish)
        .onChange(async value => {
          this.plugin.settings.awaitWriteFinish = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName('awaitWriteFinish_stabilityThreshold')
      .setDesc('stabilityThreshold for awaitWriteFinish')
      .addSlider(slider => slider
        .setValue(this.plugin.settings.awaitWriteFinish_stabilityThreshold)
        .setLimits(100, 100000, 100)
        .onChange(async value => {
          this.plugin.settings.awaitWriteFinish_stabilityThreshold = value;
          this.update_awaitWriteFinish_stabilityThreshold_value(value);
          await this.plugin.saveSettings();
        })
      );
    let awaitWriteFinish_stabilityThreshold_value = containerEl.createSpan(`Value: ${this.plugin.settings.awaitWriteFinish_stabilityThreshold}`);
    this.update_awaitWriteFinish_stabilityThreshold_value = (value: number) => {
      awaitWriteFinish_stabilityThreshold_value.setText(`Value: ${value}`);
    }
    this.update_awaitWriteFinish_stabilityThreshold_value(this.plugin.settings.awaitWriteFinish_stabilityThreshold);
    
    new Setting(containerEl)
      .setName('awaitWriteFinish_pollInterval')
      .setDesc('polling interval for awaitWriteFinish')
      .addSlider(slider => slider
        .setValue(this.plugin.settings.awaitWriteFinish_pollInterval)
        .setLimits(100, 5000, 100)
        .onChange(async value => {
          this.plugin.settings.awaitWriteFinish_pollInterval = value;
          this.update_awaitWriteFinish_pollInterval_value(value);
          await this.plugin.saveSettings();
        })
      );
    let awaitWriteFinish_pollInterval_value = containerEl.createSpan(`Value: ${this.plugin.settings.awaitWriteFinish_pollInterval}`);
    this.update_awaitWriteFinish_pollInterval_value = (value: number) => {
      awaitWriteFinish_pollInterval_value.setText(`Value: ${value}`);
    }
    this.update_awaitWriteFinish_pollInterval_value(this.plugin.settings.awaitWriteFinish_pollInterval);
	}
}

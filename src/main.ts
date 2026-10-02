import { Plugin } from 'obsidian';
import { publishService, unpublishService } from '../../sbe-core/src/bridge';
import type { SbeDevstandApi } from '../../sbe-core/src/types';
import { DevClient } from './services/dev-client';
import { DEFAULT_SETTINGS, SbeDevstandSettings } from './types/settings';
import { SbeDevstandSettingsTab } from './ui/settings-tab';

export default class SbeDevstandPlugin extends Plugin {
  settings!: SbeDevstandSettings;
  dev!: DevClient;

  async onload(): Promise<void> {
    await this.loadSettings();
    this.dev = new DevClient(() => this.settings);
    publishService<SbeDevstandApi>('sbe-devstand', this.dev, {
      version: this.manifest.version,
      name: this.manifest.name,
    });
    this.addSettingTab(new SbeDevstandSettingsTab(this.app, this));
  }

  onunload(): void {
    unpublishService('sbe-devstand');
  }

  async loadSettings(): Promise<void> {
    const data = (await this.loadData() as Partial<SbeDevstandSettings>) || {};
    this.settings = {
      ...DEFAULT_SETTINGS,
      ...data,
      integrations: { ...DEFAULT_SETTINGS.integrations, ...(data.integrations ?? {}) },
    };
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }
}

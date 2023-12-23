import { Plugin } from 'obsidian';
import { calctexHintRenderer } from './editor';
import { CalctexPluginSettings, CalctexSettingTab, DEFAULT_SETTINGS } from './settings';

export default class CalctexPlugin extends Plugin {
  static INSTANCE: CalctexPlugin;
  settings: CalctexPluginSettings;

	async onload() {
    await this.loadSettings();
    this.addSettingTab(new CalctexSettingTab(this.app, this));

    this.registerEditorExtension([calctexHintRenderer]);

    CalctexPlugin.INSTANCE = this;
	}

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}
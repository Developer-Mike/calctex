import CalctexPlugin from "./main";
import { App, PluginSettingTab, Setting } from "obsidian";

export interface CalctexPluginSettings {
  calculationTriggerString: string,
  completionTriggerKey: string,
}

export const DEFAULT_SETTINGS: Partial<CalctexPluginSettings> = {
  calculationTriggerString: "=",
  completionTriggerKey: "Tab"
};

export class CalctexSettingTab extends PluginSettingTab {
  plugin: CalctexPlugin;

  constructor(app: App, plugin: CalctexPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    let { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName("Calculation Trigger String")
      .setDesc("The string that triggers calculation.")
      .addText((text) =>
        text
          .setPlaceholder("Type a string here")
          .setValue(this.plugin.settings.calculationTriggerString)
          .onChange(async (value) => {
            this.plugin.settings.calculationTriggerString = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Completion Trigger Key")
      .setDesc("The key that triggers completion.")
      .addText((text) =>
        text
          .setPlaceholder("Type name of a key here")
          .setValue(this.plugin.settings.completionTriggerKey)
          .onChange(async (value) => {
            this.plugin.settings.completionTriggerKey = value;
            await this.plugin.saveSettings();
          })
      );
  }
}
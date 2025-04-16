import CalctexPlugin from "./main";
import { App, PluginSettingTab, Setting } from "obsidian";

export interface CalctexPluginSettings {
  calculationTriggerString: string
  approxCalculationTriggerString: string
  completionTriggerKey: string
  multiplicationSymbol: string
  groupSeparator: string
}

export const DEFAULT_SETTINGS: Partial<CalctexPluginSettings> = {
  calculationTriggerString: "=",
  approxCalculationTriggerString: "\\approx",
  completionTriggerKey: "Tab",
  multiplicationSymbol: "*",
  groupSeparator: "'",
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
      .setName("Approximation Trigger String")
      .setDesc("The string that triggers approximation.")
      .addText((text) =>
        text
          .setPlaceholder("Type a string here")
          .setValue(this.plugin.settings.approxCalculationTriggerString)
          .onChange(async (value) => {
            this.plugin.settings.approxCalculationTriggerString = value;
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

    new Setting(containerEl)
      .setName("Multiplication Symbol")
      .setDesc("The symbol used for multiplication (e.g. * or \\times).")
      .addText((text) =>
        text
          .setPlaceholder("Type a symbol here")
          .setValue(this.plugin.settings.multiplicationSymbol)
          .onChange(async (value) => {
            this.plugin.settings.multiplicationSymbol = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Group Separator")
      .setDesc("The symbol used for grouping numbers (e.g. ' or \\,).")
      .addText((text) =>
        text
          .setPlaceholder("Type a symbol here")
          .setValue(this.plugin.settings.groupSeparator)
          .onChange(async (value) => {
            this.plugin.settings.groupSeparator = value;
            await this.plugin.saveSettings();
          })
      );
  }
}
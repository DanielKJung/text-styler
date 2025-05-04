import { App, PluginSettingTab, Setting, ColorComponent, BaseComponent } from "obsidian";
import TextStyler from "./main"; // Assuming main class is TextStyler
import { DEFAULT_SETTINGS, MAX_COLOR_SLOTS } from "./constants";

export class StylerSettingsTab extends PluginSettingTab {
    plugin: TextStyler;
    favoriteTextColorsSetting: Setting;
    favoriteHighlightColorsSetting: Setting;

    constructor(app: App, plugin: TextStyler) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.createEl("h2", { text: "Text Styler Settings" });

        // --- Text Color Settings ---
        containerEl.createEl("h3", { text: "Text Color" });
        new Setting(containerEl)
            .setName("Number of Text Color Slots")
            .setDesc(`Set the number of quick-access text color slots in the status bar (1-${MAX_COLOR_SLOTS}). Requires reload.`)
            .addText((text) => text
                .setPlaceholder(String(DEFAULT_SETTINGS.textColorSlots))
                .setValue(String(this.plugin.settings.textColorSlots))
                .onChange(async (value) => {
                    let num = parseInt(value);
                    if (isNaN(num) || num < 1) num = 1;
                    if (num > MAX_COLOR_SLOTS) num = MAX_COLOR_SLOTS;
                    this.plugin.settings.textColorSlots = num;
                    // Ensure color arrays match new size on save
                    await this.plugin.saveSettings(true); // Pass flag to resize arrays
                    text.setValue(String(this.plugin.settings.textColorSlots)); // Update display
                    // Note: User still needs to reload manually for status bar change
                })
            );

        this.favoriteTextColorsSetting = new Setting(containerEl)
            .setName("Favorite Text Colors")
            .setDesc("Set your favorite text colors for the picker modal.");
        this.renderColorPickers(this.favoriteTextColorsSetting, this.plugin.settings.favoriteTextColors, 'text');


        // --- Highlight Color Settings ---
         containerEl.createEl("h3", { text: "Highlight Color" });
         new Setting(containerEl)
            .setName("Number of Highlight Color Slots")
            .setDesc(`Set the number of quick-access highlight color slots in the status bar (1-${MAX_COLOR_SLOTS}). Requires reload.`)
            .addText((text) => text
                .setPlaceholder(String(DEFAULT_SETTINGS.highlightColorSlots))
                .setValue(String(this.plugin.settings.highlightColorSlots))
                .onChange(async (value) => {
                    let num = parseInt(value);
                    if (isNaN(num) || num < 1) num = 1;
                    if (num > MAX_COLOR_SLOTS) num = MAX_COLOR_SLOTS;
                    this.plugin.settings.highlightColorSlots = num;
                    await this.plugin.saveSettings(true); // Resize arrays
                    text.setValue(String(this.plugin.settings.highlightColorSlots));
                })
            );

        this.favoriteHighlightColorsSetting = new Setting(containerEl)
            .setName("Favorite Highlight Colors")
            .setDesc("Set your favorite highlight colors for the picker modal.");
        this.renderColorPickers(this.favoriteHighlightColorsSetting, this.plugin.settings.favoriteHighlightColors, 'highlight');


    }

    // Helper to render color pickers and handle updates
    renderColorPickers(setting: Setting, colorArray: string[], type: 'text' | 'highlight') {
        // Clear existing color pickers before rendering
        setting.components = setting.components.filter(c => !(c instanceof ColorComponent));


        colorArray.forEach((color, index) => {
            setting.addColorPicker((cp) => cp
                .setValue(color)
                .onChange(async (value) => {
                    colorArray[index] = value;
                    await this.plugin.saveSettings();
                })
            );
        });

         // Add "Restore Defaults" button if not present
         if (!setting.components.find(c => (c as any).extraButtonEl?.ariaLabel === "Restore defaults")) {
            setting.addExtraButton((button) => {
                button
                    .setIcon("rotate-ccw")
                    .setTooltip("Restore defaults")
                    .onClick(async () => {
                        if (type === 'text') {
                            this.plugin.settings.favoriteTextColors = [...DEFAULT_SETTINGS.favoriteTextColors];
                        } else {
                            this.plugin.settings.favoriteHighlightColors = [...DEFAULT_SETTINGS.favoriteHighlightColors];
                        }
                        this.renderColorPickers(setting, colorArray, type); // Re-render
                        await this.plugin.saveSettings();
                    });
            });
         }
    }
}

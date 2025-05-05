import { App, Editor, MarkdownView, Menu, Notice, Plugin, PluginManifest, ExtraButtonComponent, TextComponent, MenuItem } from 'obsidian'; // Added missing imports
import { StylerSettingsTab } from './settingsTab';
import { StylerStatusBar } from './statusBar';
import { StyleManager } from './styleManager';
import { DEFAULT_SETTINGS, DEFAULT_COLORED_UNDERLINE_THICKNESS, DEFAULT_CIRCLE_THICKNESS } from './constants'; // Import new defaults
import { PluginSettings, StyleType } from './types';
import { ColorModal } from './colorModal';

export default class TextStyler extends Plugin {
    settings: PluginSettings;
    statusBar: StylerStatusBar | null = null;
    styleManager: StyleManager;
    statusBarItem: HTMLElement | null = null;

    constructor(app: App, manifest: PluginManifest) {
        super(app, manifest);
        this.styleManager = new StyleManager(this); // Pass plugin instance
    }

    async onload() {
        console.log('Loading Text Styler Plugin');

        await this.loadSettings();

        // --- Status Bar ---
        this.statusBarItem = this.addStatusBarItem();
        if (this.statusBarItem) {
            this.statusBar = new StylerStatusBar(this, this.statusBarItem);
        } else {
            console.error("Text Styler: Could not create status bar item.");
        }


        // --- Settings Tab ---
        this.addSettingTab(new StylerSettingsTab(this.app, this));

        // --- Commands ---
        this.addSimpleToggleCommand('toggle-bold', 'Toggle Bold', 'bold');
        this.addSimpleToggleCommand('toggle-italic', 'Toggle Italic', 'italic');
        this.addSimpleToggleCommand('toggle-underline', 'Toggle Underline', 'underline');
        this.addSimpleToggleCommand('toggle-strike', 'Toggle Strikethrough', 'strike');

        // Circled Text Command (needs color value)
        this.addCommand({
            id: 'toggle-circled',
            name: 'Toggle Circled Text',
            editorCallback: (editor: Editor) => {
                const color = this.statusBar?.getCurrentTextColor(); // Get current text color
                if (color) {
                    this.styleManager.toggleStyle(editor, 'circled', color); // Pass color as value
                } else {
                    new Notice("Text Styler: Select a text color first to use for the circle.");
                }
            }
        });

        // Colored Underline Command (needs color value)
        this.addCommand({
          id: 'toggle-colored-underline',
          name: 'Toggle Colored Underline',
          editorCallback: (editor: Editor) => {
              const color = this.statusBar?.getCurrentTextColor();
              if (color) {
                  this.styleManager.toggleStyle(editor, 'colored-underline', color);
              } else {
                  new Notice("Text Styler: No text color selected for underline.");
              }
          }
        });

        // Apply/Remove Color/Highlight Commands
        this.addCommand({
            id: 'apply-text-color',
            name: 'Apply Text Color (Current Slot)',
            editorCallback: (editor: Editor) => {
                const color = this.statusBar?.getCurrentTextColor();
                if (color) { this.styleManager.toggleStyle(editor, 'color', color); }
                else { new Notice("Text Styler: No text color selected."); }
            },
        });

         this.addCommand({
            id: 'apply-highlight-color',
            name: 'Apply Highlight Color (Current Slot)',
            editorCallback: (editor: Editor) => {
                const color = this.statusBar?.getCurrentHighlightColor();
                if (color) { this.styleManager.toggleStyle(editor, 'highlight', color); }
                 else { new Notice("Text Styler: No highlight color selected."); }
            },
        });

         this.addCommand({
            id: 'remove-text-color',
            name: 'Remove Text Color',
            editorCallback: (editor: Editor) => {
                this.styleManager.toggleStyle(editor, 'color', null);
            },
        });

         this.addCommand({
            id: 'remove-highlight-color',
            name: 'Remove Highlight Color',
            editorCallback: (editor: Editor) => {
                this.styleManager.toggleStyle(editor, 'highlight', null);
            },
        });

        // Remove All Styling Command
        this.addCommand({
            id: 'remove-all-styling',
            name: 'Remove All Styling',
             editorCallback: (editor: Editor) => {
                this.styleManager.removeAllStyling(editor);
             }
        });

        // Change Color Slot Commands
         this.addCommand({
            id: 'change-text-color-slot',
            name: 'Change Current Text Color Slot',
            callback: () => this.openColorChangeModal('text')
         });

         this.addCommand({
            id: 'change-highlight-color-slot',
            name: 'Change Current Highlight Color Slot',
            callback: () => this.openColorChangeModal('highlight')
         });

         this.addCommand({
            id: 'cycle-text-color-forward',
            name: 'Change Text Color Slot Forward',
            callback: () => this.cycleColorSlot('text', 'forward'),
        });
        this.addCommand({
            id: 'cycle-text-color-backward',
            name: 'Change Text Color Slot Backward',
            callback: () => this.cycleColorSlot('text', 'backward'),
        });
        this.addCommand({
            id: 'cycle-highlight-color-forward',
            name: 'Change Highlight Color Slot Forward',
            callback: () => this.cycleColorSlot('highlight', 'forward'),
        });
        this.addCommand({
            id: 'cycle-highlight-color-backward',
            name: 'Change Highlight Color Slot Backward',
            callback: () => this.cycleColorSlot('highlight', 'backward'),
        });




        // --- Context Menu ---
        this.registerEvent(
            this.app.workspace.on("editor-menu", this.handleEditorMenu)
        );

        // --- Update status bar on theme change ---
        this.registerEvent(this.app.workspace.on("css-change", () => {
             this.statusBar?.updateSelectedVisuals();
        }));
    }

    onunload() {
        console.log('Unloading Text Styler Plugin');
        this.statusBar?.destroy();
        if (this.statusBarItem) {
            this.statusBarItem.remove();
        }
    }

    // Helper to add simple toggle commands (no value needed)
    private addSimpleToggleCommand(id: string, name: string, styleType: StyleType) {
         this.addCommand({
            id: id,
            name: name,
            editorCallback: (editor: Editor) => { // view param removed as unused
                this.styleManager.toggleStyle(editor, styleType, null); // Value is null
            },
        });
    }

    // Handle Context Menu
    private handleEditorMenu = (menu: Menu, editor: Editor, view: MarkdownView) => {
        const selection = editor.getSelection();
        if (!selection) return; // Only show styling options if text selected

         menu.addItem((item: MenuItem) => {
            item.setTitle("Styler: Apply Text Color")
                .setIcon("palette")
                .onClick(() => {
                    const color = this.statusBar?.getCurrentTextColor();
                    if (color) this.styleManager.toggleStyle(editor, 'color', color);
                    else new Notice("Text Styler: No text color selected.");
                });
        });
         menu.addItem((item: MenuItem) => {
            item.setTitle("Styler: Apply Highlight")
                .setIcon("highlighter")
                .onClick(() => {
                     const color = this.statusBar?.getCurrentHighlightColor();
                    if (color) this.styleManager.toggleStyle(editor, 'highlight', color);
                     else new Notice("Text Styler: No highlight color selected.");
                });
        });

        menu.addSeparator();

        menu.addItem((item: MenuItem) => {
            item.setTitle("Styler: Toggle Bold")
                .setIcon("bold")
                .onClick(() => this.styleManager.toggleStyle(editor, 'bold', null)); // Pass null explicitly
        });
         menu.addItem((item: MenuItem) => {
            item.setTitle("Styler: Toggle Italic")
                .setIcon("italic")
                .onClick(() => this.styleManager.toggleStyle(editor, 'italic', null)); // Pass null explicitly
        });
        menu.addItem((item: MenuItem) => { // Toggle Standard Underline
          item.setTitle("Styler: Toggle Underline")
              .setIcon("underline")
              .onClick(() => this.styleManager.toggleStyle(editor, 'underline', null)); // Pass null explicitly
        });
       menu.addItem((item: MenuItem) => { // Toggle Colored Underline
          item.setTitle("Styler: Toggle Colored Underline")
              .setIcon("underline") // Consider a different icon later if available
              .onClick(() => {
                  const color = this.statusBar?.getCurrentTextColor();
                  if (color) {
                       this.styleManager.toggleStyle(editor, 'colored-underline', color);
                  } else {
                       new Notice("Text Styler: No text color selected for underline.");
                  }
              });
        });
       menu.addItem((item: MenuItem) => { // Toggle Strike
          item.setTitle("Styler: Toggle Strikethrough")
              .setIcon("strikethrough")
              .onClick(() => this.styleManager.toggleStyle(editor, 'strike', null)); // Pass null explicitly
        });
       menu.addItem((item: MenuItem) => { // Toggle Circled
          item.setTitle("Styler: Toggle Circled Text")
              .setIcon("circle")
              .onClick(() => {
                    const color = this.statusBar?.getCurrentTextColor();
                    if (color) {
                         this.styleManager.toggleStyle(editor, 'circled', color); // Pass text color
                    } else {
                         new Notice("Text Styler: Select a text color first to use for the circle.");
                    }
              });
        });

        menu.addSeparator();

         menu.addItem((item: MenuItem) => {
            item.setTitle("Styler: Remove Colors/Highlight")
                .setIcon("eraser")
                .onClick(() => {
                    this.styleManager.toggleStyle(editor, 'color', null); // Remove color
                    this.styleManager.toggleStyle(editor, 'highlight', null); // Remove highlight
                    this.styleManager.toggleStyle(editor, 'colored-underline', null); // Remove colored underline props
                    });
        });
         menu.addItem((item: MenuItem) => {
            item.setTitle("Styler: Remove All Styles")
                .setIcon("trash")
                .onClick(() => this.styleManager.removeAllStyling(editor));
        });
    }


    openColorChangeModal(type: 'text' | 'highlight') {
        const index = type === 'text' ? this.settings.selectedTextColorIndex : this.settings.selectedHighlightColorIndex;
        const colors = type === 'text' ? this.settings.textColors : this.settings.highlightColors;
        // Ensure index is valid before accessing array
        const safeIndex = Math.max(0, Math.min(index, colors.length - 1));
        const currentColor = colors[safeIndex] || (type === 'text' ? DEFAULT_SETTINGS.textColors[0] : DEFAULT_SETTINGS.highlightColors[0]);

         new ColorModal({
            app: this.app,
            plugin: this,
            initialColor: currentColor,
            colorType: type,
            onSubmit: (newColorHex) => {
                 // Ensure index is still valid before assignment (paranoid check)
                 if (safeIndex < colors.length) {
                     colors[safeIndex] = newColorHex;
                 }
                 this.saveSettings();
                 this.statusBar?.rebuild(); // Update cell color visually
            }
        }).open();
    }

    async cycleColorSlot(type: 'text' | 'highlight', direction: 'forward' | 'backward') {
        if (type === 'text') {
            const currentIdx = this.settings.selectedTextColorIndex;
            const slotCount = this.settings.textColorSlots;
            if (slotCount <= 0) return; // Avoid division by zero or negative index
            let nextIdx: number;
            if (direction === 'forward') {
                nextIdx = (currentIdx + 1) % slotCount;
            } else { // backward
                nextIdx = (currentIdx - 1 + slotCount) % slotCount;
            }
            this.settings.selectedTextColorIndex = nextIdx;
        } else { // highlight
            const currentIdx = this.settings.selectedHighlightColorIndex;
            const slotCount = this.settings.highlightColorSlots;
             if (slotCount <= 0) return;
            let nextIdx: number;
            if (direction === 'forward') {
                nextIdx = (currentIdx + 1) % slotCount;
            } else { // backward
                nextIdx = (currentIdx - 1 + slotCount) % slotCount;
            }
            this.settings.selectedHighlightColorIndex = nextIdx;
        }
        // Save the setting and update the status bar visuals
        await this.saveSettings(); // Use await here for consistency if saveSettings might be async
        this.statusBar?.updateSelectedVisuals(); // Call the existing method to update the UI
    }


    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
        this.ensureColorArraysMatchSlots(); // Ensure new settings are initialized
    }

    async saveSettings(resizeArrays = false) {
        if (resizeArrays) {
            this.ensureColorArraysMatchSlots();
        }
        await this.saveData(this.settings);
        // this.statusBar?.updateSelectedVisuals();
        // No need to call updateSelectedVisuals here, it's called after specific updates

    }

    ensureColorArraysMatchSlots() {
        const { textColorSlots, textColors, highlightColorSlots, highlightColors } = this.settings;
        const defaultTextColor = DEFAULT_SETTINGS.textColors[0] || '#000000'; // Use first default or fallback
        const defaultHighlightColor = DEFAULT_SETTINGS.highlightColors[0] || '#ffff00'; // Use first default or fallback

        // Resize/Initialize Text Colors Array
        if (!Array.isArray(this.settings.textColors) || this.settings.textColors.length !== this.settings.textColorSlots) {
            const newTextColors = Array(this.settings.textColorSlots).fill(defaultTextColor);
            if (Array.isArray(this.settings.textColors)) { // Preserve old colors if possible
                 for (let i = 0; i < Math.min(this.settings.textColors.length, this.settings.textColorSlots); i++) {
                    newTextColors[i] = this.settings.textColors[i];
                }
            }
            this.settings.textColors = newTextColors;
        }

        // Resize/Initialize Highlight Colors Array
        if (!Array.isArray(this.settings.highlightColors) || this.settings.highlightColors.length !== this.settings.highlightColorSlots) {
            const newHighlightColors = Array(this.settings.highlightColorSlots).fill(defaultHighlightColor);
             if (Array.isArray(this.settings.highlightColors)) { // Preserve old colors if possible
                for (let i = 0; i < Math.min(this.settings.highlightColors.length, this.settings.highlightColorSlots); i++) {
                    newHighlightColors[i] = this.settings.highlightColors[i];
                }
             }
            this.settings.highlightColors = newHighlightColors;
         }

         // Initialize new thickness settings if they don't exist
         if (this.settings.coloredUnderlineThickness === undefined || this.settings.coloredUnderlineThickness === null || typeof this.settings.coloredUnderlineThickness !== 'number') {
             this.settings.coloredUnderlineThickness = DEFAULT_SETTINGS.coloredUnderlineThickness;
         }
          if (this.settings.circleThickness === undefined || this.settings.circleThickness === null || typeof this.settings.circleThickness !== 'number') {
             this.settings.circleThickness = DEFAULT_SETTINGS.circleThickness;
         }

         // Ensure selected indices are valid
         this.settings.selectedTextColorIndex = Math.max(0, Math.min(this.settings.selectedTextColorIndex ?? 0, this.settings.textColorSlots - 1));
         this.settings.selectedHighlightColorIndex = Math.max(0, Math.min(this.settings.selectedHighlightColorIndex ?? 0, this.settings.highlightColorSlots - 1));
    }
}

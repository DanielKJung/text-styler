import { App,Editor, MarkdownView, Menu, Notice, Plugin, PluginManifest } from 'obsidian';
import { StylerSettingsTab } from './settingsTab';
import { StylerStatusBar } from './statusBar';
import { StyleManager } from './styleManager';
import { DEFAULT_SETTINGS } from './constants';
import { PluginSettings, StyleType } from './types';
import { ColorModal } from './colorModal'; // Assuming modal exists

export default class TextStyler extends Plugin {
    settings: PluginSettings;
    statusBar: StylerStatusBar | null = null;
    styleManager: StyleManager;
    statusBarItem: HTMLElement | null = null; // Reference to the status bar element

    constructor(app: App, manifest: PluginManifest) {
        super(app, manifest);
        this.styleManager = new StyleManager();
    }

    async onload() {
        console.log('Loading Text Styler Plugin');

        await this.loadSettings();

        // --- Status Bar ---
        // Create the container element for the status bar items
        this.statusBarItem = this.addStatusBarItem();
        // Pass the container to the StylerStatusBar class
        this.statusBar = new StylerStatusBar(this, this.statusBarItem);


        // --- Settings Tab ---
        this.addSettingTab(new StylerSettingsTab(this.app, this));

        // --- Commands ---
        this.addStyleCommand('toggle-bold', 'Toggle Bold', 'bold');
        this.addStyleCommand('toggle-italic', 'Toggle Italic', 'italic');
        this.addStyleCommand('toggle-underline', 'Toggle Underline', 'underline');
        this.addStyleCommand('toggle-strike', 'Toggle Strikethrough', 'strike');
        this.addStyleCommand('toggle-circled', 'Toggle Circled Text', 'circled'); // <-- Add Circled command

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



        this.addCommand({
            id: 'apply-text-color',
            name: 'Apply Text Color (Current Slot)',
            editorCallback: (editor: Editor) => {
                const color = this.statusBar?.getCurrentTextColor();
                if (color) {
                    this.styleManager.toggleStyle(editor, 'color', color);
                }
            },
        });

         this.addCommand({
            id: 'apply-highlight-color',
            name: 'Apply Highlight Color (Current Slot)',
            editorCallback: (editor: Editor) => {
                const color = this.statusBar?.getCurrentHighlightColor();
                if (color) {
                     this.styleManager.toggleStyle(editor, 'highlight', color);
                }
            },
        });

         this.addCommand({
            id: 'remove-text-color',
            name: 'Remove Text Color',
            editorCallback: (editor: Editor) => {
                // Pass null value to indicate removal of the style type
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

        this.addCommand({
            id: 'remove-all-styling',
            name: 'Remove All Styling',
             editorCallback: (editor: Editor) => {
                this.styleManager.removeAllStyling(editor);
             }
        });

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


        // --- Context Menu ---
        this.registerEvent(
            this.app.workspace.on("editor-menu", this.handleEditorMenu)
        );

        // --- Update status bar on theme change (optional but good) ---
        this.registerEvent(this.app.workspace.on("css-change", () => {
             this.statusBar?.updateSelectedVisuals(); // Re-check contrast, etc.
        }));
    }

    onunload() {
        console.log('Unloading Text Styler Plugin');
        this.statusBar?.destroy();
        if (this.statusBarItem) {
            this.statusBarItem.remove();
        }
    }

    // Helper to add styling commands
    addStyleCommand(id: string, name: string, styleType: StyleType) {
        this.addCommand({
            id: id,
            name: name,
            editorCallback: (editor: Editor, view: MarkdownView) => {
                this.styleManager.toggleStyle(editor, styleType, null);
            },
        });
    }

    // Handle Context Menu
    private handleEditorMenu = (menu: Menu, editor: Editor, view: MarkdownView) => {
        const selection = editor.getSelection();
        if (!selection) return; // Only show if text selected

         menu.addItem((item) => {
            item.setTitle("Styler: Apply Text Color")
                .setIcon("palette")
                .onClick(() => {
                    const color = this.statusBar?.getCurrentTextColor();
                    if (color) this.styleManager.toggleStyle(editor, 'color', color);
                });
        });
         menu.addItem((item) => {
            item.setTitle("Styler: Apply Highlight")
                .setIcon("highlighter")
                .onClick(() => {
                     const color = this.statusBar?.getCurrentHighlightColor();
                    if (color) this.styleManager.toggleStyle(editor, 'highlight', color);
                });
        });

        menu.addSeparator();

        menu.addItem((item) => {
            item.setTitle("Styler: Toggle Bold")
                .setIcon("bold")
                .onClick(() => this.styleManager.toggleStyle(editor, 'bold'));
        });
         menu.addItem((item) => {
            item.setTitle("Styler: Toggle Italic")
                .setIcon("italic")
                .onClick(() => this.styleManager.toggleStyle(editor, 'italic'));
        });
        // Add other toggles similarly (underline, strike)

        menu.addItem((item) => { // Toggle Standard Underline
          item.setTitle("Styler: Toggle Underline")
              .setIcon("underline") // Standard underline icon
              .onClick(() => this.styleManager.toggleStyle(editor, 'underline'));
      });
       menu.addItem((item) => { // Toggle Colored Underline - NEW
          item.setTitle("Styler: Toggle Colored Underline")
              .setIcon("underline") // Reuse underline icon or find better one
              .onClick(() => {
                  const color = this.statusBar?.getCurrentTextColor();
                  if (color) {
                       this.styleManager.toggleStyle(editor, 'colored-underline', color);
                  } else {
                       new Notice("Text Styler: No text color selected for underline.");
                  }
              });
      });
       menu.addItem((item) => { // Toggle Strike - unchanged
          item.setTitle("Styler: Toggle Strikethrough")
              .setIcon("strikethrough")
              .onClick(() => this.styleManager.toggleStyle(editor, 'strike'));
      });
       menu.addItem((item) => { // Toggle Circled - NEW
          item.setTitle("Styler: Toggle Circled Text")
              .setIcon("circle") // Lucide icon name for circle
              .onClick(() => this.styleManager.toggleStyle(editor, 'circled'));
      });



        menu.addSeparator();

         menu.addItem((item) => {
            item.setTitle("Styler: Remove Colors")
                .setIcon("eraser")
                .onClick(() => {
                    this.styleManager.toggleStyle(editor, 'color', null);
                    this.styleManager.toggleStyle(editor, 'highlight', null);
                    });
        });
         menu.addItem((item) => {
            item.setTitle("Styler: Remove All Styles")
                .setIcon("trash")
                .onClick(() => this.styleManager.removeAllStyling(editor));
        });
    }


    openColorChangeModal(type: 'text' | 'highlight') {
        const index = type === 'text' ? this.settings.selectedTextColorIndex : this.settings.selectedHighlightColorIndex;
        const colors = type === 'text' ? this.settings.textColors : this.settings.highlightColors;
        const currentColor = colors[index];

         new ColorModal({
            app: this.app,
            plugin: this,
            initialColor: currentColor,
            colorType: type,
            onSubmit: (newColorHex) => {
                colors[index] = newColorHex;
                 this.saveSettings();
                 this.statusBar?.rebuild(); // Update cell color visually
            }
        }).open();
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
        // Ensure arrays match slot numbers after loading potentially old settings
        this.ensureColorArraysMatchSlots();
    }

    async saveSettings(resizeArrays = false) {
        if (resizeArrays) {
            this.ensureColorArraysMatchSlots();
        }
        await this.saveData(this.settings);
        // Trigger status bar rebuild if necessary (e.g., slot count changed)
        // Note: Requires reload for slot count change to take effect in UI creation.
         this.statusBar?.updateSelectedVisuals(); // Update selection visuals immediately
    }

    // Adjust color arrays if slot count changed
    ensureColorArraysMatchSlots() {
        const { textColorSlots, textColors, highlightColorSlots, highlightColors } = this.settings;
        const defaultTextColor = '#000000';
        const defaultHighlightColor = '#ffff00';

        if (textColors.length !== textColorSlots) {
            const newTextColors = Array(textColorSlots).fill(defaultTextColor);
            for (let i = 0; i < Math.min(textColors.length, textColorSlots); i++) {
                newTextColors[i] = textColors[i];
            }
            this.settings.textColors = newTextColors;
        }

         if (highlightColors.length !== highlightColorSlots) {
            const newHighlightColors = Array(highlightColorSlots).fill(defaultHighlightColor);
            for (let i = 0; i < Math.min(highlightColors.length, highlightColorSlots); i++) {
                 newHighlightColors[i] = highlightColors[i];
            }
            this.settings.highlightColors = newHighlightColors;
         }

         // Ensure selected index is valid
         if (this.settings.selectedTextColorIndex >= textColorSlots) {
            this.settings.selectedTextColorIndex = 0;
         }
          if (this.settings.selectedHighlightColorIndex >= highlightColorSlots) {
            this.settings.selectedHighlightColorIndex = 0;
         }
    }
}
import { setIcon } from "obsidian";
import TextStyler from "./main";
import { ColorModal } from "./colorModal";
import { CLASS_PREFIX } from "./constants";

export class StylerStatusBar {
    private plugin: TextStyler;
    private statusBarEl: HTMLElement | null = null; // Main container

    private textPaletteEl: HTMLElement;
    private textColorCells: HTMLElement[] = [];
    private highlightPaletteEl: HTMLElement;
    private highlightColorCells: HTMLElement[] = [];

    constructor(plugin: TextStyler, containerEl: HTMLElement) {
        this.plugin = plugin;
        this.statusBarEl = containerEl; // This should be plugin.addStatusBarItem()
        this.statusBarEl.addClass('styler-status-bar-item'); // Add main class

        // --- Text Color Palette ---
        const textIconEl = this.statusBarEl.createSpan({ cls: 'styler-status-icon' });
        setIcon(textIconEl, 'palette'); // Icon for text color section
        this.textPaletteEl = this.statusBarEl.createDiv({ cls: 'styler-color-palette' });
        this.createColorCells(this.textPaletteEl, this.textColorCells, 'text');

        // Divider
        this.statusBarEl.createSpan({ text: '|', cls: 'styler-status-icon' });

        // --- Highlight Color Palette ---
        const highlightIconEl = this.statusBarEl.createSpan({ cls: 'styler-status-icon' });
        setIcon(highlightIconEl, 'highlighter'); // Icon for highlight section
        this.highlightPaletteEl = this.statusBarEl.createDiv({ cls: 'styler-highlight-palette' });
        this.createColorCells(this.highlightPaletteEl, this.highlightColorCells, 'highlight');

        this.updateSelectedVisuals();
    }

    private createColorCells(paletteEl: HTMLElement, cellArray: HTMLElement[], type: 'text' | 'highlight') {
        const count = type === 'text' ? this.plugin.settings.textColorSlots : this.plugin.settings.highlightColorSlots;
        const colors = type === 'text' ? this.plugin.settings.textColors : this.plugin.settings.highlightColors;

        paletteEl.empty(); // Clear previous cells if any
        cellArray.length = 0; // Clear array

        for (let i = 0; i < count; i++) {
            const cell = paletteEl.createDiv({ cls: 'styler-color-cell' });
            cell.style.backgroundColor = colors[i] || (type === 'text' ? '#000000' : '#ffff00'); // Fallback color
            cell.dataset.index = String(i); // Store index

            cell.addEventListener('click', (event) => {
                this.handleCellClick(i, type);
            });
            cell.addEventListener('dblclick', (event) => {
                this.handleCellDoubleClick(i, type);
            });
            cellArray.push(cell);
        }
    }

    private handleCellClick(index: number, type: 'text' | 'highlight') {
        if (type === 'text') {
            this.plugin.settings.selectedTextColorIndex = index;
        } else {
            this.plugin.settings.selectedHighlightColorIndex = index;
        }
        this.plugin.saveSettings(); // Save selection change
        this.updateSelectedVisuals();
    }

    private handleCellDoubleClick(index: number, type: 'text' | 'highlight') {
        const currentColor = (type === 'text' ? this.plugin.settings.textColors : this.plugin.settings.highlightColors)[index];

        new ColorModal({
            app: this.plugin.app,
            plugin: this.plugin,
            initialColor: currentColor,
            colorType: type,
            onSubmit: (newColorHex) => { // Expecting HEX
                if (type === 'text') {
                    this.plugin.settings.textColors[index] = newColorHex;
                    this.textColorCells[index].style.backgroundColor = newColorHex;
                } else {
                    this.plugin.settings.highlightColors[index] = newColorHex;
                    this.highlightColorCells[index].style.backgroundColor = newColorHex;
                }
                 this.plugin.saveSettings(); // Save the changed color
                 this.updateSelectedVisuals(); // Ensure border color is updated if needed
            }
        }).open();
    }

    // Update visual indicators (borders) for selected cells
    updateSelectedVisuals() {
        this.textColorCells.forEach((cell, i) => {
            cell.toggleClass('selected', i === this.plugin.settings.selectedTextColorIndex);
             // Maybe update border color based on contrast if needed (complex)
        });
        this.highlightColorCells.forEach((cell, i) => {
            cell.toggleClass('selected', i === this.plugin.settings.selectedHighlightColorIndex);
             // Maybe update border color based on contrast if needed
        });
    }

    // Get the currently selected color HEX value
    getCurrentTextColor(): string {
        return this.plugin.settings.textColors[this.plugin.settings.selectedTextColorIndex] || '#000000';
    }

    getCurrentHighlightColor(): string {
        return this.plugin.settings.highlightColors[this.plugin.settings.selectedHighlightColorIndex] || '#ffff00';
    }

    // Call this if settings change (e.g., number of slots) - requires reload usually
    rebuild() {
        if (!this.statusBarEl) return;
        this.createColorCells(this.textPaletteEl, this.textColorCells, 'text');
        this.createColorCells(this.highlightPaletteEl, this.highlightColorCells, 'highlight');
        this.updateSelectedVisuals();
    }

    destroy() {
        // Remove listeners if necessary, although Obsidian might handle status bar item removal
        this.statusBarEl?.remove();
    }
}
import { App, Modal, Setting } from "obsidian";
import React from "react";
import { Root, createRoot } from "react-dom/client";
import TextStyler from "./main";
// Assuming ColorPalette component exists and is adapted as needed (like original)
import ColorPalette from "./components/ColorPalette";
import { hexToRgb, rgbToHex } from "./utils"; // Assuming utils file

interface ColorModalProps {
    app: App;
    plugin: TextStyler;
    initialColor: string; // Expect HEX format now
    colorType: 'text' | 'highlight';
    onSubmit: (result: string) => void; // Result is HEX string
}

export class ColorModal extends Modal {
    private props: ColorModalProps;
    private colorResult: string; // Stores HEX color
    private colorPaletteRoot: Root | null = null;

    constructor(props: ColorModalProps) {
        super(props.app);
        this.props = props;
        // Ensure initial color is HEX
        this.colorResult = props.initialColor.startsWith('#') ? props.initialColor : rgbToHex(props.initialColor);
    }

    onOpen() {
        const { contentEl } = this;
        const { plugin, colorType, onSubmit } = this.props;
        const title = colorType === 'text' ? "Select Text Color" : "Select Highlight Color";
        const favoriteColors = colorType === 'text' ? plugin.settings.favoriteTextColors : plugin.settings.favoriteHighlightColors;

        contentEl.createEl("h1", { text: title });
        const paletteContainer = contentEl.createDiv(); // Container for React component
        this.colorPaletteRoot = createRoot(paletteContainer);

        // Render React Color Palette
        this.colorPaletteRoot.render(
            <React.StrictMode>
                <div className="setting-item setting-item-regular" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                 <div className="setting-item-info">
                     <div className="setting-item-name">Favorite Colors</div>
                     <div className="setting-item-description">Select a quick color.</div>
                 </div>
                 <div className="setting-item-control">
                    <ColorPalette
                        colors={favoriteColors}
                        onModalColorClick={this.onPaletteColorClick}
                    />
                 </div>
                </div>
            </React.StrictMode>
        );

        // Obsidian's Native Color Picker
        new Setting(contentEl)
            .setName("Custom Color")
            .setDesc("Pick any color or enter a HEX value.")
            .addColorPicker((color) => color
                .setValue(this.colorResult) // Use HEX
                .onChange((value) => {
                    this.colorResult = value; // Already HEX
                })
            );

        // Submit Button
        new Setting(contentEl)
            .addButton((btn) => btn
                .setButtonText("Apply Color")
                .setCta()
                .onClick(() => {
                    this.close();
                    onSubmit(this.colorResult); // Submit HEX
                })
            );
    }

    onClose() {
        // Unmount React component
        if (this.colorPaletteRoot) {
            this.colorPaletteRoot.unmount();
            this.colorPaletteRoot = null;
        }
        this.contentEl.empty();
    }

    // Callback from React component
    onPaletteColorClick = (color: string) => { // Expects HEX from palette
        this.colorResult = color;
        // Maybe update the native picker visually? Optional.
        const nativePicker = this.contentEl.querySelector('.setting-item-control input[type="color"]') as HTMLInputElement;
        if (nativePicker) {
            nativePicker.value = color;
        }
    }
}
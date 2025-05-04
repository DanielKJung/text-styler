# Obsidian Text Styler Plugin

This plugin for [Obsidian](https://obsidian.md/) allows you to easily apply and toggle various text styles to your notes using commands, the context menu, or status bar shortcuts. Style your text with colors, highlights, emphasis, and more.

*(Optional: Consider adding a screenshot or GIF demonstrating the plugin here)*

## Credits
This project is inspired by Erinc Ayaz's Colored Text obsidian plugin.
Check it out here:
https://github.com/erincayaz/obsidian-colored-text


## Features

*   **Multiple Style Types:**
    *   Bold
    *   Italic
    *   Underline (Standard)
    *   Colored Underline (Uses selected text color, 3px thick)
    *   Strikethrough
    *   Highlight (Uses selected highlight color)
    *   Text Color (Uses selected text color)
    *   Circled Text (Draws a rounded border around text using text color)
*   **Stackable Styles:** Apply multiple styles to the same text (e.g., bold, colored, and underlined).
*   **Status Bar Palettes:**
    *   Quick access palettes in the status bar for Text Colors and Highlight Colors.
    *   Configure the number of color slots (1-20) in settings (requires reload).
    *   Single-click a color slot to select it for application.
    *   Double-click a color slot to open the color picker and change the color stored in that slot.
*   **Color Picker Modal:**
    *   Choose from favorite colors (configurable in settings).
    *   Select any custom color using the native color picker.
*   **Keyboard Focused:** Designed with commands assignable to hotkeys for quick styling.
*   **Context Menu:** Access common styling options via the right-click menu on selected text.
*   **Toggling:** Applying the same style command again generally toggles the style off. Applying a different color/highlight color overwrites the existing one.

## Usage

1.  **Status Bar:**
    *   Locate the "Text Styler" section in the Obsidian status bar (usually at the bottom).
    *   The **left palette** (icon: `palette`) controls **Text Color**.
    *   The **right palette** (icon: `highlighter`) controls **Highlight Color**.
    *   **Single-click** a square in either palette to select that color for the next application (Text Color, Colored Underline, or Highlight). The selected slot will have a highlighted border.
    *   **Double-click** a square to open the Color Picker modal and change the color saved in that specific slot.
2.  **Commands & Hotkeys (Recommended):**
    *   Open Obsidian Settings -> Hotkeys.
    *   Search for "Text Styler".
    *   Assign keyboard shortcuts to commands like:
        *   `Text Styler: Toggle Bold`
        *   `Text Styler: Toggle Italic`
        *   `Text Styler: Toggle Underline`
        *   `Text Styler: Toggle Colored Underline`
        *   `Text Styler: Toggle Strikethrough`
        *   `Text Styler: Toggle Circled Text`
        *   `Text Styler: Apply Text Color (Current Slot)`
        *   `Text Styler: Apply Highlight Color (Current Slot)`
        *   `Text Styler: Remove Text Color`
        *   `Text Styler: Remove Highlight Color`
        *   `Text Styler: Remove All Styling`
        *   `Text Styler: Change Current Text Color Slot` (Opens modal for selected slot)
        *   `Text Styler: Change Current Highlight Color Slot` (Opens modal for selected slot)
    *   Select text in the editor and use your assigned hotkeys.
3.  **Context Menu:**
    *   Select text in the editor.
    *   Right-click on the selection.
    *   Choose the desired styling option from the "Styler:" submenu.

## Settings

Access the plugin settings via Obsidian Settings -> Community Plugins -> Text Styler -> Settings (Cog icon).

*   **Text Color Slots:** Set the number of text color squares shown in the status bar (1-20). *Requires Obsidian reload to take effect.*
*   **Favorite Text Colors:** Customize the palette of quick-pick colors shown in the Text Color modal.
*   **Highlight Color Slots:** Set the number of highlight color squares shown in the status bar (1-20). *Requires Obsidian reload to take effect.*
*   **Favorite Highlight Colors:** Customize the palette of quick-pick colors shown in the Highlight Color modal.

## Installation

1.  Open Obsidian Settings.
2.  Go to `Community Plugins`.
3.  Ensure "Restricted Mode" is **off**.
4.  Click `Browse` community plugins.
5.  Search for "Text Styler".
6.  Click `Install`.
7.  Once installed, click `Enable`.

## Compatibility

Requires Obsidian version 0.15.0 or higher.

## Author

Daniel Jung ([@DanielKJung](https://github.com/DanielKJung))

## License

This plugin is released under the MIT License. See the [LICENSE](LICENSE) file for details.
import { PluginSettings } from "./types";

export const MAX_COLOR_SLOTS = 20;
export const DEFAULT_COLOR_SLOTS = 5;
export const DEFAULT_TEXT_COLOR = '#000000';
export const DEFAULT_HIGHLIGHT_COLOR = '#ffff00'; // Yellow default highlight

// Base class prefix to avoid conflicts
export const CLASS_PREFIX = 'styler-';

// CSS Class names (without prefix added)
export const StyleClasses = {
    BOLD: 'bold',
    ITALIC: 'italic',
    UNDERLINE: 'underline',
    STRIKE: 'strike',
    COLORED: 'colored', // Optional generic class
    HIGHLIGHTED: 'highlighted', // Optional generic class
    COLORED_UNDERLINE: 'colored-underline', // Optional marker class
    CIRCLED: 'circled', // <-- Add for the circle effect

};

export const DEFAULT_SETTINGS: Readonly<PluginSettings> = {
    textColorSlots: DEFAULT_COLOR_SLOTS,
    textColors: Array(DEFAULT_COLOR_SLOTS).fill(DEFAULT_TEXT_COLOR),
    favoriteTextColors: [
        "#c00000", "#ff0000", "#ffc000", "#ffff00", "#92d050",
        "#00b050", "#00b0f0", "#0070c0", "#002060", "#7030a0"
    ],
    selectedTextColorIndex: 0,

    highlightColorSlots: DEFAULT_COLOR_SLOTS,
    highlightColors: Array(DEFAULT_COLOR_SLOTS).fill(DEFAULT_HIGHLIGHT_COLOR),
    favoriteHighlightColors: [ // Example highlight favorites
        "#FFEDAB", // Yellow
        "#FBD2BA", // Orange
        "#C4E0F7", // Light Blue
        "#B2F0C8", // Light Green
        "#FFBDBA", // Light Pink
        "#d3d3d3", // Light Grey
    ],
    selectedHighlightColorIndex: 0,
};
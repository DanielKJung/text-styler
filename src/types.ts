export interface PluginSettings {
    textColorSlots: number;
    textColors: string[];        // Current colors in text slots
    favoriteTextColors: string[]; // Palette for text color modal
    selectedTextColorIndex: number;
  
    highlightColorSlots: number;
    highlightColors: string[];     // Current colors in highlight slots
    favoriteHighlightColors: string[]; // Palette for highlight color modal
    selectedHighlightColorIndex: number;
  
    // Could add default states for toggles later if needed
  }
  
  export type StyleType = 'bold' | 'italic' | 'underline' | 'strike' | 'color' | 'highlight' | 'colored-underline'  | 'circled' ;
  
  // Describes a segment within the user's selection
  export interface SelectionSegment {
    text: string;
    start: number; // Original offset relative to selection start
    end: number;   // Original offset relative to selection start
    
    // Info about the span wrapping this segment (if any)
    span: {
        startTag: string; // The full opening tag <span ...>
        startTagOffset: number; // Offset of tag start relative to selection start
        endTagOffset: number; // Offset of tag end relative to selection start
        classList: string[];
        style: Record<string, string>; // Parsed inline style attributes
    } | null;
  }
import { Editor, EditorPosition, Notice, EditorRange } from "obsidian";
import { CLASS_PREFIX, StyleClasses } from "./constants";
import { SelectionSegment, StyleType } from "./types";

export class StyleManager {

    // --- Public API ---

    public toggleStyle(editor: Editor, styleType: StyleType, value: string | null = null): void {
        const selection = editor.listSelections()[0]; // Assuming single selection for now
        if (!selection) return;

        const from = selection.anchor.line < selection.head.line || (selection.anchor.line === selection.head.line && selection.anchor.ch <= selection.head.ch) ? selection.anchor : selection.head;
        const to = from === selection.anchor ? selection.head : selection.anchor;

        const selectedText = editor.getRange(from, to);

        // Allow empty selection only for color/highlight insertion
         if (selectedText.length === 0 && (styleType === 'color' || styleType === 'highlight') && value) {
            // Insert an empty span with the style, ready for typing
             const styledEmptySpan = this.createStyledSpan('', styleType, value, null);
             editor.replaceRange(styledEmptySpan, from, to);
             // Place cursor inside the new span
             const cursorInsidePos = { line: from.line, ch: from.ch + styledEmptySpan.indexOf('>') + 1 };
             editor.setCursor(cursorInsidePos);
            return;
         }
         // For other styles, require selection for now
         if (selectedText.length === 0 && styleType !== 'color' && styleType !== 'highlight') {
            console.warn("Text Styler: Selection required for toggle styles like", styleType);
            // Provide user feedback
            new Notice("Text Styler: Selection required for this style."); // <-- Use Notice
            return;
        }


        const originalContent = editor.getRange(from, to);
        const segments = this.parseSelection(originalContent, from, editor); // Get segments with context

        // --- Nuanced check for value-based styles START ---
        let isCurrentlyActive = false;
        let hasDifferentValue = false;
        let isSameValueActive = false; // Track if the *specific* value is already active

        // Perform detailed check only for styles that have values and exhibit the override/toggle issue
        if ((styleType === 'colored-underline' || styleType === 'color' || styleType === 'highlight') && value) {
            const styleProp = styleType === 'colored-underline' ? 'text-decoration-color'
                            : styleType === 'color' ? 'color'
                            : 'background-color'; // highlight

            for (const segment of segments) {
                if (segment.span?.style[styleProp]) {
                    isCurrentlyActive = true; // Found the style active
                    const currentColor = segment.span.style[styleProp]?.toLowerCase();
                    if (currentColor === value.toLowerCase()) {
                         isSameValueActive = true; // The exact value we want to apply/toggle is present
                    } else {
                         hasDifferentValue = true; // Found the style, but with a different value
                    }
                }
                // Optional: Check marker class for colored-underline just in case style is missing
                if (styleType === 'colored-underline' && segment.span?.classList.includes(`${CLASS_PREFIX}${StyleClasses.COLORED_UNDERLINE}`)) {
                     isCurrentlyActive = true;
                     if (!segment.span?.style[styleProp]) {
                         hasDifferentValue = true; // Class exists but color missing -> treat as different
                     }
                }
            }
        } else {
             // Use original simple check for other styles or when removing value styles (value is null)
             isCurrentlyActive = this.isStyleActiveInSegments(segments, styleType, value);
        }


        let shouldApply: boolean;
        // Determine toggle action based on detailed check for value-based styles
        if ((styleType === 'colored-underline' || styleType === 'color' || styleType === 'highlight') && value) {
             if (isSameValueActive && !hasDifferentValue) {
                 // Only the EXACT value we want to toggle is active across the selection
                 shouldApply = false; // -> Remove
             } else {
                 // Style is not active OR it's active but with a different value somewhere in selection
                 shouldApply = true; // -> Apply/Modify
             }
        }
         else {
             // Default toggle behavior for simple styles or remove operations (value is null)
             shouldApply = !isCurrentlyActive;
        }
        // --- Nuanced check END ---


        let modifiedContent = "";
        segments.forEach(segment => {
            const { text, span } = segment;
            // Pass the necessary 'value' (color) for colored underline or other value-based styles
            modifiedContent += this.applyModificationToSegment(text, span, styleType, value, shouldApply);
        });


        // Ensure we don't replace more/less than the original *text* content length caused by tags
        // This reconstruction is tricky. A simpler approach for now: replace the exact original range.
        editor.replaceRange(modifiedContent, from, to);

        // Reselect the modified text (optional, might be slightly off due to tag changes)
        // editor.setSelection(from, editor.offsetToPos(editor.posToOffset(from) + modifiedContent.length));
    }

    
    public removeAllStyling(editor: Editor): void {
         const selection = editor.listSelections()[0];
         if (!selection) return;
         const from = selection.anchor.line < selection.head.line || (selection.anchor.line === selection.head.line && selection.anchor.ch <= selection.head.ch) ? selection.anchor : selection.head;
         const to = from === selection.anchor ? selection.head : selection.anchor;

         const originalContent = editor.getRange(from, to);
         // Simple approach: Strip all <span...> tags found within the selection
         // This is blunt and might remove spans not added by this plugin.
         // A more refined approach would only remove spans with `styler-` classes or specific styles.
         const plainText = originalContent.replace(/<span[^>]*>|<\/span>/gi, '');
         editor.replaceRange(plainText, from, to);
    }

    // --- Private Helpers ---

    private applyModificationToSegment(
        text: string,
        spanInfo: SelectionSegment['span'],
        styleType: StyleType,
        value: string | null,
        shouldApply: boolean
    ): string {
        let currentClasses = spanInfo ? [...spanInfo.classList] : [];
        let currentStyles = spanInfo ? { ...spanInfo.style } : {};
        // Determine target class names (handle multiple types)
        // Use Partial<Record<...>> to indicate not all StyleTypes map to classes
        const classBasedStyleTypes: Partial<Record<StyleType, string>> = {
            'bold': StyleClasses.BOLD,
            'italic': StyleClasses.ITALIC,
            'underline': StyleClasses.UNDERLINE, // Standard underline class
            'strike': StyleClasses.STRIKE,
            'circled': StyleClasses.CIRCLED, // Class for circled
            'colored-underline': StyleClasses.COLORED_UNDERLINE // Marker class for colored underline
        };
        const targetClass = (styleType in classBasedStyleTypes)
            ? `${CLASS_PREFIX}${classBasedStyleTypes[styleType]}`
            : null;

        if (shouldApply) {
            // --- Apply Style ---
            if (targetClass) {
                if (!currentClasses.includes(targetClass)) {
                    currentClasses.push(targetClass);
                }
            } 

            // --- MODIFY START --- Handle specific style types ---
            if (styleType === 'color' && value) {
                currentStyles['color'] = value;
            } else if (styleType === 'highlight' && value) {
                currentStyles['background-color'] = value;
            } else if (styleType === 'colored-underline' && value) {
                // Apply colored underline styles
                currentStyles['text-decoration-line'] = this.addDecoration(currentStyles['text-decoration-line'], 'underline');
                currentStyles['text-decoration-color'] = value;
                currentStyles['text-decoration-thickness'] = '3px';
                // Remove standard underline class if applying colored version
                currentClasses = currentClasses.filter(cls => cls !== `${CLASS_PREFIX}${StyleClasses.UNDERLINE}`);
            } else if (styleType === 'underline') {
                 // Apply standard underline styles/class
                currentStyles['text-decoration-line'] = this.addDecoration(currentStyles['text-decoration-line'], 'underline');
                // Ensure colored underline style/class are removed if applying standard
                delete currentStyles['text-decoration-color'];
                delete currentStyles['text-decoration-thickness'];
                currentClasses = currentClasses.filter(cls => cls !== `${CLASS_PREFIX}${StyleClasses.COLORED_UNDERLINE}`);
            } else if (styleType === 'strike') {
                 currentStyles['text-decoration-line'] = this.addDecoration(currentStyles['text-decoration-line'], 'line-through');
            }
            // Note: 'bold', 'italic', 'circled' are handled by adding their class via targetClass logic above
            // --- MODIFY END ---

        } else {
            // --- Remove Style ---
            if (targetClass) {
                currentClasses = currentClasses.filter(cls => cls !== targetClass);
            }             
            
            if (styleType === 'color') {
                delete currentStyles['color'];
            } else if (styleType === 'highlight') {
                delete currentStyles['background-color'];
            } else if (styleType === 'colored-underline') {
                // Remove colored underline styles
                delete currentStyles['text-decoration-color'];
                delete currentStyles['text-decoration-thickness'];
                 // Remove underline decoration ONLY if standard underline class is NOT present
                if (!currentClasses.includes(`${CLASS_PREFIX}${StyleClasses.UNDERLINE}`)) {
                     currentStyles['text-decoration-line'] = this.removeDecoration(currentStyles['text-decoration-line'], 'underline');
                }
                // Class removal already handled by targetClass logic
            } else if (styleType === 'underline') {
                 // Remove standard underline decoration ONLY if colored underline marker class is NOT present
                 if (!currentClasses.includes(`${CLASS_PREFIX}${StyleClasses.COLORED_UNDERLINE}`)) {
                   currentStyles['text-decoration-line'] = this.removeDecoration(currentStyles['text-decoration-line'], 'underline');
                }
                delete currentStyles['text-decoration-thickness'];
                // Class removal already handled by targetClass logic
            } else if (styleType === 'strike') {
                currentStyles['text-decoration-line'] = this.removeDecoration(currentStyles['text-decoration-line'], 'line-through');
            }
             // Note: 'bold', 'italic', 'circled' are handled by removing their class via targetClass logic above

        }

        // Remove text-decoration-line if it becomes empty or 'none'
        if (currentStyles['text-decoration-line']?.trim() === '' || currentStyles['text-decoration-line'] === 'none') {
            delete currentStyles['text-decoration-line'];
       }
       // If text-decoration-line was removed, also remove its color
       if (!currentStyles['text-decoration-line']) {
            delete currentStyles['text-decoration-color'];
            delete currentStyles['text-decoration-thickness'];
       }
       // If text-decoration-line exists but color doesn't, ensure color property is absent
       // (This case might be redundant due to toggle logic but safe to keep)
       if (currentStyles['text-decoration-line'] && !currentStyles['text-decoration-color']) {
            delete currentStyles['text-decoration-color'];
            delete currentStyles['text-decoration-thickness'];
       }


        // --- Reconstruct Span ---
        const styleString = Object.entries(currentStyles)
                                .map(([k, v]) => `${k}: ${v};`)
                                .join(' ');

        // Determine if span is still needed
        const hasClasses = currentClasses.length > 0;
        const hasStyles = styleString.trim().length > 0;

        if (hasClasses || hasStyles) {
            let openingTag = '<span';
            if (hasClasses) {
                openingTag += ` class="${currentClasses.join(' ')}"`;
            }
            if (hasStyles) {
                openingTag += ` style="${styleString.trim()}"`;
            }
            openingTag += '>';
            return `${openingTag}${text}</span>`;
        } else {
            // No classes or styles left, return plain text
            return text;
        }
    }

    // Helper to add text-decoration values safely
    private addDecoration(existing: string | undefined, add: string): string {
        if (!existing || existing.trim() === '' || existing === 'none') return add;
        const parts = existing.split(' ').filter(p => p.trim() !== '');
        if (!parts.includes(add)) {
            parts.push(add);
        }
        return parts.join(' ');
    }

     // Helper to remove text-decoration values safely
    private removeDecoration(existing: string | undefined, remove: string): string {
        if (!existing || existing.trim() === '' || existing === 'none') return 'none';
        const parts = existing.split(' ').filter(p => p.trim() !== '' && p !== remove);
        return parts.length > 0 ? parts.join(' ') : 'none';
    }


    // Simple check if the style exists anywhere in the segments
    private isStyleActiveInSegments(segments: SelectionSegment[], styleType: StyleType, value: string | null): boolean {
        const classChecks: Partial<Record<StyleType, string>> = {
            'bold': `${CLASS_PREFIX}${StyleClasses.BOLD}`,
            'italic': `${CLASS_PREFIX}${StyleClasses.ITALIC}`,
            'underline': `${CLASS_PREFIX}${StyleClasses.UNDERLINE}`, // Standard underline class
            'strike': `${CLASS_PREFIX}${StyleClasses.STRIKE}`,
            'circled': `${CLASS_PREFIX}${StyleClasses.CIRCLED}`, // Circled class
            'colored-underline': `${CLASS_PREFIX}${StyleClasses.COLORED_UNDERLINE}` // Colored underline marker class
        };
        const styleChecks: Partial<Record<StyleType, string>> = {
            'color': 'color',
            'highlight': 'background-color',
            'colored-underline': 'text-decoration-color', // Check for color style presence
            'underline': 'text-decoration-line', // Check if 'underline' is in line style
            'strike': 'text-decoration-line' // Check if 'line-through' is in line style
        };

        const targetClass = classChecks[styleType];
        const targetStyleProp = styleChecks[styleType];


        for (const segment of segments) {
            if (segment.span) {
                // Check Class based styles first
                if (targetClass && segment.span.classList.includes(targetClass)) {
                    // For most class-based styles, finding the class is enough
                    // For standard underline, need to ensure colored-underline isn't *also* active
                     if (styleType === 'underline') {
                         // Is active *only if* it doesn't also have colored underline active
                         if (!segment.span.style['text-decoration-color'] && !segment.span.classList.includes(`${CLASS_PREFIX}${StyleClasses.COLORED_UNDERLINE}`)) {
                            return true;
                         }
                     }
                     
                     else if (styleType === 'colored-underline') {
                        // If checking colored underline, class presence isn't enough on its own.
                        // We primarily rely on text-decoration-color below.
                        // However, if a value IS provided, we MUST check it.
                        if (value && segment.span.style['text-decoration-color']?.toLowerCase() === value.toLowerCase()) {
                            return true; // Correct color is active
                        }
                        // If no value provided (e.g., remove command), just checking style below is fine.
                    }

                    else {
                         return true; // For bold, italic, strike, circled
                    }
                }


                // Check Style based properties
                if (targetStyleProp) {
                     const currentStyleValue = segment.span.style[targetStyleProp];
                     if (currentStyleValue && currentStyleValue !== 'none') {
                         if (styleType === 'color' || styleType === 'highlight') {
                            // Check specific value if provided, otherwise just existence
                            if (value && currentStyleValue.toLowerCase() === value.toLowerCase()) return true;
                            if (!value && (segment.span.style['color'] || segment.span.style['background-color'])) return true; // Any color/highlight active (for remove)
                        } else if (styleType === 'colored-underline') {
                            // Check if *any* text-decoration-color exists
                            if (segment.span.style['text-decoration-color']) {
                                 // If a specific value is being checked, ensure it matches
                                 if (value && segment.span.style['text-decoration-color'].toLowerCase() === value.toLowerCase()){
                                     return true;
                                 }
                                 // If no specific value needed (e.g. shouldApply check), any color counts as active
                                 if (!value) {
                                     return true;
                                 }
                            }
                        } else if (styleType === 'underline') {
                            if (currentStyleValue.split(' ').includes('underline')) {
                                if (!segment.span.style['text-decoration-color'] && !segment.span.classList.includes(`${CLASS_PREFIX}${StyleClasses.COLORED_UNDERLINE}`)) {
                                    return true; // Standard underline active
                                }
                            }
                        } else if (styleType === 'strike') {
                            if (currentStyleValue.split(' ').includes('line-through')) {
                                return true;
                            }
                        }
                    }
                }
            }
        }
        return false;
    }

    // Creates a new span tag string
    private createStyledSpan(text: string, styleType: StyleType, value: string | null, existingSpanInfo: SelectionSegment['span']): string {
        const segment = { text, span: existingSpanInfo } as SelectionSegment;
        // The `true` ensures the style is *applied* when creating a new span
        return this.applyModificationToSegment(text, existingSpanInfo, styleType, value, true);
    }


    // --- Parsing Logic (Simplified) ---
    // This is the most complex part and needs refinement for robustness.
    // It iterates through the text, identifying spans and plain text segments.
    private parseSelection(selectedText: string, from: EditorPosition, editor: Editor): SelectionSegment[] {
        const segments: SelectionSegment[] = [];
        let currentIndex = 0;
        const len = selectedText.length;

        // Regex to find span tags (simplified - might miss edge cases)
        const tagRegex = /<\/?span[^>]*>/gi;
        let match;
        let lastTagEnd = 0;

        // Store active span info
        let currentSpanInfo: SelectionSegment['span'] | null = null;

        while (currentIndex < len) {
             // Need context before/after selection for open spans
             // This simplified parser ONLY looks within the selection.
             // A robust solution needs to look at line context or use CM6 parsing states.

             // For now, assume spans are fully contained or we process segment by segment.
             // This is a MAJOR simplification.

             // Find the next tag within the remaining text
             const remainingText = selectedText.substring(currentIndex);
             tagRegex.lastIndex = 0; // Reset regex index
             match = tagRegex.exec(remainingText);

             const tagStart = match ? match.index : -1;
             const textEnd = (tagStart === -1) ? len : currentIndex + tagStart;

             // 1. Add plain text segment (if any)
             if (textEnd > currentIndex) {
                 segments.push({
                     text: selectedText.substring(currentIndex, textEnd),
                     start: currentIndex,
                     end: textEnd,
                     span: currentSpanInfo // Inherit span info from previous tag
                 });
             }

             // 2. Process the found tag
             if (match) {
                 const tagText = match[0];
                 const tagActualStart = currentIndex + tagStart;
                 const tagActualEnd = tagActualStart + tagText.length;

                 if (tagText.startsWith('</span')) {
                     // End tag: Clear current span info
                     currentSpanInfo = null;
                 } else {
                     // Start tag: Parse it and set current span info
                     const classList = this.extractClasses(tagText);
                     const style = this.extractStyles(tagText);
                     currentSpanInfo = {
                         startTag: tagText,
                         startTagOffset: tagActualStart, // Relative to selection start
                         endTagOffset: -1, // Need to find matching end tag (hard in this simple parser)
                         classList,
                         style,
                     };
                 }
                 currentIndex = tagActualEnd; // Move past the tag
             } else {
                 // No more tags found
                 currentIndex = len;
             }
        }


        // TODO: Refine this parsing significantly. It currently doesn't handle
        // spans crossing selection boundaries well or nested spans perfectly.
        // It serves as a basic segmentation for applying styles.

        // If no segments were created (plain text selection), create one segment
        if (segments.length === 0 && selectedText.length > 0) {
            segments.push({
                text: selectedText,
                start: 0,
                end: selectedText.length,
                span: null
            });
        }


        return segments;
    }

    private extractClasses(tag: string): string[] {
        const classMatch = tag.match(/class="([^"]*)"/i);
        return classMatch && classMatch[1] ? classMatch[1].split(' ').filter(Boolean) : [];
    }

    private extractStyles(tag: string): Record<string, string> {
        const styleMatch = tag.match(/style="([^"]*)"/i);
        const styles: Record<string, string> = {};
        if (styleMatch && styleMatch[1]) {
            styleMatch[1].split(';').forEach(stylePart => {
                const [key, value] = stylePart.split(':');
                if (key && value) {
                    styles[key.trim()] = value.trim();
                }
            });
        }
        return styles;
    }
}
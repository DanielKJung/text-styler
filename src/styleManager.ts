import { Editor, EditorPosition, Notice, EditorRange } from "obsidian";
import TextStyler from "./main"; // Import the main plugin class
import { CLASS_PREFIX, StyleClasses } from "./constants";
import { SelectionSegment, StyleType } from "./types";

export class StyleManager {
    private plugin: TextStyler;

    constructor(plugin: TextStyler) {
        this.plugin = plugin; // Store plugin instance
    }


    // --- Public API ---

    public toggleStyle(editor: Editor, styleType: StyleType, value: string | null = null): void {
        const selection = editor.listSelections()[0];
        if (!selection) return;

        const from = selection.anchor.line < selection.head.line || (selection.anchor.line === selection.head.line && selection.anchor.ch <= selection.head.ch) ? selection.anchor : selection.head;
        const to = from === selection.anchor ? selection.head : selection.anchor;

        const selectedText = editor.getRange(from, to);

        // Allow empty selection only for color/highlight insertion (using CSS variables)
         if (selectedText.length === 0 && (styleType === 'color' || styleType === 'highlight') && value) {
             const styledEmptySpan = this.createStyledSpan('', styleType, value, null);
             editor.replaceRange(styledEmptySpan, from, to);
             const cursorInsidePos = { line: from.line, ch: from.ch + styledEmptySpan.indexOf('>') + 1 };
             editor.setCursor(cursorInsidePos);
            return;
         }
         // For other styles, require selection for now
         if (selectedText.length === 0 && styleType !== 'color' && styleType !== 'highlight') {
            console.warn("Text Styler: Selection required for toggle styles like", styleType);
            new Notice("Text Styler: Selection required for this style.");
            return;
        }

        const originalContent = editor.getRange(from, to);
        const segments = this.parseSelection(originalContent, from, editor);

        // --- Nuanced check for value-based styles START ---
        let isCurrentlyActive = false;
        let hasDifferentValue = false;
        let isSameValueActive = false;

        // Perform detailed check only for styles where the value matters for toggling
        if ((styleType === 'colored-underline' || styleType === 'color' || styleType === 'highlight' || styleType === 'circled') && value) {
            const varToCheck = styleType === 'colored-underline' ? '--styler-underline-color'
                             : styleType === 'color' ? '--styler-text-color'
                             : styleType === 'highlight' ? '--styler-highlight-color'
                             : '--styler-circle-color'; // Check circle color var

            for (const segment of segments) {
                const currentVarValue = this.getCssVariableValue(segment.span, varToCheck);
                const markerClass = this.classMap[styleType] ? `${CLASS_PREFIX}${this.classMap[styleType]}` : null; // Get potential marker class

                if (currentVarValue !== null) { // Variable exists
                    isCurrentlyActive = true;
                    if (currentVarValue.toLowerCase() === value.toLowerCase()) {
                         isSameValueActive = true;
                    } else {
                         hasDifferentValue = true;
                    }
                } else if (markerClass && segment.span?.classList.includes(markerClass)) {
                     // Class exists but variable missing -> Treat as active but needing modification
                     isCurrentlyActive = true;
                     hasDifferentValue = true; // Needs modification to add the variable
                }
            }
        } else {
             // Use general check for simple toggles or remove operations (value is null)
             isCurrentlyActive = this.isStyleActiveInSegments(segments, styleType, value);
        }


        let shouldApply: boolean;
        // Determine toggle action based on detailed check for value-based styles
        if ((styleType === 'colored-underline' || styleType === 'color' || styleType === 'highlight' || styleType === 'circled') && value) {
             if (isSameValueActive && !hasDifferentValue) {
                 shouldApply = false; // Only the exact value is active -> Remove
             } else {
                 shouldApply = true; // Not active OR active with a different value -> Apply/Modify
             }
        } else {
             // Default toggle behavior for simple styles or remove operations
             shouldApply = !isCurrentlyActive;
        }
        // --- Nuanced check END ---


        let modifiedContent = "";
        segments.forEach(segment => {
            const { text, span } = segment;
            modifiedContent += this.applyModificationToSegment(text, span, styleType, value, shouldApply);
        });

        editor.replaceRange(modifiedContent, from, to);
    }


    public removeAllStyling(editor: Editor): void {
         const selection = editor.listSelections()[0];
         if (!selection) return;
         const from = selection.anchor.line < selection.head.line || (selection.anchor.line === selection.head.line && selection.anchor.ch <= selection.head.ch) ? selection.anchor : selection.head;
         const to = from === selection.anchor ? selection.head : selection.anchor;

         const originalContent = editor.getRange(from, to);
         // Removes spans potentially created by this plugin
         let modifiedContent = "";
         const segments = this.parseSelection(originalContent, from, editor);
         segments.forEach(segment => {
              modifiedContent += segment.text; // Just keep the text
         });

         editor.replaceRange(modifiedContent, from, to);
    }

    // --- Private Helpers ---

    // Define ALL style classes map
    private readonly classMap: Partial<Record<StyleType, string>> = {
        'bold': StyleClasses.BOLD, 'italic': StyleClasses.ITALIC,
        'underline': StyleClasses.UNDERLINE, 'strike': StyleClasses.STRIKE,
        'circled': StyleClasses.CIRCLED,
        'color': StyleClasses.COLORED, // Marker class
        'highlight': StyleClasses.HIGHLIGHTED, // Marker class
        'colored-underline': StyleClasses.COLORED_UNDERLINE // Marker class
    };


    private applyModificationToSegment(
        text: string,
        spanInfo: SelectionSegment['span'],
        styleType: StyleType,
        value: string | null, // Value for color, highlight, colored-underline, circle color
        shouldApply: boolean
    ): string {
        let currentClasses = spanInfo ? [...spanInfo.classList] : [];
        let currentCssVariables: Record<string, string> = {};

        // Populate cssVariables accurately from existing inline style
        if (spanInfo?.startTag) {
            const styleAttr = spanInfo.startTag.match(/style="([^"]*)"/i)?.[1] || '';
            styleAttr.split(';').forEach(part => {
                const [key, val] = part.split(':');
                const trimmedKey = key?.trim();
                if (trimmedKey?.startsWith('--styler-')) {
                    currentCssVariables[trimmedKey] = val?.trim() || '';
                }
            });
        }

        const targetClass = (styleType in this.classMap) ? `${CLASS_PREFIX}${this.classMap[styleType]}` : null;


        if (shouldApply) {
            // --- Apply Style ---
            if (targetClass) {
                if (!currentClasses.includes(targetClass)) {
                    currentClasses.push(targetClass);
                }
            }

            // Set CSS Variables / Manage classes for relevant styles
            if (styleType === 'color' && value) {
                currentCssVariables['--styler-text-color'] = value;
            } else if (styleType === 'highlight' && value) {
                currentCssVariables['--styler-highlight-color'] = value;
            } else if (styleType === 'colored-underline' && value) {
                currentCssVariables['--styler-underline-color'] = value;
                currentCssVariables['--styler-underline-thickness'] = `${this.plugin.settings.coloredUnderlineThickness}px`;
                currentClasses = currentClasses.filter(cls => cls !== `${CLASS_PREFIX}${StyleClasses.UNDERLINE}`);
            } else if (styleType === 'underline') {
                 delete currentCssVariables['--styler-underline-color'];
                 delete currentCssVariables['--styler-underline-thickness'];
                 currentClasses = currentClasses.filter(cls => cls !== `${CLASS_PREFIX}${StyleClasses.COLORED_UNDERLINE}`);
            } else if (styleType === 'circled' && value) {
                 currentCssVariables['--styler-circle-color'] = value;
                 currentCssVariables['--styler-circle-thickness'] = `${this.plugin.settings.circleThickness}px`;
            }
            // Strike/Bold/Italic handled by class logic

        } else {
            // --- Remove Style ---
            if (targetClass) {
                currentClasses = currentClasses.filter(cls => cls !== targetClass);
            }

            // Remove CSS Variables or related classes
            if (styleType === 'color') {
                delete currentCssVariables['--styler-text-color'];
            } else if (styleType === 'highlight') {
                delete currentCssVariables['--styler-highlight-color'];
            } else if (styleType === 'colored-underline') {
                delete currentCssVariables['--styler-underline-color'];
                delete currentCssVariables['--styler-underline-thickness'];
            } else if (styleType === 'underline') {
                 delete currentCssVariables['--styler-underline-color'];
                 delete currentCssVariables['--styler-underline-thickness'];
            } else if (styleType === 'circled') {
                 delete currentCssVariables['--styler-circle-color'];
                 delete currentCssVariables['--styler-circle-thickness'];
            }
            // Strike/Bold/Italic class removal handled by targetClass logic
        }

        // --- Cleanup ---

        // If NO underline classes remain, remove underline color/thickness vars
        const hasAnyUnderlineClass = currentClasses.includes(`${CLASS_PREFIX}${StyleClasses.UNDERLINE}`) || currentClasses.includes(`${CLASS_PREFIX}${StyleClasses.COLORED_UNDERLINE}`);
        if (!hasAnyUnderlineClass) {
            delete currentCssVariables['--styler-underline-color'];
            delete currentCssVariables['--styler-underline-thickness'];
        }
        // If standard underline is applied OR colored underline is removed, ensure colored vars are removed
        if (currentClasses.includes(`${CLASS_PREFIX}${StyleClasses.UNDERLINE}`) || !currentClasses.includes(`${CLASS_PREFIX}${StyleClasses.COLORED_UNDERLINE}`)) {
             delete currentCssVariables['--styler-underline-color'];
             delete currentCssVariables['--styler-underline-thickness'];
        }


        // Remove marker classes if their corresponding variable is gone
        if (!currentCssVariables['--styler-text-color']) {
            currentClasses = currentClasses.filter(cls => cls !== `${CLASS_PREFIX}${StyleClasses.COLORED}`);
        }
        if (!currentCssVariables['--styler-highlight-color']) {
            currentClasses = currentClasses.filter(cls => cls !== `${CLASS_PREFIX}${StyleClasses.HIGHLIGHTED}`);
        }
        if (!currentCssVariables['--styler-underline-color']) {
             currentClasses = currentClasses.filter(cls => cls !== `${CLASS_PREFIX}${StyleClasses.COLORED_UNDERLINE}`);
             delete currentCssVariables['--styler-underline-thickness'];
        }
         if (!currentCssVariables['--styler-circle-color']) {
             currentClasses = currentClasses.filter(cls => cls !== `${CLASS_PREFIX}${StyleClasses.CIRCLED}`);
             delete currentCssVariables['--styler-circle-thickness'];
        }


        // --- Reconstruct Span ---
        const variableString = Object.entries(currentCssVariables)
                                .map(([k, v]: [string, string]) => `${k}: ${v};`)
                                .join(' ');
        const styleAttrValue = variableString.trim(); // Only variables go in style now

        const uniqueClasses = [...new Set(currentClasses)].filter(Boolean);
        const hasClasses = uniqueClasses.length > 0;
        const hasStyles = styleAttrValue.length > 0;

        if (hasClasses || hasStyles) {
            let openingTag = '<span';
            if (hasClasses) {
                 openingTag += ` class="${uniqueClasses.join(' ')}"`;
            }
            if (hasStyles) {
                openingTag += ` style="${styleAttrValue}"`;
            }
            openingTag += '>';
            return `${openingTag}${text}</span>`;
        } else {
            return text;
        }
    }


    private isStyleActiveInSegments(segments: SelectionSegment[], styleType: StyleType, value: string | null): boolean {
        const targetClass = (styleType in this.classMap) ? `${CLASS_PREFIX}${this.classMap[styleType]}` : null;
        const varChecks: Partial<Record<StyleType, string>> = {
             'color': '--styler-text-color',
             'highlight': '--styler-highlight-color',
             'colored-underline': '--styler-underline-color',
             'circled': '--styler-circle-color' // Check circle color variable too
         };
        const targetVar = varChecks[styleType];

        for (const segment of segments) {
            if (segment.span) {
                let isClassActive = targetClass ? segment.span.classList.includes(targetClass) : false;
                let isVarActive = false;

                 // Check Variable
                 if (targetVar) {
                     const varValue = this.getCssVariableValue(segment.span, targetVar);
                     if (varValue !== null) { // Variable exists
                         if (value) { // Checking specific value
                             if (varValue.toLowerCase() === value.toLowerCase()) {
                                 isVarActive = true;
                             }
                         } else { // Just checking existence
                             isVarActive = true;
                         }
                     }
                 }

                // Determine overall active state based on type
                if (styleType === 'bold' || styleType === 'italic' || styleType === 'strike') {
                    if (isClassActive) return true;
                }
                 else if (styleType === 'underline') {
                      const isColoredActive = this.hasCssVariable(segment.span, '--styler-underline-color') || segment.span.classList.includes(`${CLASS_PREFIX}${StyleClasses.COLORED_UNDERLINE}`);
                      if (isClassActive && !isColoredActive) return true;
                 }
                 else if (styleType === 'circled') {
                       // Active if class is present OR variable is present (for remove check)
                       if (isClassActive || (isVarActive && value === null)) return true;
                 }
                 else if (styleType === 'color' || styleType === 'highlight' || styleType === 'colored-underline') {
                     if (isVarActive) return true; // Variable existence/match is primary check
                     if (isClassActive && value === null) return true; // Class is fallback for remove check
                 }
            }
        }
        return false;
    }

    // Helper to check for CSS Variable existence in the style attribute
    private hasCssVariable(spanInfo: SelectionSegment['span'], varName: string): boolean {
        if (!spanInfo?.startTag) return false;
        const styleAttr = spanInfo.startTag.match(/style="([^"]*)"/i)?.[1] || '';
        const regex = new RegExp(`(^|;)\\s*${varName}\\s*:`);
        return regex.test(styleAttr);
    }

    // Helper to get CSS Variable value from the style attribute
    private getCssVariableValue(spanInfo: SelectionSegment['span'], varName: string): string | null {
         if (!spanInfo?.startTag) return null;
         const styleAttr = spanInfo.startTag.match(/style="([^"]*)"/i)?.[1] || '';
         const regex = new RegExp(`${varName}\\s*:\\s*([^;]+)`);
         const match = styleAttr.match(regex);
         return match && match[1] ? match[1].trim() : null;
    }

    // Creates a new span tag string (using CSS variable approach)
    private createStyledSpan(text: string, styleType: StyleType, value: string | null, existingSpanInfo: SelectionSegment['span']): string {
        // Pass null for existingSpanInfo to create fresh span
        return this.applyModificationToSegment(text, null, styleType, value, true);
    }

    // --- Parsing Logic (Simplified) ---
    private parseSelection(selectedText: string, from: EditorPosition, editor: Editor): SelectionSegment[] {
        const segments: SelectionSegment[] = [];
        let currentIndex = 0;
        const len = selectedText.length;
        const tagRegex = /<\/?span[^>]*>/gi;
        let match;
        let currentSpanInfo: SelectionSegment['span'] | null = null;
        while (currentIndex < len) {
             const remainingText = selectedText.substring(currentIndex);
             tagRegex.lastIndex = 0;
             match = tagRegex.exec(remainingText);
             const tagStart = match ? match.index : -1;
             const textEnd = (tagStart === -1) ? len : currentIndex + tagStart;
             if (textEnd > currentIndex) {
                 segments.push({
                     text: selectedText.substring(currentIndex, textEnd),
                     start: currentIndex,
                     end: textEnd,
                     span: currentSpanInfo
                 });
             }
             if (match) {
                 const tagText = match[0];
                 const tagActualStart = currentIndex + tagStart;
                 const tagActualEnd = tagActualStart + tagText.length;
                 if (tagText.startsWith('</span')) {
                     currentSpanInfo = null;
                 } else {
                     const classList = this.extractClasses(tagText);
                     const style = this.extractStyles(tagText); // Simple parse for segment context
                     currentSpanInfo = {
                         startTag: tagText,
                         startTagOffset: tagActualStart,
                         endTagOffset: -1, // Not accurately determined by this parser
                         classList,
                         style,
                     };
                 }
                 currentIndex = tagActualEnd;
             } else {
                 currentIndex = len;
             }
        }
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
    // Note: This simple parsing is primarily used to get context for segmentation.
    // applyModificationToSegment re-parses the style attribute more carefully for variables.
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

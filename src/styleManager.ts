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
        let isSameValueActive = false; // Track if the *specific* value is already active

        // Perform detailed check only for styles that have values and exhibit the override/toggle issue
        if ((styleType === 'colored-underline' || styleType === 'color' || styleType === 'highlight') && value) {
             // Define which CSS variable to check based on the style type
            const varToCheck = styleType === 'colored-underline' ? '--styler-underline-color'
                             : styleType === 'color' ? '--styler-text-color'
                             : '--styler-highlight-color';

            for (const segment of segments) {
                 // Check based on CSS variable existence/value in inline style
                const currentVarValue = this.getCssVariableValue(segment.span, varToCheck);

                if (currentVarValue !== null) { // Variable exists
                    isCurrentlyActive = true; // Found the style active
                    if (currentVarValue.toLowerCase() === value.toLowerCase()) {
                         isSameValueActive = true; // The exact value we want to apply/toggle is present
                    } else {
                         hasDifferentValue = true; // Found the style, but with a different value
                    }
                }

                // Optional: Check marker class just in case style is missing but class remains
                 const markerClass = styleType === 'colored-underline' ? `${CLASS_PREFIX}${StyleClasses.COLORED_UNDERLINE}`
                                  : styleType === 'color' ? `${CLASS_PREFIX}${StyleClasses.COLORED}`
                                  : `${CLASS_PREFIX}${StyleClasses.HIGHLIGHTED}`;
                if (segment.span?.classList.includes(markerClass)) {
                     isCurrentlyActive = true; // If class exists, consider style potentially active
                     if (currentVarValue === null) {
                         hasDifferentValue = true; // Class exists but variable missing -> treat as different
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
         // More refined approach: remove only spans added by this plugin or specific styles
         // This implementation removes styler classes and related css variables/styles
         let modifiedContent = "";
         const segments = this.parseSelection(originalContent, from, editor);
         segments.forEach(segment => {
              modifiedContent += segment.text; // Always just add the text content
         });

         editor.replaceRange(modifiedContent, from, to);
    }

    // --- Private Helpers ---

    private applyModificationToSegment(
        text: string,
        spanInfo: SelectionSegment['span'],
        styleType: StyleType,
        value: string | null, // Value for color, highlight, colored-underline
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
                if (trimmedKey?.startsWith('--styler-')) { // Only look for variables now
                    currentCssVariables[trimmedKey] = val?.trim() || '';
                }
            });
        }


        // Define ALL style classes
        const classMap: Partial<Record<StyleType, string>> = {
            'bold': StyleClasses.BOLD, 'italic': StyleClasses.ITALIC,
            'underline': StyleClasses.UNDERLINE, 'strike': StyleClasses.STRIKE,
            'circled': StyleClasses.CIRCLED,
            'color': StyleClasses.COLORED, // Marker class
            'highlight': StyleClasses.HIGHLIGHTED, // Marker class
            'colored-underline': StyleClasses.COLORED_UNDERLINE // Marker class
        };
        const targetClass = (styleType in classMap) ? `${CLASS_PREFIX}${classMap[styleType]}` : null;


        if (shouldApply) {
            // --- Apply Style ---
            if (targetClass) { // Apply the class (marker or direct style)
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
                currentCssVariables['--styler-underline-thickness'] = '3px';
                // Remove standard underline class if applying colored version
                currentClasses = currentClasses.filter(cls => cls !== `${CLASS_PREFIX}${StyleClasses.UNDERLINE}`);
                // Ensure colored-underline class is added (targetClass logic already handles this)
            } else if (styleType === 'underline') {
                 // Applying standard underline - remove colored variables/class
                 delete currentCssVariables['--styler-underline-color'];
                 delete currentCssVariables['--styler-underline-thickness'];
                 currentClasses = currentClasses.filter(cls => cls !== `${CLASS_PREFIX}${StyleClasses.COLORED_UNDERLINE}`);
                 // Ensure standard underline class is added (targetClass logic already handles this)
            }
            // Strike/Bold/Italic/Circled are handled by adding class via targetClass logic

        } else {
            // --- Remove Style ---
            if (targetClass) { // Remove the class (marker or direct style)
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
                // Class removal handled by targetClass logic
            } else if (styleType === 'underline') {
                 // If removing standard underline, ensure colored vars are gone too
                 delete currentCssVariables['--styler-underline-color'];
                 delete currentCssVariables['--styler-underline-thickness'];
                // Class removal handled by targetClass logic
            }
            // Strike/Bold/Italic/Circled class removal handled by targetClass logic
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
             delete currentCssVariables['--styler-underline-thickness']; // Remove thickness if color gone
        }


        // --- Reconstruct Span ---
        const variableString = Object.entries(currentCssVariables)
                                .map(([k, v]: [string, string]) => `${k}: ${v};`)
                                .join(' ');
        const styleAttrValue = variableString.trim(); // Only variables go in style now

        const uniqueClasses = [...new Set(currentClasses)].filter(Boolean);
        const hasClasses = uniqueClasses.length > 0;
        const hasStyles = styleAttrValue.length > 0; // Only check variables

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
            // No classes or styles left, return plain text
            return text;
        }
    }


    private isStyleActiveInSegments(segments: SelectionSegment[], styleType: StyleType, value: string | null): boolean {
       // Define classes and variables to check
        const classChecks: Partial<Record<StyleType, string>> = {
            'bold': `${CLASS_PREFIX}${StyleClasses.BOLD}`, 'italic': `${CLASS_PREFIX}${StyleClasses.ITALIC}`,
            'underline': `${CLASS_PREFIX}${StyleClasses.UNDERLINE}`, 'strike': `${CLASS_PREFIX}${StyleClasses.STRIKE}`,
            'circled': `${CLASS_PREFIX}${StyleClasses.CIRCLED}`,
            'color': `${CLASS_PREFIX}${StyleClasses.COLORED}`,
            'highlight': `${CLASS_PREFIX}${StyleClasses.HIGHLIGHTED}`,
            'colored-underline': `${CLASS_PREFIX}${StyleClasses.COLORED_UNDERLINE}`
        };
        const varChecks: Partial<Record<StyleType, string>> = {
             'color': '--styler-text-color',
             'highlight': '--styler-highlight-color',
             'colored-underline': '--styler-underline-color',
         };

        const targetClass = classChecks[styleType];
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
                if (styleType === 'bold' || styleType === 'italic' || styleType === 'circled' || styleType === 'strike') {
                    if (isClassActive) return true; // Class is sufficient
                }
                 else if (styleType === 'underline') {
                      // Standard underline active if its class exists AND colored underline var/class does NOT
                      const isColoredActive = this.hasCssVariable(segment.span, '--styler-underline-color') || segment.span.classList.includes(`${CLASS_PREFIX}${StyleClasses.COLORED_UNDERLINE}`);
                      if (isClassActive && !isColoredActive) return true;
                 } else if (styleType === 'color' || styleType === 'highlight' || styleType === 'colored-underline') {
                     // Active if the variable exists/matches OR if class exists when checking for general removal (value is null)
                     if (isVarActive) return true;
                     if (isClassActive && value === null) return true;
                 }
            }
        }
        return false;
    }

    // Helper to check for CSS Variable existence in the style attribute
    private hasCssVariable(spanInfo: SelectionSegment['span'], varName: string): boolean {
        if (!spanInfo?.startTag) return false;
        const styleAttr = spanInfo.startTag.match(/style="([^"]*)"/i)?.[1] || '';
        // Regex looks for variable name at start of string or after a semicolon, followed by colon
        const regex = new RegExp(`(^|;)\\s*${varName}\\s*:`);
        return regex.test(styleAttr);
    }

    // Helper to get CSS Variable value from the style attribute
    private getCssVariableValue(spanInfo: SelectionSegment['span'], varName: string): string | null {
         if (!spanInfo?.startTag) return null;
         const styleAttr = spanInfo.startTag.match(/style="([^"]*)"/i)?.[1] || '';
         // Regex finds variable name, colon, and captures value until semicolon or end
         const regex = new RegExp(`${varName}\\s*:\\s*([^;]+)`);
         const match = styleAttr.match(regex);
         return match && match[1] ? match[1].trim() : null;
    }


    // Creates a new span tag string (using CSS variable approach)
    private createStyledSpan(text: string, styleType: StyleType, value: string | null, existingSpanInfo: SelectionSegment['span']): string {
        // This now correctly calls applyModificationToSegment which uses CSS vars
        return this.applyModificationToSegment(text, null, styleType, value, true); // Pass null for existingSpanInfo to create fresh
    }


    // --- Parsing Logic (Simplified) ---
    // No changes needed in parseSelection, extractClasses, extractStyles
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
                     const style = this.extractStyles(tagText); // This might include variables
                     currentSpanInfo = {
                         startTag: tagText,
                         startTagOffset: tagActualStart,
                         endTagOffset: -1,
                         classList,
                         style, // Parsed direct styles (may incorrectly include vars initially)
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
    // Note: extractStyles might incorrectly parse CSS variables as direct styles here.
    // The logic in applyModificationToSegment re-parses the style attribute more carefully.
    private extractStyles(tag: string): Record<string, string> {
        const styleMatch = tag.match(/style="([^"]*)"/i);
        const styles: Record<string, string> = {};
        if (styleMatch && styleMatch[1]) {
            styleMatch[1].split(';').forEach(stylePart => {
                const [key, value] = stylePart.split(':');
                if (key && value) {
                    // Store keys lowercase? Maybe not needed if re-parsed later.
                    styles[key.trim()] = value.trim();
                }
            });
        }
        return styles;
    }
}
import styled from "styled-components";

// Define constants for colors and effects
const BORDER_COLOR = "var(--text-faint)"; // Use Obsidian CSS variable for faint border
const SELECTED_BORDER_COLOR = "var(--text-accent)"; // Use Obsidian CSS variable for accent color
const HOVER_BRIGHTNESS = 85; // Brightness percentage on hover

// Styles for the container holding the color items
export const Row = styled.div`
  display: flex;
  flex-wrap: wrap;      /* Allow items to wrap to the next line */
  align-items: center;  /* Align items vertically */
  gap: 5px;             /* Space between color items */
  padding: 5px 0;       /* Vertical padding around the row */
  /* Removed fixed flex/width/margin to allow natural wrapping */
  /* justify-content: center; /* Optional: Center if desired, usually left-align looks better */
`;

// Define the props interface for the ColorItem component
interface ColorItemProps {
  color: string; // Expects a valid CSS color string (e.g., #RRGGBB)
}

// Styles for the individual clickable color square/button
export const ColorItem = styled.button<ColorItemProps>`
  /* Appearance & Sizing */
  background-color: ${p => p.color} !important; /* Set background and force override */
  width: 24px;          /* Fixed width */
  height: 24px;         /* Fixed height */
  min-width: 24px;      /* Prevent shrinking */
  padding: 0;           /* Remove default button padding */
  margin: 0;            /* Remove default button margin */
  border: 1px solid ${BORDER_COLOR}; /* Default border */
  border-radius: 4px;   /* Slightly rounded corners */
  box-sizing: border-box; /* Border included in width/height */
  cursor: pointer;      /* Indicate it's clickable */
  display: inline-block;/* Correct display type */
  vertical-align: middle; /* Align with text if needed */
  flex: 0 0 auto;       /* Prevent flex resizing */

  /* Transitions for smooth effects */
  transition: transform 0.1s ease-out, border-color 0.1s ease-out, box-shadow 0.1s ease-out;

  /* Hover Effects */
  &:hover {
    filter: brightness(${HOVER_BRIGHTNESS}%); /* Slightly darken on hover */
    transform: scale(1.1); /* Slightly enlarge on hover */
    border-color: ${SELECTED_BORDER_COLOR}; /* Use accent color for hover border */
  }

  /* Disabled State (Selected Color) */
  &:disabled {
    filter: none; /* Remove hover brightness */
    /* Use inset box-shadow for a clear "selected" indicator */
    box-shadow: inset 0 0 0 2px ${SELECTED_BORDER_COLOR};
    border-color: ${SELECTED_BORDER_COLOR}; /* Keep border color consistent */
    cursor: default; /* Change cursor to default */
    transform: none; /* Disable hover transform */
  }

  /* Edge Case: Make very light colors visible on light backgrounds */
  /* Add subtle inner shadow for white/very light colors */
  ${p => ['#ffffff', '#fff', 'rgb(255, 255, 255)'].includes(p.color.toLowerCase()) ? `
      box-shadow: inset 0 0 0 1px rgba(0,0,0,0.1); /* Subtle inner border */
      &:disabled {
          /* Combine inner border with selected state shadow */
          box-shadow: inset 0 0 0 1px rgba(0,0,0,0.1), inset 0 0 0 2px ${SELECTED_BORDER_COLOR};
      }
  ` : ''}
`;
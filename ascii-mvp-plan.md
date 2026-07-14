# ASCII MVP Plan

## Top-Level Overview
Build a polished client-side MVP that improves on the current ASCII image converter by delivering a stronger user experience and higher-quality output without adding backend, auth, persistence, or social features. The approach is to keep the existing browser-based conversion pipeline, redesign the main interface for clearer workflows, expand the control surface only where it directly improves output quality, and upgrade preview and export presentation so the product feels more complete and competitive.

## Sub-Tasks

### 1. Refresh the app structure and core UX
- **Intent** — Rework the current single-screen experience so upload, tuning, preview, and export feel deliberate and polished rather than functional-only.
- **Expected Outcomes** — The main screen has a clearer hierarchy, stronger branding, improved spacing and responsiveness, and more useful empty, loading, and error states while preserving the current client-side flow.
- **Todo List**
  1. Review the current layout and identify which parts of [`Converter`](src/components/converter.tsx:37) should stay versus be reorganized.
  2. Redesign the page structure to make upload, controls, preview, and actions easier to scan on desktop and mobile.
  3. Improve helper copy and visual states for idle, dragging, loading, and error cases.
  4. Keep the implementation minimal by reusing the existing page entry and component flow.
- **Relevant Context** — [`src/app/page.tsx`](src/app/page.tsx), [`Converter`](src/components/converter.tsx:37), existing status handling in [`loadFile`](src/components/converter.tsx:96), existing preview section in [`src/components/converter.tsx`](src/components/converter.tsx).
- **Status** — [x] done

### 2. Improve controls and tuning workflow
- **Intent** — Make image tuning easier and more predictable so users can reach good results faster with better defaults and clearer controls.
- **Expected Outcomes** — The controls are easier to understand, settings are grouped more effectively, and the available adjustments better support common image-to-ASCII tuning without unnecessary scope growth.
- **Todo List**
  1. Evaluate the current settings model in [`AsciiSettings`](src/lib/ascii.ts:10) and identify the smallest set of additions or refinements needed for visibly better output.
  2. Reorganize the controls in [`src/components/converter.tsx`](src/components/converter.tsx) so primary adjustments are more prominent.
  3. Introduce lightweight presets or better defaults if they materially improve first-run results.
  4. Ensure control changes continue to trigger conversion cleanly through the existing flow in [`runConversion`](src/components/converter.tsx:57).
- **Relevant Context** — [`AsciiSettings`](src/lib/ascii.ts:10), [`DEFAULT_SETTINGS`](src/lib/ascii.ts:19), controls UI in [`src/components/converter.tsx`](src/components/converter.tsx), conversion trigger in [`runConversion`](src/components/converter.tsx:57).
- **Status** — [ ] pending

### 3. Upgrade the conversion and preview quality
- **Intent** — Improve the quality of generated ASCII and on-screen presentation so the output looks more intentional and competitive.
- **Expected Outcomes** — The generated ASCII is more visually useful across a wider range of images, and the preview is easier to inspect with better sizing and presentation.
- **Todo List**
  1. Review the current luminance mapping and rendering path in [`imageToAscii`](src/lib/ascii.ts:78) for the smallest quality-oriented improvements.
  2. Improve preview presentation in [`src/components/converter.tsx`](src/components/converter.tsx) so users can inspect results more comfortably.
  3. Align preview styling and export styling so the product output feels consistent.
  4. Preserve fully client-side processing and avoid adding server dependencies.
- **Relevant Context** — [`imageToAscii`](src/lib/ascii.ts:78), brightness mapping in [`mapBrightness`](src/lib/ascii.ts:35), dithering in [`ditherIndices`](src/lib/ascii.ts:48), preview scaling effect in [`src/components/converter.tsx`](src/components/converter.tsx), global ASCII styles in [`src/app/globals.css`](src/app/globals.css).
- **Status** — [ ] pending

### 4. Polish export actions and final product feel
- **Intent** — Make copying and downloading feel like finished product features instead of utility buttons.
- **Expected Outcomes** — Export actions are easier to discover, file outputs feel intentional, and the app has a cohesive finish across interaction states and output paths.
- **Todo List**
  1. Review the current export actions in the header and decide how they should fit into the refreshed layout.
  2. Improve export affordances and labels while preserving the existing text and PNG download capabilities.
  3. Refine rendered PNG styling through the existing canvas export path where it directly improves perceived quality.
  4. Check that the final UX remains simple, fast, and entirely client-side.
- **Relevant Context** — header actions in [`src/components/converter.tsx`](src/components/converter.tsx), [`downloadAscii`](src/lib/ascii.ts:140), [`copyAscii`](src/lib/ascii.ts:149), [`renderAsciiToCanvas`](src/lib/ascii.ts:153), [`downloadAsciiPng`](src/lib/ascii.ts:188).
- **Status** — [ ] pending

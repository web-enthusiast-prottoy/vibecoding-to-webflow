# Implementation Plan: Fix Frontend Attribute and Class Import

The current frontend implementation fails to apply classes and custom attributes described in the backend JSON output. This plan refactors the `buildElementTree` function to properly use Webflow Designer API v2 methods.

## Target
File: `/Users/mirror_code/Desktop/Anti Projects/Code to Webflow/code-to-webflow-frontend/src/index.ts`

## Proposed Changes

### 1. Introduce Style Management
In Webflow API v2, "classes" are formal `Style` objects. We need to:
- Retrieve existing styles by name.
- Create new styles if they don't exist.
- Apply an array of these `Style` objects to elements using `element.setStyles()`.

### 2. Robust Attribute Handling
Webflow elements support attributes differently:
- `DOMElement` (from `webflow.elementPresets.DOM`) uses `setAttribute()`.
- Built-in elements (like `DivBlock`) use `setCustomAttribute()`.
We will handle both based on availability.

### 3. Specialized Image and Link Handling
- Use `element.setAsset()` or `setCustomAttribute("src", ...)` for images.
- Use `element.setSettings("url", ...)` for links.

### 4. Cleanup inline styles
The current `setStyles(Record<string, string>)` call is incorrect for API v2 as it expects an array of Style objects. We will remove this or refactor it if inline overrides are strictly required.

## Phase 1: Logic Refactor
- Update `buildElementTree` to iterate through `nodeData.classes`.
- Use `await webflow.getStyleByName()` and `await webflow.createStyle()`.
- Map `attributes` to `setCustomAttribute` or `setAttribute`.

## Phase 2: Testing & Verification
- Run `npm run build` or ensure the dev server picks up changes.
- Test with the provided sample JSON in the Webflow Designer.

## Verification Criteria
- [ ] Elements are created with the correct tags.
- [ ] Webflow Styles (classes) are applied to elements.
- [ ] Custom attributes (like `data-animate`, `id`, `alt`) are correctly set in the Designer.
- [ ] Text content is correctly populated.

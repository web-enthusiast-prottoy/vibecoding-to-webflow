---
description: How to build Webflow sections using strict Client-First methodology
---

# Webflow Client-First Methodology

Whenever you are asked to generate or construct Webflow sections/components (either in JSON format or mentally structuring HTML/CSS equivalents for Webflow), you MUST strictly follow the Client-First methodology based on the following rules.

## Rule 1: The Core Structure (Nesting Hierarchy)

Every top-level section MUST follow this exact nesting hierarchy. Do not deviate to ensure responsivenes and predictable layout inheritance.

1. `<section class="section_[name]">` (e.g., `section_header1`)
2. `  └─ <div class="padding-global">`
3. `       └─ <div class="container-large">` (can be `container-medium`, `container-small` as needed)
4. `            └─ <div class="padding-section-large">` (can be `padding-section-medium`, `padding-section-small`)
5. `                 └─ <div class="[name]_component">` (e.g., `header1_component`)
6. `                      └─ { The custom component content goes here }`

## Rule 2: Typography and Global Spacing Classes

Instead of setting styles directly on elements unless absolutely necessary, apply utility classes consistently.

**Typography Utilities**:
Use standard text and heading utility tags across elements:

- `heading-style-h1` through `heading-style-h6`
- `text-size-large`, `text-size-medium`, `text-size-small`
- Text alignment: `text-align-center`, `text-align-left`, `text-align-right`
- Text style: `text-weight-semibold`, `text-weight-bold`

**Spacing Utilities**:
Always use margin classes for spacing between internal elements instead of fixed pixels/rems on the elements themselves:

- `margin-bottom` paired with a size multiplier: `margin-small`, `margin-medium`, `margin-large`
  _(e.g., `<div class="margin-bottom margin-small">`)_
- `margin-top` paired with size multiplier: `margin-xxsmall`, `margin-xsmall`, `margin-small`, etc.

## Rule 3: Component Custom Classes (BEM-like Naming)

Inside the `[name]_component`, use clear, component-specific class names reflecting their role, separated by a hyphen for children inside the block.

**Examples**:

- `header1_content`
- `header1_content-left`
- `header1_image-wrapper`
- `blog1_list-wrapper`
- `blog1_item`
- `blog1_image-wrapper`, `blog1_image`

Avoid styling direct tags (like styling `h3` directly) unless applying a global `heading-style-hx` or text-size class.

## Rule 4: JSON Payload Structure

When generating the literal `{"type": "@webflow/XscpData", "payload": { ... }}` JSON for Webflow pasting:

1. **Nodes list**: Create a flat array of nodes in the `payload.nodes`.
2. **Types**: Use appropriate `type` per node block: `Block`, `Grid`, `Image`, `Heading`, `Paragraph`, `Link`, `HtmlEmbed`.
3. **Tags**: If type is `Html`, explicitly declare `tag` (e.g., `"tag": "div"`, `"tag": "section"`, `"tag": "p"`).
4. **Styles Flat-List**: All classes used in the nodes MUST be represented in the `payload.styles` array.
5. **Class Reference**: A node’s `classes` array should reference the `_id` of the class defined in the `styles` array.
6. **Property Representation**: In the `styles` array, CSS is encoded inside `styleLess` properties as string arrays separated by `;`.

## Example Hierarchy Implementation

```html
<!-- Example of a Hero Section Layout -->
<section class="section_hero">
	<div class="padding-global">
		<div class="container-large">
			<div class="padding-section-large">
				<div class="hero_component">
					<div class="hero_content">
						<div class="margin-bottom margin-small">
							<h1 class="heading-style-h1">Welcome</h1>
						</div>
						<p class="text-size-medium">
							Our methodology description goes here.
						</p>
					</div>
					<div class="hero_image-wrapper">
						<img src="..." class="hero_image" />
					</div>
				</div>
			</div>
		</div>
	</div>
</section>
```

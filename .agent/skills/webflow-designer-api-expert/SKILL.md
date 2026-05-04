# Webflow Designer API Mastery Skill

## Overview & Purpose
The Webflow Designer API is a **client-side JavaScript/TypeScript API** that lets you build **Designer Extensions** — powerful tools that run directly inside the Webflow Designer canvas. It enables programmatic control over the visual editor: creating/manipulating elements, styles, components, variables, pages, assets, and more, in real-time as the user designs.

**Key Characteristics**:
- Not a REST API — it's browser-based JS executed in an iframe/extension context.
- All operations are asynchronous (`async/await` or `.then()`).
- Pattern: **Get references first** (via GET methods like `getSelectedElement()`), then **manipulate** (create, update, delete).
- Requires a Designer Extension project (use Webflow CLI).
- Runs with full access to the current site's Designer state.

**Core Global Object**: `webflow` (available in your extension's code).

**What You Can Build**:
- AI-powered element generators
- Design system automators (variables, components, styles)
- Bulk page creators/editors
- Asset importers
- Custom component libraries
- Smart layout tools
- Notifications, UI panels, and interactive extensions

## Setup & Getting Started (Extension Development)
1. Install Webflow CLI: `npm install -g @webflow/webflow-cli`
2. Initialize: `webflow extension init my-extension`
3. Develop in `src/` (TypeScript recommended; use `@webflow/designer-extension-typings`)
4. Configure `webflow.json` manifest (apiVersion: "2", intents, size, connections, etc.)
5. Serve locally: `webflow extension serve`
6. Test in Webflow Designer (install the extension in your workspace/project)
7. Publish to Webflow Apps marketplace when ready.

**Basic Structure** (index.ts example):
```typescript
import { webflow } from '@webflow/designer'; // or global webflow

document.getElementById('my-button').addEventListener('click', async () => {
  const selected = await webflow.getSelectedElement();
  if (selected) {
    // Perform actions
    await webflow.notify({ type: 'Success', message: 'Action completed!' });
  }
});
```

**Important Notes**:
- Always handle `null` returns (no selection).
- Changes are live in the Designer (undoable by user).
- Component properties not yet supported (roadmap item).
- Use `elementPresets` for standard elements or `DOM` for custom HTML.

## Core Concepts
- **Element References**: Objects with `.id`, `.type`, properties (`.children`, `.styles`, etc.), and methods (`.append()`, `.setTextContent()`, `.remove()`).
- **Element Presets**: `webflow.elementPresets.DivBlock`, `Paragraph`, `Image`, `FormForm`, `Heading`, `Link`, `DOM` (custom), etc. Full list in docs.
- **PropertyMap**: Object for styles, e.g., `{ "background-color": "#ff0000", "font-size": "16px" }`. Supports CSS values + Webflow Variables.
- **Hierarchy**: Use `before/after` (siblings), `prepend/append` (children).
- **Variables**: Reusable tokens (Color, Size, Font, Number, Percentage) in collections/modes.
- **Components**: Reusable definitions + instances.

## 1. Elements (Core Manipulation)
**Capabilities**:
- Get selected/all elements
- Create/insert at precise locations
- Modify text, attributes, children, structure
- Delete/remove
- Bulk complex structures with `elementBuilder`
- Special handling for Forms, Strings, DOM elements

**Key Methods**:
```typescript
// Retrieval & Selection
const selected = await webflow.getSelectedElement(); // Promise<null | AnyElement>
const all = await webflow.getAllElements();
await webflow.setSelectedElement(element);

// **`webflow.getAllStyles()`**
// [Retrieve all Styles, also known as Classes](https://help.webflow.com/hc/en-us/articles/33961311094419) present on the Webflow site.
// Syntax: webflow.getAllStyles(): Promise<Array<Style>>
const allStyles = await webflow.getAllStyles();
if (allStyles.length > 0) {
  console.log("List of all styles:");
  allStyles.forEach(async (style, index) => {
    console.log(`${index + 1}. Style Name: ${await style.getName()}, Style ID: ${style.id}`);
  });
}

// Insertion (on existing element reference)
// Can take Preset, Component, or String (lowercase tag names like 'p', 'h1', 'section')
const newDiv = await selected.after(webflow.elementPresets.DivBlock);   
const newP = await selected.append('p');  // Appends <p> element (maps to Paragraph preset)
const firstChild = await selected.prepend(webflow.elementPresets.Image); 

// Tag Mapping for Strings:
// 'div' -> DivBlock, 'header'/'footer'/'nav'/'main'/'section' -> DivBlock
// 'img' -> Image, 'a' -> LinkBlock, 'ul' -> List, 'ol'/'li' -> ListItem
// 'h1'-'6' -> Heading, 'p' -> Paragraph, 'button' -> FormButton
// All others -> DOM

// Remove
await selected.remove();

// Bulk Builder (Optimized for complex structures & SVGs)
// Currently only supports DOM elements.
const navMenu = webflow.elementBuilder(webflow.elementPresets.DOM);
navMenu.setTag('nav');
navMenu.setStyles([navStyle]); // Takes Array of Style objects

const item = navMenu.append(webflow.elementPresets.DOM);
item.setTag('a');
item.setAttribute('href', '#');
item.setTextContent('Home');
item.setStyles([navItemStyle]);

// Add the entire structure to the canvas in one operation
await selected.append(navMenu);

// Text & Attributes
**`element.setTextContent(content: string): Promise<null>`**
Sets the text content for an element that supports text content (Paragraph, Heading, Link, DOM, etc).
```typescript
if (selected.textContent !== undefined) {
  await selected.setTextContent("Lorem Ipsum");
}
```

// Display Name (Navigator panel)
**`element.setDisplayName(displayName: string): Promise<null>`**
**`element.getDisplayName(): Promise<string | null>`**
Sets or gets the user-facing display name of an element in the Navigator panel.
```typescript
await selected.setDisplayName("Hero Wrapper");
const name = await selected.getDisplayName();
// Pass empty string to reset:
// await selected.setDisplayName("");
```

// Custom Attributes
**`element.setCustomAttribute(name: string, value: string): Promise<null>`**
**`element.removeCustomAttribute(name: string): Promise<null>`**
```typescript
await selected.setCustomAttribute("data-id", "123"); 
await selected.removeCustomAttribute("data-id");
```

// Set Tag (for Block elements: div, header, main, section, nav, etc.)
if (selected.type === 'Block') {
  await selected.setTag('main');
}

// Children
const children = await selected.getChildren?.() || await selected.children;

// Set Heading Level (for Heading elements)
**`heading.setHeadingLevel(level: 1 | 2 | 3 | 4 | 5 | 6): Promise<null>`**
Sets the heading level (H1-H6) for a Heading element.
```typescript
if (selected.type === 'Heading') {
  await selected.setHeadingLevel(1); // Sets to H1
}
```

**`element.setText(text: string): Promise<null>`**
Sets the text value on a **String element** (Text node), overwriting any prior text value.
```typescript
if (selected.type === 'String' && 'setText' in selected) {
  await selected.setText("Hello Webflow 🚀");
}
```
```

**Forms**: Use `FormForm` preset — auto-generates full form with fields, success/error messages.

### Form structure
A Webflow form consists of several nested elements that work together:
| Element | Description | Parent Element |
| --- | --- | --- |
| `FormWrapper` | The outermost container element that encapsulates the entire form structure | |
| `FormForm` | The main form element containing all form fields and inputs | `FormWrapper` |
| `FormSuccessMessage` | The success message after successful form submission | `FormWrapper` |
| `FormErrorMessage` | The error message if form submission fails | `FormWrapper` |
| `FormInput` | An individual form field. | |
| `FormBlockLabel` | The label for a `FormInput` | `FormInput` |
| `FormButton` | The submit button for the form | `FormForm` |

### Form inputs
You can create form inputs using the following element presets:
* `FormTextInput`
* `FormTextarea`
* `FormSelect`
* `FormCheckboxInput`
* `FormRadioInput`

### Form Methods
- `form.setName(name: string): Promise<null>`
- `form.setSettings(settings: { state: string, name: string, action: string, method: string }): Promise<null>`
- `formInput.setRequired(value: boolean): Promise<null>`
- `formInput.setName(name: string): Promise<null>`
- `formInput.setInputType(type: 'text' | 'email' | 'password' | 'tel' | 'number' | 'url'): Promise<null>`

## 2. Styles & Classes
Manage global styles, classes, and their CSS properties across different breakpoints and pseudo-states.

### 2.1 Concepts
- **Style Object**: Represents a Webflow Class.
- **PropertyMap**: A dictionary of CSS properties and values (e.g., `{ 'background-color': 'blue' }`).
- **Breakpoints**: `"xxl" | "xl" | "large" | "main" (default) | "medium" | "small" | "tiny"`
- **Pseudo-States**: `"noPseudo" | "hover" | "active" | "focus" | "focus-visible" | "first-child" | "last-child" | "before" | "after"`, etc.

### 2.2 Getting & Setting Style Properties
**`style.getProperties(options?: { breakpoint?: BreakpointId, pseudo?: PseudoStateKey }): Promise<PropertyMap>`**
Retrieves the CSS properties of the specified Style Object. Additionally, you can get properties on a style for a specific breakpoint or pseudo-state.

- **`BreakpointId`**: xxl | xl | large | main | medium | small | tiny
- **`PseudoStateKey`**: noPseudo | nth-child(odd) | nth-child(even) | first-child | last-child | hover | active | pressed | visited | focus | focus-visible | focus-within | placeholder | empty | before | after

```typescript
// Example: Get all properties across styles for a specific breakpoint
const element = await webflow.getSelectedElement()
if (element?.styles) {
  const styles = await element.getStyles()
  const allProperties: { [key: string]: any } = {};
  for (let style of styles) {
    const styleName: string = await style.getName();
    const breakpoint : BreakpointAndPseudo = { breakpoint: 'xxl' }
    const properties = await style.getProperties(breakpoint);
    allProperties[styleName] = properties;
  }
}
```

**`style.setProperties(props: PropertyMap, options?: { breakpointId?: BreakpointId, pseudoStateKey?: PseudoStateKey }): Promise<null>`**
Sets multiple style properties at once.
```typescript
const myStyle = await webflow.createStyle("MyCustomStyle");
await myStyle.setProperties({
  "background-color": "#ff5733",
  "font-size": "18px",
  "display": "flex",
  "gap": "16px"
}, { breakpointId: "medium" });
```

**`style.setProperty(prop: StyleProperty, value: string, options?: { breakpointId?: string, pseudoStateKey?: PseudoStateKey }): Promise<null>`**
Sets a single style property. To use a variable, get its binding string using `variable.getBinding()`.
```typescript
const binding = await myVariable.getBinding(); // Returns "var(--my-variable)"
await myStyle.setProperty('background-color', binding, { breakpointId: "xl", pseudoStateKey: "hover" });
```

### 2.3 Removing Style Properties
**`style.removeProperty(prop: StyleProperty, options?: { breakpointId?: BreakpointId, pseudoStateKey?: PseudoStateKey }): Promise<void>`**
Removes a single property from the style.
```typescript
await myStyle.removeProperty('background-color');
```

**`style.removeProperties(props: Array<StyleProperty>, options?: { breakpointId?: BreakpointId, pseudoStateKey?: PseudoStateKey }): Promise<null>`**
Removes multiple properties at once.
```typescript
await myStyle.removeProperties(['background-color', 'accent-color', 'font-family']);
```

### 2.4 Managing Element Styles
**`element.setStyles(styles: Style[]): Promise<null>`**
**`element.getStyles(): Promise<Style[]>`** (or `.styles` property)
```typescript
const element = await webflow.getSelectedElement();
if (element) {
  // Get all styles on element
  const styles = await element.getStyles();
  // Apply a style class
  await element.setStyles([myStyle]);
}
```

### 2.5 Style Properties Reference
Style properties define the visual appearance and layout of web page elements. Using the Webflow Designer API, you can programmatically set these CSS properties to control design aspects like colors, typography, spacing, and positioning.

The Designer API accepts style properties as a `PropertyMap` object — a key-value collection where keys are CSS property names and values are their corresponding settings.

```typescript
{
    "color": "#ff5733",
    "font-size": "16px",
    "font-weight": "bold",
    "text-align": "center",
    "background-color": "#e0e0e0",
    "border-radius": "5px",
    "border-color": "#000000",
}
```

#### Detailed Property Tables

##### Layout & Positioning
| Property | Type | Example |
| :--- | :--- | :--- |
| `display` | string | `flex` |
| `position` | string | `absolute` |
| `top` | string, SizeVariable, or PercentageVariable | `100px` |
| `right` | string, SizeVariable, or PercentageVariable | `0px` |
| `bottom` | string, SizeVariable, or PercentageVariable | `0` |
| `left` | string, SizeVariable, or PercentageVariable | `50px` |
| `inset` | string | `10px 20px` |
| `width` | string, SizeVariable, or PercentageVariable | `50%` |
| `height` | string, SizeVariable, or PercentageVariable | `100vh` |
| `min-width` | string, SizeVariable, or PercentageVariable | `60px` |
| `max-width` | string, SizeVariable, or PercentageVariable | `80%` |
| `min-height` | string, SizeVariable, or PercentageVariable | `100px` |
| `max-height` | string, SizeVariable, or PercentageVariable | `200px` |
| `aspect-ratio` | string | `16 / 9` |
| `box-sizing` | string | `border-box` |
| `overflow` | string | `hidden` |
| `overflow-x` | string | `auto` |
| `overflow-y` | string | `scroll` |
| `object-fit` | string | `cover` |
| `object-position` | string | `center top` |
| `float` | string | `right` |
| `clear` | string | `both` |
| `visibility` | string | `hidden` |
| `z-index` | string or NumberVariable | `10` |
| `contain` | string | `layout style` |
| `isolation` | string | `isolate` |
| `zoom` | string | `1.5` |

##### Flex Layout
| Property | Type | Example |
| :--- | :--- | :--- |
| `flex` | string | `1 1 auto` |
| `flex-direction` | string | `row` |
| `flex-wrap` | string | `wrap` |
| `flex-flow` | string | `row wrap` |
| `flex-basis` | string, SizeVariable, or PercentageVariable | `auto` |
| `flex-grow` | string or NumberVariable | `1` |
| `flex-shrink` | string or NumberVariable | `1` |
| `justify-content` | string | `space-between` |
| `align-items` | string | `flex-start` |
| `align-content` | string | `center` |
| `align-self` | string | `stretch` |
| `order` | string | `2` |
| `gap` | string | `10px 20px` |
| `place-content` | string | `center start` |
| `place-items` | string | `center` |
| `place-self` | string | `center` |

##### Grid
| Property | Type | Example |
| :--- | :--- | :--- |
| `grid` | string | `auto / 1fr 1fr` |
| `grid-template-columns` | string | `50px 100px` |
| `grid-template-rows` | string | `auto` |
| `grid-template-areas` | string | `'header header'` |
| `grid-template` | string | `auto / 1fr 1fr` |
| `grid-column` | string | `1 / span 2` |
| `grid-column-start` | string | `1` |
| `grid-column-end` | string | `span 2` |
| `grid-row` | string | `1 / 3` |
| `grid-row-start` | string | `1` |
| `grid-row-end` | string | `3` |
| `grid-area` | string | `header` |
| `grid-auto-columns` | string | `minmax(100px, auto)` |
| `grid-auto-rows` | string | `auto` |
| `grid-auto-flow` | string | `row dense` |
| `gap` | string | `10px 20px` |
| `grid-gap` | string | `10px 20px` |
| `grid-column-gap` | string, SizeVariable, or PercentageVariable | `10px` |
| `grid-row-gap` | string, SizeVariable, or PercentageVariable | `20px` |
| `row-gap` | string or SizeVariable | `20px` |
| `column-gap` | string or SizeVariable | `20px` |

##### Typography
| Property | Type | Example |
| :--- | :--- | :--- |
| `font` | string | `italic bold 16px/1.5 Arial` |
| `font-family` | string or FontFamilyVariable | `Arial, sans-serif` |
| `font-size` | string, SizeVariable, or PercentageVariable | `16px` |
| `font-weight` | string or NumberVariable | `bold` |
| `font-style` | string | `italic` |
| `font-variant` | string | `small-caps` |
| `font-stretch` | string | `condensed` |
| `font-feature-settings` | string | `'liga' 1` |
| `font-variation-settings` | string | `'wght' 400` |
| `line-height` | string, SizeVariable, NumberVariable, or PercentageVariable | `1.5` |
| `text-align` | string | `justify` |
| `text-transform` | string | `uppercase` |
| `text-decoration` | string | `underline` |
| `text-decoration-thickness` | string | `2px` |
| `text-underline-offset` | string | `3px` |
| `text-wrap` | string | `balance` |
| `letter-spacing` | string or SizeVariable | `0.5em` |
| `word-spacing` | string or SizeVariable | `5px` |
| `white-space` | string | `nowrap` |
| `word-break` | string | `break-word` |
| `overflow-wrap` | string | `break-word` |
| `hyphens` | string | `auto` |
| `color` | string or ColorVariable | `#FF9800` |
| `tab-size` | string or SizeVariable | `4` |
| `-webkit-line-clamp` | string | `3` |

##### Colors & Backgrounds
| Property | Type | Example |
| :--- | :--- | :--- |
| `background` | string | `#e0e0e0 url('img.jpg') no-repeat` |
| `background-color` | string or ColorVariable | `#e0e0e0` |
| `background-image` | string or ColorVariable | `url('image.jpg')` |
| `background-size` | string | `cover` |
| `background-position` | string | `top right` |
| `background-repeat` | string | `repeat-x` |
| `background-attachment` | string | `fixed` |
| `background-clip` | string | `border-box` |
| `background-origin` | string | `padding-box` |
| `background-blend-mode` | string | `multiply` |
| `accent-color` | string or ColorVariable | `#ff5733` |
| `caret-color` | string or ColorVariable | `blue` |
| `color-scheme` | string | `light dark` |

##### Borders
| Property | Type | Example |
| :--- | :--- | :--- |
| `border` | string | `1px solid black` |
| `border-width` | string or SizeVariable | `2px` |
| `border-style` | string | `solid` |
| `border-color` | string or ColorVariable | `#000000` |
| `border-radius` | string, SizeVariable, or PercentageVariable | `8px` |
| `border-spacing` | string | `5px 10px` |
| `border-top-width` | string or SizeVariable | `2px` |
| `border-top-style` | string | `ridge` |
| `border-top-color` | string or ColorVariable | `#3F51B5` |
| `border-top-left-radius` | string, SizeVariable, or PercentageVariable | `20px` |
| `border-top-right-radius` | string, SizeVariable, or PercentageVariable | `20px` |
| `border-bottom-width` | string or SizeVariable | `1px` |
| `border-bottom-style` | string | `groove` |
| `border-bottom-color` | string or ColorVariable | `#f44336` |
| `border-bottom-left-radius` | string, SizeVariable, or PercentageVariable | `4px` |
| `border-bottom-right-radius` | string, SizeVariable, or PercentageVariable | `4px` |
| `border-left-width` | string or SizeVariable | `2px` |
| `border-left-style` | string | `dashed` |
| `border-left-color` | string or ColorVariable | `#9C27B0` |
| `border-right-width` | string or SizeVariable | `1px` |
| `border-right-style` | string | `double` |
| `border-right-color` | string or ColorVariable | `#FFEB3B` |

##### Spacing
| Property | Type | Example |
| :--- | :--- | :--- |
| `margin` | string | `10px 20px` |
| `margin-top` | string, SizeVariable, or PercentageVariable | `10px` |
| `margin-right` | string, SizeVariable, or PercentageVariable | `30px` |
| `margin-bottom` | string, SizeVariable, or PercentageVariable | `20px` |
| `margin-left` | string, SizeVariable, or PercentageVariable | `30px` |
| `margin-block` | string | `10px` |
| `margin-inline` | string | `10px` |
| `padding` | string | `10px 20px` |
| `padding-top` | string, SizeVariable, or PercentageVariable | `10px` |
| `padding-right` | string, SizeVariable, or PercentageVariable | `10px` |
| `padding-bottom` | string, SizeVariable, or PercentageVariable | `15px` |
| `padding-left` | string, SizeVariable, or PercentageVariable | `10px` |
| `padding-block` | string | `10px` |
| `padding-inline" | string | `10px` |
| `gap` | string | `10px 20px` |
| `row-gap` | string or SizeVariable | `20px` |
| `column-gap` | string or SizeVariable | `20px` |

##### Effects & Transforms
| Property | Type | Example |
| :--- | :--- | :--- |
| `box-shadow` | string or SizeVariable | `10px 5px 5px black` |
| `text-shadow` | string or SizeVariable | `2px 2px 5px grey` |
| `filter` | string or SizeVariable | `blur(2px)` |
| `backdrop-filter` | string or SizeVariable | `blur(5px)` |
| `transform` | string | `rotate(45deg)` |
| `transform-origin` | string | `top left` |
| `transform-style" | string | `preserve-3d` |
| `rotate` | string | `45deg` |
| `scale` | string | `1.2` |
| `translate` | string or SizeVariable | `10px, 20px` |
| `perspective` | string or SizeVariable | `500px` |
| `perspective-origin` | string | `50% 50%` |
| `backface-visibility` | string | `hidden` |
| `opacity` | string, NumberVariable, or PercentageVariable | `0.5` |
| `mix-blend-mode` | string | `multiply` |
| `clip-path` | string | `circle(50%)` |
| `will-change` | string | `transform` |

##### Transitions & Animations
| Property | Type | Example |
| :--- | :--- | :--- |
| `transition` | string | `opacity 300ms ease-in-out` |
| `transition-property` | string | `opacity` |
| `transition-duration` | string | `300ms` |
| `transition-timing-function` | string | `ease-in-out` |
| `transition-delay` | string | `0.5s` |
| `transition-behavior` | string | `allow-discrete` |
| `animation` | string | `slidein 1s ease-in-out` |
| `animation-name` | string | `slidein` |
| `animation-duration` | string | `1s` |
| `animation-timing-function` | string | `ease-in-out` |
| `animation-delay` | string | `2s` |
| `animation-iteration-count` | string | `infinite` |
| `animation-direction` | string | `alternate` |
| `animation-fill-mode` | string | `forwards` |
| `animation-play-state` | string | `paused` |
| `animation-composition` | string | `replace` |
| `animation-timeline` | string | `auto` |

##### Scroll Snap
| Property | Type | Example |
| :--- | :--- | :--- |
| `scroll-behavior` | string | `smooth` |
| `scroll-snap-type` | string | `y mandatory` |
| `scroll-snap-align` | string | `start` |
| `scroll-snap-stop` | string | `normal` |
| `scroll-margin` | string | `10px` |
| `scroll-padding` | string | `20px` |

##### Scrollbar
| Property | Type | Example |
| :--- | :--- | :--- |
| `scrollbar-color` | string | `dark` |
| `scrollbar-gutter` | string | `stable` |
| `scrollbar-width` | string | `thin` |

##### Container Queries
| Property | Type | Example |
| :--- | :--- | :--- |
| `container` | string | `sidebar / inline-size` |
| `container-name` | string | `sidebar` |
| `container-type` | string | `inline-size` |

##### Masking
| Property | Type | Example |
| :--- | :--- | :--- |
| `mask` | string | `url('mask.png') no-repeat` |
| `mask-image` | string | `url('mask.png')` |
| `mask-mode` | string | `luminance` |
| `mask-border` | string | `url('mask.png') 30` |

##### User Interaction
| Property | Type | Example |
| :--- | :--- | :--- |
| `cursor` | string | `pointer` |
| `pointer-events` | string | `none` |
| `touch-action` | string | `pan-right` |
| `user-select` | string | `none` |
| `resize` | string | `both` |
| `appearance` | string | `none` |

Values can reference Webflow Variables. Note: Most operations require the `canModifyStyleBlocks` designer ability.

Values can reference Webflow Variables. Note: Most operations require the `canModifyStyleBlocks` designer ability.

## 3. Components
Webflow Components are customizable blocks created from Elements. They serve as the foundation for structuring visual hierarchies on a Webflow site, ensuring that designs are modular, reusable, and consistent.

### 3.1 Key Concepts

- **Component Definition**: Also known as the component object, the blueprint for a component. It defines the structure and properties. Any modifications made to the definition propagate to all associated instances.
- **Component Instance**: A "carbon-copy" of the component definition. While it retains the core design, each instance can be customized through unique properties.
- **Component Properties**: Attributes within a Definition that can be assigned unique values in an Instance (e.g., text, images, links). 
  > [!WARNING]
  > Currently, Designer APIs don't support the creation and management of Component Properties. This is on the development roadmap.

### 3.2 Methods

#### Create a Component Definition
You can create a component definition within an existing root element or create an unattached definition.

**Syntax**:
```typescript
webflow.registerComponent(name: string, root: AnyElement | ElementPreset<AnyElement> | Component): Promise<Component>
// OR
webflow.registerComponent(options: { name: string, group?: string, description?: string }): Promise<Component>
```

**Example**:
```typescript
// Create from existing element
const rootElement = await webflow.getSelectedElement();
if (rootElement) {
  const component = await webflow.registerComponent('Card Component', rootElement);
}

// Create blank definition (Beta)
const hero = await webflow.registerComponent({
  name: 'Hero Section',
  group: 'Sections',
  description: 'A reusable hero section',
});
```

#### Edit a Component Definition
To modify a definition, its instance must be on the page. Use `enterComponent` to focus on the definition.

```typescript
if (selectedElement && selectedElement.type === 'ComponentInstance') {
  await webflow.enterComponent(selectedElement as ComponentElement)
  const rootElement = await webflow.getRootElement()
  if (rootElement?.children) {
    await rootElement.append(webflow.elementPresets.DivBlock)
  }
}
```

#### Add a Component Instance
Use `webflow.createInstance(componentDefinition)` to add an instance to the page.

```typescript
const allComponents = await webflow.getAllComponents()
const firstComponent = allComponents[0]
await selectedElement?.before(firstComponent)
```

#### Get All Components
Retrieves all component objects registered to the site.

```typescript
const components = await webflow.getAllComponents();
for (const component of components) {
  const name = await component.getName();
  console.log(`Name: ${name}, ID: ${component.id}`);
}
```

#### Set Component Settings (Beta)
Updates settings like name, group, and description.

```typescript
const component = (await webflow.getAllComponents())[0];
await component.setSettings({
  name: 'Hero Section v2',
  description: 'Redesigned hero component',
});
```


## 4. Variables & Collections
**Types**: Color, Size, Font, Number, Percentage.

**Key Methods**:
```typescript
const collection = await webflow.getDefaultVariableCollection();

// Create
// Retrieval
const varByName = await collection.getVariableByName("primary"); // Returns Variable | null
const varById   = await collection.getVariable("id-123");         // Returns Variable | null

// Meta-data
const binding = await colorVar.getBinding(); // e.g., "var(--primary)"
const cssName = await colorVar.getCSSName(); // e.g., "--primary"

// Aliases & Custom
const aliasVar = await collection.createColorVariable("button", colorVar); // References primary
```

Supports `calc()`, `clamp()`, `color-mix()`, `var()` bindings. Use `variable.getBinding()` or `{ variableId: v.id }` for `setProperty`.

## 5. Pages & Folders
```typescript
const currentPage = await webflow.getCurrentPage() as Page;

await currentPage.setTitle("New Page Title");
await currentPage.setDraft(true);
// setSlug, setName, SEO/Open Graph settings, password protection, move to folder, etc.
```

Manage site structure, create new pages/folders (via element or dedicated methods).

## 6. Assets & Media
**Capabilities**:
- Create/upload new assets (Images, Documents, Lottie)
- Update existing assets (Name, Alt Text, File replacement)
- Assign assets to elements (e.g., Image elements)
- Get public URLs and manage alt text per locale

### 6.1 Creating Assets
**`webflow.createAsset(fileBlob: File): Promise<Asset>`**
Create a new asset on your Webflow site.

This method is specifically for creating new assets - if you need to update an existing asset, use the set asset file method instead. Be sure to review the limits and MIME types sections to ensure your files meet the requirements.

**Adding to Page**:
1. Create an asset
2. Create an image element
3. Use the `element.setAsset(asset)` method to set the asset

**Example (Remote File)**:
```typescript
// Fetch image from remote source and build a Blob object
const response = await fetch(url)
const blob = await response.blob()
const file = new File([blob], fileName, {
  type: 'image/png',
})

// Create and upload the asset to webflow
const asset = await webflow.createAsset(file);
console.log(asset)
```

**Example (Direct Upload)**:
```html
<!-- Add a file picker to your interface -->
<input type="file" id="fileInput" />
```

```javascript
// Reference the file input element
const fileInput = document.getElementById('fileInput');

// Add change event listener
fileInput.addEventListener('change', async function () {
  try {
    if (fileInput instanceof HTMLInputElement) {
      const file = fileInput.files[0];
      if (!file) return;
      const asset = await webflow.createAsset(file);
    } else {
      console.error('Not an input element');
    }
  } catch (err) {
    console.error('Something went wrong', err);
  }
});
```

### 6.2 Managing Assets (Asset Object Methods)
**`asset.setName(name: string): Promise<null>`**
Sets the name of an asset.
```typescript
const assets = await webflow.getAllAssets();
await assets[0].setName("New Asset Name");
```

**`asset.setAltText(altText: string | null, localeId?: string): Promise<null>`**
Sets alt text for a specific locale. If `altText` is `null`, Webflow sets it to "decorative".
```typescript
const asset = await webflow.getAssetById(assetId);
await asset.setAltText("A descriptive text", "en_US");
```

**`asset.setFile(fileBlob: File): Promise<null>`**
Replaces the file of an existing asset with a new one.
```typescript
const newFile = new File([blob], 'marvin-smiling.png', { type: 'image/png' });
await asset.setFile(newFile);
```

### 6.3 Limits & MIME Types
Uploaded assets must adhere to specific size limitations:
* Images must not exceed 4MB
* Documents must not exceed 10MB

**Accepted MIME Types**:
Refer to the accepted MIME types listed below for compatibility. Pass Lottie files as `application/json` MIME types.
`image/jpeg`, `image/jpg`, `image/png`, `image/gif`, `image/svg+xml`, `image/bmp`, `image/webp`, `application/pdf`, `application/msword`, `application/vnd.ms-excel`, `application/vnd.ms-powerpoint`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `application/vnd.openxmlformats-officedocument.presentationml.presentation`, `text/plain`, `text/csv`, `application/vnd.oasis.opendocument.text`, `application/vnd.oasis.opendocument.spreadsheet`, `application/vnd.oasis.opendocument.presentation`, `application/json`

### Designer Ability
Most asset operations require the **`canManageAssets`** designer ability.

## 7. Extension Utilities
```typescript
// Notifications
await webflow.notify({
  type: 'Success' | 'Error' | 'Info',
  message: 'Operation complete!'
});

// Resize UI
// Set the desired size for the Extension UI.
// Syntax: webflow.setExtensionSize(size: 'default' | 'comfortable' | 'large' | {width: number; height: number}): Promise<null>
// Default: 240x360 | Comfortable: 320x460 | Large: 800x600
await webflow.setExtensionSize("large");

// Site info, subscribe to events (selection change, etc.), app discovery, modals/panels.
```

## 8. API Reference: setProperty

### **`style.setProperty(prop, value, options?)`**

Manage the CSS of a Style by setting a specific style property at the given breakpoint and pseudo-state.

#### Syntax
```typescript
 style.setProperty(
  prop: StyleProperty,
  value: string | VariableReference,
  options?: {
    breakpointId?: BreakpointId,
    pseudoStateKey?: PseudoStateKey
  }
): Promise<void>
```

#### Parameters

* **`prop`**: *StyleProperty* - The property to set. (e.g., 'display', 'color', 'padding').
* **`value`**: *String* - The value to set. Can be a CSS string or a Webflow variable binding string (use `variable.getBinding()`).
* **`options`**: *BreakpointAndPseudo* - (Optional) filter properties by breakpoint and/or pseudo-state.

  * **`BreakpointId`**: xxl | xl | large | main | medium | small | tiny
  * **`PseudoStateKey`**: noPseudo | nth-child(odd) | nth-child(even) | first-child | last-child | hover | active | pressed | visited | focus | focus-visible | focus-within | placeholder | empty | before | after

#### Returns
**Promise\<null>**

#### Example
```typescript
// Retrieve the style by name
const retrievedStyle = await webflow.getStyleByName(styleName);

// Set Style Properties with options
const options: BreakpointAndPseudo = { breakpoint: "xl", pseudo: "hover" }
await retrievedStyle?.setProperty('background-color', 'blue', options)
```

## 9. Error Handling

This section outlines error patterns, debugging tips, and all possible errors for quick troubleshooting to aid developers in building resilient applications. API errors in Webflow may be a result of a number of scenarios including but not limited to insufficient Webflow entitlements, user role abilities, and more.

### Error patterns

The Designer API employs a structured format for exceptions, ensuring you have clear and actionable information at your disposal. Here's what you can expect in the event of an error:

```
Cause Tag: ResourceRemovalFailed
Message: "Failed to remove style. Ensure there are no usages of this style."
```

**Cause Tag** `(err.cause.tag)`: Accompanying each error message is a consistent, unchanging cause tag. These tags describe a unique error type for the purpose of programmatically distinguishing between different error scenarios and responding accordingly.

**Message** `(err.message)`: A descriptive sentence designed to provide insight into what went wrong. The wording of this message may change over time to clarify or reflect updated functionality within the Designer API.

### List of errors

This section provides a detailed list of error cause tags you might encounter while interacting with the Designer API.

| Cause Tag               | Description                                                                                                                                                                    |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| DuplicateValue          | Indicates a value was duplicated where it should be unique.                                                                                                                    |
| Forbidden               | Indicates that a User and/or app doesn't have the permission to take a specific action. For more on this error see documentation on [App Modes](/designer/reference/app-modes) |
| InternalError           | An error occurred within the system or process.                                                                                                                                |
| InvalidElementPlacement | An element was placed in an invalid location or context.                                                                                                                       |
| InvalidRequest          | A request is invalid based on the designer's current ability                                                                                                                   |
| InvalidStyle            | The specified style is invalid or not recognized.                                                                                                                              |
| InvalidStyleName        | The specified style name doesn't exist or is incorrect.                                                                                                                        |
| InvalidStyleProperty    | The property of the style is invalid or not applicable.                                                                                                                        |
| InvalidStyleVariant     | The variant of the style specified is invalid or not recognized.                                                                                                               |
| InvalidTargetElement    | The target element for the operation is invalid.                                                                                                                               |
| PageCreateFailed        | Failed to create a page due to an unspecified error.                                                                                                                           |
| ResourceCreationFailed  | Failed to create a resource due to an unspecified error.                                                                                                                       |
| ResourceMissing         | The requested resource is missing or unavailable.                                                                                                                              |
| VariableInvalid         | A variable's value is invalid or not within the expected range.                                                                                                                |

### How to handle errors

Apps need to manage errors gracefully to maintain a seamless user experience. See the approaches below for a few patterns on how to handle errors if they arise when working with Designer APIs.

#### Using try/catch for error handling

The try/catch block is seamlessly integrated with async/await syntax, offering a straightforward way to catch exceptions as demonstrated:

```typescript
try {
  const element = await webflow.getSelectedElement();
  await element.remove();
  // Attempting further operations on the removed element will throw an error
  const styles = await element.getStyles();
} catch (err) {
  console.error(`Cause:${err.cause.tag}`);
  console.error(`Message:${err.message}`);
}
```

#### Notifying users of an error

By utilizing the `webflow.notify` method, you can send a notification directly to the user within Webflow that acknowledges the error and also, when feasible, provide guidance on resolving it. This proactive approach helps maintain trust and ensures users aren't left in the dark, improving their overall experience and satisfaction with your application.

```typescript
function handleErrors(err) {
  switch (err.cause.tag) {
    case 'ResourceMissing':
      webflow.notify({ type: 'Error', message: 'The element no longer exists. Select a different element' });
      break;
    case 'InvalidElementPlacement':
      // Handle specific error
      webflow.notify({  type: 'Error', message: 'The element cannot be placed here. Try another location' });
      break;
    // Additional error cases
    default:
      webflow.notify({ type: 'Error', message: 'An error occurred. Please try again later' });
  }
}
```

## 10. Forms & Inputs
Webflow Forms enable users to capture and collect information. A Webflow form consists of several nested elements that work together.

### 10.1 Creating a Form
Use the `FormForm` element preset to create a form. It automatically generates a complete structure with default fields, a success message, and an error message.
```typescript
// Create a form element after the selected element
let form = await el.after(webflow.elementPresets.FormForm);
```

### 10.2 Form Structure
| Element | Description | Parent Element |
| :--- | :--- | :--- |
| `FormWrapper` | Outermost container element | |
| `FormForm` | Main form element containing fields/inputs | `FormWrapper` |
| `FormSuccessMessage` | Success message shown after submission | `FormWrapper` |
| `FormErrorMessage` | Error message shown if submission fails | `FormWrapper` |
| `FormInput` | Individual form field (generic term) | |
| `FormBlockLabel` | Label for a FormInput | `FormInput` (or sibling in wrapper) |
| `FormButton` | The submit button | `FormForm` |

### 10.3 Form Inputs
You can create various input types using specialized presets:
* `FormTextInput`
* `FormTextarea`
* `FormSelect`
* `FormCheckboxInput`
* `FormRadioInput`

**Best Practice**: Wrap each input and its corresponding `FormBlockLabel` in a container (like a `DivBlock`) to keep them organized.

```typescript
// Example: Adding a text input with a label
const inputWrapper = await formEl.append(webflow.elementPresets.DivBlock);
const label = await inputWrapper.append(webflow.elementPresets.FormBlockLabel);
await label.setText("Your Email");

const input = await inputWrapper.append(webflow.elementPresets.FormTextInput);
await input.setName("Email");
await input.setInputType("email"); // Only supported by FormTextInput
await input.setRequired(true);
```

### 10.4 Form Methods
#### Form & Wrapper Methods:
* **`setName(name: string)`**: Sets the name of the form.
* **`getName()`**: Retrieves the form name.
* **`setSettings(settings)` / `getSettings()`**: Manage form settings (Action, Method, etc.).

#### Input Field Methods:
* **`setRequired(required: boolean)`**: Sets whether the field is required.
* **`setName(name: string)`**: Sets the `name` attribute for the input.
* **`setInputType(type: string)`**: Sets the type (e.g., "email", "password", "tel") — *FormTextInput only*.
* **`setCustomAttribute("placeholder", text)`**: Set placeholder text (overrides Designer settings).

### 10.5 Custom Select Options
Currently, setting options for `FormSelect` is not directly supported via specialized methods. Use the **Custom DOM** approach:
```typescript
const select = wrapper.append(webflow.elementPresets.DOM);
select.setTag('select');
select.setAttribute('name', 'custom-select');

// Create options as children
const choices = [{ name: 'Option 1', value: '1' }];
choices.forEach((choice) => {
  const option = select.append(webflow.elementPresets.DOM);
  option.setTag('option');
  option.setAttribute('value', choice.value);
  option.setTextContent(choice.name);
});
```

## Best Practices & Patterns
- **Error Handling**: Check for `null`, use try/catch, notify user on errors.
- **User Guidance**: Always notify on success/error or when selection is required.
- **Performance**: Batch operations where possible; avoid excessive DOM reads.
- **Type Safety**: Use TypeScript + official typings for `Element`, `Page`, `Variable`, etc.
- **Undo/History**: User can undo API changes in Designer.
- **Testing**: Use the Designer API Playground + local serve.
- **Permissions**: Extensions run in user context with their permissions.

## 11. Performance & Stability (Advanced)

### 11.1 Pseudo-State Stability (Avoid Timeouts)
**Symptom**: `setProperties()` (batched) times out (> 15s) when applying styles to pseudo-states like `:hover`, `:active`, etc.
**Root Cause**: The Designer API sometimes deadlocks when resolving inheritance chains for multiple properties in a single batch on pseudo-classes.
**The Fix**: 
- **Force Individual Application**: Use `setProperty()` (singular) with a `CHUNK_SIZE` of 1 for any style block containing a `pseudoStateKey`.
- **UI Breathing Room**: Add a tiny delay (e.g., `await sleep(25)`) between individual property calls to allow the Designer's UI thread to cycle.

### 11.2 API Version Compatibility (The Double-Key Pattern)
Different versions of the Designer API and its internal typings sometimes drift between property names. To ensure robustness and prevent "Invalid Option" or "Timeout" errors:
- **Unified Options Object**: Always include both "old" and "new" keys in your options.
```typescript
const wfOptions = {
  breakpointId: bp,   // Modern V2
  breakpoint: bp,     // Legacy/Fallback
  pseudoStateKey: ps, // Modern V2
  pseudo: ps          // Legacy/Fallback
};
await style.setProperty('color', '#fff', wfOptions);
```

### 11.3 Variable Bindings & Complex Props
- **Favor Binding Strings**: For `setProperty`, using `variable.getBinding()` (e.g. `"var(--my-id)"`) is often more stable than passing the `Variable` object directly, especially for complex properties like `background-image`, `transition`, or `transform`.

### 11.4 Resilient Variable Syncing (Avoid Batch Failures)
- **Problem**: Calling `v.get()` on a `Size` variable that contains a custom expression like `clamp()` or `calc()` will **throw an error**.
- **The Pitfall**: Using `Promise.all([v.getName(), v.getBinding(), v.get(), v.getCSSName()])` will cause the entire variable to be skipped if `v.get()` fails.
- **The Fix**: Fetch variable metadata individually with `try/catch` per property. Ensure the `variable` object itself is still cached even if `v.get()` or `v.getBinding()` fails.

### 11.5 Custom Size Variable Values (clamp/calc)
- **Webflow API Rule**: When setting the value of a `Size` variable to a custom CSS expression (`clamp`, `calc`, `min`, `max`), you must pass the **raw CSS string** directly to `variable.set(value)`.
- **Warning**: Do NOT wrap it in a custom object like `{ type: "custom", value: "clamp(...)" }`. This format is not recognized by the Webflow variable API and will cause the variable to default to `0px`.

### 11.6 Style Variable Cache Misses
- **Pattern**: If a style property value (e.g. `var(--font-size-h1)`) fails to resolve against your variable cache:
    - **Avoid**: Applying it as a plain string in a batched `setProperties()` call (it may be ignored or mismanaged).
    - **Recommended**: Upgrade the property to a "complex" entry and apply it individually via `setProperty()`. This forces the Designer to treat it as a direct CSS declaration, ensuring the value is at least applied as raw CSS.

### 11.7 Grid Gap & Responsive Mapping Gotchas
- **Symptom**: `row-gap`, `column-gap`, or `gap` properties are ignored on responsive breakpoints (XL, Med, etc.) or when using variable proxies, even if they appear in the JSON.
- **Root Cause**: The modern CSS gap property names are sometimes mismanaged by the Designer API's internal parser during responsive synchronization.
- **The Fix**: 
    - **Map to Legacy Keys**: Before applying, map modern keys to their legacy grid counterparts: `row-gap` → `grid-row-gap`, `column-gap` → `grid-column-gap`, `gap` → `grid-gap`.
    - **Result**: Visual behavior is identical, but responsive propagation and variable binding are significantly more stable.

### 11.8 Variable Binding Strategy (Proxy vs. String)
- **The Conflict**: 
    - **String Literals** (`var(--name)`): Extremely stable for main-breakpoint properties and complex shorthands (transitions, etc.). However, they often **lose breakpoint context** when applied via the API (the value applies to all breakpoints instead of just the target one).
    - **Variable Proxies** (Purple Pill objects): Correctly handle responsive propagation and UI variable linking. However, they can cause **IPC deadlocks** or be **silently ignored** by certain properties (like modern `gap`).
- **The Rule of Thumb**:
    - Use **Variable Proxies** for spacing (padding, margin) and layout (grid-*-gap) where responsive behavior is critical.
    - Use **String Literals** for decoration (colors, fonts) or complex shorthands where stability is more important than responsive variable linking.

## 12. Mandatory Bug-Fixing Checklist

Whenever investigating a bug or sync error in the Webflow extension, you MUST check these points:

1. **Property Mapping check**: Is the property using a modern name (e.g. `gap`) that should be mapped to a legacy equivalent (`grid-gap`) for stability?
2. **Variable Binding check**: Are we passing a variable proxy object to a property that only supports string literals, or vice versa? (See §11.8)
3. **Responsive Context check**: Are breakpoints being lost? (Usually fixed by using Variable Proxies instead of raw `var()` strings).
4. **Pseudo-State check**: Is the property being applied to a pseudo-state? If so, is it being applied **individually** via `setProperty` to avoid timeouts?
5. **IPC Batch check**: Is the batch size too large? (Default to `CHUNK_SIZE = 5` or less).
6. **Value Normalization check**: Are numeric zero values passed as `0px` (safe) instead of `0` (can cause parser stalls)?

## Common Workflows
1. **Auto-generate Section**: Get selected → Append complex `elementBuilder` structure → Apply styles/variables.
2. **Component Library Tool**: Select elements → Register as components → Bulk instantiate.
3. **Design Token Sync**: Pull variables → Apply to selected elements.
4. **Smart Form Builder**: Insert FormForm + customize fields dynamically.

## 12. Fixing Bugs & Designer API Gotchas (CRITICAL)

This section contains "Hard-Won Lessons" from complex synchronization tasks. Always consult this before debugging Grid or Responsive issues.

### 12.1 Grid Property Normalization
- **Plural vs. Singular**: Webflow's Designer API strictly expects plural keys (`grid-template-columns`, `grid-template-rows`). Singular CSS aliases like `grid-template-column` will be ignored or cause UI desync.
- **Shorthand Expansion**: Properties like `grid-template` or `grid-gap` should be expanded into their constituent properties (e.g., `grid-row-gap`, `grid-column-gap`) for maximum stability in the Designer panels.
- **Repeat Expansion**: `repeat(n, unit)` values must be expanded into explicit space-separated units (e.g., `1fr 1fr`) in the JSON output to ensure the Designer's Grid Editor can hydrate correctly.

### 12.2 Shorthand Splitting & CSS Functions
- **Parenthesis Awareness**: When splitting shorthands (e.g., `gap: 10px 20px` or `margin: var(--a) var(--b)`), use a regex that **ignores whitespace inside parentheses**. 
- **The Clamp/Calc Bug**: A simple `.split(/\s+/)` will break values like `clamp(1rem, 2vw, 3rem)`, resulting in corrupted strings like `clamp(1rem,`. Use `trimmed.match(/(?:[^\s(]+|\((?:[^()]+|\([^()]*\))*\))+/g)` instead.

### 12.3 Breakpoint Aggregation & Media Queries
- **Range-Based Matching**: Webflow's breakpoints are inclusive. Avoid fixed checks like `if (width === 991)`. Use range-based matching:
    - Tablet (`medium`): `768px < width <= 991px`
    - Phone Landscape (`small`): `479px < width <= 768px`
    - Phone Portrait (`tiny`): `width <= 479px`
- **Fallback Overwrite Risk**: If a media query (e.g., `@media (max-width: 900px)`) is not successfully recognized as a Webflow breakpoint, it **must not** default to the `main` bucket. Doing so will cause mobile styles to overwrite desktop styles. Unrecognized media queries must be pushed to `styles-embed.json`.

### 12.4 Zero Values & Units
- **The Stalling Zero**: Always pass numeric zero values with units (e.g., `0px`) when targeting layout properties. Unitless `0` can sometimes cause the Designer parser to stall or hang during style application.

**Skill Usage Tip**: When generating code for Webflow extensions, always start with getting references (`getSelectedElement`, `getCurrentPage`, `getDefaultVariableCollection`), use async/await, include user notifications, and prefer presets for standard elements. Reference this skill for accurate method names and patterns. For pseudo-states, always use individual `setProperty` calls to avoid timeouts.

This `.skill` file provides complete, actionable knowledge. It covers **everything** derivable from the full documentation tree (introduction, elements, pages, components, variables, assets, utilities, styles, specific methods). Use it to generate accurate, production-ready extension code. 

# Webflow Designer API: Variables & Styling Gotchas

## Context
This document outlines critical bugs, IPC (Inter-Process Communication) deadlocks, and strict constraints related to Webflow variables and styling application via the Designer API. 

Because the Designer API operates via a cross-window `postMessage` bridge between the extension context and the Webflow Designer canvas, incorrectly formatted objects or undocumented configuration keys will fail serialization. **These failures do not throw standard try/catch errors; they cause the promise to hang permanently, resulting in timeouts (e.g., `Timeout: setProperty took too long (> 5000ms)`).**

Always check these constraints when debugging API timeouts during style application.

---

## 1. The Variable Assignment Object Format

When assigning a Webflow Variable to a CSS property, the API expects a very specific reference payload.

**❌ Mistakes Made (Results in Timeout):**
- Passing an object literal `{ variableId: "..." }`. The API tries to serialize this in a way that causes the IPC bridge to hang indefinitely.
- Passing a manually constructed `{"id": "..."}` object.

**✅ The Correct Approach:**
When passing a variable object reference, you MUST pass the native Variable proxy object directly! The Webflow runtime natively intercepts its own proxy objects before the message serialization boundary.

```typescript
// Correct Native Object Syntax
await style.setProperty('color', cached.variable);

// Correct String Binding Syntax (Alternative)
const bindingString = await variable.getBinding(); // "var(--my-color)"
await style.setProperty('color', bindingString);
```

---

## 2. Batching Limitations with `setProperties()`

The `style.setProperties(chunk)` method is heavily optimized for batching large amounts of CSS rules at once. However, the serialization bridge struggles to handle mixed payloads involving literal Webflow variable reference proxy objects.

**❌ Mistakes Made (Results in Batch Timeout):**
Batching proxy objects alongside plain string values causes the Designer IPC bridge to lock up.
```typescript
// NEVER do this inside setProperties:
await style.setProperties({
    "padding": "10px",
    "color": cached.variable // ❌ Causes timeout of the entire batch
});
```

**✅ The Correct Approach (Two-Track Pipeline):**
You must split style application into two separate tracks. Plaint text strings can be safely batched, while variable proxy references must be applied one-by-one.

```typescript
// 1. Separate the properties
const plainEntries = Object.entries(props).filter(([, v]) => typeof v !== 'object' || v === null);
const varEntries = Object.entries(props).filter(([, v]) => typeof v === 'object' && v !== null);

// 2. Batch plain strings safely
const chunk = Object.fromEntries(plainEntries);
await style.setProperties(chunk);

// 3. Apply proxy objects individually
for (const [prop, val] of varEntries) {
    await style.setProperty(prop, val);
}
```

---

## 3. Strict Options Configuration (Breakpoints & Pseudo-states)

Both `setProperties()` and `setProperty()` accept an optional configuration object to target breakpoints and pseudo-states (e.g., `:hover`).

**❌ Mistakes Made (Results in Timeout):**
Passing undocumented, legacy, or duplicate keys in the `options` object. Older versions of documentation or legacy code patterns sometimes utilized keys like `breakpoint` or `pseudoState`.
```typescript
// ❌ This configuration object will cause ALL properties in this batch/call to timeout:
const badOptions = { 
    breakpointId: 'main', 
    breakpoint: 'main',       // Undocumented/Invalid
    pseudoStateKey: 'hover',
    pseudoState: 'hover'      // Undocumented/Invalid
};
```

**✅ The Correct Approach:**
Adhere EXACTLY to the TypeScript definitions of the Webflow Designer API. The bridge strictly validates these keys.

- Use **ONLY** `breakpointId`
- Use **ONLY** `pseudoStateKey`

```typescript
const validOptions = {};
if (targetBreakpoint && targetBreakpoint !== 'main') {
    validOptions.breakpointId = targetBreakpoint;
}
if (targetPseudo) {
    validOptions.pseudoStateKey = targetPseudo;
}

await style.setProperty('transform', 'scale(1.02)', validOptions);
```

---

## 4. Implementing Resilient Fallbacks

Because API errors sometimes manifest as hangs rather than exceptions, **always implement a timeout fallback** when applying large style structures.

```typescript
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, name: string): Promise<T> {
  let timeoutHandle: any;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => reject(new Error(`Timeout: ${name} took too long (> ${timeoutMs}ms)`)), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutHandle);
  }
}

// Usage Example
try {
    const setPromise = style.setProperties(chunk);
    await withTimeout(setPromise, 15000, `setProperties Batch`);
} catch (err) {
    console.warn(`Batch failed, falling back to per-property loop...`);
    // Iterate over chunk and try each property with style.setProperty
}
```

---

## 5. Transition & Shorthand Precision (CRITICAL)

The Designer API has extremely fragile parsing for the `transition` shorthand, especially when it involves Webflow Variables or non-standard units. Failure to follow these rules will cause the Designer UI to crash or the API to timeout.

**❌ Mistakes Made:**
- **Shorthand String with Variables**: Passing `"transition": "opacity .2s var(--my-variable)"`. The Designer UI cannot parse `var()` references inside complex shorthand strings and will hang.
- **Wrong Units**: Using seconds (`.2s`) for transition durations. While valid CSS, Webflow's native panel expects milliseconds (`200ms`). Using `s` can cause the Designer UI to crash when the user clicks the Transition property.
- **Shorthand property itself**: Sending the `transition` property directly often bypasses Webflow's internal validation.

**✅ The Correct Approach:**
1. **Expand Shorthands**: Always split `transition` into `transition-property`, `transition-duration`, and `transition-timing-function`.
2. **Inline Variables for Transitions/Transforms**: For these specific properties, do NOT pass `var(--name)`. Instead, look up the variable's raw value and inline it (e.g., `cubic-bezier(...)`).
3. **Use 'ms' Units**: Always convert seconds to milliseconds before sending to the API.

```typescript
// Correct formatting for a Transition
const props = {
    "transition-property": "opacity",
    "transition-duration": "200ms", // 👈 Use ms, not s
    "transition-timing-function": "cubic-bezier(0.25, 0.1, 0.25, 1)" // 👈 Inlined value, no var()
};

await style.setProperties(props);

---

## 6. Complex Functions & Expansion Constraints

Webflow's internal parser has specific behaviors when it comes to CSS functions (`calc`, `clamp`, `min`, `max`) and property naming conventions for Layouts.

### UI Panel Syncing (calc/clamp)
Applying complex CSS functions via `setProperties()` (batch) often succeeds in the CSS but fails to update the **Designer UI Panels**. This results in the property showing `0px` or `default` in the right-hand panel even though it is active in the browser.

**✅ Solution:**
Always apply properties containing complex functions individually via `setProperty()`. This forces a UI refresh for that specific control.

```typescript
// Detect complex functions
const isComplex = val.includes("calc(") || val.includes("clamp(");

if (isComplex) {
    // Individual call ensures the UI panel (e.g. Padding) updates from 0px to the calculated value
    await style.setProperty(prop, val);
}
```

### Layout Shorthands & Property Naming
When expanding shorthand properties like `padding` or `margin` that contain complex expressions, the constituent parts (e.g., `padding-top`) must be correctly tokensized even if they contain nested parentheses.

**⚠️ Property Name Quirk (Grid Gaps):**
While modern CSS uses `row-gap` and `column-gap`, the Webflow Designer API (v2) still requires `grid-row-gap` and `grid-column-gap` for reliable layout application in many contexts. Using the standard `row-gap` can result in the property being ignored or incorrectly mapped.

**✅ Solution:**
1. Use robust regex to tokensize shorthands containing nested parentheses: `val.match(/(?:[^\s(]+|\((?:[^()]+|\([^()]*\))*\))+/g)`.
2. Stick to `grid-row-gap` and `grid-column-gap` for Grid container styling.

# Webflow Designer API Reference (v2)

> This document provides a reference for key Webflow Designer API v2 methods used in this project.

## **`webflow.getAllStyles()`**

Retrieve all Styles (Classes) present on the Webflow site.

### Syntax
```typescript
webflow.getAllStyles(): Promise<Array<Style>>
```

### Returns
**Promise<Array<Style>>**
A Promise that resolves to an array of Style objects.

---

## **`style.getProperties(options?)`**

Retrieves the CSS properties of the specified Style Object. You can filter by breakpoint or pseudo-state.

### Syntax
```typescript
style.getProperties(
  options?: {
    breakpoint?: "xxl" | "xl" | "large" | "main" | "medium" | "small" | "tiny",
    pseudo?: "noPseudo" | "nth-child(odd)" | "nth-child(even)" | "first-child" | "last-child" | "hover" | "active" | "pressed" | "visited" | "focus" | "focus-visible" | "focus-within" | "placeholder" | "empty" | "before" | "after"
  }
): Promise<Record<string, string>>
```

### Returns
**Promise<Record<string, string>>**
A dictionary of style properties and their values.

---

## **`webflow.createVariableCollection(name)`**

Creates a new variable collection with the given name.

### Syntax
```typescript
webflow.createVariableCollection(collectionName: string): Promise<VariableCollection>
```

### Example
```typescript
const collection = await webflow.createVariableCollection("My Collection");
```

---

## **`collection.createVariableMode(name)`**

Creates a new variable mode for the collection. Modes are always created as 'Manual'.

### Syntax
```typescript
collection.createVariableMode(name: string): Promise<VariableMode>
```

### Example
```typescript
const variableMode = await collection.createVariableMode("Dark Mode");
```

---

## **`variable.set(value, options?)`**

Sets a value for a variable, optionally for a specific mode. Passing `null` resets to default.

### Syntax
```typescript
variable.set(
  value: any, 
  options?: { mode: VariableMode }
): Promise<null>
```

### Example
```typescript
// Set mode-specific value
await colorVariable.set("#FFF", { mode: variableMode });

// Reset mode-specific value back to default
await colorVariable.set(null, { mode: variableMode });
```

---

## **`webflow.getAllVariableCollections()`**

Retrieves all variable collections for a site.

### Syntax
```typescript
webflow.getAllVariableCollections(): Promise<Array<VariableCollection>>
```

---

## **`collection.getAllVariableModes()`**

Retrieves all variable modes in a collection.

### Syntax
```typescript
collection.getAllVariableModes(): Promise<Array<VariableMode>>
```

---

## **`webflow.getDefaultVariableCollection()`**

Retrieves the default variable collection. The default collection is the first variable collection created with your site.

### Syntax
```typescript
webflow.getDefaultVariableCollection(): Promise<null | VariableCollection>;
```

### Returns
**Promise\<*VariableCollection*>**
A Promise that resolves to the default Variable Collection or null if not found.

### Example
```typescript
// Get Collection
const defaultVariableCollection = await webflow.getDefaultVariableCollection();

// Fetch all variables within the default collection
const variables = await defaultVariableCollection?.getAllVariables();
```

---

## **Validation Rules (Publish Blockers)**

These patterns are known to cause Webflow publishing failures or UI corruption and should be audited regularly:

1. **Unsupported Functions**: `color-mix()` is NOT supported by the Webflow validator.
2. **Broken Parentheses**: Unbalanced `(` or `)` in `calc()`, `var()`, or `clamp()` expressions.
3. **Garbage Fragments**: 
   - Lone `*` or `)` values.
   - Corrupt coordinate strings (e.g., duplicated `rgba(0, 0, 0, 0)` with excess zeros).
4. **Logical Properties**: Properties like `padding-inline`, `margin-block` should be expanded to physical equivalents (`padding-left`, etc.) for Variable compatibility.
5. **Transition Variables**: Custom properties (`--var`) in `transition-property` usually fail to map correctly in the native UI.

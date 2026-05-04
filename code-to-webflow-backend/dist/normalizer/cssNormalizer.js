/**
 * cssNormalizer.ts
 *
 * All CSS property transformations that previously happened at runtime in the
 * Webflow Designer extension frontend. By running these at parse time we ship
 * a clean, normalized JSON that the frontend can apply directly without any
 * regex work or property-level decisions.
 *
 * Pipeline (runs in order on every property map):
 *   1. camelCase → kebab-case
 *   2. Vendor prefix stripping (keep `backdrop-filter`, drop the rest)
 *   3. `background` shorthand → `background-color` or `background-image`
 *   4. `gap` → `row-gap` + `column-gap`
 *   5. Remove CSS custom properties (`--*`) that Webflow cannot accept
 *   6. `--tw-*` chain resolution using a provided variable lookup map
 *
 * None of this code calls the Webflow API — it is pure, synchronous,
 * and safe to run in Node.js during backend parsing.
 */
// ------------------------------------
// 1. camelCase → kebab-case
// ------------------------------------
function camelToKebab(key) {
    return key.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}
// ------------------------------------
// 2. Vendor prefix resolution
// ------------------------------------
function resolveVendorPrefix(key) {
    if (key.startsWith("-webkit-") ||
        key.startsWith("-moz-") ||
        key.startsWith("-ms-") ||
        key.startsWith("-o-")) {
        const standard = key.replace(/^-(webkit|moz|ms|o)-/, "");
        // Standardize specific ones we know Webflow prefers in standard form
        if (standard === "backdrop-filter")
            return standard;
        if (standard === "appearance")
            return standard;
        if (standard === "user-select")
            return standard;
        // For everything else, keep the prefixed version so it can be applied as a custom property in Webflow
        return key;
    }
    return key; // Unchanged
}
// ------------------------------------
// 3. `background` shorthand split
// ------------------------------------
function resolveBackground(value) {
    const isImage = value.includes("gradient(") || value.includes("url(");
    return { key: !isImage ? "background-color" : "background-image", value };
}
// ------------------------------------
// 4. `gap` preserved as shorthand
// ------------------------------------
function splitGap(value) {
    const trimmed = value.trim();
    // split spaces but not inside parentheses (e.g. var() or calc() or clamp())
    const parts = trimmed.match(/(?:[^\s(]+|\((?:[^()]+|\([^()]*\))*\))+/g);
    if (parts && parts.length > 1) {
        const row = parts[0];
        const col = parts[1] || parts[0];
        return {
            "grid-row-gap": row,
            "grid-column-gap": col,
        };
    }
    return { "grid-row-gap": trimmed, "grid-column-gap": trimmed };
}
// ------------------------------------
// 4b. Webflow Required Expansions
// Webflow Designer API custom property panels will be used if we don't map
// padding, margin, border, border-radius directly to their sub-properties.
// ------------------------------------
function expandPaddingMargin(key, val) {
    // split spaces but not inside parentheses (e.g. var() or calc())
    // handles nested parentheses for calc(var(--x) * 1.5)
    const parts = val.match(/(?:[^\s(]+|\((?:[^()]+|\([^()]*\))*\))+/g);
    if (!parts)
        return { [key]: val };
    const [t, r = t, b = t, l = r] = parts;
    return {
        [`${key}-top`]: t,
        [`${key}-right`]: r,
        [`${key}-bottom`]: b,
        [`${key}-left`]: l,
    };
}
function expandBorderRadius(val) {
    const parts = val.match(/(?:[^\s(]+|\((?:[^()]+|\([^()]*\))*\))+/g);
    if (!parts || val.includes("/"))
        return { "border-radius": val };
    const [tl, tr = tl, br = tl, bl = tr] = parts;
    return {
        "border-top-left-radius": tl,
        "border-top-right-radius": tr,
        "border-bottom-right-radius": br,
        "border-bottom-left-radius": bl,
    };
}
function expandBorder(val, side) {
    const parts = val.match(/(?:[^\s(]+|\((?:[^()]+|\([^()]*\))*\))+/g);
    if (!parts)
        return null;
    let width, style, color;
    parts.forEach((p) => {
        if (["solid", "dashed", "dotted", "none", "hidden"].includes(p))
            style = p;
        else if (p.match(/^(#|rgb|hsl|transparent|currentColor)/))
            color = p;
        else if (p.match(/^(0|0px|0rem|0em|[1-9]\d*(?:\.\d+)?(?:px|rem|em|vw|vh|%))$/))
            width = p;
        else if (p.includes("var(")) {
            // Heuristic for variable identification in border shorthand
            if (p.includes("color") ||
                p.includes("bg") ||
                p.includes("brand") ||
                p.includes("palette"))
                color = p;
            else if (p.includes("width") ||
                p.includes("size") ||
                p.includes("spacing") ||
                p.includes("border"))
                width = p;
            else if (!color)
                color = p;
            else if (!width)
                width = p;
        }
    });
    const res = {};
    const sides = side ? [side] : ["top", "right", "bottom", "left"];
    sides.forEach((s) => {
        if (width)
            res[`border-${s}-width`] = width;
        if (style)
            res[`border-${s}-style`] = style;
        if (color)
            res[`border-${s}-color`] = color;
    });
    return Object.keys(res).length > 0 ? res : null;
}
// ------------------------------------
// 4c. Hex alpha normalization
// Webflow does not support #RGBA or #RRGGBBAA.
// ------------------------------------
export function normalizeHexAlpha(value) {
    return value.replace(/#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g, (match) => {
        const hex = match.substring(1);
        // 3 or 6 digits are opaque, Webflow supports these
        if (hex.length === 3 || hex.length === 6)
            return match;
        // 8-digit #RRGGBBAA
        if (hex.length === 8) {
            const r = parseInt(hex.substring(0, 2), 16);
            const g = parseInt(hex.substring(2, 4), 16);
            const b = parseInt(hex.substring(4, 6), 16);
            const a = (parseInt(hex.substring(6, 8), 16) / 255).toFixed(3);
            const alpha = parseFloat(a);
            return alpha === 1
                ? `#${hex.substring(0, 6)}`
                : `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }
        // 4-digit #RGBA
        if (hex.length === 4) {
            const r = parseInt(hex[0] + hex[0], 16);
            const g = parseInt(hex[1] + hex[1], 16);
            const b = parseInt(hex[2] + hex[2], 16);
            const a = (parseInt(hex[3] + hex[3], 16) / 255).toFixed(3);
            const alpha = parseFloat(a);
            const rgbHex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
            return alpha === 1
                ? `#${rgbHex}`
                : `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }
        return match;
    });
}
// ------------------------------------
// 4d. Grid Template Normalization
// Webflow's Designer UI doesn't always handle CSS `repeat()` well in the
// columns/rows fields. We expand them to explicit values (repeat(3, 1fr) -> 1fr 1fr 1fr).
// ------------------------------------
function normalizeGridTemplate(value) {
    if (!value.includes("repeat("))
        return value;
    let result = value;
    // Use a loop to handle potential nested or multiple repeat() calls
    let iterations = 0;
    while (result.includes("repeat(") && iterations < 5) {
        // More robust regex to handle units with their own parentheses like var() or calc()
        const next = result.replace(/repeat\((\d+),\s*([^()]*(?:\([^()]*\)[^()]*)*)\)/g, (_, count, unit) => {
            const n = parseInt(count);
            if (isNaN(n))
                return _;
            return new Array(n).fill(unit.trim()).join(" ");
        });
        if (next === result)
            break;
        result = next;
        iterations++;
    }
    return result;
}
function splitGridTemplate(value) {
    const trimmed = value.trim();
    if (trimmed.includes("/")) {
        const [rows, columns] = trimmed.split("/").map((s) => s.trim());
        return {
            "grid-template-rows": normalizeGridTemplate(rows),
            "grid-template-columns": normalizeGridTemplate(columns),
        };
    }
    // If no slash, assume it's just columns for simplicity in many common cases,
    // but the UI usually prefers explicit rows/cols.
    return {
        "grid-template-columns": normalizeGridTemplate(trimmed),
    };
}
/**
 * Normalizes a map of CSS properties:
 * - Applies the full pipeline described above
 * - Resolves `--tw-*` references using the provided variable map
 *
 * @param properties  Raw CSS property map (camelCase or kebab, with any vendor prefixes)
 * @param varMap      Optional flat map of CSS variable name → resolved value (e.g. "--tw-shadow" → "0 4px 6px …")
 */
export function normalizeCssProperties(properties, varMap = {}) {
    const out = {};
    for (const [rawKey, rawValue] of Object.entries(properties)) {
        if (rawValue === undefined || rawValue === null)
            continue;
        const cleanedVal = typeof rawValue === "string"
            ? rawValue.replace(/\s+/g, " ").trim()
            : String(rawValue);
        // Step 0: Color normalization (Hex Alpha -> RGBA)
        const val = normalizeHexAlpha(cleanedVal);
        // Step 1: camelCase → kebab
        let key = camelToKebab(rawKey);
        // Preserve CSS custom properties that are intentional (like var refs) but don't normalize them
        if (key.startsWith("--")) {
            // Custom properties: skip entirely — Webflow can't apply them to elements,
            // and they should already be in the variables collection.
            continue;
        }
        // Step 2: Vendor prefix
        const resolved = resolveVendorPrefix(key);
        if (resolved === null)
            continue; // Skip unsupported prefixed prop
        key = resolved;
        // Step 3: background shorthand
        if (key === "background") {
            const { key: bgKey, value: bgVal } = resolveBackground(val);
            out[bgKey] = bgVal;
            continue;
        }
        // Step 4: gap split
        if (key === "gap") {
            Object.assign(out, splitGap(val));
            continue;
        }
        if (key === "row-gap" || key === "grid-row-gap") {
            out["grid-row-gap"] = val;
            continue;
        }
        if (key === "column-gap" || key === "grid-column-gap") {
            out["grid-column-gap"] = val;
            continue;
        }
        // Step 4b: padding/margin/border expansion
        if (key === "padding" || key === "margin") {
            Object.assign(out, expandPaddingMargin(key, val));
            continue;
        }
        // Step 4b-ii: CSS logical properties → physical equivalents
        // Webflow does not support margin-inline, padding-inline, margin-block, padding-block.
        // Split "X Y" → start/end, single value → both sides.
        if (key === "margin-inline" || key === "padding-inline") {
            const base = key.startsWith("margin") ? "margin" : "padding";
            const parts = val.match(/(?:[^\s(]+|\((?:[^()]+|\([^()]*\))*\))+/g) || [val];
            const [start, end = start] = parts;
            out[`${base}-left`] = start;
            out[`${base}-right`] = end;
            continue;
        }
        if (key === "margin-block" || key === "padding-block") {
            const base = key.startsWith("margin") ? "margin" : "padding";
            const parts = val.match(/(?:[^\s(]+|\((?:[^()]+|\([^()]*\))*\))+/g) || [val];
            const [start, end = start] = parts;
            out[`${base}-top`] = start;
            out[`${base}-bottom`] = end;
            continue;
        }
        if (key === "margin-inline-start") {
            out["margin-left"] = val;
            continue;
        }
        if (key === "margin-inline-end") {
            out["margin-right"] = val;
            continue;
        }
        if (key === "margin-block-start") {
            out["margin-top"] = val;
            continue;
        }
        if (key === "margin-block-end") {
            out["margin-bottom"] = val;
            continue;
        }
        if (key === "padding-inline-start") {
            out["padding-left"] = val;
            continue;
        }
        if (key === "padding-inline-end") {
            out["padding-right"] = val;
            continue;
        }
        if (key === "padding-block-start") {
            out["padding-top"] = val;
            continue;
        }
        if (key === "padding-block-end") {
            out["padding-bottom"] = val;
            continue;
        }
        if (key.startsWith("border")) {
            if (key === "border" ||
                key === "border-top" ||
                key === "border-right" ||
                key === "border-bottom" ||
                key === "border-left") {
                const side = key === "border" ? undefined : key.replace("border-", "");
                const bRes = expandBorder(val, side);
                if (bRes)
                    Object.assign(out, bRes);
            }
            else if (key === "border-radius") {
                Object.assign(out, expandBorderRadius(val));
            }
            else if (key === "border-color") {
                out["border-top-color"] = val;
                out["border-right-color"] = val;
                out["border-bottom-color"] = val;
                out["border-left-color"] = val;
            }
            else if (key === "border-width") {
                out["border-top-width"] = val;
                out["border-right-width"] = val;
                out["border-bottom-width"] = val;
                out["border-left-width"] = val;
            }
            else if (key === "border-style") {
                out["border-top-style"] = val;
                out["border-right-style"] = val;
                out["border-bottom-style"] = val;
                out["border-left-style"] = val;
            }
            else {
                out[key] = val; // let specific border-top-* pass through
            }
            continue;
        }
        // Step 4d: Grid normalization
        if (key === "grid-template") {
            Object.assign(out, splitGridTemplate(val));
            continue;
        }
        if (key === "grid-template-columns" ||
            key === "grid-template-rows" ||
            key === "grid-template-column" ||
            key === "grid-template-row") {
            const pluralKey = key.endsWith("s") ? key : `${key}s`;
            out[pluralKey] = normalizeGridTemplate(val);
            continue;
        }
        out[key] = val;
    }
    // Step 6: Resolve --tw-* variable chains
    // Tailwind v4 emits e.g. `box-shadow: var(--tw-shadow)` and defines
    // `--tw-shadow` in the universal `*,:before,:after` rule. We resolve
    // those to their final computed values so the frontend never sees them.
    for (const [prop, val] of Object.entries(out)) {
        if (typeof val === "string" && val.includes("var(--tw-")) {
            out[prop] = val.replace(/var\((--tw-[^,)]+)(?:,\s*([^)]*))?\)/g, (match, varName, fallback) => {
                if (varMap[varName])
                    return varMap[varName];
                return fallback?.trim() || "0 0 #0000"; // Tailwind default empty-shadow
            });
        }
    }
    // Step 7: Webflow-specific Grid Defaults
    // If columns are defined but rows are not, Webflow often performs better
    // if we explicitly set grid-template-rows to auto.
    if (out["grid-template-columns"] && !out["grid-template-rows"]) {
        out["grid-template-rows"] = "auto";
    }
    return out;
}
// ------------------------------------
// Complex selector pre-resolution
// ------------------------------------
/**
 * Resolves complex (descendant / tag child) CSS selectors into the nodes they target.
 *
 * For each selector like `.aether-nav-links a` or `.nav span`:
 *   - Walk every node in the tree
 *   - If the node matches the right-hand part AND has the correct ancestor class,
 *     merge the selector's styles into the node's own `styles` map.
 *
 * This eliminates the entire `matchesComplexSelector()` runtime traversal in the frontend.
 *
 * @param complexSelectors  Map of selector → normalized style map (breakpoint-keyed)
 * @param nodes             Array of top-level nodes to traverse
 * @returns                 The same nodes array (mutated in place for efficiency)
 */
export function resolveComplexSelectors(complexSelectors, nodes) {
    // Walk tree with each node's ancestor class list
    function walk(node, ancestorClasses) {
        // Check every complex selector against this node
        for (const [selector, bpStyles] of Object.entries(complexSelectors)) {
            const [baseSelector, pseudo] = selector.split(":");
            if (matches(node, ancestorClasses, baseSelector.trim())) {
                // Merge the main breakpoint styles into node.styles
                const mainProps = bpStyles.main || bpStyles;
                if (mainProps && typeof mainProps === "object") {
                    if (!pseudo) {
                        node.styles = { ...(node.styles || {}), ...mainProps };
                    }
                    else {
                        node.inlinePseudoStyles = node.inlinePseudoStyles || {};
                        node.inlinePseudoStyles[pseudo] = {
                            ...(node.inlinePseudoStyles[pseudo] || {}),
                            ...mainProps,
                        };
                    }
                }
            }
        }
        // Walk children with updated ancestry
        const newAncestry = [...ancestorClasses, node.classes || []];
        for (const child of node.children || []) {
            walk(child, newAncestry);
        }
    }
    for (const node of nodes) {
        walk(node, []);
    }
    return nodes;
}
/**
 * Checks if a node matches a CSS simple/descendant selector part.
 * Supports: `.class`, `tag`, `.parent .child`, `.parent tag`
 */
function matches(node, ancestorClasses, selector) {
    const parts = selector.split(/\s+/).filter(Boolean);
    if (parts.length === 0)
        return false;
    if (parts.length === 1) {
        return matchesSingle(node, parts[0]);
    }
    if (parts.length === 2) {
        const [parentPart, childPart] = parts;
        if (!matchesSingle(node, childPart))
            return false;
        // Check ancestors
        if (parentPart.startsWith(".")) {
            const parentClass = parentPart.substring(1);
            return ancestorClasses.some((classList) => classList.includes(parentClass));
        }
        // Tag-based parent — less common, skip for now
        return false;
    }
    // 3-part selectors (e.g. `.a .b span`) — not handled, skip
    return false;
}
function matchesSingle(node, selector) {
    if (selector.startsWith(".")) {
        const selectorClasses = selector.split(".").filter(Boolean);
        return selectorClasses.every((c) => (node.classes || []).includes(c));
    }
    // Tag or type match
    const lower = selector.toLowerCase();
    if (node.tag?.toLowerCase() === lower)
        return true;
    if (node.type.toLowerCase() === lower)
        return true;
    // Common aliases
    if (lower === "a" && node.type === "Link")
        return true;
    if (lower === "img" && node.type === "Image")
        return true;
    if (lower === "li" && node.type === "ListItem")
        return true;
    if ((lower === "ul" || lower === "ol") && node.type === "List")
        return true;
    return false;
}
// ------------------------------------
// Tailwind universal variable extractor
// ------------------------------------
/**
 * Extracts the `--tw-*` variable definitions from the universal selector
 * (`*,:before,:after` or `*,::before,::after`) in the global styles map.
 *
 * These are used to resolve Tailwind's internal CSS variable chains.
 *
 * @param globalStyles  The full globalStyles map from the parsed document
 * @returns             A flat { "--tw-varname": "value" } map
 */
export function extractTailwindVarMap(globalStyles) {
    const map = {};
    for (const [selector, bpStyles] of Object.entries(globalStyles)) {
        const isUniversal = selector.startsWith("*") ||
            selector === ":root" ||
            selector.includes("::before") ||
            selector.includes(":before");
        if (!isUniversal)
            continue;
        const mainProps = bpStyles.main || bpStyles;
        if (!mainProps || typeof mainProps !== "object")
            continue;
        for (const [prop, val] of Object.entries(mainProps)) {
            if (prop.startsWith("--")) {
                map[prop] = val;
            }
        }
    }
    return map;
}

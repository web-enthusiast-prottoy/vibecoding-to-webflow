// ============================================================
// Code to Webflow — Designer Extension
// Paste AI-generated JSON to build Webflow element trees
// ============================================================
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
// ------------------------------------
// V1 Legacy Safety Shim
// v2 JSON from the backend is already fully normalized.
// This shim handles any old (v1) files that may still be pasted manually.
// ------------------------------------
// ------------------------------------
/**
 * Expands CSS shorthands into their constituent parts for the Webflow API.
 * This ensures properties like 'border-bottom' or 'padding' hit the native panels.
 */
function expandProperties(properties) {
    const expanded = {};
    for (let [key, val] of Object.entries(properties)) {
        if (val === null || val === undefined)
            continue;
        const value = String(val).trim();
        // 1. Padding/Margin expansion
        // SHIM: Avoid re-splitting if the key is already a constituent part (padding-top, etc)
        // or if the value has no spaces outside of parentheses.
        if ((key === "padding" || key === "margin") && !key.includes("-")) {
            // split spaces but not inside parentheses (e.g. var() or calc())
            const parts = value.match(/(?:[^\s(]+|\((?:[^()]+|\([^()]*\))*\))+/g);
            if (!parts) {
                expanded[key] = value;
                continue;
            }
            if (parts.length === 1) {
                expanded[`${key}-top`] = parts[0];
                expanded[`${key}-right`] = parts[0];
                expanded[`${key}-bottom`] = parts[0];
                expanded[`${key}-left`] = parts[0];
            }
            else if (parts.length === 2) {
                expanded[`${key}-top`] = parts[0];
                expanded[`${key}-right`] = parts[1];
                expanded[`${key}-bottom`] = parts[0];
                expanded[`${key}-left`] = parts[1];
            }
            else if (parts.length === 3) {
                expanded[`${key}-top`] = parts[0];
                expanded[`${key}-right`] = parts[1];
                expanded[`${key}-bottom`] = parts[2];
                expanded[`${key}-left`] = parts[1];
            }
            else if (parts.length === 4) {
                expanded[`${key}-top`] = parts[0];
                expanded[`${key}-right`] = parts[1];
                expanded[`${key}-bottom`] = parts[2];
                expanded[`${key}-left`] = parts[3];
            }
            continue;
        }
        // 2. Border expansion (e.g. border: 1px solid red or border-bottom: 1px solid red)
        if (key.match(/^border-(top|right|bottom|left)$/) || key === "border") {
            const parts = value.split(/\s+(?![^()]*\))/).filter(Boolean);
            // Simple parser for "1px solid red" or "1px solid var(--color)"
            let width, style, color;
            for (const part of parts) {
                if (part.match(/^(solid|dashed|dotted|double|none|hidden)$/)) {
                    style = part;
                }
                else if (part.match(/^(thin|medium|thick|[0-9.]+(px|em|rem|%|vh|vw|pt))$/) ||
                    part === "0") {
                    width = part;
                }
                else {
                    // If it doesn't match a style or a known unit, treat it as a color (includes vars, rgb, etc)
                    color = part;
                }
            }
            if (key === "border") {
                // Apply to all sides using global properties
                if (width)
                    expanded[`border-width`] = width;
                if (style)
                    expanded[`border-style`] = style;
                if (color)
                    expanded[`border-color`] = color;
            }
            else {
                // For single sides, the user reports shorthand works better/is expected
                expanded[key] = value;
            }
            continue;
        }
        // 3. Gap shorthand (preserved)
        if (key === "gap") {
            expanded["gap"] = value;
            continue;
        }
        // 4. Background shorthand (simple color check)
        if (key === "background") {
            const isColor = /^(#|rgb|hsl|[a-zA-Z]+$)/.test(value) &&
                !value.includes("gradient(") &&
                !value.includes("url(");
            expanded[isColor ? "background-color" : "background-image"] = value;
            continue;
        }
        // 5. Transition expansion
        if (key === "transition") {
            const chunks = value.split(/,(?![^()]*\))/).map((s) => s.trim());
            const properties = [];
            const durations = [];
            const timingFunctions = [];
            const delays = [];
            for (const chunk of chunks) {
                const tokens = chunk
                    .split(/\s+(?![^()]*\))/)
                    .map((s) => s.trim())
                    .filter(Boolean);
                let prop = "all";
                let dur = "0s";
                let timing = "ease";
                let del = "0s";
                let timeCount = 0;
                for (const token of tokens) {
                    if (/^\.?\d+(s|ms)$/.test(token) ||
                        /^\d+\.?\d*(s|ms)$/.test(token)) {
                        if (timeCount === 0) {
                            dur = token;
                            timeCount++;
                        }
                        else {
                            del = token;
                        }
                    }
                    else if (/^(ease|linear|step|cubic-bezier|var\()/.test(token)) {
                        timing = token;
                    }
                    else {
                        prop = token;
                    }
                }
                const toMs = (val) => {
                    if (val.endsWith("ms"))
                        return val;
                    if (val.endsWith("s")) {
                        const num = parseFloat(val);
                        return isNaN(num) ? val : `${Math.round(num * 1000)}ms`;
                    }
                    return val;
                };
                properties.push(prop);
                durations.push(toMs(dur));
                timingFunctions.push(timing);
                delays.push(toMs(del));
            }
            expanded["transition-property"] = properties.join(", ");
            expanded["transition-duration"] = durations.join(", ");
            expanded["transition-timing-function"] = timingFunctions.join(", ");
            if (delays.some((d) => d !== "0s" && d !== "0ms")) {
                expanded["transition-delay"] = delays.join(", ");
            }
            continue;
        }
        expanded[key] = val;
    }
    return expanded;
}
function normalizePropertiesLegacy(properties) {
    const out = {};
    for (const [rawKey, rawValue] of Object.entries(properties)) {
        const val = typeof rawValue === "string"
            ? rawValue.replace(/\s+/g, " ").trim()
            : String(rawValue);
        let key = rawKey.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
        if (key.startsWith("--"))
            continue;
        if (key.startsWith("-webkit-") ||
            key.startsWith("-moz-") ||
            key.startsWith("-ms-") ||
            key.startsWith("-o-")) {
            const std = key.replace(/^-(webkit|moz|ms|o)-/, "");
            if (std === "backdrop-filter") {
                key = std;
            }
            else {
                continue;
            }
        }
        out[key] = val;
    }
    // Run through expansion to handle shorthands
    return expandProperties(out);
}
// ------------------------------------
// Helpers
// ------------------------------------
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
/**
 * Wraps a promise with a timeout.
 * Useful for Webflow Designer API calls that might hang the IPC bridge.
 */
function withTimeout(promise, timeoutMs, label) {
    return __awaiter(this, void 0, void 0, function* () {
        let timeoutId;
        const timeoutPromise = new Promise((_, reject) => {
            timeoutId = setTimeout(() => {
                reject(new Error(`Operation timed out after ${timeoutMs}ms: ${label}`));
            }, timeoutMs);
        });
        try {
            return yield Promise.race([promise, timeoutPromise]);
        }
        finally {
            if (timeoutId)
                clearTimeout(timeoutId);
        }
    });
}
const DEFAULT_TIMEOUT = 6000; // Fail-fast: deadlocks don't resolve with more time
function handleStyleError(err, property) {
    var _a;
    const causeTag = (_a = err === null || err === void 0 ? void 0 : err.cause) === null || _a === void 0 ? void 0 : _a.tag;
    const message = (err === null || err === void 0 ? void 0 : err.message) || "";
    console.error(`Cause: ${causeTag}`);
    console.error(`Message: ${message}`);
    switch (causeTag) {
        case "InvalidStyle":
            webflow.notify({
                type: "Error",
                message: "The style is invalid or not recognized",
            });
            break;
        case "InvalidStyleProperty":
            console.warn(`Property ${property} is invalid or not applicable.`);
            break;
        case "ResourceMissing":
            webflow.notify({
                type: "Error",
                message: "The style resource is missing.",
            });
            break;
        default:
            if (message.toLowerCase().includes("conflict")) {
                // Conflict errors are handled by retry logic, but if they persist:
                webflow.notify({
                    type: "Error",
                    message: "Style conflict detected in the store. Try again.",
                });
            }
            else {
                webflow.notify({
                    type: "Error",
                    message: "An error occurred with styles.",
                });
            }
    }
}
// Cache for created/existing variables, bindings, and raw values
// Stores: { variable: Variable, binding: string, rawValue: any, type: string, cssName: string }
const variableCache = new Map();
const allStylesMap = new Map();
/**
 * Robustly tries to find a variable in the cache by name or CSS var name.
 * Handles variations like '--name', 'name', case sensitivity, and Webflow folder prefixes.
 *
 * Matching order:
 * 1. Exact match
 * 2. Case-insensitive match
 * 3. Strip leading '--' and retry
 * 4. Add leading '--' and retry
 * 5. Word-based fuzzy match: every word in the JSON var name must be present
 *    in the candidate's word list (handles Webflow folder prefixes like
 *    font-family-font-styles-heading matching font-styles-heading).
 *    Among multiple candidates, the one with the fewest extra words wins.
 */
function tryResolveVariable(rawName) {
    const name = rawName.trim();
    // 1. Exact match
    if (variableCache.has(name))
        return variableCache.get(name);
    const lower = name.toLowerCase();
    // 2. Case-insensitive match
    if (variableCache.has(lower))
        return variableCache.get(lower);
    // Strip leading '--'
    const stripped = lower.replace(/^--/, "");
    // 3. Without leading dashes
    if (variableCache.has(stripped))
        return variableCache.get(stripped);
    // 4. With leading dashes
    if (variableCache.has(`--${stripped}`))
        return variableCache.get(`--${stripped}`);
    // 5. Word-based fuzzy match
    // Split the JSON var name into its constituent words (split on '-')
    const queryWords = stripped.split("-").filter(Boolean);
    if (queryWords.length === 0)
        return null;
    let bestMatch = null;
    let bestExtraWords = Infinity;
    for (const [key, value] of variableCache) {
        // Normalise the cache key: strip leading '--', lowercase
        const keyNorm = key.toLowerCase().replace(/^--/, "");
        const keyWords = keyNorm.split("-").filter(Boolean);
        // All query words must be present in the key's word list (order-independent)
        // We consume words one-by-one so duplicates are handled correctly.
        const remaining = [...keyWords];
        const allPresent = queryWords.every((qw) => {
            const idx = remaining.indexOf(qw);
            if (idx === -1)
                return false;
            remaining.splice(idx, 1);
            return true;
        });
        if (!allPresent)
            continue;
        // Prefer candidate with fewest extra words (closest match)
        const extraWords = keyWords.length - queryWords.length;
        if (extraWords < bestExtraWords) {
            bestExtraWords = extraWords;
            bestMatch = value;
        }
    }
    return bestMatch;
}
/**
 * SHIM: Webflow V2 API does not provide getStyleByName.
 * We use a pre-fetched map of styles for efficient lookups.
 */
function getStyleByName(name) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        return (_a = allStylesMap.get(name.trim())) !== null && _a !== void 0 ? _a : null;
    });
}
// (System Fluid collection logic removed)
// ------------------------------------
/**
 * Normalizes CSS pseudo-states to Webflow-supported ones.
 * Webflow only supports a specific list; unsupported ones (like nth-child(4n)) cause API errors.
 */
function normalizePseudo(rawPseudo) {
    if (!rawPseudo || rawPseudo === "noPseudo")
        return "noPseudo";
    // List of pseudo-states natively supported by the Webflow Designer API
    const supported = [
        "nth-child(odd)",
        "nth-child(even)",
        "first-child",
        "last-child",
        "disabled",
        "hover",
        "active",
        "pressed",
        "visited",
        "focus",
        "focus-visible",
        "focus-within",
        "placeholder",
        "empty",
        "before",
        "after",
        "lang",
        "data",
    ];
    // Exact match check
    if (supported.includes(rawPseudo))
        return rawPseudo;
    const lower = rawPseudo.toLowerCase();
    // If the pseudo contains spaces, it's a descendant selector (e.g. ":hover .child")
    // Webflow doesn't support applying this natively.
    if (rawPseudo.trim().includes(" "))
        return "unsupported";
    // 1. Hover/Focus variants
    if (lower === "hover")
        return "hover";
    if (lower === "focus-visible")
        return "focus-visible";
    if (lower === "focus-within")
        return "focus-within";
    if (lower === "focus")
        return "focus";
    // 2. Child variants
    if (lower === "first-child")
        return "first-child";
    if (lower === "last-child")
        return "last-child";
    // 3. Nth-child logic (Webflow only supports odd/even)
    if (lower.includes("nth-child")) {
        if (lower.includes("even") || lower.includes("(2n)"))
            return "nth-child(even)";
        if (lower.includes("odd"))
            return "nth-child(odd)";
        if (lower.includes("(1)"))
            return "first-child";
        // Unsupported nth-child expressions
        return "unsupported";
    }
    if (supported.includes(lower))
        return lower;
    return "unsupported";
}
function applyStyleProperties(style_1, properties_1, options_1) {
    return __awaiter(this, arguments, void 0, function* (style, properties, options, isLegacy = false, elementRef) {
        var _a, _b, _c, _d;
        const styleName = yield style.getName();
        const pseudo = normalizePseudo(options === null || options === void 0 ? void 0 : options.pseudo);
        const hasPseudo = pseudo !== "noPseudo";
        const styleLabel = hasPseudo ? `.${styleName}:${pseudo}` : `.${styleName}`;
        // 3. Build Webflow API options — STRICT: only documented keys allowed.
        // Using the actual Webflow typings: `{ breakpoint?: BreakpointId, pseudo?: PseudoStateKey }`.
        const bp = (options === null || options === void 0 ? void 0 : options.breakpointId) || "main";
        // Build options object with ONLY valid keys. Use undefined (no options) when possible
        // so the no-options setProperty/setProperties path is exercised for the common case.
        const wfOptions = bp !== "main" || hasPseudo
            ? Object.assign(Object.assign({}, (bp !== "main" ? { breakpoint: bp } : {})), (hasPseudo ? { pseudo: pseudo } : {})) : undefined;
        // 1. Expand properties (padding, margin, transitions, etc).
        // We run this unconditionally even on v2 normalized payloads because the backend parser currently
        // fails to split shorthand transitions, which Webflow cannot insert as a block.
        const props = isLegacy
            ? normalizePropertiesLegacy(properties)
            : expandProperties(properties);
        if (pseudo === "unsupported") {
            const cssLines = Object.entries(props).map(([k, v]) => `  ${k}: ${v};`).join("\n");
            const pseudoSuffix = options.pseudo.startsWith(":") ? options.pseudo : `:${options.pseudo}`;
            const cssText = `.${styleName}${pseudoSuffix} {\n${cssLines}\n}`;
            recordUnsupportedCss({
                className: styleName,
                pseudo: options.pseudo,
                cssText
            });
            return false;
        }
        const CHUNK_SIZE = 5; // Reduced from 15 to 5 to avoid IPC bridge congestion
        let success = true;
        const paddingGroup = {};
        const marginGroup = {};
        const GRID_ISOLATED_PROPS = new Set([
            "grid-template-columns",
            "grid-template-rows",
            "grid-row-gap",
            "grid-column-gap",
            "grid-gap",
            "row-gap",
            "column-gap",
            "gap",
        ]);
        // 2. Resolve var() references to Webflow native Variable objects (purple pills).
        const resolvedProperties = {};
        for (let [prop, val] of Object.entries(props)) {
            let valueToSet = val;
            let isComplex = false;
            // Map modern gap shorthand/longhands to Webflow's older native API equivalent.
            // Webflow API sometimes drops responsive breakpoints or ignores Purple Pills for 'row-gap'/'column-gap',
            // but correctly respects 'grid-row-gap'/'grid-column-gap' with identical visual result.
            if (prop === "row-gap")
                prop = "grid-row-gap";
            if (prop === "column-gap")
                prop = "grid-column-gap";
            if (prop === "gap")
                prop = "grid-gap";
            const valStr = String(val);
            if (valStr.includes("clamp(") ||
                valStr.includes("calc(") ||
                valStr.includes("min(") ||
                valStr.includes("max(")) {
                // Complex CSS functions must be applied individually to force UI refresh.
                isComplex = true;
            }
            // Webflow API Stability: white-space reliably deadlocks the IPC bridge on many elements.
            // It is better handled via the Global Style Embed.
            if (prop === "white-space")
                continue;
            // Normalized units: '0' should be '0px' for spacing/layout to prevent parser stalls.
            if (val === "0" &&
                [
                    "padding-top",
                    "padding-right",
                    "padding-bottom",
                    "padding-left",
                    "margin-top",
                    "margin-right",
                    "margin-bottom",
                    "margin-left",
                    "width",
                    "height",
                    "top",
                    "right",
                    "bottom",
                    "left",
                ].includes(prop)) {
                valueToSet = "0px";
            }
            if (typeof valueToSet === "string" && valueToSet.includes("var(")) {
                // Strip fallback from var() before cache lookups.
                // e.g. var(--aether-black, #000) → we only want "--aether-black"
                // Webflow variables don't support fallbacks, so we ignore them entirely.
                const extractVarName = (raw) => raw.split(",")[0].trim();
                // Match a value that is ONLY a single var() with optional fallback
                // Allow for spaces and fallbacks: var( --name, fallback )
                const varMatch = valueToSet
                    .trim()
                    .match(/^var\(\s*(--[^,)\s]+)\s*(?:,\s*[^)]+)?\)$/);
                // Extract pure variable name (without fallback or leading/trailing spaces)
                const pureVarName = varMatch ? varMatch[1].trim() : null;
                // Webflow strictly bans 'transition' from custom properties and cannot handle var() natively here.
                // It's safer to completely inline the raw values so complex properties actually work without crashing the API.
                // We only force this for properties that are complex shorthands or have known issues.
                const isShorthandBorder = [
                    "border",
                    "border-top",
                    "border-right",
                    "border-bottom",
                    "border-left",
                    "border-image",
                    "outline",
                ].includes(prop);
                // Grid gap properties were previously thought to deadlock when variable proxy is passed,
                // but only columns/rows crash with Purple Pills. We now allow gap properties to be purple pills.
                const isGridLayout = [
                    "grid-template-columns",
                    "grid-template-rows",
                ].includes(prop);
                // Webflow API IPC Deadlocks:
                // 1. Proxies bound to transition/transform/border shorthands → Designer UI crash.
                // 2. Proxies bound to grid layout props → setProperties timeout (ALL breakpoints, not just pseudo).
                // 3. var() strings with pseudoStateKey options also cause hangs (gotcha §3).
                // SOLUTION: Inline raw numeric/color value for all these contexts.
                const shouldInline = prop.startsWith("transition") ||
                    prop.startsWith("transform") ||
                    isShorthandBorder ||
                    isGridLayout ||
                    hasPseudo;
                if (shouldInline) {
                    valueToSet = valueToSet.replace(/var\(\s*(--[^,)\s]+)\s*(?:,\s*[^)]+)?\)/g, (match, varNameContent) => {
                        const varName = varNameContent.trim();
                        const cached = tryResolveVariable(varName);
                        if (cached && cached.rawValue != null) {
                            const raw = cached.rawValue;
                            if (typeof raw === "string" ||
                                typeof raw === "number")
                                return String(raw);
                            if (raw.value !== undefined && raw.unit)
                                return `${raw.value}${raw.unit}`;
                            if (raw.value !== undefined)
                                return String(raw.value);
                        }
                        // If we can't inline but it's a grid property/pseudo, we log a warning.
                        // We'll keep the var() string in the final value for now, but line 538 will catch it.
                        return match;
                    });
                    // Post-inline safety: if var() is still present after inlining (cache miss)
                    // AND we're in a danger zone (pseudo-state or grid layout), skip the property.
                    // Passing raw var() strings to the API with pseudoStateKey or on grid props
                    // causes an IPC deadlock — it's safer to omit them entirely.
                    if (typeof valueToSet === "string" &&
                        valueToSet.includes("var(") &&
                        (hasPseudo || isGridLayout)) {
                        log(`    ⚠ Skipping ${prop} on ${styleLabel}: var() could not be inlined (cache miss for ${((_a = valueToSet.match(/var\(\s*(--[^,)\s]+)\)/)) === null || _a === void 0 ? void 0 : _a[1]) ||
                            "variable"}) — passing raw var() here would deadlock the IPC bridge`, "warn");
                        continue;
                    }
                }
                else if (pureVarName && !isComplex) {
                    // Simple var() — resolve to native Webflow variable object (purple pill)
                    const cached = tryResolveVariable(pureVarName);
                    // Defensive routing: Only use Variable PROXY objects (purple pills) for main-breakpoint, non-pseudo, non-grid props.
                    // For everything else, the proxy object is the #1 cause of serialization hangs or ignored variables.
                    // Wait: We actually DO need the proxy object for gap properties on responsive states to work correctly.
                    // Since we mapped them to grid-*-gap, Webflow should support the proxy object fully.
                    if (cached &&
                        cached.variable &&
                        !hasPseudo &&
                        !isGridLayout) {
                        valueToSet = cached.variable;
                    }
                    else if (cached && (cached.binding || cached.cssName)) {
                        // Fallback to var() string
                        valueToSet = cached.binding || `var(${cached.cssName})`;
                        isComplex = true;
                    }
                    else {
                        // Cache miss: variable not yet synced from Webflow.
                        log(`    ⚠ Cache miss for ${pureVarName} on ${prop} — applying via setProperty as raw CSS string`, "warn");
                        isComplex = true;
                    }
                }
                else {
                    // Multi-var or complex value — replace each var() reference with Webflow's internal CSS name
                    valueToSet = valueToSet.replace(/var\(\s*(--[^,)\s]+)\s*(?:,\s*[^)]+)?\)/g, (match, varNameContent) => {
                        const varName = varNameContent.trim();
                        const cached = tryResolveVariable(varName);
                        return cached && cached.cssName
                            ? `var(${cached.cssName})`
                            : match;
                    });
                }
            }
            // Spacing sync-lock: padding/margin ALWAYS go into their groups (including complex calc values).
            // All 4 sides are sent together via setProperties() — matching the Webflow playground pattern.
            // '0px' is used for zero-value sides to keep the parser stable (not bare '0').
            if (prop.startsWith("padding-") || prop.startsWith("margin-")) {
                // CRITICAL: Track complex spacing values (clamp/calc) in complexValueEmbeds
                // before hitting the continue statement for grouping. 
                if (isComplex) {
                    recordComplexValue({
                        className: styleName,
                        property: prop,
                        value: String(valueToSet),
                        breakpointId: bp,
                        element: elementRef,
                    });
                }
                if (prop.startsWith("padding-"))
                    paddingGroup[prop] = valueToSet;
                else
                    marginGroup[prop] = valueToSet;
                continue;
            }
            if (GRID_ISOLATED_PROPS.has(prop)) {
                resolvedProperties[`__grid__${prop}`] = valueToSet;
                continue;
            }
            if (isComplex) {
                // Non-spacing complex functions (clamp, calc on other props) applied individually.
                // __complex__ prefix is stripped before calling setProperty (see step 9).
                resolvedProperties[`__complex__${prop}`] = valueToSet;
            }
            else {
                // Only safe, non-complex values are included in the batch for performance.
                resolvedProperties[prop] = valueToSet;
            }
        }
        // 4. Priority Sorting: Apply layout-defining properties first
        // This ensures 'position' is set before 'left/right' and 'display' before 'row-gap'
        const allEntries = Object.entries(resolvedProperties);
        const layoutProps = [
            "display",
            "position",
            "flex-direction",
            "gap",
            "grid-row-gap",
            "grid-column-gap",
            "row-gap",
            "column-gap",
            "grid-template-columns",
            "grid-template-rows",
        ];
        const priorityEntries = allEntries.filter(([k]) => layoutProps.includes(k));
        const remainingEntries = allEntries.filter(([k]) => !layoutProps.includes(k));
        const sortedEntries = [...priorityEntries, ...remainingEntries];
        // 6. Split into four tracks:
        //    - gridEntries: grid-template-columns/rows — high-latency UI items (applied individually)
        //    - complexEntries: clamp/calc/min/max values — flagged for individual UI pings
        //    - plainEntries: safe to batch via setProperties() (unless it's a pseudo-state)
        //    - varEntries: { variableId } objects — MUST be applied one-by-one via setProperty()
        //      Batching { variableId } objects in setProperties() causes IPC serialization timeouts.
        const gridEntries = sortedEntries.filter(([k]) => k.startsWith("__grid__"));
        const complexEntries = sortedEntries.filter(([k]) => k.startsWith("__complex__"));
        const plainEntries = sortedEntries.filter(([k, v]) => !k.startsWith("__complex__") &&
            !k.startsWith("__grid__") &&
            (typeof v !== "object" || v === null));
        const varEntries = sortedEntries.filter(([k, v]) => !k.startsWith("__complex__") &&
            !k.startsWith("__grid__") &&
            typeof v === "object" &&
            v !== null);
        for (let i = 0; i < plainEntries.length; i += CHUNK_SIZE) {
            const chunk = {};
            for (const [k, v] of plainEntries.slice(i, i + CHUNK_SIZE)) {
                chunk[k] = v;
            }
            const chunkProps = Object.keys(chunk).join(", ");
            log(`    → Applying chunk ${Math.floor(i / CHUNK_SIZE) + 1} (${chunkProps}) on ${styleLabel}...`);
            try {
                const setPromise = wfOptions
                    ? style.setProperties(chunk, wfOptions)
                    : style.setProperties(chunk);
                yield withTimeout(setPromise, DEFAULT_TIMEOUT, `setProperties-${chunkProps}`);
            }
            catch (err) {
                log(`    ✕ Chunk ${Math.floor(i / CHUNK_SIZE) + 1} failed for ${styleLabel}: ${err.message}`, "error");
                log(`    › Falling back to per-property for this chunk...`, "warn");
                success = false;
                for (const [prop, val] of Object.entries(chunk)) {
                    log(`      → Fallback: Applying ${prop} on ${styleLabel}...`);
                    try {
                        const p1 = wfOptions
                            ? style.setProperty(prop, val, wfOptions)
                            : style.setProperty(prop, val);
                        // Background images can be extremely slow to process in the Webflow Designer engine
                        const timeout = prop === "background-image" ? 20000 : DEFAULT_TIMEOUT;
                        yield withTimeout(p1, timeout, `setProperty-${prop}`);
                    }
                    catch (e) {
                        log(`      ⚠ Plain fallback failed for ${prop} on ${styleLabel} (value: ${JSON.stringify(val)}): ${e.message}`, "error");
                    }
                }
            }
        }
        // 7. Apply variable bindings (Purple Pills)
        if (varEntries.length > 0) {
            for (const [prop, val] of varEntries) {
                try {
                    const p = wfOptions
                        ? style.setProperty(prop, val, wfOptions)
                        : style.setProperty(prop, val);
                    yield withTimeout(p, DEFAULT_TIMEOUT, `setProperty-var-${prop}`);
                }
                catch (e) {
                    // FALLBACK: If native variable binding fails, inline the original raw CSS string.
                    // props[prop] holds the original string value (e.g., 'var(--font-size-h3)').
                    // CRITICAL: Must use wfOptions during fallback to retain breakpoint/pseudo state context
                    const rawFallback = String((_b = props[prop]) !== null && _b !== void 0 ? _b : "");
                    log(`      ✕ Failed binding ${prop} on ${styleLabel}: ${e.message}. Inlining ${rawFallback}`, "error");
                    try {
                        const pFallback = wfOptions
                            ? style.setProperty(prop, rawFallback, wfOptions)
                            : style.setProperty(prop, rawFallback);
                        yield withTimeout(pFallback, DEFAULT_TIMEOUT, `setProperty-varFallback-${prop}`);
                    }
                    catch (_) { }
                    success = false;
                }
            }
        }
        // 8. Apply Spacing Batches (sync-lock pattern)
        // CRITICAL: All 4 sides are sent in one setProperties() call.
        // Missing sides default to '0px' (not bare '0') to keep the Webflow parser stable.
        // This matches the confirmed-working playground code and prevents the 0px rendering bug.
        for (const [prefix, groupPayload] of [
            ["padding", paddingGroup],
            ["margin", marginGroup],
        ]) {
            if (Object.keys(groupPayload).length > 0) {
                // Ensure all 4 sides are always present — missing sides get '0px'
                const sides = ["top", "right", "bottom", "left"];
                const fullGroup = {};
                for (const side of sides) {
                    const key = `${prefix}-${side}`;
                    fullGroup[key] = (_c = groupPayload[key]) !== null && _c !== void 0 ? _c : "0px";
                }
                try {
                    log(`    → Applying ${prefix} group synchronously (all 4 sides)...`);
                    const p = wfOptions
                        ? style.setProperties(fullGroup, wfOptions)
                        : style.setProperties(fullGroup);
                    yield withTimeout(p, 10000, `setProperties-Spacing-${prefix}`);
                }
                catch (e) {
                    log(`    ✕ Failed to apply ${prefix} group: ${e.message}`, "error");
                    success = false;
                }
            }
        }
        // 9. Apply Grid Layout Properties individually
        // These are extremely high latency (45s timeout used).
        if (gridEntries.length > 0) {
            for (const [rawProp, val] of gridEntries) {
                const prop = rawProp.replace(/^__grid__/, "");
                try {
                    log(`    → Applying high-latency grid property ${prop} individually...`);
                    const p = wfOptions
                        ? style.setProperty(prop, val, wfOptions)
                        : style.setProperty(prop, val);
                    yield withTimeout(p, 3000, `setProperty-grid-${prop}`);
                }
                catch (e) {
                    // FALLBACK: If native grid binding fails (e.g. for proxies), try original string.
                    const rawFallback = String((_d = props[prop]) !== null && _d !== void 0 ? _d : "");
                    log(`    ✕ Failed to apply grid property ${prop}: ${e.message}. Inlining ${rawFallback}`, "warn");
                    if (rawFallback && typeof val === "object") {
                        try {
                            const pFallback = wfOptions
                                ? style.setProperty(prop, rawFallback, wfOptions)
                                : style.setProperty(prop, rawFallback);
                            yield withTimeout(pFallback, 3000, `setProperty-gridFallback-${prop}`);
                        }
                        catch (_) { }
                    }
                    success = false;
                }
            }
        }
        // 10. Apply complex CSS function values (clamp/calc/min/max) directly per-property.
        // CRITICAL: Strip the __complex__ prefix before passing to setProperty — Webflow
        // does NOT know about this internal routing tag and will reject the property name.
        // Also track them in complexValueEmbeds so the user can verify / copy-paste.
        if (complexEntries.length > 0) {
            for (const [rawProp, val] of complexEntries) {
                const prop = rawProp.replace(/^__complex__/, "");
                const valStr = String(val);
                // Track for Webflow Musts UI — store element ref so user can Select on Canvas.
                recordComplexValue({
                    className: styleName,
                    property: prop,
                    value: valStr,
                    breakpointId: bp,
                    element: elementRef,
                });
                try {
                    log(`    → Applying complex property ${prop} individually...`);
                    const p = wfOptions
                        ? style.setProperty(prop, valStr, wfOptions)
                        : style.setProperty(prop, valStr);
                    yield withTimeout(p, DEFAULT_TIMEOUT, `setProperty-complex-${prop}`);
                }
                catch (e) {
                    log(`    ✕ Failed to apply ${prop}: ${e.message}`, "error");
                    success = false;
                }
            }
        }
        return success;
    });
}
function applyGlobalStyles(globalStyles_1) {
    return __awaiter(this, arguments, void 0, function* (globalStyles, isLegacy = false) {
        // Only process Class selectors (must start with a dot).
        // Tag-based selectors (body, html, a, img, etc.) and the universal selector (*) are
        // explicitly moved to the Global Styles Embed by the backend for maximum reliability.
        const validSelectors = Object.keys(globalStyles).filter((s) => !s.includes(" ") && s.startsWith("."));
        const total = validSelectors.length;
        log(`Applying ${total} global style${total !== 1 ? "s" : ""}...`);
        // Global style cache shared across the entire build session
        if (!window.__wfStyleCache) {
            window.__wfStyleCache = new Map();
        }
        const styleCache = window.__wfStyleCache;
        try {
            const allStyles = yield webflow.getAllStyles();
            // Parallelize getName + getParent lookups in batches to avoid O(n) sequential IPC round-trips.
            const STYLE_BATCH = 20;
            for (let i = 0; i < allStyles.length; i += STYLE_BATCH) {
                const batch = allStyles.slice(i, i + STYLE_BATCH);
                yield Promise.all(batch.map((s) => __awaiter(this, void 0, void 0, function* () {
                    const [name, parent] = yield Promise.all([
                        s.getName(),
                        s.getParent(),
                    ]);
                    const cacheKey = parent ? `${parent.id}:${name}` : name;
                    styleCache.set(cacheKey, s);
                })));
            }
            log(`Pre-loaded ${styleCache.size} styles into session cache`);
        }
        catch (_) {
            // getAllStyles not available — falls back to per-class lookup
        }
        // CRITICAL: Process selectors SEQUENTIALLY — the Webflow IPC bridge is single-threaded.
        // Firing 15 parallel setProperties streams saturates it, causing all breakpoint-specific
        // and pseudo-state calls to timeout before they can be processed.
        // Sequential iteration eliminates all bridge congestion.
        for (const selector of validSelectors) {
            const value = globalStyles[selector];
            const [baseRef, rawPseudo] = selector.split(":");
            const pseudo = normalizePseudo(rawPseudo);
            // Handle both Classes (.my-class) and Tags (h1, a, etc)
            const isTag = !baseRef.startsWith(".");
            const classChain = isTag
                ? [baseRef]
                : [...new Set(baseRef.split(".").filter(Boolean))];
            if (classChain.length === 0)
                continue;
            let currentParent = null;
            let leafStyle = null;
            for (const className of classChain) {
                const cacheKey = currentParent
                    ? `${currentParent.id}:${className}`
                    : className;
                let style = styleCache.get(cacheKey);
                if (!style) {
                    style = yield getStyleByName(className);
                    if (style) {
                        const parent = yield style.getParent();
                        if ((parent === null || parent === void 0 ? void 0 : parent.id) !== (currentParent === null || currentParent === void 0 ? void 0 : currentParent.id))
                            style = null;
                    }
                }
                if (!style) {
                    try {
                        style = yield webflow.createStyle(className, currentParent ? { parent: currentParent } : {});
                        styleCache.set(cacheKey, style);
                    }
                    catch (e) {
                        const msg = e.message.toLowerCase();
                        if (msg.includes("conflict") ||
                            msg.includes("duplicate") ||
                            msg.includes("already exists")) {
                            style = yield getStyleByName(className);
                        }
                    }
                }
                if (style) {
                    leafStyle = style;
                    currentParent = style;
                    styleCache.set(cacheKey, style);
                }
                else {
                    break;
                }
            }
            if (leafStyle && value) {
                const isBreakpointKeyed = !isLegacy ||
                    (Object.keys(value).some((k) => [
                        "main",
                        "medium",
                        "small",
                        "tiny",
                        "large",
                        "xl",
                        "xxl",
                    ].includes(k)) &&
                        typeof Object.values(value)[0] === "object");
                if (isBreakpointKeyed) {
                    for (const [bp, props] of Object.entries(value)) {
                        if (props && Object.keys(props).length > 0) {
                            yield applyStyleProperties(leafStyle, props, { breakpointId: bp, pseudo }, isLegacy);
                        }
                    }
                }
                else {
                    if (Object.keys(value).length > 0) {
                        yield applyStyleProperties(leafStyle, value, { pseudo }, isLegacy);
                    }
                }
            }
            incrementProgress();
            const done = Math.min(validSelectors.indexOf(selector) + 1, total);
            if (done % 10 === 0 || done === total)
                log(`Progress: ${done} / ${total} styles applied`);
        }
        log("✓ All styles applied", "success");
    });
}
// ------------------------------------
// DOM refs (populated after DOMContentLoaded)
// ------------------------------------
let jsonTextarea;
let errorBox;
let buildBtn;
let btnLabel;
let spinner;
let fileInput;
let dropzone;
let fileInfo;
let fileNameDisplay;
let removeFileBtn;
let findBtn;
let progressLog;
let uploadedPayload = null;
function nodeToHtml(node) {
    const tag = node.tag || (node.type === "Heading" ? "h1" : node.type === "Paragraph" ? "p" : "div");
    // Collect attributes
    const attrs = Object.entries(node.attributes || {})
        .map(([k, v]) => ` ${k}="${v}"`)
        .join("");
    // Inline styles
    let stylesStr = "";
    if (node.styles && Object.keys(node.styles).length > 0) {
        stylesStr = ` style="${Object.entries(node.styles)
            .map(([k, v]) => `${k}:${v}`)
            .join(";")}"`;
    }
    // Classes
    let classStr = "";
    if (node.classes && node.classes.length > 0) {
        classStr = ` class="${node.classes.join(" ")}"`;
    }
    const startTag = `<${tag}${classStr}${attrs}${stylesStr}>`;
    const endTag = `</${tag}>`;
    const text = typeof node.text === "string" ? node.text : Array.isArray(node.text) ? node.text.join("\n") : "";
    const childrenHtml = (node.children || []).map(nodeToHtml).join("");
    const selfClosing = ["path", "circle", "rect", "line", "polyline", "polygon", "ellipse", "img", "br", "hr"];
    if (selfClosing.includes(tag.toLowerCase()) && !text && childrenHtml.length === 0) {
        return `<${tag}${classStr}${attrs}${stylesStr} />`;
    }
    return `${startTag}${text}${childrenHtml}${endTag}`;
}
function countAllNodes(nodes) {
    let count = nodes.length;
    for (const n of nodes) {
        if (n.children)
            count += countAllNodes(n.children);
    }
    return count;
}
let fallbackEmbeds = [];
let complexValueEmbeds = [];
let unsupportedCssEmbeds = [];
function recordUnsupportedCss(embed) {
    const duplicate = unsupportedCssEmbeds.find(existing => existing.className === embed.className &&
        existing.pseudo === embed.pseudo &&
        existing.cssText === embed.cssText);
    if (!duplicate) {
        unsupportedCssEmbeds.push(embed);
    }
}
/**
 * Records an SVG embed that requires manual pasting.
 * Prevents duplicates for the same code and location.
 */
function recordFallbackEmbed(embed) {
    const duplicate = fallbackEmbeds.find(existing => existing.code === embed.code &&
        existing.tag === embed.tag &&
        JSON.stringify(existing.classList) === JSON.stringify(embed.classList));
    if (!duplicate) {
        fallbackEmbeds.push(embed);
    }
}
/**
 * Records a complex CSS value (clamp/calc) that requires manual verification.
 * Prevents duplicates for the same class, property, and breakpoint.
 */
function recordComplexValue(cv) {
    const duplicate = complexValueEmbeds.find(existing => existing.className === cv.className &&
        existing.property === cv.property &&
        existing.breakpointId === cv.breakpointId &&
        existing.value === cv.value);
    if (!duplicate) {
        complexValueEmbeds.push(cv);
    }
}
function buildAccordionSection(id, title, badge, accentColor, bodyHtml) {
    return `
		<div style="border: 1px solid #334155; border-radius: 8px; overflow: hidden; margin-bottom: 10px;">
			<button
				onclick="(function(btn){
					var body = document.getElementById('${id}-body');
					var icon = btn.querySelector('.acc-icon');
					var open = body.style.display !== 'none';
					body.style.display = open ? 'none' : 'block';
					icon.style.transform = open ? 'rotate(0deg)' : 'rotate(90deg)';
				})(this)"
				style="width:100%; display:flex; align-items:center; gap:8px; padding:10px 12px; background:#1e293b; border:none; cursor:pointer; color:#e2e8f0; font-size:13px; font-weight:600; text-align:left; transition:background 0.15s;"
				onmouseover="this.style.background='#253347'"
				onmouseout="this.style.background='#1e293b'"
			>
				<span class="acc-icon" style="display:inline-block; font-size:10px; transition:transform 0.2s; color:${accentColor};">▶</span>
				<span style="flex:1;">${title}</span>
				<span style="background:${accentColor}22; color:${accentColor}; border:1px solid ${accentColor}44; border-radius:99px; padding:1px 8px; font-size:11px; font-weight:700;">${badge}</span>
			</button>
			<div id="${id}-body" style="display:none; padding:12px; background:#0f172a;">
				${bodyHtml}
			</div>
		</div>
	`;
}
function showFallbackEmbedsUI() {
    const container = document.getElementById("fallback-embeds-container");
    if (!container)
        return;
    const hasSvg = fallbackEmbeds.length > 0;
    const hasComplex = complexValueEmbeds.length > 0;
    const hasUnsupportedCss = unsupportedCssEmbeds.length > 0;
    if (!hasSvg && !hasComplex && !hasUnsupportedCss)
        return;
    // Global selector helpers (only register once)
    if (!window.selectWebflowElement) {
        window.selectWebflowElement = (index) => __awaiter(this, void 0, void 0, function* () {
            const embed = fallbackEmbeds[index];
            if (embed && embed.element) {
                try {
                    yield webflow.setSelectedElement(embed.element);
                    log(`Selected: ${embed.displayName || 'Manual Embed'}`, "info");
                }
                catch (e) {
                    log(`Failed to select element: ${e.message}`, "error");
                }
            }
        });
    }
    if (!window.selectComplexValueElement) {
        window.selectComplexValueElement = (index) => __awaiter(this, void 0, void 0, function* () {
            const cv = complexValueEmbeds[index];
            if (!cv)
                return;
            if (cv.element) {
                try {
                    yield webflow.setSelectedElement(cv.element);
                    log(`Selected element for: .${cv.className} → ${cv.property}`, "info");
                    return;
                }
                catch (e) {
                    log(`Failed to select specific element: ${e.message}`, "warn");
                    // Continue to fallback if original reference failed
                }
            }
            // --- DISCOVERY FALLBACK ---
            // If no direct reference (global style or unused class), search the entire canvas.
            log(`Searching canvas for an element with class .${cv.className}...`, "info");
            webflow.notify({ type: "Info", message: `Searching for .${cv.className} on canvas...` });
            try {
                const allElements = yield webflow.getAllElements();
                // Use a batch processing to stay responsive while checking style names
                for (const el of allElements) {
                    if (typeof el.getStyles === "function") {
                        try {
                            const styles = yield el.getStyles();
                            for (const style of styles) {
                                const name = yield style.getName();
                                if (name === cv.className) {
                                    cv.element = el;
                                    yield webflow.setSelectedElement(el);
                                    log(`    [DEBUG] Discovered element for .${cv.className} via project-wide scan`, "success");
                                    return;
                                }
                            }
                        }
                        catch ( /* ignore elements that fail to report styles */_a) { /* ignore elements that fail to report styles */ }
                    }
                }
                // If we reach here, the class truly isn't being used anywhere.
                webflow.notify({
                    type: "Info",
                    message: `The class ".${cv.className}" is defined in Style Manager but not used by any element on the canvas.`,
                });
                log(`Global class style .${cv.className} exists but is unused on canvas.`, "info");
            }
            catch (err) {
                log(`Canvas discovery failed: ${err.message}`, "error");
            }
        });
    }
    if (!window.copyAsWebflowJSON) {
        window.copyAsWebflowJSON = (index, btnId) => __awaiter(this, void 0, void 0, function* () {
            const embed = fallbackEmbeds[index];
            if (!embed)
                return;
            const nodeId = crypto.randomUUID ? crypto.randomUUID() : "e" + Math.random().toString(36).substr(2, 9);
            const payload = {
                "type": "@webflow/XscpData",
                "payload": {
                    "nodes": [{
                            "_id": nodeId,
                            "type": "HtmlEmbed",
                            "tag": "div",
                            "classes": [],
                            "children": [],
                            "v": embed.code,
                            "data": {
                                "search": { "exclude": true },
                                "embed": { "type": "html", "meta": { "html": embed.code, "div": false, "script": false, "compilable": false, "iframe": false } },
                                "insideRTE": false, "content": "", "devlink": { "runtimeProps": {}, "slot": "" }, "displayName": embed.displayName || "",
                                "attr": { "id": "" }, "xattr": [], "visibility": { "conditions": [], "keepInHtml": { "tag": "False", "val": {} } }
                            }
                        }],
                    "styles": [], "assets": [], "ix1": [], "ix2": { "interactions": [], "events": [], "actionLists": [] }
                },
                "meta": { "unlinkedSymbolCount": 0, "droppedLinks": 0, "dynBindRemovedCount": 0, "dynListBindRemovedCount": 0, "paginationRemovedCount": 0 }
            };
            try {
                const payloadStr = JSON.stringify(payload);
                const copyHandler = (e) => {
                    var _a, _b;
                    (_a = e.clipboardData) === null || _a === void 0 ? void 0 : _a.setData('application/json', payloadStr);
                    (_b = e.clipboardData) === null || _b === void 0 ? void 0 : _b.setData('text/plain', 'Webflow Component');
                    e.preventDefault();
                };
                document.addEventListener('copy', copyHandler);
                document.execCommand('copy');
                document.removeEventListener('copy', copyHandler);
                const btn = document.getElementById(btnId);
                if (btn) {
                    btn.textContent = '✓ Copied to Webflow!';
                    setTimeout(() => btn.textContent = 'Copy to Webflow', 2000);
                }
            }
            catch (err) {
                console.error("Clipboard error:", err);
                alert("Clipboard copy failed. Try copying the raw code instead.");
            }
        });
    }
    if (!window.copyCssAsWebflowJSON) {
        window.copyCssAsWebflowJSON = (index, btnId) => __awaiter(this, void 0, void 0, function* () {
            const embed = unsupportedCssEmbeds[index];
            if (!embed)
                return;
            const cssCode = `<style>\n${embed.cssText}\n</style>`;
            const nodeId = crypto.randomUUID ? crypto.randomUUID() : "e" + Math.random().toString(36).substr(2, 9);
            const payload = {
                "type": "@webflow/XscpData",
                "payload": {
                    "nodes": [{
                            "_id": nodeId,
                            "type": "HtmlEmbed",
                            "tag": "div",
                            "classes": [],
                            "children": [],
                            "v": cssCode,
                            "data": {
                                "search": { "exclude": true },
                                "embed": { "type": "html", "meta": { "html": cssCode, "div": false, "script": false, "compilable": false, "iframe": false } },
                                "insideRTE": false, "content": "", "devlink": { "runtimeProps": {}, "slot": "" }, "displayName": "Unsupported CSS",
                                "attr": { "id": "" }, "xattr": [], "visibility": { "conditions": [], "keepInHtml": { "tag": "False", "val": {} } }
                            }
                        }],
                    "styles": [], "assets": [], "ix1": [], "ix2": { "interactions": [], "events": [], "actionLists": [] }
                },
                "meta": { "unlinkedSymbolCount": 0, "droppedLinks": 0, "dynBindRemovedCount": 0, "dynListBindRemovedCount": 0, "paginationRemovedCount": 0 }
            };
            try {
                const payloadStr = JSON.stringify(payload);
                const copyHandler = (e) => {
                    var _a, _b;
                    (_a = e.clipboardData) === null || _a === void 0 ? void 0 : _a.setData('application/json', payloadStr);
                    (_b = e.clipboardData) === null || _b === void 0 ? void 0 : _b.setData('text/plain', 'Webflow Component');
                    e.preventDefault();
                };
                document.addEventListener('copy', copyHandler);
                document.execCommand('copy');
                document.removeEventListener('copy', copyHandler);
                const btn = document.getElementById(btnId);
                if (btn) {
                    btn.textContent = '✓ Copied to Webflow!';
                    setTimeout(() => btn.textContent = 'Copy to Webflow', 2000);
                }
            }
            catch (err) {
                console.error("Clipboard error:", err);
                alert("Clipboard copy failed. Try copying the raw code instead.");
            }
        });
    }
    let sectionsHtml = "";
    // --- SVG section ---
    if (hasSvg) {
        let svgBody = "";
        fallbackEmbeds.forEach((embed, i) => {
            const idHtml = `embed-code-${i}`;
            const displayStr = embed.displayName
                ? `<strong style="color:#f8fafc;font-weight:600;">${embed.displayName}</strong> — `
                : "";
            const location = embed.classList.length > 0 ? `.${embed.classList.join('.')}` : embed.tag;
            const escapedCode = embed.code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
            svgBody += `
				<div style="background:#1e293b;padding:11px;margin-bottom:10px;border-radius:6px;border:1px solid #2d3f55;box-sizing:border-box;">
					<div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:8px;">
						<div style="font-size:12px;color:#94a3b8;">${displayStr}<span style="font-family:monospace;color:#38bdf8;">${location}</span></div>
						<button onclick="selectWebflowElement(${i})" style="padding:2px 8px;background:rgba(56,189,248,0.1);color:#38bdf8;border:1px solid rgba(56,189,248,0.25);border-radius:4px;cursor:pointer;font-size:11px;font-weight:500;">Select on Canvas</button>
					</div>
					<p style="font-size:11px;color:#64748b;margin:0 0 6px;">Paste directly into Webflow, or copy the raw code for an existing embed:</p>
					<textarea id="${idHtml}" readonly style="width:100%;height:72px;padding:7px;border-radius:4px;border:1px solid #334155;background:#070f1c;color:#7dd3fc;font-family:monospace;font-size:11px;box-sizing:border-box;resize:vertical;margin-bottom:7px;">${escapedCode}</textarea>
					<div style="display:flex;gap:8px;">
						<button onclick="copyAsWebflowJSON(${i}, 'btn-wf-${i}')" id="btn-wf-${i}" style="padding:5px 11px;background:#38bdf8;color:#0f172a;border:none;border-radius:4px;cursor:pointer;font-size:12px;font-weight:600;">Copy to Webflow</button>
						<button onclick="navigator.clipboard.writeText(document.getElementById('${idHtml}').value);this.textContent='✓ Code Copied!';setTimeout(()=>this.textContent='Copy Raw Code',2000)" style="padding:5px 11px;background:#1e40af;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:12px;font-weight:500;">Copy Raw Code</button>
					</div>
				</div>
			`;
        });
        sectionsHtml += buildAccordionSection("acc-svg", "SVG Code Embeds", fallbackEmbeds.length, "#38bdf8", svgBody);
    }
    // --- Complex Values section ---
    if (hasComplex) {
        let cvBody = `<p style="font-size:11px;color:#94a3b8;margin:0 0 10px;">These complex CSS values (clamp, calc, etc.) were applied via the API. Verify each in the Webflow Style Panel — if the value looks wrong or is missing, copy and paste it manually.</p>`;
        complexValueEmbeds.forEach((cv, i) => {
            const idCv = `cv-code-${i}`;
            const bpLabel = cv.breakpointId && cv.breakpointId !== "main" ? ` <span style="background:#1e3a2f;color:#4ade80;border:1px solid #166534;border-radius:3px;padding:0 5px;font-size:10px;">${cv.breakpointId}</span>` : "";
            cvBody += `
				<div style="background:#1e293b;padding:11px;margin-bottom:8px;border-radius:6px;border:1px solid #2d3f55;box-sizing:border-box;">
					<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
						<span style="font-family:monospace;font-size:12px;color:#f472b6;">.${cv.className}</span>
						<span style="color:#64748b;font-size:11px;">→</span>
						<span style="font-family:monospace;font-size:12px;color:#fbbf24;">${cv.property}</span>
						${bpLabel}
						<button onclick="selectComplexValueElement(${i})" style="margin-left:auto;padding:2px 8px;background:rgba(56,189,248,0.1);color:#38bdf8;border:1px solid rgba(56,189,248,0.25);border-radius:4px;cursor:pointer;font-size:11px;font-weight:500;">Select on Canvas</button>
					</div>
					<div style="display:flex;gap:6px;align-items:center;">
						<input id="${idCv}" readonly value="${cv.value.replace(/"/g, '&quot;')}" style="flex:1;padding:6px 8px;border-radius:4px;border:1px solid #334155;background:#070f1c;color:#a3e635;font-family:monospace;font-size:11px;box-sizing:border-box;" />
						<button onclick="navigator.clipboard.writeText(document.getElementById('${idCv}').value);this.textContent='✓';setTimeout(()=>this.textContent='Copy',1800)" style="padding:5px 10px;background:#166534;color:#86efac;border:none;border-radius:4px;cursor:pointer;font-size:11px;font-weight:600;">Copy</button>
					</div>
				</div>
			`;
        });
        sectionsHtml += buildAccordionSection("acc-cv", "Complex CSS Values", complexValueEmbeds.length, "#a3e635", cvBody);
    }
    // --- Unsupported CSS section ---
    if (hasUnsupportedCss) {
        let unsuppBody = `<p style="font-size:11px;color:#94a3b8;margin:0 0 10px;">These CSS selectors (e.g., complex pseudo-classes or descendant selectors) are not natively supported by the Webflow Designer API. Paste them into the custom code section or an HTML Embed.</p>`;
        unsupportedCssEmbeds.forEach((embed, i) => {
            const idUnsupp = `unsupp-code-${i}`;
            const escapedCode = `<style>\n${embed.cssText}\n</style>`.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
            unsuppBody += `
				<div style="background:#1e293b;padding:11px;margin-bottom:10px;border-radius:6px;border:1px solid #2d3f55;box-sizing:border-box;">
					<div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:8px;">
						<div style="font-size:12px;color:#94a3b8;">Unsupported Selector: <span style="font-family:monospace;color:#f472b6;">.${embed.className}:${embed.pseudo}</span></div>
					</div>
					<p style="font-size:11px;color:#64748b;margin:0 0 6px;">Paste directly into Webflow, or copy the raw code for an existing embed:</p>
					<textarea id="${idUnsupp}" readonly style="width:100%;height:80px;padding:7px;border-radius:4px;border:1px solid #334155;background:#070f1c;color:#f472b6;font-family:monospace;font-size:11px;box-sizing:border-box;resize:vertical;margin-bottom:7px;">${escapedCode}</textarea>
					<div style="display:flex;gap:8px;">
						<button onclick="copyCssAsWebflowJSON(${i}, 'btn-wf-css-${i}')" id="btn-wf-css-${i}" style="padding:5px 11px;background:#f472b6;color:#0f172a;border:none;border-radius:4px;cursor:pointer;font-size:12px;font-weight:600;">Copy to Webflow</button>
						<button onclick="navigator.clipboard.writeText(document.getElementById('${idUnsupp}').value);this.textContent='✓ Code Copied!';setTimeout(()=>this.textContent='Copy Raw CSS',2000)" style="padding:5px 11px;background:#9d174d;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:12px;font-weight:500;">Copy Raw CSS</button>
					</div>
				</div>
			`;
        });
        sectionsHtml += buildAccordionSection("acc-unsupp", "Unsupported CSS Selectors", unsupportedCssEmbeds.length, "#f472b6", unsuppBody);
    }
    container.innerHTML = `
		<div style="margin-bottom:8px;">
			<div style="font-size:12px;font-weight:700;color:#f8fafc;letter-spacing:0.04em;margin-bottom:6px;display:flex;align-items:center;gap:6px;">
				<span style="color:#f59e0b;">⚠</span> Webflow Musts
			</div>
			<p style="font-size:11px;color:#64748b;margin:0 0 10px;">These items need manual attention in the Webflow Designer. Expand a section to review.</p>
		</div>
		${sectionsHtml}
	`;
    container.style.display = "block";
}
let currentProgress = 0;
let totalSteps = 0;
function updateProgressBar() {
    const progressFill = document.getElementById("progress-fill");
    const progressText = document.getElementById("progress-percentage");
    if (!progressFill || !progressText)
        return;
    const percentage = totalSteps > 0 ? Math.round((currentProgress / totalSteps) * 100) : 0;
    progressFill.style.width = `${Math.min(percentage, 100)}%`;
    progressText.textContent = `${Math.min(percentage, 100)}%`;
}
function log(message, level = "info") {
    console.log(`[${level.toUpperCase()}] ${message}`);
    // Minimal UI: only show warnings and errors in the log panel
    const isWarningOrError = level === "warn" || level === "error";
    if (!isWarningOrError || !progressLog)
        return;
    const logPanel = document.getElementById("progress-log");
    if (logPanel)
        logPanel.classList.add("has-errors");
    const entry = document.createElement("div");
    entry.className = `log-entry log-${level}`;
    const icons = {
        info: "›",
        success: "✓",
        warn: "⚠",
        error: "✕",
    };
    entry.innerHTML = `<span class="log-icon">${icons[level]}</span><span class="log-text" style="white-space: pre-wrap;">${message}</span>`;
    progressLog.appendChild(entry);
    window.requestAnimationFrame(() => {
        progressLog.scrollTop = progressLog.scrollHeight;
    });
    // Bridge to Debug Server if it's running
    fetch("http://localhost:5174/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            message,
            level,
            timestamp: new Date().toISOString(),
        }),
    }).catch(() => {
        /* Silent if server not running */
    });
}
function showHardError(title, message) {
    const overlayId = "wf-hard-error-overlay";
    let overlay = document.getElementById(overlayId);
    if (!overlay) {
        overlay = document.createElement("div");
        overlay.id = overlayId;
        overlay.style.cssText = `
			position: fixed; top: 0; left: 0; width: 100%; height: 100%;
			background: rgba(0,0,0,0.85); color: #ff4d4d; z-index: 999999;
			display: flex; flex-direction: column; align-items: center; justify-content: center;
			font-family: system-ui; padding: 20px; text-align: center;
		`;
        document.body.appendChild(overlay);
    }
    overlay.innerHTML = `
		<h1 style="margin-bottom: 10px;">🛑 ${title}</h1>
		<div style="background: #222; padding: 15px; border-radius: 8px; border: 1px solid #444; max-width: 80%; overflow: auto; text-align: left;">
			<pre style="margin: 0; white-space: pre-wrap; font-size: 13px;">${message}</pre>
		</div>
		<button onclick="this.parentElement.remove()" style="margin-top: 20px; padding: 10px 20px; background: #ff4d4d; color: white; border: none; border-radius: 4px; cursor: pointer;">Close Overlay</button>
	`;
}
window.addEventListener("unhandledrejection", (event) => {
    var _a, _b;
    const msg = ((_a = event.reason) === null || _a === void 0 ? void 0 : _a.message) || String(event.reason);
    const stack = ((_b = event.reason) === null || _b === void 0 ? void 0 : _b.stack) || "";
    log(`CRASH DETECTED: ${msg}`, "error");
    showHardError("Unhandled Promise Rejection (Crash)", `${msg}\n\n${stack}`);
});
window.addEventListener("error", (event) => {
    log(`RUNTIME ERROR: ${event.message}`, "error");
    showHardError("Runtime Error (Crash)", `${event.message}\nat ${event.filename}:${event.lineno}:${event.colno}`);
});
function incrementProgress(amount = 1) {
    currentProgress += amount;
    updateProgressBar();
}
function clearLog() {
    if (progressLog)
        progressLog.innerHTML = "";
}
// ------------------------------------
// Initialization
// ------------------------------------
function init() {
    var _a;
    log("--- APP INITIALIZED (Build 2026-04-09.0421) ---", "warn");
    // Set the Extension UI size to large for better workspace
    webflow.setExtensionSize("large").catch(() => {
        /* fallback if API not supported in this environment */
    });
    const app = document.getElementById("app");
    if (!app)
        return;
    app.innerHTML = `
    <div class="header">
      <div class="header-content">
        <div class="logo">
          <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
            <rect width="26" height="26" rx="7" fill="url(#logoGrad)"/>
            <path d="M7 9h12M7 13h12M7 17h7" stroke="white" stroke-width="2" stroke-linecap="round"/>
            <defs>
              <linearGradient id="logoGrad" x1="0" y1="0" x2="26" y2="26">
                <stop stop-color="#3B82F6"/>
                <stop offset="1" stop-color="#6366F1"/>
              </linearGradient>
            </defs>
          </svg>
          <span class="logo-text">Code to Webflow</span>
        </div>
      </div>
    </div>

    <div class="main">
      <p class="description">
        Select a target element in the Webflow Designer (e.g. Body), upload a JSON file or paste your generated JSON below.
      </p>

      <div class="file-upload-container">
        <div class="field-label">File Upload</div>
        <div id="dropzone" class="file-dropzone">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          <div class="file-dropzone-text">Click to upload or drag & drop</div>
          <div class="file-dropzone-subtext">webflow-site-structure.json</div>
          <input type="file" id="file-input" accept=".json">
        </div>
        <div id="file-info" class="file-info">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
          </svg>
          <span id="file-name-display">filename.json</span>
          <div id="remove-file" class="remove-file">×</div>
        </div>
      </div>

      <div class="divider">
        <div class="divider-line"></div>
        <div class="divider-text">or</div>
        <div class="divider-line"></div>
      </div>

      <div>
        <div class="field-label">JSON Payload</div>
        <textarea
          id="json-input"
          class="json-textarea"
          placeholder='Paste JSON here...'
        ></textarea>
      </div>

      <div id="error-box" class="error-box"></div>

      <button id="build-btn" class="btn-build" disabled style="margin-bottom: 8px;">
        <div id="spinner" class="spinner"></div>
        <span id="btn-label">Build Site</span>
      </button>

      <button id="find-invalid-btn" class="btn-secondary" style="display: none; width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #e2e8f0; background: white; color: #1e293b; font-weight: 500; cursor: pointer; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s; font-size: 13px;">
         <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
         </svg>
         <span>Find Invalid Styles</span>
      </button>

      <style>
        .btn-secondary:hover { background: #f8fafc !important; border-color: #cbd5e1 !important; }
        .btn-secondary:active { background: #f1f5f9 !important; }
      </style>

      <div id="progress-container" class="progress-container">
        <div class="progress-label-row">
          <span>Overall Progress</span>
          <span id="progress-percentage">0%</span>
        </div>
        <div class="progress-bar-bg">
          <div id="progress-fill" class="progress-bar-fill"></div>
        </div>
        <div id="progress-log" class="progress-log">
          <div class="progress-log-header">
            <span>Issues & Alerts</span>
            <button id="clear-log-btn" class="clear-log-btn" title="Clear log">Clear</button>
          </div>
          <div id="progress-log-entries" class="progress-log-entries"></div>
        </div>
      </div>

      <div id="fallback-embeds-container" class="fallback-embeds-container" style="display: none; width: 100%; margin-top: 16px;"></div>

      <div id="build-status" class="build-status" style="margin-top: 12px; font-size: 12px; color: #64748b; text-align: center; display: none;"></div>
      <div class="version-footer">Build: 2026-04-09.0421 (Log Level: INFO)</div>
    </div>

    <div class="toast" id="toast"></div>
  `;
    // Cache DOM refs
    jsonTextarea = document.getElementById("json-input");
    errorBox = document.getElementById("error-box");
    buildBtn = document.getElementById("build-btn");
    btnLabel = document.getElementById("btn-label");
    spinner = document.getElementById("spinner");
    fileInput = document.getElementById("file-input");
    dropzone = document.getElementById("dropzone");
    fileInfo = document.getElementById("file-info");
    fileNameDisplay = document.getElementById("file-name-display");
    removeFileBtn = document.getElementById("remove-file");
    findBtn = document.getElementById("find-invalid-btn");
    progressLog = document.getElementById("progress-log-entries");
    // Clear log button
    (_a = document.getElementById("clear-log-btn")) === null || _a === void 0 ? void 0 : _a.addEventListener("click", () => {
        clearLog();
        const logPanel = document.getElementById("progress-log");
        if (logPanel)
            logPanel.classList.remove("has-errors");
    });
    jsonTextarea.addEventListener("input", () => {
        if (jsonTextarea.value.trim().length > 0) {
            clearUploadedFile();
        }
        updateBuildButtonState();
        hideError();
    });
    buildBtn.addEventListener("click", handleBuild);
    findBtn.addEventListener("click", handleAuditStyles);
    setupFileUpload();
}
function updateBuildButtonState() {
    const hasText = jsonTextarea.value.trim().length > 0;
    const hasFile = !!uploadedPayload;
    buildBtn.disabled = !hasText && !hasFile;
}
function clearUploadedFile() {
    uploadedPayload = null;
    fileInput.value = "";
    fileInfo.classList.remove("show");
}
function setupFileUpload() {
    dropzone.addEventListener("click", () => fileInput.click());
    dropzone.addEventListener("dragover", (e) => {
        e.preventDefault();
        dropzone.classList.add("dragover");
    });
    dropzone.addEventListener("dragleave", () => {
        dropzone.classList.remove("dragover");
    });
    dropzone.addEventListener("drop", (e) => {
        var _a;
        e.preventDefault();
        dropzone.classList.remove("dragover");
        const files = (_a = e.dataTransfer) === null || _a === void 0 ? void 0 : _a.files;
        if (files && files.length > 0) {
            handleFileSelect(files[0]);
        }
    });
    fileInput.addEventListener("change", (e) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            handleFileSelect(files[0]);
        }
    });
    removeFileBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        clearUploadedFile();
        updateBuildButtonState();
    });
}
function handleFileSelect(file) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!file.name.endsWith(".json")) {
            showError("Please select a .json file.");
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            var _a;
            try {
                const content = (_a = e.target) === null || _a === void 0 ? void 0 : _a.result;
                uploadedPayload = JSON.parse(content);
                // Update UI
                fileNameDisplay.textContent = file.name;
                fileInfo.classList.add("show");
                jsonTextarea.value = ""; // Clear textarea to avoid confusion
                updateBuildButtonState();
                hideError();
                showToast("File loaded successfully", "success");
            }
            catch (err) {
                showError("Failed to parse JSON file.");
                console.error(err);
            }
        };
        reader.readAsText(file);
    });
}
// ------------------------------------
// Build handler
// ------------------------------------
function handleBuild() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        let payload;
        if (uploadedPayload) {
            payload = uploadedPayload;
        }
        else {
            const raw = jsonTextarea.value.trim();
            if (!raw)
                return;
            try {
                payload = JSON.parse(raw);
            }
            catch (_c) {
                showError("Invalid JSON — please check your input.");
                return;
            }
        }
        // Safety: If the user pasted an array of nodes directly at the root
        if (Array.isArray(payload)) {
            payload = {
                nodes: payload,
                __meta: {
                    version: 1,
                    normalized: false,
                    complexSelectorsResolved: false,
                },
            };
        }
        setLoading(true);
        hideError();
        clearLog();
        fallbackEmbeds = [];
        complexValueEmbeds = [];
        const embedContainer = document.getElementById("fallback-embeds-container");
        if (embedContainer) {
            embedContainer.style.display = "none";
            embedContainer.innerHTML = "";
        }
        const statusEl = document.getElementById("build-status");
        if (statusEl)
            statusEl.style.display = "none";
        currentProgress = 0;
        totalSteps = 0;
        updateProgressBar();
        const progressContainer = document.getElementById("progress-container");
        if (progressContainer)
            progressContainer.classList.add("show");
        const logPanel = document.getElementById("progress-log");
        if (logPanel)
            logPanel.classList.remove("has-errors");
        log("--- START BUILD ---");
        try {
            yield buildSiteFromJson(payload);
            currentProgress = totalSteps; // Ensure 100% on success
            updateProgressBar();
            showToast("Site structure built successfully!", "success");
        }
        catch (e) {
            showError(`Build failed: ${(_a = e === null || e === void 0 ? void 0 : e.message) !== null && _a !== void 0 ? _a : e}`);
            showToast("Build failed. Check the error above.", "error");
            log(`Build failed: ${(_b = e === null || e === void 0 ? void 0 : e.message) !== null && _b !== void 0 ? _b : e}`, "error");
        }
        finally {
            setLoading(false);
            // Reset state if successful
            if (currentProgress >= totalSteps && totalSteps > 0) {
                if (fallbackEmbeds.length > 0 || complexValueEmbeds.length > 0) {
                    showFallbackEmbedsUI();
                }
                const finishedFileName = fileNameDisplay.textContent || "Pasted JSON";
                // Show status
                const statusEl = document.getElementById("build-status");
                if (statusEl) {
                    statusEl.textContent = `✓ Finished building: ${finishedFileName}`;
                    statusEl.style.display = "block";
                }
                // Reset progress after a short delay
                setTimeout(() => {
                    currentProgress = 0;
                    totalSteps = 0;
                    updateProgressBar();
                    const container = document.getElementById("progress-container");
                    if (container)
                        container.classList.remove("show");
                }, 3000);
                // Reset inputs
                clearUploadedFile();
                jsonTextarea.value = "";
                updateBuildButtonState();
            }
        }
    });
}
// ------------------------------------
// Webflow API
// ------------------------------------
const WEBFLOW_NATIVE_TAGS = [
    "div",
    "section",
    "header",
    "footer",
    "main",
    "nav",
    "aside",
    "article",
    "address",
    "figure",
    "figcaption",
    "span",
];
// Helper to fetch and upload assets
function uploadAssetFromUrl(url) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (!url || (!url.startsWith("http") && !url.startsWith("data:"))) {
                console.warn("Skipping asset upload for non-absolute or data URL:", url);
                return null;
            }
            // 1. Fetch image with basic validation
            const response = yield fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
            }
            // Use arrayBuffer instead of blob to ensure we get raw bytes.
            // This bypasses issues in some environments where response.blob() yields a corrupted/readonly object
            // that the Webflow API cannot correctly process or assign properties to.
            const arrayBuffer = yield response.arrayBuffer();
            if (arrayBuffer.byteLength === 0) {
                throw new Error("Fetched image buffer is empty (0 bytes).");
            }
            const uint8Array = new Uint8Array(arrayBuffer);
            // 2. Derive a valid file name with extension
            const mimeType = response.headers.get("content-type") || "image/png";
            let ext = "png";
            if (mimeType.includes("jpeg") || mimeType.includes("jpg"))
                ext = "jpg";
            else if (mimeType.includes("svg"))
                ext = "svg";
            else if (mimeType.includes("webp"))
                ext = "webp";
            const fileName = `img-${Date.now()}.${ext}`;
            // 3. Resilient upload sequence
            // We try multiple patterns to ensure compatibility with different API variants/versions
            try {
                log(`    → Pattern 1: Uploading File object (${fileName})...`);
                const file = new File([uint8Array], fileName, { type: mimeType });
                return yield webflow.createAsset(file);
            }
            catch (err1) {
                try {
                    log(`    → Pattern 2: Uploading as { file } object...`);
                    const file = new File([uint8Array], fileName, {
                        type: mimeType,
                    });
                    return yield webflow.createAsset({ file });
                }
                catch (err2) {
                    try {
                        log(`    → Pattern 3: Uploading File/Blob via defineProperty...`);
                        // Some environments don't have a fully spec-compliant File constructor
                        const backupBlob = new Blob([uint8Array], {
                            type: mimeType,
                        });
                        Object.defineProperty(backupBlob, "name", {
                            value: fileName,
                            writable: true,
                        });
                        return yield webflow.createAsset(backupBlob);
                    }
                    catch (err3) {
                        const finalMsg = (err1 === null || err1 === void 0 ? void 0 : err1.message) ||
                            (err3 === null || err3 === void 0 ? void 0 : err3.message) ||
                            "All upload patterns failed";
                        log(`    ✕ Asset upload failed: ${finalMsg}`, "error");
                        webflow.notify({
                            type: "Error",
                            message: `Asset Sync Error: ${finalMsg}`,
                        });
                        throw err1;
                    }
                }
            }
        }
        catch (err) {
            const errorMessage = (err === null || err === void 0 ? void 0 : err.message) || String(err);
            console.warn(`Could not upload asset from ${url}:`, err);
            log(`    ✕ Asset Upload Error: ${errorMessage}`, "error");
            return null;
        }
    });
}
function getPresetForType(node) {
    var _a, _b, _c;
    const tag = (_a = node.tag) === null || _a === void 0 ? void 0 : _a.toLowerCase();
    // 1. Prioritize explicit Webflow types
    switch (node.type) {
        case "Heading":
            if (node.children && node.children.length > 0)
                return webflow.elementPresets.DivBlock;
            return webflow.elementPresets.Heading;
        case "Paragraph":
            if (node.children && node.children.length > 0)
                return webflow.elementPresets.DivBlock;
            return webflow.elementPresets.Paragraph;
        case "Link": {
            // If it has children (like an icon + text), use LinkBlock
            if (node.children && node.children.length > 0)
                return webflow.elementPresets.LinkBlock;
            // If it only has text, a standard Link (Text Link) is much better
            return (webflow.elementPresets.Link || webflow.elementPresets.LinkBlock);
        }
        case "Image":
            return webflow.elementPresets.Image;
        case "HtmlEmbed":
            return (webflow.elementPresets.HtmlEmbed ||
                webflow.elementPresets.Embed ||
                webflow.elementPresets.HTMLEmbed ||
                webflow.elementPresets.Html ||
                webflow.elementPresets.EmbedCode ||
                webflow.elementPresets.CodeEmbed ||
                webflow.elementPresets.EmbedElement);
        case "List":
            return (webflow.elementPresets.List ||
                webflow.elementPresets.ListElement);
        case "ListItem":
            return (webflow.elementPresets.ListItem ||
                webflow.elementPresets.ListItemElement);
        case "TextBlock":
            return (webflow.elementPresets.TextBlock ||
                webflow.elementPresets.BlockElement ||
                webflow.elementPresets.DOM);
        case "FormWrapper":
            return webflow.elementPresets.FormWrapper || webflow.elementPresets.DivBlock;
        case "FormForm":
            return webflow.elementPresets.FormForm || webflow.elementPresets.DOM;
        case "FormTextInput":
            return webflow.elementPresets.FormTextInput || webflow.elementPresets.DOM;
        case "FormTextarea":
            return webflow.elementPresets.FormTextarea || webflow.elementPresets.DOM;
        case "FormSelect":
            return webflow.elementPresets.FormSelect || webflow.elementPresets.DOM;
        case "FormCheckboxInput":
            return webflow.elementPresets.FormCheckboxInput || webflow.elementPresets.DOM;
        case "FormRadioInput":
            return webflow.elementPresets.FormRadioInput || webflow.elementPresets.DOM;
        case "FormBlockLabel":
            return webflow.elementPresets.FormBlockLabel || webflow.elementPresets.DOM;
        case "FormButton":
            return webflow.elementPresets.FormButton || webflow.elementPresets.DOM;
        case "FormSuccessMessage":
            return webflow.elementPresets.FormSuccessMessage || webflow.elementPresets.DivBlock;
        case "FormErrorMessage":
            return webflow.elementPresets.FormErrorMessage || webflow.elementPresets.DivBlock;
        case "custom": {
            // Upgrade custom nodes whose tag matches a native Webflow form element.
            // This handles stale JSON where the backend emitted type="custom" for
            // form/label/input/textarea/select/button before the form-type mapping was added.
            if (tag === "form")
                return webflow.elementPresets.FormForm || webflow.elementPresets.DOM;
            if (tag === "label")
                return webflow.elementPresets.FormBlockLabel || webflow.elementPresets.DOM;
            if (tag === "textarea")
                return webflow.elementPresets.FormTextarea || webflow.elementPresets.DOM;
            if (tag === "select")
                return webflow.elementPresets.FormSelect || webflow.elementPresets.DOM;
            if (tag === "button")
                return webflow.elementPresets.FormButton || webflow.elementPresets.DOM;
            if (tag === "input") {
                const inputType = (((_b = node.attributes) === null || _b === void 0 ? void 0 : _b.type) || "text").toLowerCase();
                if (inputType === "checkbox")
                    return webflow.elementPresets.FormCheckboxInput || webflow.elementPresets.DOM;
                if (inputType === "radio")
                    return webflow.elementPresets.FormRadioInput || webflow.elementPresets.DOM;
                if (inputType === "submit")
                    return webflow.elementPresets.FormButton || webflow.elementPresets.DOM;
                return webflow.elementPresets.FormTextInput || webflow.elementPresets.DOM;
            }
            return webflow.elementPresets.DOM;
        }
    }
    // 2. Map tags to native presets
    if (tag === "ul" || tag === "ol")
        return webflow.elementPresets.List;
    if (tag === "li")
        return webflow.elementPresets.ListItem;
    if (tag === "form")
        return webflow.elementPresets.FormForm;
    if (tag === "label")
        return webflow.elementPresets.FormBlockLabel;
    if (tag === "textarea")
        return webflow.elementPresets.FormTextarea;
    if (tag === "select")
        return webflow.elementPresets.FormSelect;
    if (tag === "button")
        return webflow.elementPresets.FormButton;
    if (tag === "input") {
        const inputType = (((_c = node.attributes) === null || _c === void 0 ? void 0 : _c.type) || "text").toLowerCase();
        if (inputType === "checkbox")
            return webflow.elementPresets.FormCheckboxInput;
        if (inputType === "radio")
            return webflow.elementPresets.FormRadioInput;
        if (inputType === "submit")
            return webflow.elementPresets.FormButton;
        return webflow.elementPresets.FormTextInput;
    }
    // 2. Custom attributes check for Block types
    // Allow common attributes that native Webflow elements support
    const allowedAttrs = [
        "id",
        "class",
        "style",
        "src",
        "href",
        "alt",
        "target",
        "loading",
        "name",
        "id",
        "for",
        "placeholder",
        "type",
        "required",
        "value",
        "method",
        "action",
        "rows",
        "cols",
        "selected",
        "disabled",
        "data-name"
    ];
    const hasCustomAttributes = Object.keys(node.attributes || {}).some((k) => !allowedAttrs.includes(k));
    if (hasCustomAttributes &&
        !["div", "section", "header", "footer", "main", "form", "label", "input", "textarea", "select", "button"].includes(tag || "")) {
        return webflow.elementPresets.DOM;
    }
    // 3. Fallback logic for Blocks
    // Span and SVG should be DOM elements
    if (tag === "span" || tag === "svg")
        return webflow.elementPresets.DOM;
    // Only use DivBlock for tags that Webflow officially supports as block containers.
    // Lists of valid block tags: div, header, footer, nav, main, section, article, aside, address, figure.
    const validBlockTags = [
        "div",
        "section",
        "header",
        "footer",
        "main",
        "nav",
        "aside",
        "article",
        "address",
        "figure",
    ];
    const isSupportedBlockTag = !tag || tag === "div" || validBlockTags.includes(tag);
    if (isSupportedBlockTag) {
        return webflow.elementPresets.DivBlock;
    }
    return webflow.elementPresets.DOM;
}
// matchesComplexSelector() removed — complex selectors are pre-resolved
// into node.inlineStyles by the backend CLI. No runtime tree walking needed.
/**
 * Robustly adds an element even if the user has a non-container selected.
 * If append is not supported, it tries to add as a sibling (after).
 */
function smartAppend(parentNode, preset) {
    return __awaiter(this, void 0, void 0, function* () {
        if (typeof parentNode.append === "function") {
            return yield withTimeout(parentNode.append(preset), 10000, "smartAppend-append");
        }
        if (typeof parentNode.after === "function") {
            log(`    ⚠ Selection (${parentNode.type}) doesn't support children. Adding as sibling instead.`, "warn");
            return yield withTimeout(parentNode.after(preset), 10000, "smartAppend-after");
        }
        // Try moving up one level
        if (typeof parentNode.getParent === "function") {
            const realParent = yield parentNode.getParent();
            if (realParent) {
                log(`    ⚠ Selection not a container. Moving up to ${realParent.type}...`, "info");
                return yield smartAppend(realParent, preset);
            }
        }
        throw new Error(`Current selection (${parentNode.type}) cannot have children or siblings.`);
    });
}
function setElementText(element, text) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!element)
            return;
        // Helper to deeply find the String child relative to any parent
        function findStringDescendant(parent_1) {
            return __awaiter(this, arguments, void 0, function* (parent, depth = 0) {
                if (depth > 5 || !parent || !parent.getChildren)
                    return null;
                const children = yield parent.getChildren();
                if (!Array.isArray(children))
                    return null;
                for (const child of children) {
                    if (child.type === "String" && child.setText)
                        return child;
                    const found = yield findStringDescendant(child, depth + 1);
                    if (found)
                        return found;
                }
                return null;
            });
        }
        // 1. Direct setText for String elements
        if (element.type === "String" && element.setText) {
            yield element.setText(text);
            return;
        }
        // 2. Refresh element via ID to ensure UI is hydrated for complex presets
        if (element.id &&
            (element.type === "TextBlock" ||
                element.type === "BlockElement" ||
                element.type === "DOM")) {
            try {
                yield new Promise((r) => setTimeout(r, 100)); // Tick for UI flush
                const allElements = yield webflow.getAllElements();
                const freshRef = allElements.find((el) => el.id === element.id);
                if (freshRef) {
                    const stringChild = yield findStringDescendant(freshRef);
                    if (stringChild) {
                        yield stringChild.setText(text);
                        return;
                    }
                }
            }
            catch (e) {
                console.warn("Failed to find String descendant via fresh ID lookup:", e);
            }
        }
        // 3. Standard fallback
        if (element.setTextContent) {
            yield element.setTextContent(text);
        }
    });
}
function applyClassesAndStyles(element_1, nodeData_1) {
    return __awaiter(this, arguments, void 0, function* (element, nodeData, isLegacy = false) {
        if (!element)
            return;
        // ------------------------------------
        // Classes (Webflow Styles / Combo Classes)
        // ------------------------------------
        const styleRefs = [];
        const classes = [...(nodeData.classes || [])];
        // Merge styles: node's own styles + backend-inlined complex selector styles
        const nodeStyles = Object.assign(Object.assign({}, (nodeData.styles || {})), (nodeData.inlineStyles || {}));
        const hasStylesToApply = Object.keys(nodeStyles).length > 0;
        const hasPseudoStyles = nodeData.inlinePseudoStyles &&
            Object.keys(nodeData.inlinePseudoStyles).length > 0;
        // If the element has styles but no classes, auto-generate a class name
        if ((hasStylesToApply || hasPseudoStyles) && classes.length === 0) {
            const tagBase = nodeData.tag || nodeData.type.toLowerCase() || "element";
            classes.push(`${tagBase}-style`);
        }
        if (classes.length > 0 && element.setStyles) {
            let currentParent = null;
            const cleanClasses = [
                ...new Set(classes.filter((c) => c && c.trim().length > 0)),
            ];
            const styleCache = window.__wfStyleCache;
            for (const className of cleanClasses) {
                const cacheKey = currentParent
                    ? `${currentParent.id}:${className}`
                    : className;
                let style = styleCache === null || styleCache === void 0 ? void 0 : styleCache.get(cacheKey);
                let fallbackStyle = style;
                if (!style) {
                    style = yield getStyleByName(className);
                    fallbackStyle = style;
                    if (style) {
                        const parent = yield style.getParent();
                        if ((parent === null || parent === void 0 ? void 0 : parent.id) !== (currentParent === null || currentParent === void 0 ? void 0 : currentParent.id))
                            style = null;
                    }
                }
                if (!style) {
                    try {
                        style = yield webflow.createStyle(className, currentParent ? { parent: currentParent } : {});
                        if (styleCache)
                            styleCache.set(cacheKey, style);
                    }
                    catch (e) {
                        const msg = e.message.toLowerCase();
                        if (msg.includes("conflict") ||
                            msg.includes("duplicate") ||
                            msg.includes("already exists")) {
                            style =
                                (yield getStyleByName(className)) || fallbackStyle;
                        }
                        if (!style) {
                            log(`    ⚠ Could not resolve class ${className} for chain: ${e.message}`, "warn");
                        }
                    }
                }
                if (style) {
                    styleRefs.push(style);
                    currentParent = style;
                    if (styleCache)
                        styleCache.set(cacheKey, style);
                }
            }
            if (styleRefs.length > 0) {
                try {
                    yield withTimeout(element.setStyles([...styleRefs]), 8000, "setStyles");
                }
                catch (e) {
                    log(`    ✕ Failed to apply style chain: ${e.message}`, "error");
                }
            }
            // BACKFILL: Link this element to any complex values tracked for its classes
            // that don't yet have an element reference (e.g. global styles).
            for (const className of cleanClasses) {
                const pending = complexValueEmbeds.filter(cv => cv.className === className && !cv.element);
                for (const cv of pending) {
                    cv.element = element;
                    log(`    [DEBUG] Backfilled element ref for .${cv.className} complex value`, "info");
                }
            }
        }
        // ------------------------------------
        // Apply Properties to the primary class
        // ------------------------------------
        if (styleRefs.length > 0) {
            const primaryStyle = styleRefs[styleRefs.length - 1];
            if (hasStylesToApply) {
                yield applyStyleProperties(primaryStyle, nodeStyles, undefined, isLegacy, element);
            }
            if (hasPseudoStyles) {
                for (const [pseudo, pseudoProps] of Object.entries(nodeData.inlinePseudoStyles || {})) {
                    yield applyStyleProperties(primaryStyle, pseudoProps, { pseudo }, isLegacy, element);
                }
            }
        }
    });
}
function buildElementTree(parentNode_1, rawNodeData_1) {
    return __awaiter(this, arguments, void 0, function* (parentNode, rawNodeData, isLegacy = false) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w;
        // Normalize text: handle array of lines (literal string format) from backend
        const text = Array.isArray(rawNodeData.text)
            ? rawNodeData.text.join("\n")
            : rawNodeData.text;
        const nodeData = Object.assign(Object.assign({}, rawNodeData), { text: text });
        // TYPE UPGRADE: Promote "custom" nodes that match native Webflow form tags.
        // This covers stale JSON where type="custom" tag="form/input/label/..." was emitted
        // before the backend gained form-type awareness.
        if (nodeData.type === "custom") {
            const tTag = (_a = nodeData.tag) === null || _a === void 0 ? void 0 : _a.toLowerCase();
            if (tTag === "form") {
                nodeData.type = "FormForm";
            }
            else if (tTag === "label") {
                nodeData.type = "FormBlockLabel";
            }
            else if (tTag === "textarea") {
                nodeData.type = "FormTextarea";
            }
            else if (tTag === "select") {
                nodeData.type = "FormSelect";
            }
            else if (tTag === "button") {
                // Only upgrade button if it's clearly a form submit/button, not a custom-styled one.
                // Heuristic: if it has type="submit" attribute or no children that are non-text.
                const btnType = (_c = (_b = nodeData.attributes) === null || _b === void 0 ? void 0 : _b.type) === null || _c === void 0 ? void 0 : _c.toLowerCase();
                if (btnType === "submit" || btnType === "button" || btnType === undefined) {
                    nodeData.type = "FormButton";
                }
            }
            else if (tTag === "input") {
                const inputType = (((_d = nodeData.attributes) === null || _d === void 0 ? void 0 : _d.type) || "text").toLowerCase();
                if (inputType === "checkbox")
                    nodeData.type = "FormCheckboxInput";
                else if (inputType === "radio")
                    nodeData.type = "FormRadioInput";
                else if (inputType === "submit")
                    nodeData.type = "FormButton";
                else
                    nodeData.type = "FormTextInput";
            }
        }
        // WEBFLOW COMPLIANCE: If a Heading or Paragraph has children, it MUST be a custom DOM element
        // to avoid "Elements cannot be added to Paragraph elements" error.
        const isTextType = ["Paragraph", "Heading", "Link", "TextBlock"].includes(nodeData.type) ||
            ["p", "span", "label", "li", "a", "h1", "h2", "h3", "h4", "h5", "h6"].includes(((_e = nodeData.tag) === null || _e === void 0 ? void 0 : _e.toLowerCase()) || "");
        const originalType = nodeData.type;
        if ((nodeData.type === "Heading" || nodeData.type === "Paragraph") &&
            nodeData.children &&
            nodeData.children.length > 0) {
            nodeData.type = "custom";
        }
        // SVG AUTOMATIC FALLBACK: Webflow API often blocks SVG specific attributes (d, viewBox, etc)
        // or causes Designer instability when creating complex SVG trees via DOM.
        // We detect the top-level 'svg' tag in a 'custom' node and treat it as a Manual Embed candidate.
        const isSvgRoot = nodeData.type === "custom" && ((_f = nodeData.tag) === null || _f === void 0 ? void 0 : _f.toLowerCase()) === "svg";
        if (isSvgRoot) {
            log(`    ⚠ SVG node detected (tag: ${nodeData.tag}). Handling as manual embed...`, "warn");
            const code = nodeToHtml(nodeData);
            log(`    [DEBUG] SVG code serialized (${code.length} chars)`, "info");
            const embedName = `SVG Manual Embed ${fallbackEmbeds.length + 1}`;
            const embedEntry = {
                code,
                classList: nodeData.classes || [],
                tag: nodeData.tag || "svg",
                displayName: embedName
            };
            recordFallbackEmbed(embedEntry);
            try {
                log(`    [DEBUG] Creating HtmlEmbed...`, "info");
                // Append an empty HtmlEmbed element where the user should paste the code
                const embedEl = yield withTimeout(smartAppend(parentNode, webflow.elementPresets.HtmlEmbed || webflow.elementPresets.DOM), 5000, "svg-htmlembed");
                // Attach the element to the fallback entry for interactive selection
                embedEntry.element = embedEl;
                // Apply classes/styles to the placeholder element to preserve grid layout
                if (embedEl) {
                    yield applyClassesAndStyles(embedEl, nodeData, isLegacy);
                }
            }
            catch (e) {
                log(`    ⚠ HtmlEmbed creation skipped: ${e.message || e}`, "info");
            }
            const totalNodesInBranch = countAllNodes([nodeData]);
            log(`    [DEBUG] Branch nodes counted: ${totalNodesInBranch}. Incrementing progress...`, "info");
            incrementProgress(totalNodesInBranch);
            log(`    [DEBUG] SVG branch finished. Returning.`, "info");
            return;
        }
        const preset = getPresetForType(nodeData);
        let element;
        try {
            // ------------------------------------
            // Create Element
            // ------------------------------------
            // Use direct append for immediate access to the element reference
            if (!preset) {
                log(`    ✕ Unsupported node type or empty preset for type: ${nodeData.type}`, "error");
                return;
            }
            // ------------------------------------
            // HtmlEmbed Wrapping Logic
            // ------------------------------------
            let targetParent = parentNode;
            if (nodeData.type === "HtmlEmbed") {
                try {
                    log(`    [EMBED] Creating wrapper div.htmlembed...`);
                    const wrapper = yield smartAppend(parentNode, webflow.elementPresets.DivBlock);
                    let embedStyle = yield getStyleByName("htmlembed");
                    if (!embedStyle) {
                        try {
                            embedStyle = yield webflow.createStyle("htmlembed");
                        }
                        catch (e) {
                            if (e.message.toLowerCase().includes("conflict")) {
                                embedStyle = yield getStyleByName("htmlembed");
                            }
                        }
                    }
                    if (embedStyle)
                        yield wrapper.setStyles([embedStyle]);
                    targetParent = wrapper;
                }
                catch (wrapErr) {
                    log(`    ⚠ Failed to create wrapper div: ${wrapErr.message}. Proceeding without wrapper.`, "warn");
                }
            }
            element = yield smartAppend(targetParent, preset);
            if (!element) {
                console.error("Failed to create element for node:", nodeData);
                return;
            }
            // ------------------------------------
            // HtmlEmbed: Re-fetch fresh reference
            // ------------------------------------
            if (nodeData.type === "HtmlEmbed") {
                try {
                    const fresh = yield webflow.getSelectedElement();
                    if (fresh && (fresh.type === "HtmlEmbed" || fresh.type === "DOM")) {
                        element = fresh;
                        log(`    [EMBED] Re-fetched fresh element reference (type: ${fresh.type})`, "info");
                    }
                }
                catch (e) {
                    log(`    [EMBED] Could not re-fetch element: ${e.message}. Using original reference.`, "warn");
                }
            }
            // ------------------------------------
            // Preset Children Clearing & Reference Shifting (List, FormForm)
            // ------------------------------------
            // Move this BEFORE classes/styles so classes/IDs target the actual functional element (e.g. FormForm instead of FormWrapper)
            if ((nodeData.type === "List" || nodeData.type === "FormForm") && element.getChildren) {
                try {
                    if (nodeData.type === "List") {
                        const defaultChildren = yield element.getChildren();
                        if (defaultChildren && defaultChildren.length > 0) {
                            log(`    [LIST] Clearing ${defaultChildren.length} default items...`);
                            for (const child of defaultChildren) {
                                yield child.remove();
                            }
                        }
                    }
                    else if (nodeData.type === "FormForm") {
                        // FormForm preset creates a FormWrapper containing FormForm (index 0), SuccessMessage (index 1), ErrorMessage (index 2)
                        const wrapperChildren = yield element.getChildren();
                        if (wrapperChildren && wrapperChildren.length > 0) {
                            const innerForm = wrapperChildren[0];
                            // Clear default inputs inside the inner form
                            if (innerForm && innerForm.getChildren) {
                                const formChildren = yield innerForm.getChildren();
                                if (formChildren && formChildren.length > 0) {
                                    log(`    [FORM] Clearing default inputs...`);
                                    for (const child of formChildren) {
                                        yield child.remove();
                                    }
                                }
                            }
                            // Shift element reference so classes and children target the inner FormForm, not the wrapper.
                            element = innerForm;
                        }
                    }
                }
                catch (e) {
                    console.warn("Failed to clear default children:", e);
                }
            }
            // Apply classes and styles
            yield applyClassesAndStyles(element, nodeData, isLegacy);
            // ------------------------------------
            // Set Tag
            // ------------------------------------
            let tagToSet = (_g = nodeData.tag) === null || _g === void 0 ? void 0 : _g.toLowerCase();
            // Skip setting 'span' tag for non-DOM elements as it's not a valid top-level block tag for DivBlocks
            if (tagToSet === "span" &&
                element.type !== "DOM" &&
                element.type !== "DOMElement" &&
                element.type !== "dom")
                tagToSet = undefined;
            // If we fell back to DivBlock for a Paragraph/Heading with children, ensure it maintains semantic tag
            if (!tagToSet && nodeData.children && nodeData.children.length > 0) {
                if (originalType === "Paragraph")
                    tagToSet = "p";
                if (originalType === "Heading")
                    tagToSet = ((_h = rawNodeData.tag) === null || _h === void 0 ? void 0 : _h.toLowerCase()) || "h2";
            }
            const isSpecializedHtmlEmbed = nodeData.type === "HtmlEmbed" && element.type !== "DOM";
            if (tagToSet && element.setTag && !isSpecializedHtmlEmbed) {
                yield element.setTag(tagToSet);
            }
            // ------------------------------------
            // Heading Level
            // ------------------------------------
            if (nodeData.type === "Heading" && element.setHeadingLevel && tagToSet) {
                const m = tagToSet.match(/^h([1-6])$/i);
                if (m) {
                    const level = parseInt(m[1]);
                    try {
                        yield element.setHeadingLevel(level);
                        log(`    [HEADING] Level set to H${level}`);
                    }
                    catch (e) {
                        console.warn(`Failed to set heading level ${level}:`, e.message);
                    }
                }
            }
            // ------------------------------------
            // Text Content
            // ------------------------------------
            if ((element.setTextContent || element.setText) && !isSpecializedHtmlEmbed) {
                const shouldSetText = nodeData.text !== undefined || isTextType;
                if (shouldSetText) {
                    const textValue = nodeData.text || "";
                    const nodeHasChildren = nodeData.children && nodeData.children.length > 0;
                    const isContainerType = [
                        "Block",
                        "Heading",
                        "Paragraph",
                        "Link",
                        "ListItem",
                        "custom",
                    ].includes(nodeData.type);
                    if (isContainerType && textValue.length > 0 && nodeHasChildren) {
                        try {
                            const textBlock = yield element.append(webflow.elementPresets.DOM);
                            const wrapperTag = nodeData.tag === "p" || ((_j = nodeData.tag) === null || _j === void 0 ? void 0 : _j.match(/^h[1-6]$/))
                                ? "span"
                                : "div";
                            if (textBlock.setTag)
                                yield textBlock.setTag(wrapperTag);
                            yield setElementText(textBlock, textValue);
                        }
                        catch (e) {
                            yield setElementText(element, textValue);
                        }
                    }
                    else {
                        yield setElementText(element, textValue);
                    }
                }
            }
            // ------------------------------------
            // Attributes & ID
            // ------------------------------------
            if (nodeData.id) {
                try {
                    if (element.type === "DOM" && element.setAttribute) {
                        yield withTimeout(element.setAttribute("id", nodeData.id), 5000, "setId");
                    }
                    else if (element.setCustomAttribute) {
                        yield withTimeout(element.setCustomAttribute("id", nodeData.id), 5000, "setId-custom");
                    }
                    else if (element.setAttribute) {
                        yield withTimeout(element.setAttribute("id", nodeData.id), 5000, "setId");
                    }
                }
                catch (e) {
                    log(`    ⚠ Failed to set ID: ${e.message}`, "warn");
                }
            }
            if (nodeData.attributes && Object.keys(nodeData.attributes).length > 0) {
                for (const [key, rawValue] of Object.entries(nodeData.attributes)) {
                    if (nodeData.type === "Image" && (key === "src" || key === "alt"))
                        continue;
                    if (nodeData.type === "Link" && (key === "href" || key === "target"))
                        continue;
                    if (key === "data-asset")
                        continue;
                    const value = rawValue === "" ? "true" : String(rawValue);
                    try {
                        if (element.type === "DOM" && element.setAttribute) {
                            yield withTimeout(element.setAttribute(key, value), 5000, `setAttribute-${key}`);
                        }
                        else if (element.setCustomAttribute) {
                            yield withTimeout(element.setCustomAttribute(key, value), 5000, `setAttribute-${key}`);
                        }
                        else if (element.setAttribute) {
                            yield withTimeout(element.setAttribute(key, value), 5000, `setAttribute-${key}`);
                        }
                    }
                    catch (e) {
                        log(`    ⚠ Failed to set attribute "${key}": ${e.message}`, "warn");
                    }
                }
            }
            const src = (_k = nodeData.attributes) === null || _k === void 0 ? void 0 : _k.src;
            const href = (_l = nodeData.attributes) === null || _l === void 0 ? void 0 : _l.href;
            // ------------------------------------
            // Form Inputs Handlers
            // ------------------------------------
            if (element.type === "FormTextInput" ||
                element.type === "FormTextarea" ||
                element.type === "FormSelect" ||
                element.type === "FormCheckboxInput" ||
                element.type === "FormRadioInput") {
                if (((_m = nodeData.attributes) === null || _m === void 0 ? void 0 : _m.name) && typeof element.setName === "function") {
                    yield element.setName(nodeData.attributes.name);
                }
                if (((_o = nodeData.attributes) === null || _o === void 0 ? void 0 : _o.required) != null && typeof element.setRequired === "function") {
                    yield element.setRequired(true);
                }
                // Only FormTextInput supports setInputType
                if (element.type === "FormTextInput" && ((_p = nodeData.attributes) === null || _p === void 0 ? void 0 : _p.type) && typeof element.setInputType === "function") {
                    const inputType = nodeData.attributes.type.toLowerCase();
                    if (["text", "email", "password", "tel", "number", "url"].includes(inputType)) {
                        yield element.setInputType(inputType);
                    }
                }
                if (((_q = nodeData.attributes) === null || _q === void 0 ? void 0 : _q.placeholder) && typeof element.setCustomAttribute === "function") {
                    yield element.setCustomAttribute("placeholder", nodeData.attributes.placeholder);
                }
            }
            if (nodeData.type === "Image") {
                if (src && element.setAsset) {
                    log(`    [IMAGE] Uploading asset: ${src}...`);
                    const asset = yield uploadAssetFromUrl(src);
                    if (asset) {
                        yield element.setAsset(asset);
                        log(`    ✓ Asset uploaded successfully`, "success");
                    }
                    else {
                        log(`    ⚠ Asset upload failed, falling back to src attribute`, "warn");
                        yield ((_r = element.setCustomAttribute) === null || _r === void 0 ? void 0 : _r.call(element, "src", src));
                    }
                }
                else if (src && element.setAttribute) {
                    yield element.setAttribute("src", src);
                }
                // Handle Alt Text
                if (((_s = nodeData.attributes) === null || _s === void 0 ? void 0 : _s.alt) && element.setAltText) {
                    yield element.setAltText(String(nodeData.attributes.alt));
                }
            }
            if (nodeData.type === "Link") {
                // Handle Href
                if (href) {
                    if (element.setSettings) {
                        yield element.setSettings("url", href);
                    }
                    else if (element.setAttribute) {
                        yield element.setAttribute("href", href);
                    }
                    else if (element.setCustomAttribute) {
                        yield element.setCustomAttribute("href", href);
                    }
                }
                // Handle Target
                if (((_t = nodeData.attributes) === null || _t === void 0 ? void 0 : _t.target) && element.setTarget) {
                    yield element.setTarget(nodeData.attributes.target);
                }
            }
            // Special handling for data-asset: Upload external URLs to Webflow assets
            if (((_u = nodeData.attributes) === null || _u === void 0 ? void 0 : _u["data-asset"]) && element.setCustomAttribute) {
                const rawVal = nodeData.attributes["data-asset"];
                const asset = yield uploadAssetFromUrl(rawVal);
                if (asset) {
                    const assetUrl = yield asset.getUrl();
                    yield element.setCustomAttribute("data-asset", assetUrl);
                }
                else {
                    // Fallback to raw value if upload fails (e.g. invalid URL or limited asset permissions)
                    yield element.setCustomAttribute("data-asset", rawVal);
                }
            }
            // ------------------------------------
            // Specialized Elements (HtmlEmbed)
            // ------------------------------------
            if (nodeData.type === "HtmlEmbed") {
                if (nodeData.text) {
                    let success = false;
                    if (element.type === "DOM") {
                        log(`    [EMBED] Custom DOM fallback detected. Content applied via tag/textContent.`, "info");
                    }
                    else {
                        log(`    [EMBED] Attempting automated internal content injection (Type: ${element.type})...`);
                        // Attempt multiple injection patterns for HtmlEmbed to bypass V2 API restrictions
                        const patterns = [
                            {
                                name: "setHtml",
                                fn: (el, val) => el.setHtml(val),
                            },
                            {
                                name: "setHtmlContent",
                                fn: (el, val) => el.setHtmlContent(val),
                            },
                            {
                                name: "setSettings({html})",
                                fn: (el, val) => el.setSettings({ html: val }),
                            },
                            {
                                name: "setSettings({code})",
                                fn: (el, val) => el.setSettings({ code: val }),
                            },
                            {
                                name: "setSettings('html')",
                                fn: (el, val) => el.setSettings("html", val),
                            },
                            {
                                name: "setSettings('code')",
                                fn: (el, val) => el.setSettings("code", val),
                            },
                        ];
                        for (const pattern of patterns) {
                            if (success)
                                break;
                            try {
                                if (typeof element[pattern.name.split("(")[0]] === "function") {
                                    yield pattern.fn(element, nodeData.text);
                                    success = true;
                                    log(`    ✓ Embed content injected via ${pattern.name}`, "success");
                                }
                            }
                            catch (err) {
                                // Silently try next pattern
                            }
                        }
                        // If all else fails
                        if (!success) {
                            const embedEntry = {
                                code: nodeData.text,
                                classList: nodeData.classes || [],
                                tag: nodeData.tag || nodeData.type,
                                element: element
                            };
                            recordFallbackEmbed(embedEntry);
                            log(`    ⚠ Automated injection blocked by Webflow API. Added to Manual Embeds list. generating visible raw-code placeholder on canvas...`, "warn");
                            try {
                                // Webflow's DOM primitive allows <textarea> which preserves whitespace perfectly
                                // entirely avoiding the data-attribute stringification issue.
                                // Use targetParent (the wrapper) to keep it contained
                                const textArea = yield targetParent.append(webflow.elementPresets.DOM);
                                if (textArea) {
                                    yield textArea.setTag("textarea");
                                    // Webflow v2's primitive DOM sometimes blocks attributes; sticking to content.
                                    yield textArea.setTextContent(nodeData.text);
                                    log(`    👉 SOLUTION: Copy the code directly from the text area that just appeared on your canvas, paste it into the HTML Embed setting, and then delete the box.`, "info");
                                }
                            }
                            catch (textareaErr) {
                                log(`    ✕ Failed to create visual textarea fallback: ${textareaErr.message}`, "error");
                                // Attempt final data-attribute fallback if supported on the original element
                                if (typeof element.setCustomAttribute ===
                                    "function") {
                                    yield element.setCustomAttribute("data-code-source", nodeData.text);
                                }
                            }
                        }
                    }
                }
            }
            // Children (Recursive)
            // ------------------------------------
            incrementProgress();
            // Special handling for FormSelect: Use native addOption() for <option> children
            // as FormSelect preset doesn't support .append() for arbitrary DOM nodes.
            const isSelect = nodeData.type === "FormSelect" || (element && element.type === "FormSelect");
            if (isSelect && typeof element.addOption === "function" && nodeData.children) {
                const optionNodes = nodeData.children.filter(c => { var _a, _b; return ((_a = c.tag) === null || _a === void 0 ? void 0 : _a.toLowerCase()) === "option" || c.type === "custom" && ((_b = c.tag) === null || _b === void 0 ? void 0 : _b.toLowerCase()) === "option"; });
                if (optionNodes.length > 0) {
                    log(`    [SELECT] Adding ${optionNodes.length} options natively...`);
                    for (const opt of optionNodes) {
                        // Extract display name: prefer direct text, then child String node, then fallback
                        let name = opt.text || "";
                        if (!name && opt.children) {
                            const stringChild = opt.children.find(c => !c.tag && c.text);
                            if (stringChild)
                                name = stringChild.text || "";
                        }
                        if (!name)
                            name = "Option";
                        const value = ((_v = opt.attributes) === null || _v === void 0 ? void 0 : _v.value) || name;
                        try {
                            yield element.addOption({ name: String(name), value: String(value) });
                        }
                        catch (e) {
                            log(`    ⚠ Failed to add option "${name}": ${e.message}`, "warn");
                        }
                    }
                    // Filter out these option nodes from recursion so they aren't added as siblings
                    nodeData.children = nodeData.children.filter(c => { var _a; return ((_a = c.tag) === null || _a === void 0 ? void 0 : _a.toLowerCase()) !== "option" && !(c.tag === "option"); });
                }
            }
            if (nodeData.children && nodeData.children.length > 0) {
                for (const child of nodeData.children) {
                    yield buildElementTree(element, child, isLegacy);
                }
            }
        }
        catch (err) {
            const label = ((_w = nodeData.classes) === null || _w === void 0 ? void 0 : _w[0]) || nodeData.tag || nodeData.type;
            log(`    ✕ Error building node [${label}]: ${err.message || err}`, "error");
            console.error("Error building node:", nodeData, err);
        }
    });
}
function resolveValueForCreate(type, serVal) {
    if (!serVal)
        return undefined;
    // If it's a simple string or number, return it (e.g. Color hex or Number)
    if (typeof serVal === "string" || typeof serVal === "number") {
        return serVal;
    }
    // Handle the structure: { type, value: ... }
    // But be careful: if it's { unit, value }, that IS the value (for Size).
    let effectiveValue = serVal;
    if (serVal.value !== undefined && serVal.unit === undefined) {
        // It's a wrapper like { type: "Color", value: "#..." }
        effectiveValue = serVal.value;
    }
    // If it's a custom variable (isCustom: true), use customValue
    if (serVal.isCustom && serVal.customValue) {
        effectiveValue = serVal.customValue;
    }
    if (typeof effectiveValue === "string") {
        const trimmed = effectiveValue.trim();
        const lower = trimmed.toLowerCase();
        // 1. Alias Resolution — var(--name) → native Webflow variable alias
        const varMatch = trimmed.match(/^var\((--[^,)]+)(?:,\s*[^)]+)?\)$/);
        if (varMatch) {
            const varName = varMatch[1].trim();
            const cached = tryResolveVariable(varName);
            if (cached && cached.cssName) {
                log(`    [RESOLVE] Resolved var() alias for ${type}: "${varName}" -> "var(${cached.cssName})"`);
                return { type: 'custom', value: `var(${cached.cssName})` };
            }
            else if (cached && cached.variable) {
                return cached.variable;
            }
            // Unresolved var() reference — pass as CustomValue so Webflow stores the raw string
            log(`    [RESOLVE] Unresolved var() for ${type}: "${trimmed}" — storing as CustomValue`);
            return { type: 'custom', value: trimmed };
        }
        // 2. Complex CSS functions (clamp/calc/min/max)
        // The Webflow API's CustomValue type is { type: 'custom', value: string }.
        // Passing a raw string fails silently and leaves the variable at its 0px placeholder.
        if (lower.startsWith("clamp(") ||
            lower.startsWith("calc(") ||
            lower.startsWith("min(") ||
            lower.startsWith("max(")) {
            log(`    [RESOLVE] Complex CSS function for ${type}: "${trimmed}" — wrapping as CustomValue`);
            return { type: 'custom', value: trimmed };
        }
        // 3. Size with unit strings
        if (type === "Size" && /^-?[0-9.]+(px|rem|em|vw|vh|%|ch|ex)$/.test(lower)) {
            const match = lower.match(/^(-?[0-9.]+)([a-z%]+)$/);
            if (match) {
                const res = { value: parseFloat(match[1]), unit: match[2] };
                log(`    [RESOLVE] String to Size object for ${type}: "${trimmed}" -> ${JSON.stringify(res)}`);
                return res;
            }
        }
        return trimmed;
    }
    // If it's already a Size object { value, unit }, return it
    if (type === "Size" && typeof effectiveValue === "object" && effectiveValue !== null) {
        if (effectiveValue.unit !== undefined && effectiveValue.value !== undefined) {
            const res = { value: Number(effectiveValue.value), unit: String(effectiveValue.unit) };
            log(`    [RESOLVE] Direct Size object for ${type}: ${JSON.stringify(res)}`);
            return res;
        }
    }
    return effectiveValue;
}
function pasteCollections(collections) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        log(`Found ${collections.length} variable collection${collections.length !== 1 ? "s" : ""}. Importing...`);
        // Pre-fetch all existing collections once
        const existingCollections = yield webflow.getAllVariableCollections();
        const defaultCollection = typeof webflow.getDefaultVariableCollection === "function"
            ? yield webflow.getDefaultVariableCollection()
            : existingCollections[0];
        const existingCollectionMap = new Map();
        for (const existing of existingCollections) {
            try {
                const n = (yield withTimeout(existing.getName(), 5000, "existingCol.getName"));
                if (n)
                    existingCollectionMap.set(n.trim(), existing);
            }
            catch (e) {
                // Some system collections might fail on getName()
            }
        }
        // 1. Setup collection map and gather all modes/variables strictly by their intended group
        const collectionMap = new Map();
        for (const col of collections) {
            const parentColName = col.name || "Global Variables";
            if (!collectionMap.has(parentColName)) {
                collectionMap.set(parentColName, { modes: [], variables: [] });
            }
            const colEntry = collectionMap.get(parentColName);
            if (col.modes && col.modes.length > 0) {
                col.modes.forEach((m) => {
                    const mName = typeof m === "string" ? m : m === null || m === void 0 ? void 0 : m.name;
                    if (mName && !colEntry.modes.includes(mName))
                        colEntry.modes.push(mName);
                });
            }
            for (const v of col.variables) {
                const finalColName = v.group || parentColName;
                if (!collectionMap.has(finalColName)) {
                    collectionMap.set(finalColName, { modes: [], variables: [] });
                }
                const targetEntry = collectionMap.get(finalColName);
                targetEntry.variables.push(v);
                // Only infer modes from variables if the collection itself didn't provide any
                if (targetEntry.modes.length === 0 ||
                    !col.modes ||
                    col.modes.length === 0) {
                    for (const modeName of Object.keys(v.values)) {
                        if (!targetEntry.modes.includes(modeName)) {
                            targetEntry.modes.push(modeName);
                        }
                    }
                }
            }
        }
        log(`Identified ${collectionMap.size} unique collection(s) to process.`);
        // 2. Pass 1: Setup Collections, Modes, and Create/Cache all Variables
        log(`Step 1: Setting up collections and creating variables...`);
        const variableProcessingQueue = [];
        for (const [colName, colData] of collectionMap.entries()) {
            log(`  Processing collection: "${colName}" (${colData.modes.length} mode(s))`);
            const lowerName = colName.trim().toLowerCase();
            const isBaseVariant = lowerName === "base collection" ||
                lowerName === "base" ||
                lowerName === "default";
            let targetCol = null;
            if (isBaseVariant) {
                log(`    ℹ Mapping "${colName}" to project default collection...`, "info");
                targetCol = defaultCollection;
            }
            else {
                targetCol = existingCollectionMap.get(colName.trim());
            }
            if (!targetCol) {
                log(`    + Creating new collection: "${colName}"...`);
                try {
                    targetCol = (yield withTimeout(webflow.createVariableCollection(colName), 15000, "createVariableCollection"));
                    existingCollectionMap.set(colName.trim(), targetCol);
                }
                catch (err) {
                    log(`    ✕ Failed to create collection "${colName}": ${err.message}`, "error");
                    continue;
                }
            }
            if (!targetCol) {
                log(`    ✕ Critical Error: No target collection for "${colName}"`, "error");
                continue;
            }
            // Sync Modes
            const modesInCol = (yield withTimeout(targetCol.getAllVariableModes(), 10000, "getAllVariableModes"));
            const modeRefs = {};
            for (const m of modesInCol) {
                const n = (yield withTimeout(m.getName(), 5000, "mode.getName"));
                modeRefs[n] = m;
            }
            for (const modeDef of colData.modes) {
                const mName = typeof modeDef === "string" ? modeDef : modeDef === null || modeDef === void 0 ? void 0 : modeDef.name;
                if (!mName || mName === "Base Mode")
                    continue;
                if (!modeRefs[mName]) {
                    log(`    + Creating mode "${mName}" in collection "${colName}"...`);
                    try {
                        const newMode = (yield withTimeout(targetCol.createVariableMode(mName), 10000, "createVariableMode"));
                        modeRefs[mName] = newMode;
                    }
                    catch (err) {
                        log(`    ✕ Failed to create mode "${mName}" in "${colName}": ${err.message}`, "error");
                    }
                }
            }
            // Map "Base Mode" (from JSON) to Webflow's first (default) mode
            const baseModeName = "Base Mode";
            if (!modeRefs[baseModeName] && modesInCol.length > 0) {
                modeRefs[baseModeName] = modesInCol[0];
            }
            // Pre-fetch all variables in THIS collection
            const varsInCol = (yield withTimeout(targetCol.getAllVariables(), 15000, "targetCol.getAllVariables"));
            const varMap = new Map();
            for (const v of varsInCol) {
                const n = (yield withTimeout(v.getName(), 5000, "v.getName"));
                varMap.set(n, v);
            }
            // Create/Cache variables
            for (const serializedVar of colData.variables) {
                const expectedName = serializedVar.name.replace(/--/g, "/");
                let webflowVar = varMap.get(expectedName) || varMap.get(serializedVar.name);
                if (!webflowVar) {
                    // PASS 1: CREATION
                    // Resolve the base mode value upfront. For CustomValues (clamp/calc/etc)
                    // we use them directly at creation — no need for Pass 2 to patch.
                    // For everything else, fall back to a safe literal baseline.
                    const baseSerVal = (_a = serializedVar.values["Base Mode"]) !== null && _a !== void 0 ? _a : Object.values(serializedVar.values)[0];
                    const baseResolved = baseSerVal
                        ? resolveValueForCreate(serializedVar.type, baseSerVal)
                        : undefined;
                    const isCustomVal = baseResolved !== null &&
                        typeof baseResolved === "object" &&
                        baseResolved.type === "custom";
                    let defaultValue;
                    switch (serializedVar.type) {
                        case "Color":
                            defaultValue = typeof baseResolved === "string" ? baseResolved : "#000000";
                            break;
                        case "Size":
                            // Use CustomValue directly (e.g. clamp/calc), else use resolved { unit, value } or fallback
                            if (isCustomVal) {
                                defaultValue = baseResolved;
                            }
                            else if (baseResolved && typeof baseResolved === "object" && baseResolved.unit) {
                                defaultValue = baseResolved;
                            }
                            else {
                                defaultValue = { unit: "px", value: 0 };
                            }
                            break;
                        case "FontFamily":
                            defaultValue = typeof baseResolved === "string" ? baseResolved : "Inter";
                            break;
                        case "Number":
                            defaultValue = typeof baseResolved === "number" ? baseResolved : 0;
                            break;
                        case "Percentage":
                            defaultValue = typeof baseResolved === "number" ? baseResolved : 0;
                            break;
                        default:
                            defaultValue = "#000000";
                    }
                    try {
                        const name = expectedName;
                        log(`    [CREATE] Initializing ${serializedVar.type} variable "${name}" with value: ${JSON.stringify(defaultValue)}`);
                        switch (serializedVar.type) {
                            case "Color":
                                webflowVar = (yield withTimeout(targetCol.createColorVariable(name, defaultValue), 10000, "createColorVariable"));
                                break;
                            case "Size":
                                webflowVar = (yield withTimeout(targetCol.createSizeVariable(name, defaultValue), 10000, "createSizeVariable"));
                                break;
                            case "FontFamily":
                                webflowVar = (yield withTimeout(targetCol.createFontFamilyVariable(name, defaultValue), 10000, "createFontFamilyVariable"));
                                break;
                            case "Number":
                                webflowVar = (yield withTimeout(targetCol.createNumberVariable(name, defaultValue), 10000, "createNumberVariable"));
                                break;
                            case "Percentage":
                                webflowVar = (yield withTimeout(targetCol.createPercentageVariable(name, defaultValue), 10000, "createPercentageVariable"));
                                break;
                        }
                    }
                    catch (creErr) {
                        log(`    ✕ Failed to create variable "${serializedVar.name}": ${creErr.message}`, "error");
                        continue;
                    }
                }
                if (webflowVar) {
                    // Cache it immediately so subsequent variables (even in this pass) can reference it
                    try {
                        const [binding, rawValue, cssName] = (yield Promise.all([
                            withTimeout(webflowVar.getBinding(), 5000, "v.getBinding"),
                            withTimeout(webflowVar.get(), 5000, "v.get"),
                            typeof webflowVar.getCSSName === "function"
                                ? withTimeout(webflowVar.getCSSName(), 5000, "v.getCSSName")
                                : Promise.resolve(`--${serializedVar.name}`),
                        ]));
                        const meta = {
                            variable: webflowVar,
                            binding,
                            rawValue,
                            type: serializedVar.type,
                            cssName,
                        };
                        variableCache.set(serializedVar.name, meta);
                        variableCache.set(`--${serializedVar.name}`, meta);
                    }
                    catch (e) {
                        const fallbackMeta = {
                            variable: webflowVar,
                            type: serializedVar.type,
                        };
                        variableCache.set(serializedVar.name, fallbackMeta);
                        variableCache.set(`--${serializedVar.name}`, fallbackMeta);
                    }
                    // Queue for value syncing in Pass 2
                    variableProcessingQueue.push({
                        serializedVar,
                        targetCol,
                        modeRefs,
                    });
                }
                // Add a tiny delay to allow the Designer's UI thread to breathe between creations
                yield sleep(25);
            }
        }
        // 3. Pass 2: Sync Mode Values (supports Aliasing)
        log(`Step 2: Syncing variable values and aliases...`);
        const SYNC_CHUNK = 10;
        for (let i = 0; i < variableProcessingQueue.length; i += SYNC_CHUNK) {
            const chunk = variableProcessingQueue.slice(i, i + SYNC_CHUNK);
            yield Promise.all(chunk.map((_a) => __awaiter(this, [_a], void 0, function* ({ serializedVar, modeRefs }) {
                var _b;
                const webflowVar = (_b = variableCache.get(serializedVar.name)) === null || _b === void 0 ? void 0 : _b.variable;
                if (!webflowVar)
                    return;
                for (const [modeName, modeSerVal] of Object.entries(serializedVar.values)) {
                    const modeRef = modeRefs[modeName];
                    if (!modeRef)
                        continue;
                    try {
                        const valueToSet = resolveValueForCreate(serializedVar.type, modeSerVal);
                        log(`    [SYNC] Setting "${serializedVar.name}" (${serializedVar.type}) in mode "${modeName}" to: ${JSON.stringify(valueToSet)}`);
                        yield withTimeout(webflowVar.set(valueToSet, { mode: modeRef }), 10000, "variable.set");
                    }
                    catch (modeErr) {
                        log(`    ✕ Failed to set mode "${modeName}" on "${serializedVar.name}": ${modeErr.message}`, "warn");
                    }
                }
            })));
            incrementProgress(chunk.length);
            yield sleep(50);
        }
        log(`✓ Variable synchronization complete (Pass 1: Creation, Pass 2: Value Sync)`, "success");
    });
}
/**
 * Synchronizes the internal variable cache with existing variables in the Webflow project.
 * This ensures that modular JSON segments (which might lack the collections array)
 * can still resolve CSS variables back to their Webflow UI equivalent.
 */
function syncVariableCacheFromWebflow() {
    return __awaiter(this, void 0, void 0, function* () {
        log("Syncing variables from Webflow project...");
        const startTime = Date.now();
        try {
            const collections = (yield withTimeout(webflow.getAllVariableCollections(), 10000, "getAllVariableCollections"));
            let totalFound = 0;
            for (const col of collections) {
                const variables = (yield withTimeout(col.getAllVariables(), 10000, "getAllVariables"));
                const BATCH_SIZE = 10; // Reduced from 40 for stability
                for (let i = 0; i < variables.length; i += BATCH_SIZE) {
                    const batch = variables.slice(i, i + BATCH_SIZE);
                    yield Promise.all(batch.map((v) => __awaiter(this, void 0, void 0, function* () {
                        let name;
                        try {
                            name = (yield withTimeout(v.getName(), 5000, "v.getName"));
                            if (!name)
                                return;
                        }
                        catch (_a) {
                            return;
                        }
                        let binding = null;
                        let rawValue = null;
                        let cssName = null;
                        try {
                            binding = yield withTimeout(v.getBinding(), 5000, "v.getBinding");
                        }
                        catch (_b) {
                            /* optional */
                        }
                        try {
                            rawValue = yield withTimeout(v.get(), 5000, "v.get");
                        }
                        catch (_c) {
                            /* custom values throw */
                        }
                        try {
                            if (typeof v.getCSSName === "function") {
                                cssName = (yield withTimeout(v.getCSSName(), 5000, "v.getCSSName"));
                            }
                        }
                        catch (_d) {
                            /* optional */
                        }
                        const resolvedCssName = cssName || `--${name}`;
                        const meta = {
                            variable: v,
                            binding,
                            rawValue,
                            type: v.type || "Color",
                            cssName: resolvedCssName,
                        };
                        // Store under the Webflow CSS name (e.g. --font-size-h1-abc)
                        variableCache.set(resolvedCssName.trim(), meta);
                        // Also store under the normalised CSS var name (e.g. --font-size-h1)
                        // so style values like var(--font-size-h1) resolve via direct lookup.
                        const cleanName = name
                            .trim()
                            .toLowerCase()
                            .replace(/\s+/g, "-");
                        variableCache.set(`--${cleanName}`, meta);
                        variableCache.set(cleanName, meta);
                        totalFound++;
                    })));
                }
            }
            const duration = ((Date.now() - startTime) / 1000).toFixed(1);
            log(`✓ Discovered ${totalFound} variables across ${collections.length} collections (${duration}s)`, "success");
        }
        catch (err) {
            log(`✕ Failed to sync existing variables: ${err.message}`, "error");
        }
    });
}
function syncStyleCacheFromWebflow() {
    return __awaiter(this, void 0, void 0, function* () {
        log("Syncing styles from Webflow project...");
        const startTime = Date.now();
        try {
            const allStyles = (yield withTimeout(webflow.getAllStyles(), 15000, "getAllStyles"));
            allStylesMap.clear();
            const BATCH_SIZE = 15;
            for (let i = 0; i < allStyles.length; i += BATCH_SIZE) {
                const batch = allStyles.slice(i, i + BATCH_SIZE);
                yield Promise.all(batch.map((style) => __awaiter(this, void 0, void 0, function* () {
                    try {
                        const name = (yield withTimeout(style.getName(), 5000, `style.getName-${i}`));
                        if (name)
                            allStylesMap.set(name.trim(), style);
                    }
                    catch (e) {
                        // skip styles that fail to report name
                    }
                })));
            }
            const duration = ((Date.now() - startTime) / 1000).toFixed(1);
            log(`✓ Synced ${allStylesMap.size} styles (${duration}s)`, "success");
        }
        catch (err) {
            log(`Failed to sync styles: ${err.message}`, "warn");
        }
    });
}
function buildSiteFromJson(payload) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        let selected;
        try {
            selected = yield withTimeout(webflow.getSelectedElement(), 10000, "getSelectedElement");
        }
        catch (e) {
            log(`✕ No element selected in Designer: ${e.message}`, "error");
        }
        if (!selected) {
            yield webflow.notify({
                type: "Error",
                message: "Please select an element (e.g. Body) to paste into.",
            });
            throw new Error("No element selected in the Designer.");
        }
        // Detect JSON version — v2 is pre-normalized by the backend
        const isLegacy = !payload.__meta || payload.__meta.version < 2;
        if (isLegacy) {
            log("⚠ Legacy JSON detected (v1) — enabling runtime normalization shim.", "warn");
        }
        else {
            log(`JSON v${payload.__meta.version} detected — pre-normalized. Skipping runtime transforms.`);
            window.__v2Normalized = true;
        }
        log("Starting build...");
        variableCache.clear();
        // (Fluid collection reset removed)
        // Reset global style cache for each new build
        window.__wfStyleCache = new Map();
        // Reset Webflow Musts tracking arrays
        fallbackEmbeds = [];
        complexValueEmbeds = [];
        // Step 0: Sync from existing project variables — only when the payload actually
        // references CSS variables (var()). Skipping this on variable-free builds saves
        // 5–30s of unnecessary IPC round-trips to Webflow's variable store.
        const payloadStr = JSON.stringify(payload);
        const payloadHasVars = payloadStr.includes("var(") ||
            payloadStr.includes("clamp(") ||
            payloadStr.includes("calc(");
        if (payloadHasVars) {
            yield syncVariableCacheFromWebflow();
        }
        else {
            log("No CSS variables or complex expressions detected — skipping variable sync.");
        }
        yield syncStyleCacheFromWebflow();
        // Step 1: Variables
        if (payload.collections && payload.collections.length > 0) {
            const totalVars = payload.collections.reduce((sum, c) => sum + c.variables.length, 0);
            totalSteps += totalVars;
            webflow.notify({
                type: "Info",
                message: `Importing ${totalVars} variables...`,
            });
            yield pasteCollections(payload.collections);
            webflow.notify({ type: "Success", message: "✓ Variables imported" });
        }
        else {
            log("No variable collections found — skipping.");
        }
        // Step 2: Global Styles
        const globalStyles = payload.globalStyles || payload.styles;
        if (globalStyles && Object.keys(globalStyles).length > 0) {
            const classSelectors = Object.keys(globalStyles).filter((s) => s.startsWith(".") && !s.includes(" "));
            totalSteps += classSelectors.length;
            webflow.notify({
                type: "Info",
                message: "Applying root global styles...",
            });
            yield applyGlobalStyles(globalStyles, isLegacy);
        }
        // Step 3: DOM Nodes
        let pages = (_a = payload.pages) !== null && _a !== void 0 ? _a : [];
        // If no pages but we have nodes at the root, treat it as a single-page/section payload
        if (pages.length === 0 && payload.nodes && payload.nodes.length > 0) {
            log("Detected single-section payload (nodes at root).");
            pages = [
                {
                    nodes: payload.nodes,
                    globalStyles: payload.globalStyles,
                    styles: payload.styles,
                },
            ];
        }
        let totalNodes = 0;
        pages.forEach((p) => {
            var _a;
            totalNodes += countAllNodes((_a = p.nodes) !== null && _a !== void 0 ? _a : []);
        });
        totalSteps += totalNodes;
        if (totalNodes === 0) {
            log("No nodes found to build — skipping building DOM.", "warn");
            return;
        }
        log(`Building ${pages.length} page${pages.length !== 1 ? "s" : ""} with ${totalNodes} total nodes...`);
        webflow.notify({
            type: "Info",
            message: `Building DOM (${totalNodes} total nodes)...`,
        });
        for (let pi = 0; pi < pages.length; pi++) {
            const page = pages[pi];
            const nodes = (_b = page.nodes) !== null && _b !== void 0 ? _b : [];
            log(`Page ${pi + 1}/${pages.length}: building ${nodes.length} root node${nodes.length !== 1 ? "s" : ""}...`);
            for (let ni = 0; ni < nodes.length; ni++) {
                yield buildElementTree(selected, nodes[ni], isLegacy);
            }
            // Page-level styles (less common, but supported)
            const pageStyles = page.globalStyles || page.styles;
            if (pageStyles && Object.keys(pageStyles).length > 0) {
                log(`Applying page-level styles for "${page.name}"...`);
                yield applyGlobalStyles(pageStyles, isLegacy);
            }
            log(`✓ Page ${pi + 1} complete`, "success");
        }
        log("✓ Build complete!", "success");
        yield webflow.notify({ type: "Success", message: "Site structure built!" });
    });
}
// ------------------------------------
// UI helpers
// ------------------------------------
function setLoading(on) {
    buildBtn.disabled = on;
    spinner.classList.toggle("show", on);
    btnLabel.textContent = on ? "Building…" : "Build Site";
    if (!on) {
        // Re-enable the clear button and finalise the log when done
        const clearBtn = document.getElementById("clear-log-btn");
        if (clearBtn)
            clearBtn.disabled = false;
    }
}
function showError(msg) {
    errorBox.textContent = msg;
    errorBox.classList.add("show");
}
function hideError() {
    errorBox.classList.remove("show");
}
let toastTimer = null;
function showToast(msg, type) {
    const toast = document.getElementById("toast");
    toast.textContent = msg;
    toast.className = `toast toast-${type} show`;
    if (toastTimer)
        clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 3500);
}
function handleAuditStyles() {
    return __awaiter(this, void 0, void 0, function* () {
        clearLog();
        const logPanel = document.getElementById("progress-log");
        if (logPanel)
            logPanel.classList.remove("has-errors");
        // Show progress container so user can see the logs
        const progressContainer = document.getElementById("progress-container");
        if (progressContainer)
            progressContainer.classList.add("show");
        currentProgress = 0;
        totalSteps = 0;
        updateProgressBar();
        log("Starting Search for Invalid Styles (Main Breakpoint)...", "warn");
        findBtn.disabled = true;
        try {
            const allStyles = yield webflow.getAllStyles();
            totalSteps = allStyles.length; // Set total steps for progress bar
            log(`Inspecting ${totalSteps} styles...`);
            let foundCount = 0;
            let finished = 0;
            const logicalProps = [
                "padding-inline",
                "padding-block",
                "margin-inline",
                "margin-block",
                "padding-inline-start",
                "padding-inline-end",
                "margin-inline-start",
                "margin-inline-end",
            ];
            const shorthandProps = ["gap", "inset"];
            for (const style of allStyles) {
                finished++;
                incrementProgress(1); // Update overall progress bar
                if (finished % 10 === 0 || finished === totalSteps) {
                    findBtn.innerHTML = `<span>Searching (${finished} / ${totalSteps})...</span>`;
                }
                const styleName = yield style.getName();
                // User requested 'main' breakpoint only for now to ensure speed and focus
                const properties = yield style.getProperties({
                    breakpoint: "main",
                });
                for (const [prop, val] of Object.entries(properties)) {
                    if (typeof val !== "string")
                        continue;
                    let isInvalid = false;
                    let reason = "";
                    // 1. color-mix check (Critical Publish Blocker)
                    if (val.includes("color-mix")) {
                        isInvalid = true;
                        reason =
                            "Unsupported 'color-mix' function (Publish Blocker)";
                    }
                    // 2. Broken parens / calc expansion check
                    const openCount = (val.match(/\(/g) || []).length;
                    const closeCount = (val.match(/\)/g) || []).length;
                    if (openCount !== closeCount) {
                        isInvalid = true;
                        reason =
                            "Broken parentheses/calc expansion (Publish Blocker)";
                    }
                    // 3. Logical properties check (Webflow Variable incompatibility)
                    if (logicalProps.includes(prop)) {
                        isInvalid = true;
                        reason =
                            "Unsupported logical property (Webflow Variable Incompatibility)";
                    }
                    // 4. Shorthand with variables check (Best practice: expand for native bindings)
                    if (shorthandProps.includes(prop) &&
                        (val.includes("var(") ||
                            val.includes("calc(") ||
                            val.includes("clamp("))) {
                        isInvalid = true;
                        reason =
                            "Complex shorthand with variables (Expand for native mapping)";
                    }
                    // 5. Transition-property variable check
                    if (prop === "transition-property" && val.includes("--")) {
                        isInvalid = true;
                        reason =
                            "CSS Variable in transition-property (Mapping Failure)";
                    }
                    // 6. Garbage fragments check
                    if (val === "*" ||
                        val === ")" ||
                        (val.includes("rgba(0, 0, 0, 0)") &&
                            (val.match(/0 0/g) || []).length > 3)) {
                        isInvalid = true;
                        reason =
                            "Garbage fragment or corrupt coordinate string (Publish Blocker)";
                    }
                    if (isInvalid) {
                        foundCount++;
                        log(`[FOUND] .${styleName}`, "error");
                        log(`   › Property: ${prop}`);
                        log(`   › Value: ${val}`);
                        log(`   › Reason: ${reason}`);
                        if (logPanel)
                            logPanel.classList.add("has-errors");
                    }
                }
            }
            if (foundCount === 0) {
                log("✓ Scan complete: No invalid styles found on Main breakpoint.", "success");
            }
            else {
                log(`Scan complete: Found ${foundCount} invalid properties.`, "warn");
            }
        }
        catch (err) {
            log(`Scan failed: ${err.message}`, "error");
        }
        finally {
            findBtn.disabled = false;
            findBtn.innerHTML = `
         <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
         </svg>
         <span>Find Invalid Styles</span>
        `;
        }
    });
}
// ------------------------------------
// Boot
// ------------------------------------
document.addEventListener("DOMContentLoaded", init);

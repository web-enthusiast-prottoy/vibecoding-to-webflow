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
// Stores: { variable: Variable, binding: string, rawValue: any, type: string }
const variableCache = new Map();
const allStylesMap = new Map();
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
function withTimeout(promise, timeoutMs, name) {
    return __awaiter(this, void 0, void 0, function* () {
        let timeoutHandle;
        const timeoutPromise = new Promise((_, reject) => {
            timeoutHandle = setTimeout(() => reject(new Error(`Timeout: ${name} took too long (> ${timeoutMs}ms)`)), timeoutMs);
        });
        try {
            return yield Promise.race([promise, timeoutPromise]);
        }
        finally {
            clearTimeout(timeoutHandle);
        }
    });
}
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
    // 1. Hover/Focus variants
    if (lower.includes("hover"))
        return "hover";
    if (lower.includes("focus-visible"))
        return "focus-visible";
    if (lower.includes("focus-within"))
        return "focus-within";
    if (lower.includes("focus"))
        return "focus";
    // 2. Child variants
    if (lower.includes("first-child"))
        return "first-child";
    if (lower.includes("last-child"))
        return "last-child";
    // 3. Nth-child logic (Webflow only supports odd/even)
    if (lower.includes("nth-child")) {
        if (lower.includes("even") || lower.includes("(2n)"))
            return "nth-child(even)";
        if (lower.includes("odd"))
            return "nth-child(odd)";
        if (lower.includes("(1)"))
            return "first-child";
        // Default to last-child for other unsupported nth-child (like 4n) as requested
        return "last-child";
    }
    return "noPseudo";
}
function applyStyleProperties(style_1, properties_1, options_1) {
    return __awaiter(this, arguments, void 0, function* (style, properties, options, isLegacy = false) {
        const styleName = yield style.getName();
        const pseudo = normalizePseudo(options === null || options === void 0 ? void 0 : options.pseudo);
        const styleLabel = pseudo !== "noPseudo"
            ? `.${styleName}:${pseudo}`
            : `.${styleName}`;
        // 1. Run normalization/expansion only if legacy or not already normalized
        const isNormalized = !isLegacy && window.__v2Normalized;
        const props = (isLegacy || !isNormalized)
            ? (isLegacy ? normalizePropertiesLegacy(properties) : expandProperties(properties))
            : properties;
        // 2. Resolve var() references to Webflow native Variable objects (purple pills).
        const resolvedProperties = {};
        for (const [prop, val] of Object.entries(props)) {
            let valueToSet = val;
            let isComplex = false;
            const valStr = String(val);
            if (valStr.includes("clamp(") || valStr.includes("calc(") || valStr.includes("min(") || valStr.includes("max(")) {
                // Complex CSS functions (clamp, calc, etc.) must be applied individually via setProperty.
                // Batching them in setProperties() causes Webflow's internal parser to reject them in the UI panel.
                isComplex = true;
            }
            if (typeof valueToSet === "string" && valueToSet.includes("var(")) {
                // Strip fallback from var() before cache lookups.
                // e.g. var(--aether-black, #000) → we only want "--aether-black"
                // Webflow variables don't support fallbacks, so we ignore them entirely.
                const extractVarName = (raw) => raw.split(",")[0].trim();
                // Match a value that is ONLY a single var() with optional fallback
                // Allow for spaces and fallbacks: var( --name, fallback )
                const varMatch = valueToSet.trim().match(/^var\(\s*(--[^,)\s]+)\s*(?:,\s*[^)]+)?\)$/);
                // Extract pure variable name (without fallback or leading/trailing spaces)
                const pureVarName = varMatch ? varMatch[1].trim() : null;
                // Webflow strictly bans 'transition' from custom properties and cannot handle var() natively here.
                // It's safer to completely inline the raw values so complex properties actually work without crashing the API.
                // We only force this for properties that are complex shorthands or have known issues.
                const isShorthandBorder = ["border", "border-top", "border-right", "border-bottom", "border-left", "border-image", "outline"].includes(prop);
                if (prop.startsWith("transition") || prop.startsWith("transform") || isShorthandBorder) {
                    valueToSet = valueToSet.replace(/var\(\s*(--[^,)\s]+)\s*(?:,\s*[^)]+)?\)/g, (match, varNameContent) => {
                        const varName = varNameContent.trim();
                        const cached = variableCache.get(varName);
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
                        return match;
                    });
                }
                else if (pureVarName && !isComplex) {
                    // Simple var() — resolve to native Webflow variable object (purple pill)
                    const cached = variableCache.get(pureVarName);
                    if (cached && cached.variable) {
                        valueToSet = cached.variable;
                    }
                    else if (cached && cached.binding) {
                        valueToSet = cached.binding;
                    }
                    else {
                        // Cache miss: variable not yet synced from Webflow.
                        // Route as __complex__ so the raw var() string is applied via setProperty()
                        // rather than silently injected as a plain CSS string through setProperties().
                        log(`    ⚠ Cache miss for ${pureVarName} — applying via setProperty as raw CSS`, "warn");
                        isComplex = true;
                    }
                }
                else {
                    // Multi-var or complex value — replace each var() reference with Webflow's internal CSS name
                    valueToSet = valueToSet.replace(/var\(\s*(--[^,)\s]+)\s*(?:,\s*[^)]+)?\)/g, (match, varNameContent) => {
                        const varName = varNameContent.trim();
                        const cached = variableCache.get(varName);
                        return cached && cached.cssName
                            ? `var(${cached.cssName})`
                            : match;
                    });
                }
            }
            // Always assign to the standard properties map so it's applied to the underlying CSS bulk payload
            resolvedProperties[prop] = valueToSet;
            if (isComplex) {
                // ALSO flag it for individual application to force a UI panel refresh in Webflow Designer
                resolvedProperties[`__complex__${prop}`] = valueToSet;
            }
        }
        // 3. Build Webflow API options — STRICT: only documented keys allowed.
        // Invalid keys (breakpoint, pseudo) cause IPC bridge timeouts for the ENTIRE call (gotchas §3).
        const bp = (options === null || options === void 0 ? void 0 : options.breakpointId) || "main";
        const hasPseudo = pseudo && pseudo !== "noPseudo";
        // Build options object with ONLY valid keys. Use undefined (no options) when possible
        // so the no-options setProperty/setProperties path is exercised for the common case.
        const wfOptions = (bp !== "main" || hasPseudo)
            ? Object.assign({ breakpointId: bp }, (hasPseudo ? { pseudoStateKey: pseudo } : {})) : undefined;
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
        // 6. Split into three tracks:
        //    - complexEntries: clamp/calc/min/max values — applied via getOrCreateFluidVariable → setProperty
        //    - plainEntries: safe to batch via setProperties() (unless it's a pseudo-state)
        //    - varEntries: { variableId } objects — MUST be applied one-by-one via setProperty()
        //      Batching { variableId } objects in setProperties() causes IPC serialization timeouts.
        const complexEntries = sortedEntries.filter(([k]) => k.startsWith("__complex__"));
        const plainEntries = sortedEntries.filter(([k, v]) => !k.startsWith("__complex__") && (typeof v !== "object" || v === null));
        const varEntries = sortedEntries.filter(([k, v]) => !k.startsWith("__complex__") && typeof v === "object" && v !== null);
        // 6. Apply plain string properties
        // CRITICAL: Pseudo-states (like :hover) often hang with batched setProperties().
        // We use CHUNK_SIZE=1 (one-by-one) for pseudo-states to ensure stability.
        const CHUNK_SIZE = (options === null || options === void 0 ? void 0 : options.pseudo) ? 1 : 15;
        let success = true;
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
                yield withTimeout(setPromise, 15000, `setProperties Chunk ${Math.floor(i / CHUNK_SIZE) + 1}`);
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
                        yield withTimeout(p1, 5000, `setProperty ${prop}`);
                    }
                    catch (e) {
                        log(`      ⚠ Plain fallback failed for ${prop} on ${styleLabel} (value: ${JSON.stringify(val)}): ${e.message}`, "error");
                    }
                }
            }
        }
        // 7. Apply variable bindings
        if (varEntries.length > 0) {
            const VAR_BATCH = 5;
            for (let i = 0; i < varEntries.length; i += VAR_BATCH) {
                const batch = varEntries.slice(i, i + VAR_BATCH);
                yield Promise.all(batch.map((_a) => __awaiter(this, [_a], void 0, function* ([prop, val]) {
                    try {
                        const p = wfOptions
                            ? style.setProperty(prop, val, wfOptions)
                            : style.setProperty(prop, val);
                        yield withTimeout(p, 5000, `setProperty ${prop}`);
                    }
                    catch (e) {
                        // FALLBACK: If native binding fails (e.g. row-gap doesn't support variables), inline the raw value
                        const originalExpr = props[prop];
                        const varNameMatch = typeof originalExpr === "string" ? originalExpr.match(/var\((--[^)]+)\)/) : null;
                        const varName = varNameMatch ? varNameMatch[1] : "unknown";
                        const cached = variableCache.get(varName);
                        let rawToInline = cached === null || cached === void 0 ? void 0 : cached.rawValue;
                        if (rawToInline != null) {
                            if (typeof rawToInline === "object" && rawToInline.value !== undefined) {
                                rawToInline = `${rawToInline.value}${rawToInline.unit || ""}`;
                            }
                            try {
                                const fallbackP = wfOptions
                                    ? style.setProperty(prop, String(rawToInline), wfOptions)
                                    : style.setProperty(prop, String(rawToInline));
                                yield withTimeout(fallbackP, 5000, `setProperty-fallback ${prop}`);
                            }
                            catch (e2) {
                                log(`      ✕ Failed to apply ${prop} on ${styleLabel}: ${e.message}`, "error");
                                success = false;
                            }
                        }
                        else {
                            log(`      ✕ Failed to apply ${prop} on ${styleLabel}: ${e.message}`, "error");
                            success = false;
                        }
                    }
                })));
            }
        }
        // 8. Apply complex CSS function values (clamp/calc/min/max) directly.
        // We apply them via individual setProperty calls specifically to force a UI panel refresh
        // (they were already applied to the actual CSS block via the plainEntries setProperties chunk).
        if (complexEntries.length > 0) {
            for (const [rawKey, val] of complexEntries) {
                const prop = rawKey.replace("__complex__", "");
                try {
                    const p = wfOptions
                        ? style.setProperty(prop, val, wfOptions)
                        : style.setProperty(prop, val);
                    yield withTimeout(p, 8000, `setProperty(direct) ${prop}`);
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
                    const [name, parent] = yield Promise.all([s.getName(), s.getParent()]);
                    const cacheKey = parent ? `${parent.id}:${name}` : name;
                    styleCache.set(cacheKey, s);
                })));
            }
            log(`Pre-loaded ${styleCache.size} styles into session cache`);
        }
        catch (_) {
            // getAllStyles not available — falls back to per-class lookup
        }
        const BATCH_SIZE = 15;
        for (let i = 0; i < validSelectors.length; i += BATCH_SIZE) {
            const batch = validSelectors.slice(i, i + BATCH_SIZE);
            yield Promise.all(batch.map((selector) => __awaiter(this, void 0, void 0, function* () {
                const value = globalStyles[selector];
                const [baseRef, rawPseudo] = selector.split(":");
                const pseudo = normalizePseudo(rawPseudo);
                // Handle both Classes (.my-class) and Tags (h1, a, etc)
                const isTag = !baseRef.startsWith(".");
                const classChain = isTag
                    ? [baseRef]
                    : [...new Set(baseRef.split(".").filter(Boolean))];
                if (classChain.length === 0)
                    return;
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
                            if (msg.includes("conflict") || msg.includes("duplicate") || msg.includes("already exists")) {
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
            })));
            const done = Math.min(i + BATCH_SIZE, total);
            if (done % 30 === 0 || done === total)
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
        body: JSON.stringify({ message, level, timestamp: new Date().toISOString() }),
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
                __meta: { version: 1, normalized: false, complexSelectorsResolved: false }
            };
        }
        setLoading(true);
        hideError();
        clearLog();
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
                    const file = new File([uint8Array], fileName, { type: mimeType });
                    return yield webflow.createAsset({ file });
                }
                catch (err2) {
                    try {
                        log(`    → Pattern 3: Uploading File/Blob via defineProperty...`);
                        // Some environments don't have a fully spec-compliant File constructor
                        const backupBlob = new Blob([uint8Array], { type: mimeType });
                        Object.defineProperty(backupBlob, 'name', {
                            value: fileName,
                            writable: true
                        });
                        return yield webflow.createAsset(backupBlob);
                    }
                    catch (err3) {
                        const finalMsg = (err1 === null || err1 === void 0 ? void 0 : err1.message) || (err3 === null || err3 === void 0 ? void 0 : err3.message) || "All upload patterns failed";
                        log(`    ✕ Asset upload failed: ${finalMsg}`, "error");
                        webflow.notify({ type: "Error", message: `Asset Sync Error: ${finalMsg}` });
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
    var _a;
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
        case "custom":
            return webflow.elementPresets.DOM;
    }
    // 2. Map tags to native presets
    if (tag === "ul" || tag === "ol")
        return webflow.elementPresets.List;
    if (tag === "li")
        return webflow.elementPresets.ListItem;
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
    ];
    const hasCustomAttributes = Object.keys(node.attributes || {}).some((k) => !allowedAttrs.includes(k));
    if (hasCustomAttributes &&
        !["div", "section", "header", "footer", "main"].includes(tag || "")) {
        return webflow.elementPresets.DOM;
    }
    // 3. Fallback logic for Blocks
    // Span and SVG should be DOM elements
    if (tag === "span" || tag === "svg")
        return webflow.elementPresets.DOM;
    // Only use DivBlock for tags that Webflow officially supports as block containers.
    // Lists of valid block tags: div, header, footer, nav, main, section, article, aside, address, figure.
    const validBlockTags = ["div", "section", "header", "footer", "main", "nav", "aside", "article", "address", "figure"];
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
            return yield parentNode.append(preset);
        }
        if (typeof parentNode.after === "function") {
            log(`    ⚠ Selection (${parentNode.type}) doesn't support children. Adding as sibling instead.`, "warn");
            return yield parentNode.after(preset);
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
        if (element.id && (element.type === "TextBlock" || element.type === "BlockElement")) {
            try {
                yield new Promise(r => setTimeout(r, 100)); // Tick for UI flush
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
function buildElementTree(parentNode_1, rawNodeData_1) {
    return __awaiter(this, arguments, void 0, function* (parentNode, rawNodeData, isLegacy = false) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
        // Normalize text: handle array of lines (literal string format) from backend
        const text = Array.isArray(rawNodeData.text)
            ? rawNodeData.text.join("\n")
            : rawNodeData.text;
        const nodeData = Object.assign(Object.assign({}, rawNodeData), { text: text });
        // WEBFLOW COMPLIANCE: If a Heading or Paragraph has children, it MUST be a custom DOM element
        // to avoid "Elements cannot be added to Paragraph elements" error.
        const originalType = nodeData.type;
        if ((nodeData.type === "Heading" || nodeData.type === "Paragraph") && nodeData.children && nodeData.children.length > 0) {
            nodeData.type = "custom";
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
            // The element object returned from append() is a lightweight "creation receipt"
            // that doesn't expose the full HtmlEmbed API (e.g. setHtml is missing).
            // Webflow auto-selects the newly appended element, so getSelectedElement()
            // returns the fully-initialized instance with the complete method surface.
            if (nodeData.type === "HtmlEmbed") {
                try {
                    const fresh = yield webflow.getSelectedElement();
                    if (fresh && fresh.type === "HtmlEmbed") {
                        element = fresh;
                        log(`    [EMBED] Re-fetched fresh element reference (type: ${fresh.type})`, "info");
                    }
                }
                catch (e) {
                    log(`    [EMBED] Could not re-fetch element: ${e.message}. Using original reference.`, "warn");
                }
            }
            // ------------------------------------
            // List Handling: Empty default items
            // ------------------------------------
            // Webflow adds 3 default ListItems to a new List. We must clear them first.
            if (nodeData.type === "List" && element.getChildren) {
                try {
                    const defaultChildren = yield element.getChildren();
                    if (defaultChildren && defaultChildren.length > 0) {
                        log(`    [LIST] Clearing ${defaultChildren.length} default items...`);
                        for (const child of defaultChildren) {
                            yield child.remove();
                        }
                    }
                }
                catch (e) {
                    console.warn("Failed to clear default list children:", e);
                }
            }
            // ------------------------------------
            // Set Tag
            // ------------------------------------
            let tagToSet = (_a = nodeData.tag) === null || _a === void 0 ? void 0 : _a.toLowerCase();
            // Skip setting 'span' tag for non-DOM elements as it's not a valid top-level block tag for DivBlocks
            if (tagToSet === "span" && element.type !== "DOM" && element.type !== "DOMElement" && element.type !== "dom")
                tagToSet = undefined;
            // If we fell back to DivBlock for a Paragraph/Heading with children, ensure it maintains semantic tag
            if (!tagToSet && (nodeData.children && nodeData.children.length > 0)) {
                if (originalType === "Paragraph")
                    tagToSet = "p";
                if (originalType === "Heading")
                    tagToSet = ((_b = rawNodeData.tag) === null || _b === void 0 ? void 0 : _b.toLowerCase()) || "h2";
            }
            // Skip setting tag for specialized elements like HtmlEmbed which manage their own internal tag/content
            // Determine if we are using a specialized preset or falling back to a custom DOM element
            const isSpecializedHtmlEmbed = nodeData.type === "HtmlEmbed" && element.type !== "DOM";
            // Skip setting tag for specialized elements like HtmlEmbed which manage their own internal tag/content.
            // However, if we fell back to a custom DOM element, we MUST set the tag.
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
            // Specialized elements (like HtmlEmbed) set their content via settings, not textContent.
            // If we fell back to a custom DOM element (as suggested by Webflow Designer), we use textContent.
            if ((element.setTextContent || element.setText) && !isSpecializedHtmlEmbed) {
                const isTextType = ["Paragraph", "Heading", "Link", "TextBlock"].includes(nodeData.type) ||
                    nodeData.tag === "p" ||
                    nodeData.tag === "span";
                const shouldSetText = nodeData.text !== undefined || isTextType;
                if (shouldSetText) {
                    const text = nodeData.text || "";
                    const originalTag = (_c = nodeData.tag) === null || _c === void 0 ? void 0 : _c.toLowerCase();
                    const nodeHasChildren = nodeData.children && nodeData.children.length > 0;
                    const isContainerType = ["Block", "Heading", "Paragraph", "Link", "ListItem", "custom"].includes(nodeData.type);
                    // WEBFLOW COMPLIANCE: We cannot add text AND children directly to a Paragraph/Heading in the same level
                    // without triggering "Elements cannot be added to Paragraph elements" if we use presets.
                    // If we use DOM elements (custom), we can be more flexible, but wrapping in spans/divs is safer for Layout.
                    if (isContainerType && text.length > 0 && nodeHasChildren) {
                        log(`    [${nodeData.type}] Adding TextBlock for node text: "${text.substring(0, 20)}..."`);
                        try {
                            const textBlock = yield element.append(webflow.elementPresets.DOM);
                            // If parent is heading/paragraph, use span. Otherwise use div.
                            const wrapperTag = (originalTag === "p" || (originalTag === null || originalTag === void 0 ? void 0 : originalTag.match(/^h[1-6]$/))) ? "span" : "div";
                            if (textBlock.setTag)
                                yield textBlock.setTag(wrapperTag);
                            yield setElementText(textBlock, text);
                        }
                        catch (e) {
                            log(`    ⚠ Could not create TextBlock child: ${e.message}. Falling back to parent text.`, "warn");
                            yield setElementText(element, text);
                        }
                    }
                    else {
                        yield setElementText(element, text);
                    }
                }
            }
            // ------------------------------------
            // Attributes & ID
            // ------------------------------------
            if (nodeData.id) {
                try {
                    if (element.setCustomAttribute) {
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
            // Process custom attributes
            if (nodeData.attributes &&
                Object.keys(nodeData.attributes).length > 0) {
                for (const [key, rawValue] of Object.entries(nodeData.attributes)) {
                    // Skip attributes that are handled by specialized Webflow API methods later (Image/Link/Asset)
                    if (nodeData.type === "Image" && (key === "src" || key === "alt"))
                        continue;
                    if (nodeData.type === "Link" && (key === "href" || key === "target"))
                        continue;
                    if (key === "data-asset")
                        continue;
                    // WEBFLOW COMPLIANCE: Empty strings can sometimes hang the IPC in the Designer.
                    // We map strictly empty strings to "true" to ensure the attribute is added without a hang.
                    const value = rawValue === "" ? "true" : String(rawValue);
                    try {
                        if (element.setCustomAttribute) {
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
                const cleanClasses = [...new Set(classes.filter((c) => c && c.trim().length > 0))];
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
                            if (msg.includes("conflict") || msg.includes("duplicate") || msg.includes("already exists")) {
                                style =
                                    (yield getStyleByName(className)) ||
                                        fallbackStyle;
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
            }
            // ------------------------------------
            // Apply Properties to the primary class
            // ------------------------------------
            if (styleRefs.length > 0) {
                const primaryStyle = styleRefs[styleRefs.length - 1];
                if (hasStylesToApply) {
                    yield applyStyleProperties(primaryStyle, nodeStyles, undefined, isLegacy);
                }
                if (hasPseudoStyles) {
                    for (const [pseudo, pseudoProps] of Object.entries(nodeData.inlinePseudoStyles || {})) {
                        yield applyStyleProperties(primaryStyle, pseudoProps, { pseudo }, isLegacy);
                    }
                }
            }
            // ------------------------------------
            // Specialized Elements (Image, Link)
            // ------------------------------------
            const src = (_d = nodeData.attributes) === null || _d === void 0 ? void 0 : _d.src;
            const href = (_e = nodeData.attributes) === null || _e === void 0 ? void 0 : _e.href;
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
                        yield ((_f = element.setCustomAttribute) === null || _f === void 0 ? void 0 : _f.call(element, "src", src));
                    }
                }
                else if (src && element.setAttribute) {
                    yield element.setAttribute("src", src);
                }
                // Handle Alt Text
                if (((_g = nodeData.attributes) === null || _g === void 0 ? void 0 : _g.alt) && element.setAltText) {
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
                if (((_h = nodeData.attributes) === null || _h === void 0 ? void 0 : _h.target) && element.setTarget) {
                    yield element.setTarget(nodeData.attributes.target);
                }
            }
            // Special handling for data-asset: Upload external URLs to Webflow assets
            if (((_j = nodeData.attributes) === null || _j === void 0 ? void 0 : _j["data-asset"]) && element.setCustomAttribute) {
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
                            { name: "setHtml", fn: (el, val) => el.setHtml(val) },
                            { name: "setHtmlContent", fn: (el, val) => el.setHtmlContent(val) },
                            { name: "setSettings({html})", fn: (el, val) => el.setSettings({ html: val }) },
                            { name: "setSettings({code})", fn: (el, val) => el.setSettings({ code: val }) },
                            { name: "setSettings('html')", fn: (el, val) => el.setSettings("html", val) },
                            { name: "setSettings('code')", fn: (el, val) => el.setSettings("code", val) },
                        ];
                        for (const pattern of patterns) {
                            if (success)
                                break;
                            try {
                                if (typeof element[pattern.name.split('(')[0]] === "function") {
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
                            log(`    ⚠ Automated injection blocked by Webflow API. Generating visible raw-code text box on canvas for manual copy...`, "warn");
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
                                if (typeof element.setCustomAttribute === 'function') {
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
            if (nodeData.children && nodeData.children.length > 0) {
                for (const child of nodeData.children) {
                    yield buildElementTree(element, child, isLegacy);
                }
            }
        }
        catch (err) {
            const label = ((_k = nodeData.classes) === null || _k === void 0 ? void 0 : _k[0]) || nodeData.tag || nodeData.type;
            log(`    ✕ Error building node [${label}]: ${err.message || err}`, "error");
            console.error("Error building node:", nodeData, err);
        }
    });
}
function resolveValueForCreate(type, serVal) {
    if (!serVal || (serVal.value === undefined && !serVal.isCustom)) {
        switch (type) {
            case "Color":
                return "#000000";
            case "Size":
                return { unit: "px", value: 0 };
            case "FontFamily":
                return "Inter";
            case "Number":
                return 0;
            case "Percentage":
                return 0;
            default:
                return "#000000";
        }
    }
    if (serVal.isCustom && serVal.customValue) {
        const val = serVal.customValue.trim();
        // Match var(--variable-name) or var(--variable-name, fallback)
        const varMatch = val.match(/^var\((--[^,)]+)(?:,\s*[^)]+)?\)$/);
        if (varMatch) {
            const varName = varMatch[1].trim();
            // Check cache for existing variable object to create a native Alias (purple pill)
            const cached = variableCache.get(varName);
            if (cached && cached.variable) {
                return cached.variable;
            }
        }
        // clamp/calc/min/max — Webflow's variable.set() accepts the raw CSS string directly.
        // Do NOT wrap in { type: "custom" } — that object format is not a valid Webflow API value.
        if (val.startsWith("clamp(") ||
            val.startsWith("calc(") ||
            val.startsWith("min(") ||
            val.startsWith("max(")) {
            return val;
        }
        // For any other custom value, pass raw string — Webflow handles it or ignores it gracefully.
        return val;
    }
    return serVal.value;
}
function pasteCollections(collections) {
    return __awaiter(this, void 0, void 0, function* () {
        log(`Found ${collections.length} variable collection${collections.length !== 1 ? "s" : ""}. Importing...`);
        // Pre-fetch all existing collections once
        const existingCollections = yield webflow.getAllVariableCollections();
        const defaultCollection = typeof webflow.getDefaultVariableCollection === 'function'
            ? yield webflow.getDefaultVariableCollection()
            : existingCollections[0];
        const existingCollectionMap = new Map();
        for (const existing of existingCollections) {
            try {
                const n = yield existing.getName();
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
                col.modes.forEach(m => {
                    if (!colEntry.modes.includes(m.name))
                        colEntry.modes.push(m.name);
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
                if (targetEntry.modes.length === 0 || !col.modes || col.modes.length === 0) {
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
            let targetCol = existingCollectionMap.get(colName.trim());
            const lowerName = colName.trim().toLowerCase();
            const isBaseVariant = lowerName === "base collection" || lowerName === "base" || lowerName === "default";
            if (!targetCol) {
                if (isBaseVariant) {
                    log(`    ℹ Mapping "${colName}" to project default collection...`, "info");
                    targetCol = defaultCollection;
                }
                else {
                    log(`    + Creating new collection: "${colName}"...`);
                    try {
                        targetCol = yield webflow.createVariableCollection(colName);
                        existingCollectionMap.set(colName.trim(), targetCol);
                    }
                    catch (err) {
                        log(`    ✕ Failed to create collection "${colName}": ${err.message}`, "error");
                        continue;
                    }
                }
            }
            if (!targetCol) {
                log(`    ✕ Critical Error: No target collection for "${colName}"`, "error");
                continue;
            }
            // Sync Modes
            const modesInCol = yield targetCol.getAllVariableModes();
            const modeRefs = {};
            for (const m of modesInCol) {
                const n = yield m.getName();
                modeRefs[n] = m;
            }
            for (const modeName of colData.modes) {
                if (modeName === "Base Mode")
                    continue;
                if (!modeRefs[modeName]) {
                    log(`    + Creating mode "${modeName}" in collection "${colName}"...`);
                    try {
                        const newMode = yield targetCol.createVariableMode(modeName);
                        modeRefs[modeName] = newMode;
                    }
                    catch (err) {
                        log(`    ✕ Failed to create mode "${modeName}" in "${colName}": ${err.message}`, "error");
                    }
                }
            }
            // Map "Base Mode" (from JSON) to Webflow's first (default) mode
            const baseModeName = "Base Mode";
            if (!modeRefs[baseModeName] && modesInCol.length > 0) {
                modeRefs[baseModeName] = modesInCol[0];
            }
            // Pre-fetch all variables in THIS collection
            const varsInCol = yield targetCol.getAllVariables();
            const varMap = new Map();
            for (const v of varsInCol) {
                const n = yield v.getName();
                varMap.set(n, v);
            }
            // Create/Cache variables
            for (const serializedVar of colData.variables) {
                let webflowVar = varMap.get(serializedVar.name);
                if (!webflowVar) {
                    // Resolve a literal baseline for creation (Webflow API requires a literal value on create)
                    // We fall back to standard defaults if the baseline is an alias, as aliases are synced in Pass 2.
                    const baseSerVal = serializedVar.values[baseModeName] || Object.values(serializedVar.values)[0];
                    let defaultValue = resolveValueForCreate(serializedVar.type, baseSerVal);
                    // Ensure defaultValue is literal for creation pass.
                    // Webflow variables MUST be created with a literal value (number/color/etc).
                    // We filter out complex objects or custom types here and use a safe baseline.
                    const isLiteral = defaultValue !== null &&
                        typeof defaultValue !== "object" ||
                        (defaultValue.value !== undefined && defaultValue.unit);
                    if (!isLiteral) {
                        // Fallback to standard defaults for creation pass. actual values are synced in Pass 2.
                        switch (serializedVar.type) {
                            case "Color":
                                defaultValue = "#000000";
                                break;
                            case "Size":
                                defaultValue = { unit: "px", value: 0 };
                                break;
                            case "FontFamily":
                                defaultValue = "Inter";
                                break;
                            case "Number":
                                defaultValue = 0;
                                break;
                            case "Percentage":
                                defaultValue = 0;
                                break;
                        }
                    }
                    try {
                        const name = serializedVar.name;
                        switch (serializedVar.type) {
                            case "Color":
                                webflowVar = yield targetCol.createColorVariable(name, defaultValue);
                                break;
                            case "Size":
                                webflowVar = yield targetCol.createSizeVariable(name, defaultValue);
                                break;
                            case "FontFamily":
                                webflowVar = yield targetCol.createFontFamilyVariable(name, defaultValue);
                                break;
                            case "Number":
                                webflowVar = yield targetCol.createNumberVariable(name, defaultValue);
                                break;
                            case "Percentage":
                                webflowVar = yield targetCol.createPercentageVariable(name, defaultValue);
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
                        const [binding, rawValue, cssName] = yield Promise.all([
                            webflowVar.getBinding(),
                            webflowVar.get(),
                            typeof webflowVar.getCSSName === "function" ? webflowVar.getCSSName() : Promise.resolve(`--${serializedVar.name}`),
                        ]);
                        const meta = { variable: webflowVar, binding, rawValue, type: serializedVar.type, cssName };
                        variableCache.set(serializedVar.name, meta);
                        variableCache.set(`--${serializedVar.name}`, meta);
                    }
                    catch (e) {
                        const fallbackMeta = { variable: webflowVar, type: serializedVar.type };
                        variableCache.set(serializedVar.name, fallbackMeta);
                        variableCache.set(`--${serializedVar.name}`, fallbackMeta);
                    }
                    // Queue for value syncing in Pass 2
                    variableProcessingQueue.push({ serializedVar, targetCol, modeRefs });
                }
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
                        yield webflowVar.set(valueToSet, { mode: modeRef });
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
            const collections = yield webflow.getAllVariableCollections();
            let totalFound = 0;
            for (const col of collections) {
                const variables = yield col.getAllVariables();
                const BATCH_SIZE = 40;
                for (let i = 0; i < variables.length; i += BATCH_SIZE) {
                    const batch = variables.slice(i, i + BATCH_SIZE);
                    yield Promise.all(batch.map((v) => __awaiter(this, void 0, void 0, function* () {
                        // Fetch name first — required for all cache keys.
                        // If this fails, we cannot cache, so we skip.
                        let name;
                        try {
                            name = yield v.getName();
                            if (!name)
                                return;
                        }
                        catch (_a) {
                            return;
                        }
                        // Fetch optional metadata individually.
                        // v.get() THROWS for custom-value Size vars (clamp/calc/etc).
                        // v.getBinding() may also throw. Never let these block the variable
                        // object itself from being cached — the object reference is what
                        // applyStyleProperties needs for native variable binding (purple pill).
                        let binding = null;
                        let rawValue = null;
                        let cssName = null;
                        try {
                            binding = yield v.getBinding();
                        }
                        catch ( /* optional */_b) { /* optional */ }
                        try {
                            rawValue = yield v.get();
                        }
                        catch ( /* custom values throw */_c) { /* custom values throw */ }
                        try {
                            if (typeof v.getCSSName === "function") {
                                cssName = yield v.getCSSName();
                            }
                        }
                        catch ( /* optional */_d) { /* optional */ }
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
                        const cleanName = name.trim().toLowerCase().replace(/\s+/g, "-");
                        variableCache.set(`--${cleanName}`, meta);
                        totalFound++;
                    })));
                }
            }
            const duration = ((Date.now() - startTime) / 1000).toFixed(1);
            log(`✓ Discovered ${totalFound} variables in project (${duration}s)`, "success");
        }
        catch (err) {
            log(`Failed to sync existing variables: ${err.message}`, "warn");
        }
    });
}
function syncStyleCacheFromWebflow() {
    return __awaiter(this, void 0, void 0, function* () {
        log("Syncing styles from Webflow project...");
        const startTime = Date.now();
        try {
            const allStyles = yield webflow.getAllStyles();
            allStylesMap.clear();
            for (const style of allStyles) {
                const name = yield style.getName();
                allStylesMap.set(name.trim(), style);
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
        const selected = yield webflow.getSelectedElement();
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
        // Step 0: Sync from existing project variables — only when the payload actually
        // references CSS variables (var()). Skipping this on variable-free builds saves
        // 5–30s of unnecessary IPC round-trips to Webflow's variable store.
        const payloadStr = JSON.stringify(payload);
        const payloadHasVars = payloadStr.includes("var(") || payloadStr.includes("clamp(") || payloadStr.includes("calc(");
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
        function countAllNodes(nodes) {
            let count = nodes.length;
            for (const n of nodes) {
                if (n.children)
                    count += countAllNodes(n.children);
            }
            return count;
        }
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
                const properties = yield style.getProperties({ breakpoint: "main" });
                for (const [prop, val] of Object.entries(properties)) {
                    if (typeof val !== "string")
                        continue;
                    let isInvalid = false;
                    let reason = "";
                    // 1. color-mix check (Critical Publish Blocker)
                    if (val.includes("color-mix")) {
                        isInvalid = true;
                        reason = "Unsupported 'color-mix' function (Publish Blocker)";
                    }
                    // 2. Broken parens / calc expansion check
                    const openCount = (val.match(/\(/g) || []).length;
                    const closeCount = (val.match(/\)/g) || []).length;
                    if (openCount !== closeCount) {
                        isInvalid = true;
                        reason = "Broken parentheses/calc expansion (Publish Blocker)";
                    }
                    // 3. Logical properties check (Webflow Variable incompatibility)
                    if (logicalProps.includes(prop)) {
                        isInvalid = true;
                        reason = "Unsupported logical property (Webflow Variable Incompatibility)";
                    }
                    // 4. Shorthand with variables check (Best practice: expand for native bindings)
                    if (shorthandProps.includes(prop) &&
                        (val.includes("var(") || val.includes("calc(") || val.includes("clamp("))) {
                        isInvalid = true;
                        reason = "Complex shorthand with variables (Expand for native mapping)";
                    }
                    // 5. Transition-property variable check
                    if (prop === "transition-property" && val.includes("--")) {
                        isInvalid = true;
                        reason = "CSS Variable in transition-property (Mapping Failure)";
                    }
                    // 6. Garbage fragments check
                    if (val === "*" ||
                        val === ")" ||
                        (val.includes("rgba(0, 0, 0, 0)") &&
                            (val.match(/0 0/g) || []).length > 3)) {
                        isInvalid = true;
                        reason = "Garbage fragment or corrupt coordinate string (Publish Blocker)";
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

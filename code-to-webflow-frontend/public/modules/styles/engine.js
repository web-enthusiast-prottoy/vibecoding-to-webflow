// ============================================================
// Style Engine — applyStyleProperties, applyGlobalStyles, etc.
// ============================================================
import { isBreakpointStyleMap } from "../utils/clipboard.js";
import { expandProperties, normalizePropertiesLegacy } from "../utils/css-props.js";
import { withTimeout, DEFAULT_TIMEOUT } from "../utils/helpers.js";
import { getStyleByName } from "./cache.js";
import { variableCache, getStyleCache } from "../../state.js";
// Forward-declared logger to avoid circular dependency.
let _log = null;
export function injectLog(fn) {
    _log = fn;
}
function log(message, level) {
    if (_log)
        _log(message, level);
    else
        console.log(`[${(level || "info").toUpperCase()}] ${message}`);
}
// Forward-declared embed recorder to avoid circular dependency.
let _recordComplexValue = null;
let _recordUnsupportedCss = null;
export function injectEmbedRecorders(recordComplex, recordUnsupported) {
    _recordComplexValue = recordComplex;
    _recordUnsupportedCss = recordUnsupported;
}
function recordComplexValue(cv) {
    if (_recordComplexValue)
        _recordComplexValue(cv);
}
function recordUnsupportedCss(embed) {
    if (_recordUnsupportedCss)
        _recordUnsupportedCss(embed);
}
// Forward-declared progress increment to avoid circular dependency.
let _incrementProgress = null;
export function injectIncrementProgress(fn) {
    _incrementProgress = fn;
}
function incrementProgress(amount = 1) {
    if (_incrementProgress)
        _incrementProgress(amount);
}
/**
 * Robustly tries to find a variable in the cache by name or CSS var name.
 * Handles variations like '--name', 'name', case sensitivity, and Webflow folder prefixes.
 */
export function tryResolveVariable(rawName) {
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
 * Normalizes CSS pseudo-states to Webflow-supported ones.
 * Webflow only supports a specific list; unsupported ones (like nth-child(4n)) cause API errors.
 */
export function normalizePseudo(rawPseudo) {
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
export async function applyStyleProperties(style, properties, options, isLegacy = false, elementRef) {
    var _a, _b, _c, _d;
    const styleName = await style.getName();
    const pseudo = normalizePseudo(options === null || options === void 0 ? void 0 : options.pseudo);
    const hasPseudo = pseudo !== "noPseudo";
    const styleLabel = hasPseudo ? `.${styleName}:${pseudo}` : `.${styleName}`;
    // 3. Build Webflow API options — STRICT: only documented keys allowed.
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
        const cssLines = Object.entries(props)
            .map(([k, v]) => `  ${k}: ${v};`)
            .join("\n");
        const pseudoSuffix = options.pseudo.startsWith(":")
            ? options.pseudo
            : `:${options.pseudo}`;
        const cssText = `.${styleName}${pseudoSuffix} {\n${cssLines}\n}`;
        recordUnsupportedCss({
            className: styleName,
            pseudo: options.pseudo,
            cssText,
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
            await withTimeout(setPromise, DEFAULT_TIMEOUT, `setProperties-${chunkProps}`);
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
                    await withTimeout(p1, timeout, `setProperty-${prop}`);
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
                await withTimeout(p, DEFAULT_TIMEOUT, `setProperty-var-${prop}`);
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
                    await withTimeout(pFallback, DEFAULT_TIMEOUT, `setProperty-varFallback-${prop}`);
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
                await withTimeout(p, 10000, `setProperties-Spacing-${prefix}`);
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
                await withTimeout(p, 3000, `setProperty-grid-${prop}`);
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
                        await withTimeout(pFallback, 3000, `setProperty-gridFallback-${prop}`);
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
                await withTimeout(p, DEFAULT_TIMEOUT, `setProperty-complex-${prop}`);
            }
            catch (e) {
                log(`    ✕ Failed to apply ${prop}: ${e.message}`, "error");
                success = false;
            }
        }
    }
    return success;
}
export async function applyNodeStyleMap(style, value, options, isLegacy = false, elementRef) {
    if (!value)
        return;
    if (isBreakpointStyleMap(value)) {
        for (const [bp, props] of Object.entries(value)) {
            if (props && Object.keys(props).length > 0) {
                await applyStyleProperties(style, props, { breakpointId: bp, pseudo: options === null || options === void 0 ? void 0 : options.pseudo }, isLegacy, elementRef);
            }
        }
        return;
    }
    if (Object.keys(value).length > 0) {
        await applyStyleProperties(style, value, (options === null || options === void 0 ? void 0 : options.pseudo) ? { pseudo: options.pseudo } : undefined, isLegacy, elementRef);
    }
}
export async function applyGlobalStyles(globalStyles, isLegacy = false) {
    // Only process Class selectors (must start with a dot).
    // Tag-based selectors (body, html, a, img, etc.) and the universal selector (*) are
    // explicitly moved to the Global Styles Embed by the backend for maximum reliability.
    const validSelectors = Object.keys(globalStyles).filter((s) => !s.includes(" ") && s.startsWith("."));
    const total = validSelectors.length;
    log(`Applying ${total} global style${total !== 1 ? "s" : ""}...`);
    // Global style cache shared across the entire build session
    const styleCache = getStyleCache();
    try {
        const allStyles = await webflow.getAllStyles();
        // Parallelize getName + getParent lookups in batches to avoid O(n) sequential IPC round-trips.
        const STYLE_BATCH = 20;
        for (let i = 0; i < allStyles.length; i += STYLE_BATCH) {
            const batch = allStyles.slice(i, i + STYLE_BATCH);
            await Promise.all(batch.map(async (s) => {
                const [name, parent] = await Promise.all([
                    s.getName(),
                    s.getParent(),
                ]);
                const cacheKey = parent ? `${parent.id}:${name}` : name;
                styleCache.set(cacheKey, s);
            }));
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
                style = await getStyleByName(className);
                if (style) {
                    const parent = await style.getParent();
                    if ((parent === null || parent === void 0 ? void 0 : parent.id) !== (currentParent === null || currentParent === void 0 ? void 0 : currentParent.id))
                        style = null;
                }
            }
            if (!style) {
                try {
                    style = await webflow.createStyle(className, currentParent ? { parent: currentParent } : {});
                    styleCache.set(cacheKey, style);
                }
                catch (e) {
                    const msg = e.message.toLowerCase();
                    if (msg.includes("conflict") ||
                        msg.includes("duplicate") ||
                        msg.includes("already exists")) {
                        style = await getStyleByName(className);
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
                        await applyStyleProperties(leafStyle, props, { breakpointId: bp, pseudo }, isLegacy);
                    }
                }
            }
            else {
                if (Object.keys(value).length > 0) {
                    await applyStyleProperties(leafStyle, value, { pseudo }, isLegacy);
                }
            }
        }
        incrementProgress();
        const done = Math.min(validSelectors.indexOf(selector) + 1, total);
        if (done % 10 === 0 || done === total)
            log(`Progress: ${done} / ${total} styles applied`);
    }
    log("✓ All styles applied", "success");
}

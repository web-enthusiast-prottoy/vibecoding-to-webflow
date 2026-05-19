// ============================================================
// Variable Manager — Collections, Creation, Sync
// ============================================================
import { withTimeout, sleep } from "../utils/helpers.js";
import { variableCache } from "../../state.js";
import { tryResolveVariable } from "../styles/engine.js";
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
// Forward-declared progress increment to avoid circular dependency.
let _incrementProgress = null;
export function injectIncrementProgress(fn) {
    _incrementProgress = fn;
}
function incrementProgress(amount = 1) {
    if (_incrementProgress)
        _incrementProgress(amount);
}
export function resolveValueForCreate(type, serVal) {
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
                return { type: "custom", value: `var(${cached.cssName})` };
            }
            else if (cached && cached.variable) {
                return cached.variable;
            }
            // Unresolved var() reference — pass as CustomValue so Webflow stores the raw string
            log(`    [RESOLVE] Unresolved var() for ${type}: "${trimmed}" — storing as CustomValue`);
            return { type: "custom", value: trimmed };
        }
        // 2. Complex CSS functions (clamp/calc/min/max)
        // The Webflow API's CustomValue type is { type: 'custom', value: string }.
        // Passing a raw string fails silently and leaves the variable at its 0px placeholder.
        if (lower.startsWith("clamp(") ||
            lower.startsWith("calc(") ||
            lower.startsWith("min(") ||
            lower.startsWith("max(")) {
            log(`    [RESOLVE] Complex CSS function for ${type}: "${trimmed}" — wrapping as CustomValue`);
            return { type: "custom", value: trimmed };
        }
        // 3. Size with unit strings
        if (type === "Size" &&
            /^-?[0-9.]+(px|rem|em|vw|vh|%|ch|ex)$/.test(lower)) {
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
    if (type === "Size" &&
        typeof effectiveValue === "object" &&
        effectiveValue !== null) {
        if (effectiveValue.unit !== undefined &&
            effectiveValue.value !== undefined) {
            const res = {
                value: Number(effectiveValue.value),
                unit: String(effectiveValue.unit),
            };
            log(`    [RESOLVE] Direct Size object for ${type}: ${JSON.stringify(res)}`);
            return res;
        }
    }
    return effectiveValue;
}
export async function pasteCollections(collections) {
    var _a;
    log(`Found ${collections.length} variable collection${collections.length !== 1 ? "s" : ""}. Importing...`);
    // Pre-fetch all existing collections once
    const existingCollections = await webflow.getAllVariableCollections();
    const defaultCollection = typeof webflow.getDefaultVariableCollection === "function"
        ? await webflow.getDefaultVariableCollection()
        : existingCollections[0];
    const existingCollectionMap = new Map();
    for (const existing of existingCollections) {
        try {
            const n = (await withTimeout(existing.getName(), 5000, "existingCol.getName"));
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
                targetCol = (await withTimeout(webflow.createVariableCollection(colName), 15000, "createVariableCollection"));
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
        const modesInCol = (await withTimeout(targetCol.getAllVariableModes(), 10000, "getAllVariableModes"));
        const modeRefs = {};
        for (const m of modesInCol) {
            const n = (await withTimeout(m.getName(), 5000, "mode.getName"));
            modeRefs[n] = m;
        }
        for (const modeDef of colData.modes) {
            const mName = typeof modeDef === "string" ? modeDef : modeDef === null || modeDef === void 0 ? void 0 : modeDef.name;
            if (!mName || mName === "Base Mode")
                continue;
            if (!modeRefs[mName]) {
                log(`    + Creating mode "${mName}" in collection "${colName}"...`);
                try {
                    const newMode = (await withTimeout(targetCol.createVariableMode(mName), 10000, "createVariableMode"));
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
        const varsInCol = (await withTimeout(targetCol.getAllVariables(), 15000, "targetCol.getAllVariables"));
        const varMap = new Map();
        for (const v of varsInCol) {
            const n = (await withTimeout(v.getName(), 5000, "v.getName"));
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
                        defaultValue =
                            typeof baseResolved === "string" ? baseResolved : "#000000";
                        break;
                    case "Size":
                        // Use CustomValue directly (e.g. clamp/calc), else use resolved { unit, value } or fallback
                        if (isCustomVal) {
                            defaultValue = baseResolved;
                        }
                        else if (baseResolved &&
                            typeof baseResolved === "object" &&
                            baseResolved.unit) {
                            defaultValue = baseResolved;
                        }
                        else {
                            defaultValue = { unit: "px", value: 0 };
                        }
                        break;
                    case "FontFamily":
                        defaultValue =
                            typeof baseResolved === "string" ? baseResolved : "Inter";
                        break;
                    case "Number":
                        defaultValue =
                            typeof baseResolved === "number" ? baseResolved : 0;
                        break;
                    case "Percentage":
                        defaultValue =
                            typeof baseResolved === "number" ? baseResolved : 0;
                        break;
                    default:
                        defaultValue = "#000000";
                }
                try {
                    const name = expectedName;
                    log(`    [CREATE] Initializing ${serializedVar.type} variable "${name}" with value: ${JSON.stringify(defaultValue)}`);
                    switch (serializedVar.type) {
                        case "Color":
                            webflowVar = (await withTimeout(targetCol.createColorVariable(name, defaultValue), 10000, "createColorVariable"));
                            break;
                        case "Size":
                            webflowVar = (await withTimeout(targetCol.createSizeVariable(name, defaultValue), 10000, "createSizeVariable"));
                            break;
                        case "FontFamily":
                            webflowVar = (await withTimeout(targetCol.createFontFamilyVariable(name, defaultValue), 10000, "createFontFamilyVariable"));
                            break;
                        case "Number":
                            webflowVar = (await withTimeout(targetCol.createNumberVariable(name, defaultValue), 10000, "createNumberVariable"));
                            break;
                        case "Percentage":
                            webflowVar = (await withTimeout(targetCol.createPercentageVariable(name, defaultValue), 10000, "createPercentageVariable"));
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
                    const [binding, rawValue, cssName] = (await Promise.all([
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
            await sleep(25);
        }
    }
    // 3. Pass 2: Sync Mode Values (supports Aliasing)
    log(`Step 2: Syncing variable values and aliases...`);
    const SYNC_CHUNK = 10;
    for (let i = 0; i < variableProcessingQueue.length; i += SYNC_CHUNK) {
        const chunk = variableProcessingQueue.slice(i, i + SYNC_CHUNK);
        await Promise.all(chunk.map(async ({ serializedVar, modeRefs }) => {
            var _a;
            const webflowVar = (_a = variableCache.get(serializedVar.name)) === null || _a === void 0 ? void 0 : _a.variable;
            if (!webflowVar)
                return;
            for (const [modeName, modeSerVal] of Object.entries(serializedVar.values)) {
                const modeRef = modeRefs[modeName];
                if (!modeRef)
                    continue;
                try {
                    const valueToSet = resolveValueForCreate(serializedVar.type, modeSerVal);
                    log(`    [SYNC] Setting "${serializedVar.name}" (${serializedVar.type}) in mode "${modeName}" to: ${JSON.stringify(valueToSet)}`);
                    await withTimeout(webflowVar.set(valueToSet, { mode: modeRef }), 10000, "variable.set");
                }
                catch (modeErr) {
                    log(`    ✕ Failed to set mode "${modeName}" on "${serializedVar.name}": ${modeErr.message}`, "warn");
                }
            }
        }));
        incrementProgress(chunk.length);
        await sleep(50);
    }
    log(`✓ Variable synchronization complete (Pass 1: Creation, Pass 2: Value Sync)`, "success");
}
export async function syncVariableCacheFromWebflow() {
    log("Syncing variables from Webflow project...");
    const startTime = Date.now();
    try {
        const collections = (await withTimeout(webflow.getAllVariableCollections(), 10000, "getAllVariableCollections"));
        let totalFound = 0;
        for (const col of collections) {
            const variables = (await withTimeout(col.getAllVariables(), 10000, "getAllVariables"));
            const BATCH_SIZE = 10; // Reduced from 40 for stability
            for (let i = 0; i < variables.length; i += BATCH_SIZE) {
                const batch = variables.slice(i, i + BATCH_SIZE);
                await Promise.all(batch.map(async (v) => {
                    let name;
                    try {
                        name = (await withTimeout(v.getName(), 5000, "v.getName"));
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
                        binding = await withTimeout(v.getBinding(), 5000, "v.getBinding");
                    }
                    catch (_b) {
                        /* optional */
                    }
                    try {
                        rawValue = await withTimeout(v.get(), 5000, "v.get");
                    }
                    catch (_c) {
                        /* custom values throw */
                    }
                    try {
                        if (typeof v.getCSSName === "function") {
                            cssName = (await withTimeout(v.getCSSName(), 5000, "v.getCSSName"));
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
                }));
            }
        }
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        log(`✓ Discovered ${totalFound} variables across ${collections.length} collections (${duration}s)`, "success");
    }
    catch (err) {
        log(`✕ Failed to sync existing variables: ${err.message}`, "error");
    }
}

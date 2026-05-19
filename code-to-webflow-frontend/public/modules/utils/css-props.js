// ============================================================
// CSS Property Expansion & Normalization
// v2 JSON from the backend is already fully normalized.
// This shim handles any old (v1) files that may still be pasted manually.
// ============================================================
/**
 * Expands CSS shorthands into their constituent parts for the Webflow API.
 * This ensures properties like 'border-bottom' or 'padding' hit the native panels.
 */
export function expandProperties(properties) {
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
export function normalizePropertiesLegacy(properties) {
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

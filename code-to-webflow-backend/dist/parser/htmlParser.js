import * as fs from "fs";
import * as path from "path";
import { parse, serialize } from "parse5";
import postcss from "postcss";
import { normalizeCssProperties, normalizeHexAlpha, } from "../normalizer/cssNormalizer";
function getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
        case ".png": return "image/png";
        case ".jpg":
        case ".jpeg": return "image/jpeg";
        case ".svg": return "image/svg+xml";
        case ".gif": return "image/gif";
        case ".webp": return "image/webp";
        default: return "application/octet-stream";
    }
}
function processAssetUrl(url, baseDir) {
    if (!baseDir || url.startsWith("http") || url.startsWith("data:") || url.startsWith("//")) {
        return url;
    }
    // Clean up url slightly to avoid trailing quotes or problems
    let cleanUrl = url.replace(/['"]/g, "").trim();
    try {
        const fullPath = path.resolve(baseDir, cleanUrl);
        if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
            const fileData = fs.readFileSync(fullPath);
            const base64 = fileData.toString("base64");
            const mimeType = getMimeType(fullPath);
            return `data:${mimeType};base64,${base64}`;
        }
    }
    catch (e) {
        console.warn(`    [ASSET] Warning: Failed to inline local asset: ${cleanUrl}`);
    }
    return url;
}
function inferVariableType(value, varMap, depth = 0) {
    const lowerVal = value.trim().toLowerCase();
    // Handle var() references
    if (lowerVal.startsWith("var(") && depth < 3 && varMap) {
        const varMatch = lowerVal.match(/^var\((--[^,)]+)(?:,\s*([^)]+))?\)$/);
        if (varMatch) {
            const varName = varMatch[1].trim();
            const resolved = varMap[varName];
            if (resolved)
                return inferVariableType(resolved, varMap, depth + 1);
        }
    }
    // 1. Colors & Gradients
    if (lowerVal.startsWith("#") ||
        lowerVal.startsWith("rgb") ||
        lowerVal.startsWith("hsl") ||
        lowerVal.includes("gradient(") ||
        ["transparent", "currentcolor", "inherit"].includes(lowerVal)) {
        return "Color";
    }
    // 2. Percentages (specifically handle 50% vs 50px)
    if (lowerVal.endsWith("%") && !lowerVal.includes("calc") && !lowerVal.includes("clamp")) {
        return "Percentage";
    }
    // 3. Numbers (purely numeric unitless)
    if (!isNaN(Number(value)) && value.trim() !== "") {
        return "Number";
    }
    // 4. Sizes (including CSS functions)
    if (lowerVal.includes("px") ||
        lowerVal.includes("em") ||
        lowerVal.includes("rem") ||
        lowerVal.includes("vw") ||
        lowerVal.includes("vh") ||
        lowerVal.includes("calc(") ||
        lowerVal.includes("clamp(") ||
        lowerVal.includes("min(") ||
        lowerVal.includes("max(") ||
        lowerVal.includes("var(") // If it's a complex var expression
    ) {
        return "Size";
    }
    // 5. Font Families (quotes or commas without CSS functions)
    if ((value.includes('"') || value.includes("'") || value.includes(",")) &&
        !lowerVal.includes("(") // CSS functions (clamp, calc, rgb) use parens and commas
    ) {
        return "FontFamily";
    }
    return "Size"; // fallback
}
/**
 * Determines which Webflow collection a variable belongs to based on its name and type.
 */
function getVariableCollection(name, type) {
    const n = name.toLowerCase();
    // 1. Colors -> Base Collection
    if (type === "Color")
        return "Base Collection";
    // 2. Typography -> FontFamily or anything related to text/font
    if (type === "FontFamily" ||
        n.includes("font") ||
        n.includes("text-") ||
        n.includes("heading-") ||
        n.includes("line-height") ||
        n.includes("letter-spacing") ||
        n.includes("weight")) {
        return "Typography";
    }
    // 3. Global Variables -> Spacing, container, padding, etc.
    if (type === "Size" ||
        type === "Number" ||
        n.includes("spacing") ||
        n.includes("padding") ||
        n.includes("margin") ||
        n.includes("container") ||
        n.includes("gap") ||
        n.includes("gutter") ||
        n.includes("width") ||
        n.includes("height") ||
        n.includes("radius") ||
        n.includes("shadow") ||
        n.includes("z-index") ||
        n.includes("aspect")) {
        return "Global Variables";
    }
    // Fallback to Base Collection
    return "Base Collection";
}
function parseValueForVariable(type, value) {
    const val = value.trim();
    const lowerVal = val.toLowerCase();
    // Handle keywords not supported by Webflow variables
    if (["initial", "unset", "revert"].includes(lowerVal)) {
        return null;
    }
    // Handle var() references as custom values so frontend can resolve them to native aliases
    if (lowerVal.includes("var(")) {
        return { isCustom: true, customValue: val };
    }
    if (type === "Size") {
        // Check for complex CSS functions first - these must be handled as custom values
        if (lowerVal.includes("calc(") ||
            lowerVal.includes("clamp(") ||
            lowerVal.includes("min(") ||
            lowerVal.includes("max(")) {
            // Return a format that the frontend index.ts:resolveValueForCreate can handle
            // We need to return an object that will be used to set values[mode]
            console.log(`    [VAR] Detected complex Size: "${val}"`);
            return { isCustom: true, customValue: val };
        }
        const match = val.match(/^(-?\d+(\.\d+)?)(px|em|rem|vw|vh|%|ch|ex)?$/);
        if (match) {
            return { value: parseFloat(match[1]), unit: match[3] || "px" };
        }
        // If it has units but isn't a simple number+unit (e.g. "10px 20px" - though not common for single var)
        // treat as custom if it's not a simple number
        console.log(`    [VAR] Detected non-simple Size: "${val}"`);
        return { isCustom: true, customValue: val };
    }
    if (type === "Percentage") {
        const match = val.match(/^(-?\d+(\.\d+)?)(%)?$/);
        if (match)
            return parseFloat(match[1]);
        return 0;
    }
    if (type === "Number") {
        const parsed = parseFloat(val);
        if (!isNaN(parsed))
            return parsed;
        return 0;
    }
    if (type === "Color") {
        return normalizeHexAlpha(lowerVal);
    }
    return val;
}
function isSupportedSelector(selector) {
    // If it doesn't contain a class (starts with dot), it's a tag selector.
    // We treat tag selectors as unsupported so they go into the CSS embed.
    // This is more reliable for base styles like body, a, img, etc.
    if (!selector.includes("."))
        return false;
    if (selector.includes("[") || selector.includes("]") || selector.includes(">") || selector.includes("~") || selector.includes("+"))
        return false;
    if (selector.includes("-webkit-") || selector.includes("-moz-") || selector.includes("-ms-") || selector.includes("-o-"))
        return false;
    const unsupportedPseudos = ["::before", "::after", ":before", ":after", ":nth-child", ":last-child", ":first-child", ":not", ":focus-within", ":checked", ":disabled", ":nth-of-type", ":empty", ":target"];
    for (const p of unsupportedPseudos) {
        if (selector.includes(p))
            return false;
    }
    return true;
}
const UNSUPPORTED_PROPERTIES = [
    "content",
];
function isSupportedProperty(prop) {
    if (prop.startsWith("--"))
        return false;
    return !UNSUPPORTED_PROPERTIES.includes(prop);
}
function resolveVars(value, varMap) {
    let oldVal = "";
    let newVal = value;
    let loops = 0;
    while (oldVal !== newVal && loops < 5) {
        oldVal = newVal;
        newVal = oldVal.replace(/var\((--[^,)]+)(?:,\s*([^)]+))?\)/g, (match, vName, fallback) => {
            return varMap[vName] ?? fallback ?? match;
        });
        loops++;
    }
    return newVal;
}
function wrapInMedia(rule, block) {
    let inMedia = false;
    let mediaParams = "";
    let mediaParent = rule.parent;
    while (mediaParent && mediaParent.type !== "root") {
        if (mediaParent.type === "atrule" && mediaParent.name === "media") {
            inMedia = true;
            mediaParams = `@media ${mediaParent.params}`;
            break;
        }
        mediaParent = mediaParent.parent;
    }
    if (inMedia) {
        return `${mediaParams} {\n  ${block.trim().split('\n').join('\n  ')}\n}\n`;
    }
    return block;
}
export function parseStyleTag(css) {
    const styles = {};
    const variables = [];
    let keyframes = "";
    let unsupportedCss = "";
    const root = postcss.parse(css);
    const rawVarMap = {};
    root.walkDecls((decl) => {
        if (decl.prop.startsWith("--")) {
            rawVarMap[decl.prop] = decl.value;
        }
    });
    root.walkAtRules((atRule) => {
        if (atRule.name === "keyframes") {
            keyframes += atRule.toString() + "\n";
        }
    });
    const unsupportedVarsByMode = new Map();
    root.walkRules((rule) => {
        // If rule is inside a keyframe, skip it (we already captured the whole at-rule)
        let rp = rule.parent;
        while (rp && rp.type !== "root") {
            if (rp.type === "atrule" && rp.name === "keyframes")
                return;
            rp = rp.parent;
        }
        const selectors = (rule.selectors || [rule.selector]).map((s) => s.replace(/\s+/g, " ").trim());
        const supportedSelectors = selectors.filter(isSupportedSelector);
        const unsupportedSelectors = selectors.filter(s => !isSupportedSelector(s));
        const declarations = {};
        const unsupportedRuleDeclarations = {};
        const supportedRuleDeclarations = {};
        const varModeMap = {
            main: "Base Mode",
            medium: "Tablet",
            small: "Phone Landscape",
            tiny: "Phone portrait",
            large: "Large",
            xl: "XL",
            xxl: "XXL",
        };
        let breakpointId = "main";
        let isInsideRecognizedMedia = false;
        let isInsideAnyMedia = false;
        // Check if this rule is inside a media query
        let mediaParent = rule.parent;
        while (mediaParent && mediaParent.type !== "root") {
            if (mediaParent.type === "atrule" &&
                mediaParent.name === "media") {
                isInsideAnyMedia = true;
                const params = mediaParent.params.toLowerCase();
                const maxWidthMatch = params.match(/max-width:\s*(\d+(?:\.\d+)?)\s*(px|rem|em)/);
                const minWidthMatch = params.match(/min-width:\s*(\d+(?:\.\d+)?)\s*(px|rem|em)/);
                if (maxWidthMatch) {
                    let width = parseFloat(maxWidthMatch[1]);
                    if (maxWidthMatch[2] === 'rem' || maxWidthMatch[2] === 'em') {
                        width *= 16;
                    }
                    // inclusive Tablet (991px and below, but above Mobile Landscape)
                    if (width > 768 && width <= 991) {
                        breakpointId = "medium";
                        isInsideRecognizedMedia = true;
                    }
                    // inclusive Mobile Landscape (767px and below, but above Mobile Portrait)
                    else if (width > 479 && width <= 768) {
                        breakpointId = "small";
                        isInsideRecognizedMedia = true;
                    }
                    // inclusive Mobile Portrait (479px and below)
                    else if (width <= 479) {
                        breakpointId = "tiny";
                        isInsideRecognizedMedia = true;
                    }
                }
                else if (minWidthMatch) {
                    let width = parseFloat(minWidthMatch[1]);
                    if (minWidthMatch[2] === 'rem' || minWidthMatch[2] === 'em') {
                        width *= 16;
                    }
                    if (width >= 1280 && width <= 1440) {
                        breakpointId = "large";
                        isInsideRecognizedMedia = true;
                    }
                    else if (width >= 1920) {
                        breakpointId = "xxl";
                        isInsideRecognizedMedia = true;
                    }
                }
            }
            mediaParent = mediaParent.parent;
        }
        // SAFETY: If we are inside a media query but it wasn't matched to a Webflow breakpoint,
        // we MUST treat it as unsupported CSS so it doesn't overwrite the 'main' desktop styles.
        if (isInsideAnyMedia && !isInsideRecognizedMedia) {
            let block = `${selectors.join(", ")} {\n`;
            rule.walkDecls((decl) => {
                block += `  ${decl.prop}: ${decl.value};\n`;
            });
            block += `}\n`;
            unsupportedCss += wrapInMedia(rule, block);
            return;
        }
        const currentMode = varModeMap[breakpointId] || "Base Mode";
        rule.walkDecls((decl) => {
            const isUniversal = selectors.some((s) => s.startsWith("*") || s === ":root");
            let prop = decl.prop;
            const value = decl.value;
            if (isUniversal && prop.startsWith("--")) {
                const variableName = prop.substring(2);
                const type = inferVariableType(value, rawVarMap);
                // Webflow variables support Size, Color, FontFamily, Number, and Percentage.
                // Gradients and URLs are still NOT supported as native variables in Webflow.
                // Time units (s, ms) and easing functions are now allowed to pass through
                // to support native animation and transition properties.
                const isUnsupportedValue = value.includes("gradient(") ||
                    value.includes("url(");
                if (isUnsupportedValue) {
                    // Collect for consolidated :root block per mode
                    if (!unsupportedVarsByMode.has(currentMode)) {
                        unsupportedVarsByMode.set(currentMode, {});
                    }
                    unsupportedVarsByMode.get(currentMode)[prop] = value;
                    return;
                }
                const parsedValue = parseValueForVariable(type, value);
                if (parsedValue === null)
                    return;
                const varVal = { type };
                if (typeof parsedValue === "object" &&
                    parsedValue !== null &&
                    parsedValue.isCustom) {
                    Object.assign(varVal, parsedValue);
                }
                else {
                    varVal.value = parsedValue;
                }
                // Find existing variable to merge modes
                let existingVar = variables.find(v => v.name === variableName);
                if (!existingVar) {
                    existingVar = {
                        name: variableName,
                        type,
                        values: {},
                        group: getVariableCollection(variableName, type),
                    };
                    variables.push(existingVar);
                }
                existingVar.values[currentMode] = varVal;
                return;
            }
            let isPropSupported = isSupportedProperty(prop);
            if (!isPropSupported) {
                unsupportedRuleDeclarations[decl.prop] = value;
            }
            else {
                if (supportedSelectors.length > 0) {
                    declarations[prop] = value;
                }
                if (unsupportedSelectors.length > 0) {
                    supportedRuleDeclarations[decl.prop] = value;
                }
            }
        });
        if (Object.keys(unsupportedRuleDeclarations).length > 0) {
            let block = `${selectors.join(", ")} {\n`;
            for (const [p, v] of Object.entries(unsupportedRuleDeclarations)) {
                block += `  ${p}: ${v};\n`;
            }
            block += `}\n`;
            unsupportedCss += wrapInMedia(rule, block);
        }
        if (Object.keys(supportedRuleDeclarations).length > 0 && unsupportedSelectors.length > 0) {
            let block = `${unsupportedSelectors.join(", ")} {\n`;
            for (const [p, v] of Object.entries(supportedRuleDeclarations)) {
                block += `  ${p}: ${v};\n`;
            }
            block += `}\n`;
            unsupportedCss += wrapInMedia(rule, block);
        }
        if (Object.keys(declarations).length === 0 || supportedSelectors.length === 0)
            return;
        // Normalize properties at parse time — frontend receives clean kebab-case maps
        const normalized = normalizeCssProperties(declarations);
        for (const selector of supportedSelectors) {
            if (!styles[selector]) {
                styles[selector] = {};
            }
            if (!styles[selector][breakpointId]) {
                styles[selector][breakpointId] = {};
            }
            Object.assign(styles[selector][breakpointId], normalized);
        }
    });
    // At the end, before return:
    for (const [mode, vars] of unsupportedVarsByMode.entries()) {
        if (Object.keys(vars).length === 0)
            continue;
        const modeComment = mode === "Base Mode" ? "" : ` /* Mode: ${mode} */`;
        let block = `:root${modeComment} {\n`;
        for (const [p, v] of Object.entries(vars)) {
            block += `  ${p}: ${v};\n`;
        }
        block += `}\n`;
        unsupportedCss = block + unsupportedCss; // Prepend variables to top of CSS embed
    }
    return { styles, variables, keyframes, unsupportedCss };
}
function convertHtmlNode(node, baseDir) {
    if (node.nodeName === "#text") {
        const text = node.value.trim();
        return text
            ? {
                type: "Paragraph",
                text,
                classes: [],
                children: [],
            }
            : null;
    }
    if (node.nodeName.startsWith("#") || !node.tagName)
        return null;
    const tagName = node.tagName.toLowerCase();
    let classes = [];
    let id;
    let attributes = {};
    let styles = {};
    const rawInlineStyles = {};
    (node.attrs || []).forEach((attr) => {
        if (attr.name === "class") {
            classes = attr.value.split(" ").filter(Boolean);
        }
        else if (attr.name === "id") {
            id = attr.value;
        }
        else if (attr.name === "style") {
            // Collect raw inline styles — normalizer runs below
            attr.value.split(";").forEach((s) => {
                const parts = s.split(":");
                if (parts.length < 2)
                    return;
                const key = parts[0].trim();
                const val = parts.slice(1).join(":").trim();
                if (key && val)
                    rawInlineStyles[key] = val;
            });
        }
        else {
            const val = attr.value;
            if ((attr.name === "src" || attr.name === "data-asset") && val) {
                attributes[attr.name] = processAssetUrl(val, baseDir);
            }
            else {
                attributes[attr.name] = val;
            }
        }
    });
    // Normalize inline styles through the same pipeline as global styles
    styles = normalizeCssProperties(rawInlineStyles);
    let type = "Block";
    if (["h1", "h2", "h3", "h4", "h5", "h6"].includes(tagName))
        type = "Heading";
    else if (tagName === "p")
        type = "Paragraph";
    else if (tagName === "a")
        type = "Link";
    else if (tagName === "img")
        type = "Image";
    else if (tagName === "ul" || tagName === "ol")
        type = "List";
    else if (tagName === "li")
        type = "ListItem";
    else if (tagName === "form")
        type = "FormForm";
    else if (tagName === "label")
        type = "FormBlockLabel";
    else if (tagName === "textarea")
        type = "FormTextarea";
    else if (tagName === "select")
        type = "FormSelect";
    else if (tagName === "button")
        type = "FormButton";
    else if (tagName === "input") {
        const inputType = (attributes["type"] || "text").toLowerCase();
        if (inputType === "checkbox")
            type = "FormCheckboxInput";
        else if (inputType === "radio")
            type = "FormRadioInput";
        else if (inputType === "submit")
            type = "FormButton";
        else
            type = "FormTextInput";
    }
    else if (["script", "style", "link", "meta"].includes(tagName)) {
        // script, style, link, and meta tags MUST be HtmlEmbeds because they can't be native DOM blocks in Webflow Designer without attribute errors
        let textVal;
        if (tagName === "script" || tagName === "style") {
            const innerCode = (node.childNodes || [])
                .map((c) => (c.nodeName === "#text" ? c.value : ""))
                .join("");
            const attrs = (node.attrs || [])
                .map((a) => ` ${a.name}="${a.value}"`)
                .join("");
            // Reconstruct with explicit preservation of structure
            const fullCode = `<${tagName}${attrs}>\n${innerCode}\n</${tagName}>`;
            textVal = fullCode.split(/\r?\n/);
        }
        else {
            textVal = serialize({ childNodes: [node] });
        }
        return {
            type: "HtmlEmbed",
            tag: tagName,
            classes,
            id,
            styles: Object.keys(styles).length > 0 ? styles : undefined,
            attributes: Object.keys(attributes).length > 0 ? attributes : undefined,
            text: textVal,
            children: [],
        };
    }
    const children = [];
    let aggregateText = "";
    let hasRealElements = false;
    (node.childNodes || []).forEach((child) => {
        if (child.nodeName === "#text") {
            const val = child.value.trim();
            if (val) {
                if ((type === "Block" && tagName === "div") || type === "ListItem") {
                    // SPECIAL CASE: Text inside a div or list item is wrapped in a custom span element
                    // This ensures text is rendered reliably via direct DOM manipulation,
                    // avoiding issues where native TextBlock presets fail to hydrate correctly.
                    children.push({
                        type: "custom",
                        tag: "span",
                        text: val,
                        classes: [],
                        children: [],
                    });
                    hasRealElements = true;
                }
                else {
                    aggregateText += (aggregateText ? " " : "") + val;
                }
            }
        }
        else {
            const converted = convertHtmlNode(child, baseDir);
            if (converted) {
                children.push(converted);
                hasRealElements = true;
            }
        }
    });
    // WEBFLOW COMPLIANCE: Valid block tags for DivBlock are strict.
    // If it's a Block type but not a valid tag, we switch to "custom" (DOM element)
    const validBlockTags = ["div", "section", "header", "footer", "main", "nav", "aside", "article", "address", "figure"];
    if (type === "Block" && !validBlockTags.includes(tagName)) {
        type = "custom";
    }
    // WEBFLOW COMPLIANCE: Paragraphs and Headings cannot have child elements in Webflow.
    // If they have children, we MUST use a custom DOM element instead.
    if ((type === "Paragraph" || type === "Heading") && hasRealElements) {
        type = "custom";
    }
    return {
        type,
        tag: type === "custom" || type === "Block" || type === "Heading" ? tagName : undefined,
        classes,
        id,
        styles: Object.keys(styles).length > 0 ? styles : undefined,
        attributes: Object.keys(attributes).length > 0 ? attributes : undefined,
        text: aggregateText || undefined,
        children: children,
    };
}
export function parseHtml(code, baseDir) {
    const document = parse(code);
    const globalStyles = {};
    const globalVariables = [];
    let keyframes = "";
    let unsupportedCss = "";
    const findStyleTags = (node) => {
        if (node.tagName === "style") {
            const css = node.childNodes?.[0]?.value;
            if (css) {
                const { styles, variables, keyframes: tagKeyframes, unsupportedCss: tagUnsupportedCss, } = parseStyleTag(css);
                if (tagKeyframes)
                    keyframes += tagKeyframes + "\n";
                if (tagUnsupportedCss)
                    unsupportedCss += tagUnsupportedCss + "\n";
                if (variables.length > 0) {
                    globalVariables.push(...variables);
                }
                for (const [selector, breakpoints] of Object.entries(styles)) {
                    if (!globalStyles[selector])
                        globalStyles[selector] = {};
                    for (const [bp, props] of Object.entries(breakpoints)) {
                        const typedBp = bp;
                        if (!globalStyles[selector][typedBp])
                            globalStyles[selector][typedBp] = {};
                        Object.assign(globalStyles[selector][typedBp], props);
                    }
                }
            }
        }
        if (node.childNodes) {
            node.childNodes.forEach(findStyleTags);
        }
    };
    findStyleTags(document);
    const htmlNode = document.childNodes.find((n) => n.tagName === "html");
    const body = htmlNode
        ? htmlNode.childNodes.find((n) => n.tagName === "body")
        : null;
    if (!body)
        return { nodes: [], globalStyles, collections: [] };
    const nodes = [];
    body.childNodes.forEach((child) => {
        const converted = convertHtmlNode(child, baseDir);
        if (converted)
            nodes.push(converted);
    });
    let collections = undefined;
    if (globalVariables.length > 0) {
        const groups = {};
        globalVariables.forEach((v) => {
            const group = v.group || "Base Collection";
            if (!groups[group])
                groups[group] = [];
            // Deduplicate and merge by name across multiple style tags/files
            const existing = groups[group].find(ev => ev.name === v.name);
            if (existing) {
                Object.assign(existing.values, v.values);
            }
            else {
                groups[group].push(v);
            }
        });
        collections = Object.entries(groups).map(([name, vars]) => {
            // Extract all unique mode names present in this collection
            const allModes = new Set();
            vars.forEach(v => Object.keys(v.values).forEach(m => allModes.add(m)));
            return {
                name,
                modes: Array.from(allModes).map(m => ({ name: m })),
                variables: vars,
            };
        });
        // Optional: Sort collections to a predictable order
        const order = ["Base Collection", "Typography", "Global Variables"];
        collections.sort((a, b) => {
            const idxA = order.indexOf(a.name);
            const idxB = order.indexOf(b.name);
            if (idxA !== -1 && idxB !== -1)
                return idxA - idxB;
            if (idxA !== -1)
                return -1;
            if (idxB !== -1)
                return 1;
            return a.name.localeCompare(b.name);
        });
    }
    return { nodes, globalStyles, collections, keyframes, unsupportedCss };
}

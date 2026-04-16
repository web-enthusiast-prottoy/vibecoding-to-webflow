import { parse, serialize } from "parse5";
import postcss from "postcss";
import { normalizeCssProperties, normalizeHexAlpha, } from "../normalizer/cssNormalizer";
function inferVariableType(value) {
    const lowerVal = value.trim().toLowerCase();
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
        lowerVal.includes("max(")) {
        return "Size";
    }
    // 5. Font Families (quotes or commas without CSS functions)
    if (value.includes('"') || value.includes("'") || value.includes(",")) {
        return "FontFamily";
    }
    return "Size"; // fallback
}
/**
 * Determines which Webflow collection a variable belongs to based on its name and type.
 */
function getVariableCollection(name, type) {
    const n = name.toLowerCase();
    // 1. Colors -> Base
    if (type === "Color")
        return "Base";
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
    // Fallback to Base (default for colors or unknown)
    return "Base";
}
function parseValueForVariable(type, value) {
    const val = value.trim();
    const lowerVal = val.toLowerCase();
    // Handle keywords not supported by Webflow variables
    if (["initial", "unset", "revert"].includes(lowerVal)) {
        if (type === "Color")
            return "transparent";
        if (type === "Size")
            return { value: 0, unit: "px" };
        if (type === "Percentage")
            return 0;
        if (type === "Number")
            return 0;
        return 0;
    }
    if (type === "Size") {
        // Check for complex CSS functions first - these must be handled as custom values
        if (lowerVal.includes("calc(") ||
            lowerVal.includes("clamp(") ||
            lowerVal.includes("min(") ||
            lowerVal.includes("max(")) {
            // Return a format that the frontend index.ts:resolveValueForCreate can handle
            // We need to return an object that will be used to set values[mode]
            return { isCustom: true, customValue: val };
        }
        const match = val.match(/^(-?\d+(\.\d+)?)(px|em|rem|vw|vh|%|ch|ex)?$/);
        if (match) {
            return { value: parseFloat(match[1]), unit: match[3] || "px" };
        }
        // If it has units but isn't a simple number+unit (e.g. "10px 20px" - though not common for single var)
        // treat as custom if it's not a simple number
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
    if (selector.includes("[") || selector.includes("]") || selector.includes(">") || selector.includes("~") || selector.includes("+"))
        return false;
    const unsupportedPseudos = ["::before", "::after", ":before", ":after", ":nth-child", ":last-child", ":first-child", ":not", ":focus-within", ":checked", ":disabled", ":nth-of-type", ":empty", ":target"];
    for (const p of unsupportedPseudos) {
        if (selector.includes(p))
            return false;
    }
    return true;
}
const SUPPORTED_PREFIXES = [
    "display", "position", "top", "right", "bottom", "left", "inset",
    "flex", "align", "justify", "order", "gap", "grid", "place",
    "width", "height", "min-width", "min-height", "max-width", "max-height", "aspect-ratio",
    "margin", "padding",
    "color", "background", "border", "box-shadow", "opacity",
    "font", "text", "line-height", "letter-spacing", "word", "white-space", "vertical-align",
    "z-index", "overflow", "cursor", "list-style", "outline", "fill", "stroke",
    "object-fit", "object-position", "float", "clear"
];
function isSupportedProperty(prop) {
    if (prop.startsWith("--"))
        return false;
    for (const prefix of SUPPORTED_PREFIXES) {
        if (prop === prefix || prop.startsWith(prefix + "-"))
            return true;
    }
    return false;
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
        if (atRule.name === "keyframes" || atRule.name === "font-face") {
            keyframes += atRule.toString() + "\n";
        }
    });
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
        rule.walkDecls((decl) => {
            const isUniversal = selectors.some((s) => s.startsWith("*") || s === ":root");
            let prop = decl.prop;
            const value = decl.value;
            if (isUniversal && prop.startsWith("--")) {
                const type = inferVariableType(value);
                const parsedValue = parseValueForVariable(type, value);
                const variableName = prop.substring(2);
                const varVal = { type };
                if (typeof parsedValue === "object" &&
                    parsedValue !== null &&
                    parsedValue.isCustom) {
                    Object.assign(varVal, parsedValue);
                }
                else {
                    varVal.value = parsedValue;
                }
                variables.push({
                    name: variableName,
                    type,
                    values: { Default: varVal },
                    group: getVariableCollection(variableName, type),
                });
                if (supportedSelectors.length > 0)
                    declarations[prop] = value;
                if (unsupportedSelectors.length > 0)
                    supportedRuleDeclarations[decl.prop] = value;
                return;
            }
            let isPropSupported = isSupportedProperty(prop);
            // Handle vendor prefixes
            if (prop.startsWith("-webkit-") ||
                prop.startsWith("-moz-") ||
                prop.startsWith("-ms-") ||
                prop.startsWith("-o-")) {
                const standardProp = prop.replace(/^-(webkit|moz|ms|o)-/, "");
                // Map known supported ones, skip others
                if (standardProp === "backdrop-filter") {
                    prop = standardProp;
                    isPropSupported = true;
                }
                else if (!isUniversal || !prop.startsWith("--")) {
                    unsupportedRuleDeclarations[decl.prop] = value;
                    return;
                }
            }
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
                block += `  ${p}: ${resolveVars(v, rawVarMap)};\n`;
            }
            block += `}\n`;
            unsupportedCss += wrapInMedia(rule, block);
        }
        if (Object.keys(supportedRuleDeclarations).length > 0 && unsupportedSelectors.length > 0) {
            let block = `${unsupportedSelectors.join(", ")} {\n`;
            for (const [p, v] of Object.entries(supportedRuleDeclarations)) {
                block += `  ${p}: ${resolveVars(v, rawVarMap)};\n`;
            }
            block += `}\n`;
            unsupportedCss += wrapInMedia(rule, block);
        }
        if (Object.keys(declarations).length === 0 || supportedSelectors.length === 0)
            return;
        let breakpointId = "main";
        // Check if this rule is inside a media query
        let mediaParent = rule.parent;
        while (mediaParent && mediaParent.type !== "root") {
            if (mediaParent.type === "atrule" &&
                mediaParent.name === "media") {
                const params = mediaParent.params.toLowerCase();
                // Use regex for more robust matching (handles spaces, units, and modern syntax)
                const maxWidthMatch = params.match(/max-width:\s*(\d+(?:\.\d+)?)\s*px/);
                const minWidthMatch = params.match(/min-width:\s*(\d+(?:\.\d+)?)\s*px/);
                if (maxWidthMatch) {
                    const width = parseFloat(maxWidthMatch[1]);
                    if (width >= 991 && width <= 992)
                        breakpointId = "medium";
                    else if (width >= 767 && width <= 768)
                        breakpointId = "small";
                    else if (width >= 479 && width <= 480)
                        breakpointId = "tiny";
                }
                else if (minWidthMatch) {
                    const width = parseFloat(minWidthMatch[1]);
                    if (width >= 1280 && width <= 1440)
                        breakpointId = "large";
                    else if (width >= 1920)
                        breakpointId = "xxl";
                }
            }
            mediaParent = mediaParent.parent;
        }
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
    return { styles, variables, keyframes, unsupportedCss };
}
function convertHtmlNode(node) {
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
            attributes[attr.name] = attr.value;
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
    else if (["script", "style", "link", "meta"].includes(tagName)) {
        // script, style, link, and meta tags MUST be HtmlEmbeds because they can't be native DOM blocks in Webflow Designer
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
                if (type === "Block" && tagName === "div") {
                    // SPECIAL CASE: Text inside a div is wrapped in a TextBlock child
                    children.push({
                        type: "TextBlock",
                        tag: "div",
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
            const converted = convertHtmlNode(child);
            if (converted) {
                if (tagName === "p" &&
                    converted.tag === "span" &&
                    converted.children.length === 0) {
                    if (converted.text)
                        aggregateText +=
                            (aggregateText ? " " : "") + converted.text;
                }
                else {
                    children.push(converted);
                    hasRealElements = true;
                }
            }
        }
    });
    return {
        type,
        tag: type === "Block" || type === "Heading" ? tagName : undefined,
        classes,
        id,
        styles: Object.keys(styles).length > 0 ? styles : undefined,
        attributes: Object.keys(attributes).length > 0 ? attributes : undefined,
        text: aggregateText || undefined,
        children: hasRealElements ? children : [],
    };
}
export function parseHtml(code) {
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
        const converted = convertHtmlNode(child);
        if (converted)
            nodes.push(converted);
    });
    let collections = undefined;
    if (globalVariables.length > 0) {
        const groups = {};
        globalVariables.forEach((v) => {
            const group = v.group || "Base";
            if (!groups[group])
                groups[group] = [];
            groups[group].push(v);
        });
        collections = Object.entries(groups).map(([name, vars]) => ({
            name,
            modes: [{ name: "Default" }],
            variables: vars,
        }));
        // Optional: Sort collections to a predictable order
        const order = ["Base", "Typography", "Global Variables"];
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

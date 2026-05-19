// ============================================================
// Clipboard, HTML Serialization, and Style Map Helpers
// ============================================================
import { BREAKPOINT_KEYS } from "../../types.js";
export function convertNodeToWebflowClipboard(node, styleMap) {
    var _a, _b, _c, _d, _e, _f;
    const nodeId = crypto.randomUUID
        ? crypto.randomUUID()
        : "e" + Math.random().toString(36).substr(2, 9);
    // 1. Resolve classes to IDs
    const classes = (node.classes || []).map((c) => styleMap.get(c) || c);
    // 2. Handle SVG Root -> HtmlEmbed
    const isSvgRoot = node.type === "custom" && ((_a = node.tag) === null || _a === void 0 ? void 0 : _a.toLowerCase()) === "svg";
    if (isSvgRoot) {
        // Build clean code (without classes)
        const savedClasses = node.classes;
        // @ts-ignore
        node.classes = [];
        const code = nodeToHtml(node).replace(/\s+class="[^"]*"/gi, "");
        // @ts-ignore
        node.classes = savedClasses;
        return {
            _id: nodeId,
            type: "HtmlEmbed",
            tag: "div",
            classes: classes,
            children: [],
            data: {
                search: { exclude: true },
                embed: {
                    type: "html",
                    meta: {
                        html: code,
                        div: false,
                        script: false,
                        compilable: false,
                        iframe: false,
                    },
                },
                insideRTE: false,
                content: "",
                displayName: "SVG Embed",
                attr: { id: node.id || "" },
                xattr: [],
                visibility: {
                    conditions: [],
                    keepInHtml: { tag: "False", val: {} },
                },
            },
        };
    }
    // 3. Handle Standard Nodes
    const children = (node.children || []).map((c) => convertNodeToWebflowClipboard(c, styleMap));
    // Map internal types to Webflow Clipboard types
    let wfType = node.type;
    if (wfType === "custom" || wfType === "Block")
        wfType = "Block";
    const payload = {
        _id: nodeId,
        type: wfType,
        tag: node.tag,
        classes: classes,
        children: children,
    };
    // Special data for certain types
    if (wfType === "Image") {
        payload.data = {
            asset: ((_b = node.attributes) === null || _b === void 0 ? void 0 : _b.src) || "",
            alt: ((_c = node.attributes) === null || _c === void 0 ? void 0 : _c.alt) || "",
        };
    }
    else if (wfType === "Link") {
        payload.data = {
            url: ((_d = node.attributes) === null || _d === void 0 ? void 0 : _d.href) || "#",
            target: ((_e = node.attributes) === null || _e === void 0 ? void 0 : _e.target) || "",
        };
    }
    else if (wfType === "Heading") {
        const levelMatch = (_f = node.tag) === null || _f === void 0 ? void 0 : _f.match(/^h([1-6])$/i);
        const level = levelMatch ? parseInt(levelMatch[1]) : 2;
        payload.data = { level };
    }
    return payload;
}
export function isBreakpointStyleMap(value) {
    if (!value || typeof value !== "object" || Array.isArray(value))
        return false;
    const entries = Object.entries(value);
    if (entries.length === 0)
        return false;
    return entries.every(([key, nested]) => BREAKPOINT_KEYS.has(key) &&
        !!nested &&
        typeof nested === "object" &&
        !Array.isArray(nested));
}
export function hasNodeStyles(value) {
    if (!value)
        return false;
    if (isBreakpointStyleMap(value)) {
        return Object.values(value).some((props) => !!props && Object.keys(props).length > 0);
    }
    return Object.keys(value).length > 0;
}
export function getPreviewStyles(value) {
    if (!value)
        return undefined;
    return isBreakpointStyleMap(value) ? value.main : value;
}
export function nodeToHtml(node) {
    const tag = node.tag ||
        (node.type === "Heading"
            ? "h1"
            : node.type === "Paragraph"
                ? "p"
                : "div");
    // Collect attributes (excluding class which is handled separately)
    const attrs = Object.entries(node.attributes || {})
        .filter(([k]) => k.toLowerCase() !== "class" && k.toLowerCase() !== "classname")
        .map(([k, v]) => ` ${k}="${v}"`)
        .join("");
    // Inline styles
    let stylesStr = "";
    const previewStyles = getPreviewStyles(node.styles);
    if (previewStyles && Object.keys(previewStyles).length > 0) {
        stylesStr = ` style="${Object.entries(previewStyles)
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
    const text = typeof node.text === "string"
        ? node.text
        : Array.isArray(node.text)
            ? node.text.join("\n")
            : "";
    const childrenHtml = (node.children || []).map(nodeToHtml).join("");
    const selfClosing = [
        "path",
        "circle",
        "rect",
        "line",
        "polyline",
        "polygon",
        "ellipse",
        "img",
        "br",
        "hr",
    ];
    if (selfClosing.includes(tag.toLowerCase()) &&
        !text &&
        childrenHtml.length === 0) {
        return `<${tag}${classStr}${attrs}${stylesStr} />`;
    }
    return `${startTag}${text}${childrenHtml}${endTag}`;
}

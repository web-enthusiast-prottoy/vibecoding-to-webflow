// ============================================================
// Element Presets & Asset Upload
// ============================================================
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
export function getPresetForType(node) {
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
            // ALWAYS use LinkBlock to ensure text is editable as a child TextBlock.
            // Text links (Link presets) are often not changeable later in Webflow via the Designer API.
            return webflow.elementPresets.LinkBlock;
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
                webflow.elementPresets.DOM ||
                webflow.elementPresets.BlockElement);
        case "FormWrapper":
            return (webflow.elementPresets.FormWrapper ||
                webflow.elementPresets.DivBlock);
        case "FormForm":
            return webflow.elementPresets.FormForm || webflow.elementPresets.DOM;
        case "FormTextInput":
            return webflow.elementPresets.FormTextInput || webflow.elementPresets.DOM;
        case "FormTextarea":
            return webflow.elementPresets.FormTextarea || webflow.elementPresets.DOM;
        case "FormSelect":
            return webflow.elementPresets.FormSelect || webflow.elementPresets.DOM;
        case "FormCheckboxInput":
            return (webflow.elementPresets.FormCheckboxInput ||
                webflow.elementPresets.DOM);
        case "FormRadioInput":
            return webflow.elementPresets.FormRadioInput || webflow.elementPresets.DOM;
        case "FormBlockLabel":
            return (webflow.elementPresets.FormBlockLabel ||
                webflow.elementPresets.DOM);
        case "FormButton":
            return webflow.elementPresets.FormButton || webflow.elementPresets.DOM;
        case "FormSuccessMessage":
            return (webflow.elementPresets.FormSuccessMessage ||
                webflow.elementPresets.DivBlock);
        case "FormErrorMessage":
            return (webflow.elementPresets.FormErrorMessage ||
                webflow.elementPresets.DivBlock);
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
            // Upgrade custom div to native DivBlock
            if (tag === "div")
                return webflow.elementPresets.DivBlock;
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
    // Relaxed check: If it's a native tag, we prefer DivBlock even with custom attributes
    // as long as it's not likely to be a complex DOM element that needs full DOM control.
    const isSupportedBlockTag = WEBFLOW_NATIVE_TAGS.includes(tag || "");
    if (isSupportedBlockTag) {
        return webflow.elementPresets.DivBlock;
    }
    return webflow.elementPresets.DOM;
}
export async function uploadAssetFromUrl(url) {
    try {
        if (!url || (!url.startsWith("http") && !url.startsWith("data:"))) {
            console.warn("Skipping asset upload for non-absolute or data URL:", url);
            return null;
        }
        // 1. Fetch image with basic validation
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
        }
        // Use arrayBuffer instead of blob to ensure we get raw bytes.
        // This bypasses issues in some environments where response.blob() yields a corrupted/readonly object
        // that the Webflow API cannot correctly process or assign properties to.
        const arrayBuffer = await response.arrayBuffer();
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
            return await webflow.createAsset(file);
        }
        catch (err1) {
            try {
                log(`    → Pattern 2: Uploading as { file } object...`);
                const file = new File([uint8Array], fileName, {
                    type: mimeType,
                });
                return await webflow.createAsset({ file });
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
                    return await webflow.createAsset(backupBlob);
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
}

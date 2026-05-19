// ============================================================
// Element Presets & Asset Upload
// ============================================================

import type { WebflowReadyNode, LogLevel } from "../../types.js";
import { withTimeout } from "../utils/helpers.js";

// Forward-declared logger to avoid circular dependency.
let _log: ((message: string, level?: LogLevel) => void) | null = null;
export function injectLog(fn: (message: string, level?: LogLevel) => void): void {
	_log = fn;
}

function log(message: string, level?: LogLevel): void {
	if (_log) _log(message, level);
	else console.log(`[${(level || "info").toUpperCase()}] ${message}`);
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

export function getPresetForType(node: WebflowReadyNode): any {
	const tag = node.tag?.toLowerCase();

	// 1. Prioritize explicit Webflow types
	switch (node.type) {
		case "Heading":
			if (node.children && node.children.length > 0)
				return (webflow as any).elementPresets.DivBlock;
			return (webflow as any).elementPresets.Heading;
		case "Paragraph":
			if (node.children && node.children.length > 0)
				return (webflow as any).elementPresets.DivBlock;
			return (webflow as any).elementPresets.Paragraph;
		case "Link": {
			// ALWAYS use LinkBlock to ensure text is editable as a child TextBlock.
			// Text links (Link presets) are often not changeable later in Webflow via the Designer API.
			return (webflow as any).elementPresets.LinkBlock;
		}
		case "Image":
			return (webflow as any).elementPresets.Image;
		case "HtmlEmbed":
			return (
				(webflow as any).elementPresets.HtmlEmbed ||
				(webflow as any).elementPresets.Embed ||
				(webflow as any).elementPresets.HTMLEmbed ||
				(webflow as any).elementPresets.Html ||
				(webflow as any).elementPresets.EmbedCode ||
				(webflow as any).elementPresets.CodeEmbed ||
				(webflow as any).elementPresets.EmbedElement
			);
		case "List":
			return (
				(webflow as any).elementPresets.List ||
				(webflow as any).elementPresets.ListElement
			);
		case "ListItem":
			return (
				(webflow as any).elementPresets.ListItem ||
				(webflow as any).elementPresets.ListItemElement
			);
		case "TextBlock":
			return (
				(webflow as any).elementPresets.TextBlock ||
				(webflow as any).elementPresets.DOM ||
				(webflow as any).elementPresets.BlockElement
			);
		case "FormWrapper":
			return (
				(webflow as any).elementPresets.FormWrapper ||
				(webflow as any).elementPresets.DivBlock
			);
		case "FormForm":
			return (webflow as any).elementPresets.FormForm || (webflow as any).elementPresets.DOM;
		case "FormTextInput":
			return (webflow as any).elementPresets.FormTextInput || (webflow as any).elementPresets.DOM;
		case "FormTextarea":
			return (webflow as any).elementPresets.FormTextarea || (webflow as any).elementPresets.DOM;
		case "FormSelect":
			return (webflow as any).elementPresets.FormSelect || (webflow as any).elementPresets.DOM;
		case "FormCheckboxInput":
			return (
				(webflow as any).elementPresets.FormCheckboxInput ||
				(webflow as any).elementPresets.DOM
			);
		case "FormRadioInput":
			return (webflow as any).elementPresets.FormRadioInput || (webflow as any).elementPresets.DOM;
		case "FormBlockLabel":
			return (
				(webflow as any).elementPresets.FormBlockLabel ||
				(webflow as any).elementPresets.DOM
			);
		case "FormButton":
			return (webflow as any).elementPresets.FormButton || (webflow as any).elementPresets.DOM;
		case "FormSuccessMessage":
			return (
				(webflow as any).elementPresets.FormSuccessMessage ||
				(webflow as any).elementPresets.DivBlock
			);
		case "FormErrorMessage":
			return (
				(webflow as any).elementPresets.FormErrorMessage ||
				(webflow as any).elementPresets.DivBlock
			);
		case "custom": {
			// Upgrade custom nodes whose tag matches a native Webflow form element.
			// This handles stale JSON where the backend emitted type="custom" for
			// form/label/input/textarea/select/button before the form-type mapping was added.
			if (tag === "form")
				return (webflow as any).elementPresets.FormForm || (webflow as any).elementPresets.DOM;
			if (tag === "label")
				return (webflow as any).elementPresets.FormBlockLabel || (webflow as any).elementPresets.DOM;
			if (tag === "textarea")
				return (webflow as any).elementPresets.FormTextarea || (webflow as any).elementPresets.DOM;
			if (tag === "select")
				return (webflow as any).elementPresets.FormSelect || (webflow as any).elementPresets.DOM;
			if (tag === "button")
				return (webflow as any).elementPresets.FormButton || (webflow as any).elementPresets.DOM;
			if (tag === "input") {
				const inputType = (node.attributes?.type || "text").toLowerCase();
				if (inputType === "checkbox")
					return (webflow as any).elementPresets.FormCheckboxInput || (webflow as any).elementPresets.DOM;
				if (inputType === "radio")
					return (webflow as any).elementPresets.FormRadioInput || (webflow as any).elementPresets.DOM;
				if (inputType === "submit")
					return (webflow as any).elementPresets.FormButton || (webflow as any).elementPresets.DOM;
				return (webflow as any).elementPresets.FormTextInput || (webflow as any).elementPresets.DOM;
			}
			
			// Upgrade custom div to native DivBlock
			if (tag === "div") return (webflow as any).elementPresets.DivBlock;

			return (webflow as any).elementPresets.DOM;
		}
	}

	// 2. Map tags to native presets
	if (tag === "ul" || tag === "ol") return (webflow as any).elementPresets.List;
	if (tag === "li") return (webflow as any).elementPresets.ListItem;
	if (tag === "form") return (webflow as any).elementPresets.FormForm;
	if (tag === "label") return (webflow as any).elementPresets.FormBlockLabel;
	if (tag === "textarea") return (webflow as any).elementPresets.FormTextarea;
	if (tag === "select") return (webflow as any).elementPresets.FormSelect;
	if (tag === "button") return (webflow as any).elementPresets.FormButton;
	if (tag === "input") {
		const inputType = (node.attributes?.type || "text").toLowerCase();
		if (inputType === "checkbox") return (webflow as any).elementPresets.FormCheckboxInput;
		if (inputType === "radio") return (webflow as any).elementPresets.FormRadioInput;
		if (inputType === "submit") return (webflow as any).elementPresets.FormButton;
		return (webflow as any).elementPresets.FormTextInput;
	}

	// 2. Custom attributes check for Block types
	// Relaxed check: If it's a native tag, we prefer DivBlock even with custom attributes
	// as long as it's not likely to be a complex DOM element that needs full DOM control.
	const isSupportedBlockTag = WEBFLOW_NATIVE_TAGS.includes(tag || "");

	if (isSupportedBlockTag) {
		return (webflow as any).elementPresets.DivBlock;
	}

	return (webflow as any).elementPresets.DOM;
}

export async function uploadAssetFromUrl(url: string): Promise<any> {
	try {
		if (!url || (!url.startsWith("http") && !url.startsWith("data:"))) {
			console.warn(
				"Skipping asset upload for non-absolute or data URL:",
				url,
			);
			return null;
		}

		// 1. Fetch image with basic validation
		const response = await fetch(url);
		if (!response.ok) {
			throw new Error(
				`Failed to fetch image: ${response.status} ${response.statusText}`,
			);
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
		if (mimeType.includes("jpeg") || mimeType.includes("jpg")) ext = "jpg";
		else if (mimeType.includes("svg")) ext = "svg";
		else if (mimeType.includes("webp")) ext = "webp";

		const fileName = `img-${Date.now()}.${ext}`;

		// 3. Resilient upload sequence
		// We try multiple patterns to ensure compatibility with different API variants/versions
		try {
			log(`    → Pattern 1: Uploading File object (${fileName})...`);
			const file = new File([uint8Array], fileName, { type: mimeType });
			return await (webflow as any).createAsset(file);
		} catch (err1: any) {
			try {
				log(`    → Pattern 2: Uploading as { file } object...`);
				const file = new File([uint8Array], fileName, {
					type: mimeType,
				});
				return await (webflow as any).createAsset({ file });
			} catch (err2: any) {
				try {
					log(
						`    → Pattern 3: Uploading File/Blob via defineProperty...`,
					);
					// Some environments don't have a fully spec-compliant File constructor
					const backupBlob = new Blob([uint8Array], {
						type: mimeType,
					});
					Object.defineProperty(backupBlob, "name", {
						value: fileName,
						writable: true,
					});
					return await (webflow as any).createAsset(backupBlob as File);
				} catch (err3: any) {
					const finalMsg =
						err1?.message ||
						err3?.message ||
						"All upload patterns failed";
					log(`    ✕ Asset upload failed: ${finalMsg}`, "error");
					(webflow as any).notify({
						type: "Error",
						message: `Asset Sync Error: ${finalMsg}`,
					});
					throw err1;
				}
			}
		}
	} catch (err: any) {
		const errorMessage = err?.message || String(err);
		console.warn(`Could not upload asset from ${url}:`, err);
		log(`    ✕ Asset Upload Error: ${errorMessage}`, "error");
		return null;
	}
}

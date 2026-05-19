// ============================================================
// Element Tree Builder
// ============================================================

import type { WebflowReadyNode, LogLevel } from "../../types.js";
import { withTimeout, countAllNodes } from "../utils/helpers.js";
import { nodeToHtml } from "../utils/clipboard.js";
import { getPresetForType, uploadAssetFromUrl } from "./presets.js";
import { applyStyleProperties, applyNodeStyleMap } from "../styles/engine.js";
import { getStyleByName } from "../styles/cache.js";
import {
	fallbackEmbeds,
	complexValueEmbeds,
	recordFallbackEmbed,
	recordIdEmbed,
	incrementProgress,
	getStyleCache,
	variableCache,
	uploadedPayload,
} from "../../state.js";

// Forward-declared logger to avoid circular dependency.
let _log: ((message: string, level?: LogLevel) => void) | null = null;
export function injectLog(fn: (message: string, level?: LogLevel) => void): void {
	_log = fn;
}

function log(message: string, level?: LogLevel): void {
	if (_log) _log(message, level);
	else console.log(`[${(level || "info").toUpperCase()}] ${message}`);
}

/**
 * Robustly adds an element even if the user has a non-container selected.
 * If append is not supported, it tries to add as a sibling (after).
 */
export async function smartAppend(parentNode: any, preset: any): Promise<any> {
	if (typeof parentNode.append === "function") {
		return await withTimeout(
			parentNode.append(preset),
			10000,
			"smartAppend-append",
		);
	}

	if (typeof parentNode.after === "function") {
		log(
			`    ⚠ Selection (${parentNode.type}) doesn't support children. Adding as sibling instead.`,
			"warn",
		);
		return await withTimeout(
			parentNode.after(preset),
			10000,
			"smartAppend-after",
		);
	}

	// Try moving up one level
	if (typeof parentNode.getParent === "function") {
		const realParent = await parentNode.getParent();
		if (realParent) {
			log(
				`    ⚠ Selection not a container. Moving up to ${realParent.type}...`,
				"info",
			);
			return await smartAppend(realParent, preset);
		}
	}

	throw new Error(
		`Current selection (${parentNode.type}) cannot have children or siblings.`,
	);
}

export async function setElementText(element: any, text: string): Promise<void> {
	if (!element) return;

	// Helper to deeply find the String child relative to any parent
	async function findStringDescendant(parent: any, depth = 0): Promise<any> {
		if (depth > 5 || !parent || !parent.getChildren) return null;
		const children = await parent.getChildren();
		if (!Array.isArray(children)) return null;

		for (const child of children) {
			if (child.type === "String" && child.setText) return child;
			const found = await findStringDescendant(child, depth + 1);
			if (found) return found;
		}
		return null;
	}

	// 1. Direct setText for String elements
	if (element.type === "String" && element.setText) {
		await element.setText(text);
		return;
	}

	// 2. Refresh element via ID to ensure UI is hydrated for complex presets
	if (
		element.id &&
		(element.type === "TextBlock" ||
			element.type === "BlockElement" ||
			element.type === "DOM")
	) {
		try {
			await new Promise((r) => setTimeout(r, 100)); // Tick for UI flush
			const allElements = await (webflow as any).getAllElements();
			const freshRef = allElements.find(
				(el: any) => el.id === element.id,
			);
			if (freshRef) {
				const stringChild = await findStringDescendant(freshRef);
				if (stringChild) {
					await stringChild.setText(text);
					return;
				}
			}
		} catch (e: any) {
			console.warn(
				"Failed to find String descendant via fresh ID lookup:",
				e,
			);
		}
	}

	// 3. Standard fallback
	if (element.setTextContent) {
		try {
			await element.setTextContent(text);
			return;
		} catch (e: any) {
			console.warn(`setTextContent failed on ${element.type}:`, e.message);
		}
	}

	// 4. Last resort — some presets expose setText even when they are not String nodes
	if (element.setText) {
		try {
			await element.setText(text);
			return;
		} catch (e: any) {
			console.warn(`setText failed on ${element.type}:`, e.message);
		}
	}

	console.warn(
		`Unable to set text on element of type ${element.type}. No supported text method found.`,
	);
}

export async function applyClassesAndStyles(
	element: any,
	nodeData: WebflowReadyNode,
	isLegacy = false,
): Promise<void> {
	if (!element) return;

	// ------------------------------------
	// Classes (Webflow Styles / Combo Classes)
	// ------------------------------------
	const styleRefs: any[] = [];
	const classes = [...(nodeData.classes || [])];
	const hasStylesToApply =
		!!nodeData.styles && Object.keys(nodeData.styles).length > 0 ||
		!!nodeData.inlineStyles && Object.keys(nodeData.inlineStyles).length > 0;
	const hasPseudoStyles =
		nodeData.inlinePseudoStyles &&
		Object.keys(nodeData.inlinePseudoStyles).length > 0;

	// If the element has styles but no classes, auto-generate a class name
	if ((hasStylesToApply || hasPseudoStyles) && classes.length === 0) {
		const tagBase =
			nodeData.tag || nodeData.type.toLowerCase() || "element";
		classes.push(`${tagBase}-style`);
	}

	if (classes.length > 0 && element.setStyles) {
		let currentParent: any = null;
		const cleanClasses = [
			...new Set(classes.filter((c) => c && c.trim().length > 0)),
		];

		const styleCache = getStyleCache();

		for (const className of cleanClasses) {
			const cacheKey = currentParent
				? `${currentParent.id}:${className}`
				: className;
			let style = styleCache.get(cacheKey);
			let fallbackStyle = style;

			if (!style) {
				style = await getStyleByName(className);
				fallbackStyle = style;
				if (style) {
					const parent = await style.getParent();
					if (parent?.id !== currentParent?.id) style = null;
				}
			}

			if (!style) {
				try {
					style = await (webflow as any).createStyle(
						className,
						currentParent ? { parent: currentParent } : {},
					);
					if (styleCache) styleCache.set(cacheKey, style);
				} catch (e: any) {
					const msg = e.message.toLowerCase();
					if (
						msg.includes("conflict") ||
						msg.includes("duplicate") ||
						msg.includes("already exists")
					) {
						style =
							(await getStyleByName(className)) || fallbackStyle;
					}

					if (!style) {
						log(
							`    ⚠ Could not resolve class ${className} for chain: ${e.message}`,
							"warn",
						);
					}
				}
			}

			if (style) {
				styleRefs.push(style);
				currentParent = style;
				if (styleCache) styleCache.set(cacheKey, style);
			} else {
				break;
			}
		}

		if (styleRefs.length > 0) {
			try {
				await withTimeout(
					element.setStyles([...styleRefs]),
					8000,
					"setStyles",
				);
			} catch (e: any) {
				log(`    ✕ Failed to apply style chain: ${e.message}`, "error");
			}
		}

		// BACKFILL: Link this element to any complex values tracked for its classes
		// that don't yet have an element reference (e.g. global styles).
		for (const className of cleanClasses) {
			const pending = complexValueEmbeds.filter(
				(cv) => cv.className === className && !cv.element,
			);
			for (const cv of pending) {
				cv.element = element;
				log(
					`    [DEBUG] Backfilled element ref for .${cv.className} complex value`,
					"info",
				);
			}
		}
	}

	// ------------------------------------
	// Apply Properties to the primary class
	// ------------------------------------
	if (styleRefs.length > 0) {
		const primaryStyle = styleRefs[styleRefs.length - 1];
		if (hasStylesToApply)
			await applyNodeStyleMap(
				primaryStyle,
				nodeData.styles,
				undefined,
				isLegacy,
				element,
			);
		if (hasStylesToApply)
			await applyNodeStyleMap(
				primaryStyle,
				nodeData.inlineStyles,
				undefined,
				isLegacy,
				element,
			);
		if (hasPseudoStyles) {
			for (const [pseudo, pseudoProps] of Object.entries(
				nodeData.inlinePseudoStyles || {},
			)) {
				await applyNodeStyleMap(
					primaryStyle,
					pseudoProps as any,
					{ pseudo },
					isLegacy,
					element,
				);
			}
		}
	}
}

export async function buildElementTree(
	parentNode: any,
	rawNodeData: WebflowReadyNode,
	isLegacy = false,
	isInsideForm = false,
): Promise<void> {
	// Normalize text: handle array of lines (literal string format) from backend
	const text = Array.isArray(rawNodeData.text)
		? rawNodeData.text.join("\n")
		: rawNodeData.text;
	const nodeData: WebflowReadyNode = { ...rawNodeData, text: text as string | undefined };

	// WEBFLOW COMPLIANCE: FormButton can only be placed inside a Form.
	// If a button is found outside a form, convert it to a Link block.
	if (
		!isInsideForm &&
		(nodeData.type === "FormButton" || nodeData.tag?.toLowerCase() === "button")
	) {
		(nodeData as any).type = "Link";
	}

	// TYPE UPGRADE: Promote "custom" nodes that match native Webflow form tags.
	// This covers stale JSON where type="custom" tag="form/input/label/..." was emitted
	// before the backend gained form-type awareness.
	if (nodeData.type === "custom") {
		const tTag = nodeData.tag?.toLowerCase();
		if (tTag === "form") {
			(nodeData as any).type = "FormForm";
		} else if (tTag === "label") {
			(nodeData as any).type = "FormBlockLabel";
		} else if (tTag === "textarea") {
			(nodeData as any).type = "FormTextarea";
		} else if (tTag === "select") {
			(nodeData as any).type = "FormSelect";
		} else if (tTag === "button") {
			// Only upgrade button if it's clearly a form submit/button, not a custom-styled one.
			// Heuristic: if it has type="submit" attribute or no children that are non-text.
			const btnType = nodeData.attributes?.type?.toLowerCase();
			if (btnType === "submit" || btnType === "button" || btnType === undefined) {
				(nodeData as any).type = "FormButton";
			}
		} else if (tTag === "input") {
			const inputType = (nodeData.attributes?.type || "text").toLowerCase();
			if (inputType === "checkbox") (nodeData as any).type = "FormCheckboxInput";
			else if (inputType === "radio") (nodeData as any).type = "FormRadioInput";
			else if (inputType === "submit") (nodeData as any).type = "FormButton";
			else (nodeData as any).type = "FormTextInput";
		} else if (tTag === "div") {
			(nodeData as any).type = "Block";
		}
	}

	// WEBFLOW COMPLIANCE: If a Heading or Paragraph has children, it MUST be a custom DOM element
	// to avoid "Elements cannot be added to Paragraph elements" error.
	const isTextType =
		["Paragraph", "Heading", "Link", "TextBlock"].includes(
			nodeData.type,
		) ||
		["p", "span", "label", "li", "a", "h1", "h2", "h3", "h4", "h5", "h6"].includes(
			nodeData.tag?.toLowerCase() || "",
		);
	const originalType = nodeData.type;
	if (
		(nodeData.type === "Heading" || nodeData.type === "Paragraph") &&
		nodeData.children &&
		nodeData.children.length > 0
	) {
		(nodeData as any).type = "custom";
	}

	// WEBFLOW COMPLIANCE: If a Link has text content but NO children, convert it to a Link Block
	// with a Text Block child. This mirrors the backend logic and handles legacy JSON.
	if (
		nodeData.type === "Link" &&
		nodeData.text &&
		(!nodeData.children || nodeData.children.length === 0)
	) {
		const linkText = nodeData.text;
		(nodeData as any).text = undefined;
		(nodeData as any).children = [
			{
				type: "TextBlock",
				text: linkText,
				classes: [],
				children: [],
			},
		];
	}

	// SVG AUTOMATIC FALLBACK: Webflow API often blocks SVG specific attributes (d, viewBox, etc)
	// or causes Designer instability when creating complex SVG trees via DOM.
	// We detect the top-level 'svg' tag in a 'custom' node and treat it as a Manual Embed candidate.
	const isSvgRoot = nodeData.type === "custom" && nodeData.tag?.toLowerCase() === "svg";
	if (isSvgRoot) {
		log(`    ⚠ SVG node detected (tag: ${nodeData.tag}). Handling as manual embed...`, "warn");

		const savedClasses = [...(nodeData.classes || [])];
		// Remove classes from the inner SVG tag so they are only applied natively to the Webflow HtmlEmbed wrapper
		(nodeData as any).classes = [];

		const code = nodeToHtml(nodeData);
		log(`    [DEBUG] SVG code serialized (${code.length} chars)`, "info");

		// Restore classes so the Webflow placeholder on the canvas gets the native styling applied
		(nodeData as any).classes = savedClasses;

		const embedName = `SVG Manual Embed ${fallbackEmbeds.length + 1}`;
		const embedEntry = {
			code,
			classList: savedClasses,
			tag: nodeData.tag || "svg",
			displayName: embedName,
		};
		recordFallbackEmbed(embedEntry);

		try {
			log(`    [DEBUG] Creating HtmlEmbed...`, "info");
			// Append an empty HtmlEmbed element where the user should paste the code
			const embedEl = await withTimeout(
				smartAppend(
					parentNode,
					(webflow as any).elementPresets.HtmlEmbed ||
						(webflow as any).elementPresets.DOM,
				),
				5000,
				"svg-htmlembed",
			);

			// Attach the element to the fallback entry for interactive selection
			(embedEntry as any).element = embedEl;

			// Apply classes/styles to the placeholder element to preserve grid layout
			if (embedEl) {
				await applyClassesAndStyles(embedEl, nodeData, isLegacy);
			}
		} catch (e: any) {
			log(`    ⚠ HtmlEmbed creation skipped: ${e.message || e}`, "info");
		}

		const totalNodesInBranch = countAllNodes([nodeData]);
		log(`    [DEBUG] Branch nodes counted: ${totalNodesInBranch}. Incrementing progress...`, "info");
		incrementProgress(totalNodesInBranch);
		log(`    [DEBUG] SVG branch finished. Returning.`, "info");
		return;
	}

	const preset = getPresetForType(nodeData);
	let element: any;

	try {
		// ------------------------------------
		// Create Element
		// ------------------------------------
		// Use direct append for immediate access to the element reference
		if (!preset) {
			log(
				`    ✕ Unsupported node type or empty preset for type: ${nodeData.type}`,
				"error",
			);
			return;
		}

		// Keep a reference to the actual parent for fallback embedding
		const targetParent = parentNode;

		// WEBFLOW COMPLIANCE: TextBlock preset sometimes fails to hold text via setTextContent.
		// Use a DOM builder with span tag and pre-set textContent so the text is baked in at creation.
		if (
			nodeData.type === "TextBlock" &&
			nodeData.text &&
			typeof (webflow as any).elementBuilder === "function"
		) {
			try {
				const builder = (webflow as any).elementBuilder(
					(webflow as any).elementPresets.DOM,
				);
				builder.setTag("span");
				builder.setTextContent(nodeData.text);
				element = await smartAppend(parentNode, builder);
				log(`  [TextBlock] span (builder) created`);
			} catch (e: any) {
				log(
					`    ⚠ TextBlock builder failed, falling back to preset: ${e.message}`,
					"warn",
				);
				element = await smartAppend(parentNode, preset);
			}
		} else {
			element = await smartAppend(parentNode, preset);
		}
		log(
			`  [${nodeData.type}] ${
				nodeData.classes?.join(".") || nodeData.tag || ""
			} created`,
		);

		// ------------------------------------
		// Preset Children Clearing & Reference Shifting (FormForm)
		// ------------------------------------
		// FormForm preset creates a FormWrapper containing FormForm (index 0),
		// SuccessMessage (index 1), ErrorMessage (index 2)
		if (nodeData.type === "FormForm" && element.getChildren) {
			try {
				const wrapperChildren = await element.getChildren();
				if (wrapperChildren && wrapperChildren.length > 0) {
					const innerForm = wrapperChildren[0];
					// Clear default inputs inside the inner form
					if (innerForm && innerForm.getChildren) {
						const formChildren = await innerForm.getChildren();
						if (formChildren && formChildren.length > 0) {
							log(`    [FORM] Clearing default inputs...`);
							for (const child of formChildren) {
								await child.remove();
							}
						}
					}
					// Shift element reference so classes and children target the inner FormForm, not the wrapper.
					element = innerForm;
				}
			} catch (e: any) {
				console.warn("Failed to clear default form children:", e);
			}
		}

		// ------------------------------------
		// Apply Classes and Styles
		// ------------------------------------
		await applyClassesAndStyles(element, nodeData, isLegacy);

		// ------------------------------------
		// Tag Override
		// ------------------------------------
		let tagToSet = nodeData.tag;

		// If we fell back to DivBlock for a Paragraph/Heading with children, ensure it maintains semantic tag
		if (!tagToSet && nodeData.children && nodeData.children.length > 0) {
			if (originalType === "Paragraph") tagToSet = "p";
			if (originalType === "Heading")
				tagToSet = rawNodeData.tag?.toLowerCase() || "h2";
		}

		const isSpecializedHtmlEmbed =
			nodeData.type === "HtmlEmbed" && element.type !== "DOM";

		if (tagToSet && element.setTag && !isSpecializedHtmlEmbed) {
			await element.setTag(tagToSet);
		}

		// ------------------------------------
		// Heading Level
		// ------------------------------------
		if (nodeData.type === "Heading" && element.setHeadingLevel && tagToSet) {
			const m = tagToSet.match(/^h([1-6])$/i);
			if (m) {
				const level = parseInt(m[1]) as any;
				try {
					await element.setHeadingLevel(level);
					log(`    [HEADING] Level set to H${level}`);
				} catch (e: any) {
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
				const textValue = (nodeData.text || "") as string;
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
						const textBlock = await element.append((webflow as any).elementPresets.DOM);
						const wrapperTag =
							nodeData.tag === "p" || nodeData.tag?.match(/^h[1-6]$/)
								? "span"
								: "div";
						if (textBlock.setTag) await textBlock.setTag(wrapperTag);
						await setElementText(textBlock, textValue);
					} catch (e: any) {
						await setElementText(element, textValue);
					}
				} else {
					await setElementText(element, textValue);
				}
			}
		}

		// ------------------------------------
		// Attributes & ID
		// ------------------------------------
		if (nodeData.id) {
			let domIdApplied = false;
			try {
				if ("domId" in element && typeof element.setDomId === "function") {
					await withTimeout(element.setDomId(nodeData.id), 5000, "setDomId");
					domIdApplied = true;
					log(`    ✓ Set DOM ID "${nodeData.id}"`, "success");
				}
			} catch (e: any) {
				log(`    ⚠ Failed to set DOM ID "${nodeData.id}": ${e.message}`, "warn");
			}

			if (!domIdApplied) {
				recordIdEmbed({
					id: nodeData.id,
					classList: nodeData.classes || [],
					displayName: nodeData.id,
					element,
				});
				log(`    ⚠ ID "${nodeData.id}" recorded for manual setup`, "warn");

				// Fallback for elements that do not expose the DOM ID API
				try {
					if (element.type === "DOM" && element.setAttribute) {
						await withTimeout(element.setAttribute("id", nodeData.id), 5000, "setId");
					} else if (element.setCustomAttribute) {
						await withTimeout(element.setCustomAttribute("id", nodeData.id), 5000, "setId-custom");
					} else if (element.setAttribute) {
						await withTimeout(element.setAttribute("id", nodeData.id), 5000, "setId");
					}
				} catch (_) {
					// No further fallback beyond manual review
				}
			}
		}

		if (nodeData.attributes && Object.keys(nodeData.attributes).length > 0) {
			for (const [key, rawValue] of Object.entries(nodeData.attributes)) {
				if (nodeData.type === "Image" && (key === "src" || key === "alt")) continue;
				if (nodeData.type === "Link" && (key === "href" || key === "target")) continue;
				if (key === "data-asset") continue;

				const value = rawValue === "" ? "true" : String(rawValue);
				try {
					if (element.setCustomAttribute) {
						await element.setCustomAttribute(key, value);
					} else if (element.setAttribute) {
						await element.setAttribute(key, value);
					}
				} catch (e: any) {
					console.warn(
						`Failed to set attribute ${key}=${value} on ${nodeData.type}:`,
						e.message,
					);
				}
			}
		}

		// ------------------------------------
		// Specialized Elements (Image, Link, Form)
		// ------------------------------------
		const src = nodeData.attributes?.src;
		const href = nodeData.attributes?.href;

		if (
			nodeData.type === "FormTextInput" ||
			nodeData.type === "FormTextarea" ||
			nodeData.type === "FormSelect" ||
			nodeData.type === "FormCheckboxInput" ||
			nodeData.type === "FormRadioInput"
		) {
			if (nodeData.attributes?.name && typeof element.setName === "function") {
				await element.setName(nodeData.attributes.name);
			}
			if (nodeData.attributes?.required != null && typeof element.setRequired === "function") {
				await element.setRequired(true);
			}
			// Only FormTextInput supports setInputType
			if (
				element.type === "FormTextInput" &&
				nodeData.attributes?.type &&
				typeof element.setInputType === "function"
			) {
				const inputType = nodeData.attributes.type.toLowerCase();
				if (["text", "email", "password", "tel", "number", "url"].includes(inputType)) {
					await element.setInputType(inputType);
				}
			}
			if (
				nodeData.attributes?.placeholder &&
				typeof element.setCustomAttribute === "function"
			) {
				await element.setCustomAttribute("placeholder", nodeData.attributes.placeholder);
			}
		}

		if (nodeData.type === "Image") {
			if (src && element.setAsset) {
				log(`    [IMAGE] Uploading asset: ${src}...`);
				const asset = await uploadAssetFromUrl(src);
				if (asset) {
					await element.setAsset(asset);
					log(`    ✓ Asset uploaded successfully`, "success");
				} else {
					log(
						`    ⚠ Asset upload failed, falling back to src attribute`,
						"warn",
					);
					await element.setCustomAttribute?.("src", src);
				}
			} else if (src && element.setAttribute) {
				await element.setAttribute("src", src);
			}

			// Handle Alt Text
			if (nodeData.attributes?.alt && element.setAltText) {
				await element.setAltText(String(nodeData.attributes.alt));
			}
		}

		if (nodeData.type === "Link") {
			// Handle Href
			if (href) {
				if (element.setSettings) {
					await element.setSettings("url", href);
				} else if (element.setAttribute) {
					await element.setAttribute("href", href);
				} else if (element.setCustomAttribute) {
					await element.setCustomAttribute("href", href);
				}
			}

			// Handle Target
			if (nodeData.attributes?.target && element.setTarget) {
				await element.setTarget(nodeData.attributes.target as any);
			}
		}

		// Special handling for data-asset: Upload external URLs to Webflow assets
		if (nodeData.attributes?.["data-asset"] && element.setCustomAttribute) {
			const rawVal = nodeData.attributes["data-asset"];
			const asset = await uploadAssetFromUrl(rawVal);
			if (asset) {
				const assetUrl = await asset.getUrl();
				await element.setCustomAttribute("data-asset", assetUrl);
			} else {
				// Fallback to raw value if upload fails (e.g. invalid URL or limited asset permissions)
				await element.setCustomAttribute("data-asset", rawVal);
			}
		}

		// ------------------------------------
		// Specialized Elements (HtmlEmbed)
		// ------------------------------------
		if (nodeData.type === "HtmlEmbed") {
			if (nodeData.text) {
				let success = false;
				if (element.type === "DOM") {
					log(
						`    [EMBED] Custom DOM fallback detected. Content applied via tag/textContent.`,
						"info",
					);
				} else {
					log(
						`    [EMBED] Attempting automated internal content injection (Type: ${element.type})...`,
					);

					// Attempt multiple injection patterns for HtmlEmbed to bypass V2 API restrictions
					const patterns = [
						{
							name: "setHtml",
							fn: (el: any, val: string) => el.setHtml(val),
						},
						{
							name: "setHtmlContent",
							fn: (el: any, val: string) => el.setHtmlContent(val),
						},
						{
							name: "setSettings({html})",
							fn: (el: any, val: string) => el.setSettings({ html: val }),
						},
						{
							name: "setSettings({code})",
							fn: (el: any, val: string) => el.setSettings({ code: val }),
						},
						{
							name: "setSettings('html')",
							fn: (el: any, val: string) => el.setSettings("html" as any, val),
						},
						{
							name: "setSettings('code')",
							fn: (el: any, val: string) => el.setSettings("code" as any, val),
						},
					];

					for (const pattern of patterns) {
						if (success) break;
						try {
							if (
								typeof (element as any)[
									pattern.name.split("(")[0]
								] === "function"
							) {
								await pattern.fn(element, nodeData.text as string);
								success = true;
								log(
									`    ✓ Embed content injected via ${pattern.name}`,
									"success",
								);
							}
						} catch (err: any) {
							// Silently try next pattern
						}
					}

					// If all else fails
					if (!success) {
						const embedEntry = {
							code: nodeData.text as string,
							classList: nodeData.classes || [],
							tag: nodeData.tag || nodeData.type,
							element: element,
						};
						recordFallbackEmbed(embedEntry);

						log(
							`    ⚠ Automated injection blocked by Webflow API. Added to Manual Embeds list. generating visible raw-code placeholder on canvas...`,
							"warn",
						);
						try {
							// Webflow's DOM primitive allows <textarea> which preserves whitespace perfectly
							// entirely avoiding the data-attribute stringification issue.
							// Use targetParent (the wrapper) to keep it contained
							const textArea = await targetParent.append(
								(webflow as any).elementPresets.DOM,
							);
							if (textArea) {
								await textArea.setTag("textarea");
								// Webflow v2's primitive DOM sometimes blocks attributes; sticking to content.
								await textArea.setTextContent(nodeData.text);

								log(
									`    👉 SOLUTION: Copy the code directly from the text area that just appeared on your canvas, paste it into the HTML Embed setting, and then delete the box.`,
									"info",
								);
							}
						} catch (textareaErr: any) {
							log(
								`    ✕ Failed to create visual textarea fallback: ${textareaErr.message}`,
								"error",
							);
							// Attempt final data-attribute fallback if supported on the original element
							if (
								typeof (element as any).setCustomAttribute ===
								"function"
							) {
								await (element as any).setCustomAttribute(
									"data-code-source",
									nodeData.text,
								);
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
		const isSelect =
			nodeData.type === "FormSelect" || (element && element.type === "FormSelect");
		if (isSelect && typeof element.addOption === "function" && nodeData.children) {
			const optionNodes = nodeData.children.filter(
				(c) =>
					c.tag?.toLowerCase() === "option" ||
					(c.type === "custom" && (c as any).tag?.toLowerCase() === "option"),
			);
			if (optionNodes.length > 0) {
				log(`    [SELECT] Adding ${optionNodes.length} options natively...`);
				for (const opt of optionNodes) {
					// Extract display name: prefer direct text, then child String node, then fallback
					let name = opt.text || "";
					if (!name && opt.children) {
						const stringChild = opt.children.find((c) => !c.tag && c.text);
						if (stringChild) name = stringChild.text || "";
					}
					if (!name) name = "Option";

					const value = opt.attributes?.value || name;
					try {
						await element.addOption({
							name: String(name),
							value: String(value),
						});
					} catch (e: any) {
						log(
							`    ⚠ Failed to add option "${name}": ${e.message}`,
							"warn",
						);
					}
				}
				// Filter out these option nodes from recursion so they aren't added as siblings
				(nodeData as any).children = nodeData.children.filter(
					(c) =>
						c.tag?.toLowerCase() !== "option" &&
						!((c as any).tag === "option"),
				);
			}
		}

		if (nodeData.children && nodeData.children.length > 0) {
			const childIsInsideForm =
				isInsideForm ||
				nodeData.type === "FormForm" ||
				nodeData.tag?.toLowerCase() === "form";
			for (const child of nodeData.children) {
				await buildElementTree(element, child, isLegacy, childIsInsideForm);
			}
		}
	} catch (err: any) {
		const label = nodeData.classes?.[0] || nodeData.tag || nodeData.type;
		log(
			`    ✕ Error building node [${label}]: ${err.message || err}`,
			"error",
		);
		console.error("Error building node:", nodeData, err);
	}
}

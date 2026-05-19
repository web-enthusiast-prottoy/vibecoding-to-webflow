// ============================================================
// Bind Variables — Auto-bind Color/Size/Number/Font variables to styles
// Two-phase flow: 1) Discover matches, 2) Show inline checkboxes, 3) Apply selected
// ============================================================

import type { LogLevel } from "../../types.js";
import { variableCache, recordComplexValue, complexValueEmbeds } from "../../state.js";
import { syncVariableCacheFromWebflow } from "../variables/manager.js";
import { withTimeout, sleep } from "../utils/helpers.js";
import { expandProperties } from "../utils/css-props.js";
import { showFallbackEmbedsUI } from "./embeds.js";

// Forward-declared logger
let _log: ((message: string, level?: LogLevel) => void) | null = null;
export function injectLog(fn: (message: string, level?: LogLevel) => void): void {
	_log = fn;
}
function log(message: string, level?: LogLevel): void {
	if (_log) _log(message, level);
	else console.log(`[${(level || "info").toUpperCase()}] ${message}`);
}

// Forward-declared progress setters
let _setProgress: ((current: number, total: number) => void) | null = null;
let _incrementProgress: ((amount?: number) => void) | null = null;
export function injectProgress(
	setProgressFn: (current: number, total: number) => void,
	incrementFn: (amount?: number) => void,
): void {
	_setProgress = setProgressFn;
	_incrementProgress = incrementFn;
}
function setProgress(current: number, total: number): void {
	if (_setProgress) _setProgress(current, total);
}
function incrementProgress(amount = 1): void {
	if (_incrementProgress) _incrementProgress(amount);
}

// Forward-declared UI helpers
let _syncLogPanelState: (options?: {
	keepVisible?: boolean;
	expanded?: boolean;
}) => void;
let _clearLog: () => void;
export function injectUiHelpers(
	syncLogFn: (options?: { keepVisible?: boolean; expanded?: boolean }) => void,
	clearLogFn: () => void,
): void {
	_syncLogPanelState = syncLogFn;
	_clearLog = clearLogFn;
}

const BREAKPOINTS = [
	"main", "medium", "small", "tiny", "large", "xl", "xxl",
] as const;

const SEMANTIC_KEYWORDS: Record<string, string[]> = {
	"border-radius": ["radius", "round", "corner", "rad"],
	"border-top-left-radius": ["radius", "round", "corner", "rad"],
	"border-top-right-radius": ["radius", "round", "corner", "rad"],
	"border-bottom-left-radius": ["radius", "round", "corner", "rad"],
	"border-bottom-right-radius": ["radius", "round", "corner", "rad"],
	"padding-top": ["space", "spacer", "padding", "margin", "gap"],
	"padding-right": ["space", "spacer", "padding", "margin", "gap"],
	"padding-bottom": ["space", "spacer", "padding", "margin", "gap"],
	"padding-left": ["space", "spacer", "padding", "margin", "gap"],
	"margin-top": ["space", "spacer", "padding", "margin", "gap"],
	"margin-right": ["space", "spacer", "padding", "margin", "gap"],
	"margin-bottom": ["space", "spacer", "padding", "margin", "gap"],
	"margin-left": ["space", "spacer", "padding", "margin", "gap"],
	"gap": ["space", "spacer", "padding", "margin", "gap"],
	"row-gap": ["space", "spacer", "padding", "margin", "gap"],
	"column-gap": ["space", "spacer", "padding", "margin", "gap"],
	"font-size": ["font", "text", "size", "fs", "type"],
	"line-height": ["line", "leading", "lh", "height"],
	"letter-spacing": ["letter", "tracking", "spacing"],
	"font-family": ["font", "family", "typeface"],
	"color": ["color", "bg", "background", "border"],
	"background-color": ["color", "bg", "background", "border"],
	"border-color": ["color", "bg", "background", "border"],
	"border-top-color": ["color", "bg", "background", "border"],
	"border-right-color": ["color", "bg", "background", "border"],
	"border-bottom-color": ["color", "bg", "background", "border"],
	"border-left-color": ["color", "bg", "background", "border"],
	"outline-color": ["color", "bg", "background", "border"],
};

const ALL_TARGET_PROPS = new Set(Object.keys(SEMANTIC_KEYWORDS));

const PADDING_PROPS = new Set([
	"padding-top", "padding-right", "padding-bottom", "padding-left",
]);
const MARGIN_PROPS = new Set([
	"margin-top", "margin-right", "margin-bottom", "margin-left",
]);

const NAMED_COLORS: Record<string, string> = {
	white: "#ffffff", black: "#000000", red: "#ff0000", green: "#008000",
	blue: "#0000ff", yellow: "#ffff00", cyan: "#00ffff", magenta: "#ff00ff",
	orange: "#ffa500", purple: "#800080", gray: "#808080", grey: "#808080",
};

function normalizeColor(val: string): string | null {
	const s = val.trim().toLowerCase();
	if (s === "transparent") return null;
	if (s.startsWith("#")) {
		let hex = s.slice(1);
		if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
		if (hex.length === 6) return `#${hex}`;
		if (hex.length === 8) return `#${hex.slice(0, 6)}`;
		return null;
	}
	if (s.startsWith("rgb")) {
		const nums = s.match(/[\d.]+/g);
		if (!nums || nums.length < 3) return null;
		const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
		return `#${toHex(parseFloat(nums[0]))}${toHex(parseFloat(nums[1]))}${toHex(parseFloat(nums[2]))}`;
	}
	if (NAMED_COLORS[s]) return NAMED_COLORS[s];
	return null;
}

function normalizeSize(val: string): string | null {
	const s = val.trim().toLowerCase();
	if (s === "0" || s === "0px") return "0px";
	const m = s.match(/^(-?\d+\.?\d*)(px|rem|em|%|vw|vh|ch|ex|cm|mm|in|pt|pc)$/);
	if (!m) return null;
	return `${parseFloat(m[1])}${m[2]}`;
}

function normalizeUnitless(val: string): string | null {
	const s = val.trim();
	if (/^\d+\.?\d*$/.test(s)) return s;
	return null;
}

function normalizeFont(val: string): string | null {
	const first = val.split(",")[0].trim().replace(/^["']|["']$/g, "").toLowerCase();
	return first || null;
}

interface IndexedVar { meta: any; keys: Set<string>; varName: string; }

function getVariableKeys(meta: any): Set<string> {
	const keys = new Set<string>();
	const { type, rawValue } = meta;
	if (type === "Color") {
		const raw = typeof rawValue === "string" ? rawValue : String(rawValue);
		keys.add(raw.toLowerCase());
		const hex = normalizeColor(raw);
		if (hex) keys.add(hex);
	} else if (type === "Size") {
		let raw: string;
		if (rawValue && typeof rawValue === "object" && rawValue.value !== undefined && rawValue.unit) {
			raw = `${rawValue.value}${rawValue.unit}`;
		} else if (typeof rawValue === "string") raw = rawValue;
		else if (typeof rawValue === "number") raw = `${rawValue}px`;
		else raw = String(rawValue);
		keys.add(raw.toLowerCase());
		const normalized = normalizeSize(raw);
		if (normalized) keys.add(normalized);
	} else if (type === "Number") {
		if (typeof rawValue === "number") keys.add(String(rawValue));
		else if (typeof rawValue === "string") {
			keys.add(rawValue);
			const n = parseFloat(rawValue);
			if (!isNaN(n)) keys.add(String(n));
		}
	} else if (type === "FontFamily") {
		const raw = typeof rawValue === "string" ? rawValue : String(rawValue);
		keys.add(raw.toLowerCase());
		const normalized = normalizeFont(raw);
		if (normalized) keys.add(normalized);
	}
	return keys;
}

function buildVariableIndex(): IndexedVar[] {
	const seen = new Set<any>();
	const index: IndexedVar[] = [];
	for (const [cacheKey, meta] of variableCache) {
		if (!meta || !meta.variable) continue;
		if (seen.has(meta.variable)) continue;
		seen.add(meta.variable);
		const keys = getVariableKeys(meta);
		if (keys.size === 0) continue;
		const varName = meta.cssName || (typeof cacheKey === "string" ? cacheKey : "");
		index.push({ meta, keys, varName });
	}
	return index;
}

function scoreVariableName(prop: string, varName: string): number {
	const keywords = SEMANTIC_KEYWORDS[prop];
	if (!keywords) return 0;
	const lower = varName.toLowerCase();
	return keywords.filter((kw) => lower.includes(kw)).length;
}

function findMatch(prop: string, value: string, index: IndexedVar[]): any | null {
	const valueKeys = new Set<string>();
	valueKeys.add(value.trim().toLowerCase());

	const isColorProp = (prop.startsWith("border-") && prop.endsWith("-color")) ||
		prop === "color" || prop === "background-color" || prop === "outline-color";
	const isNonColorProp = SEMANTIC_KEYWORDS[prop] && !prop.includes("color");

	if (isColorProp) {
		const hex = normalizeColor(value);
		if (hex) valueKeys.add(hex);
	} else if (isNonColorProp) {
		const sizeNorm = normalizeSize(value);
		if (sizeNorm) valueKeys.add(sizeNorm);
		if (prop === "line-height") {
			const unitless = normalizeUnitless(value);
			if (unitless) valueKeys.add(unitless);
		}
		if (prop === "font-family") {
			const fontNorm = normalizeFont(value);
			if (fontNorm) valueKeys.add(fontNorm);
		}
	}

	const candidates: Array<{ meta: any; score: number }> = [];
	for (const iv of index) {
		for (const key of valueKeys) {
			if (iv.keys.has(key)) {
				const score = scoreVariableName(prop, iv.varName);
				candidates.push({ meta: iv.meta, score });
				break;
			}
		}
	}
	if (candidates.length === 0) return null;
	candidates.sort((a, b) => b.score - a.score);
	if (candidates[0].score === 0) return null;
	return candidates[0].meta;
}

function getCategory(prop: string): "colors" | "typography" | "border" | "spacing" {
	if (prop === "color" || prop === "background-color" || prop === "outline-color" ||
		(prop.startsWith("border-") && prop.endsWith("-color"))) {
		return "colors";
	}
	if (prop.startsWith("border-") && prop.includes("radius"))
		return "border";
	if (prop === "font-size" || prop === "line-height" || prop === "letter-spacing" || prop === "font-family") {
		return "typography";
	}
	return "spacing";
}

function getOptions(bp: string) {
	return bp === "main" ? undefined : { breakpoint: bp };
}

// ============================================================
// Review UI (inline checkboxes below the button)
// ============================================================

interface BindingMatch {
	style: any;
	styleName: string;
	breakpoint: string;
	property: string;
	value: string;
	variable: any;
	variableName: string;
}

interface GroupedMatches {
	colors: BindingMatch[];
	typography: BindingMatch[];
	border: BindingMatch[];
	spacing: BindingMatch[];
}

function showInlineReview(
	grouped: GroupedMatches,
	onApply: (selected: GroupedMatches) => void,
	onCancel: () => void,
) {


	const container = document.getElementById("bind-review-container") as HTMLElement | null;
	const categoriesEl = document.getElementById("bind-review-categories") as HTMLElement | null;
	const detailsEl = document.getElementById("bind-review-details") as HTMLElement | null;
	const applyBtn = document.getElementById("bind-review-apply-inline") as HTMLButtonElement | null;
	const cancelBtn = document.getElementById("bind-review-cancel-inline") as HTMLButtonElement | null;

	if (!container) { console.error("[BIND] bind-review-container NOT FOUND"); return; }
	if (!categoriesEl) { console.error("[BIND] bind-review-categories NOT FOUND"); return; }
	if (!detailsEl) { console.error("[BIND] bind-review-details NOT FOUND"); return; }
	if (!applyBtn) { console.error("[BIND] bind-review-apply-inline NOT FOUND"); return; }
	if (!cancelBtn) { console.error("[BIND] bind-review-cancel-inline NOT FOUND"); return; }



	const categories: { key: keyof GroupedMatches; label: string; accent: string }[] = [
		{ key: "colors", label: "Colors", accent: "#f472b6" },
		{ key: "typography", label: "Typography", accent: "#60a5fa" },
		{ key: "border", label: "Border Radius", accent: "#a78bfa" },
		{ key: "spacing", label: "Spacing", accent: "#4ade80" },
	];

	// Clear previous
	categoriesEl.innerHTML = "";
	detailsEl.innerHTML = "";

	let hasAny = false;

	for (const cat of categories) {
		const items = grouped[cat.key];
		if (items.length === 0) continue;
		hasAny = true;

		// Checkbox row
		const row = document.createElement("div");
		row.style.display = "flex";
		row.style.alignItems = "center";
		row.style.gap = "8px";
		row.style.marginBottom = "8px";

		const cb = document.createElement("input");
		cb.type = "checkbox";
		cb.id = `bind-cat-${cat.key}`;
		cb.checked = true;
		cb.style.width = "16px";
		cb.style.height = "16px";
		cb.style.cursor = "pointer";
		cb.style.accentColor = cat.accent;

		const label = document.createElement("label");
		label.htmlFor = `bind-cat-${cat.key}`;
		label.textContent = `${cat.label} (${items.length})`;
		label.style.color = cat.accent;
		label.style.fontWeight = "600";
		label.style.fontSize = "12px";
		label.style.cursor = "pointer";

		row.appendChild(cb);
		row.appendChild(label);
		categoriesEl.appendChild(row);

		// Details for this category
		const catDetails = document.createElement("div");
		catDetails.style.marginLeft = "24px";
		catDetails.style.marginBottom = "12px";
		catDetails.style.maxHeight = "120px";
		catDetails.style.overflowY = "auto";

		for (let i = 0; i < Math.min(items.length, 30); i++) {
			const item = items[i];
			const line = document.createElement("div");
			line.style.fontSize = "10px";
			line.style.color = "#94a3b8";
			line.style.fontFamily = "monospace";
			line.style.padding = "2px 0";
			line.style.whiteSpace = "nowrap";
			line.style.overflow = "hidden";
			line.style.textOverflow = "ellipsis";
			line.textContent = `.${item.styleName} [${item.breakpoint}] ${item.property} → ${item.variableName} (${item.value})`;
			catDetails.appendChild(line);
		}

		if (items.length > 30) {
			const more = document.createElement("div");
			more.style.fontSize = "10px";
			more.style.color = "#64748b";
			more.style.padding = "2px 0";
			more.textContent = `… and ${items.length - 30} more`;
			catDetails.appendChild(more);
		}

		detailsEl.appendChild(catDetails);
	}

	if (!hasAny) {
		const empty = document.createElement("p");
		empty.textContent = "No variable matches found.";
		empty.style.color = "#64748b";
		empty.style.fontSize = "12px";
		empty.style.textAlign = "center";
		empty.style.padding = "10px 0";
		categoriesEl.appendChild(empty);
	}

	// Wire buttons
	applyBtn.onclick = () => {

		const selected: GroupedMatches = { colors: [], typography: [], border: [], spacing: [] };
		for (const cat of categories) {
			const cb = document.getElementById(`bind-cat-${cat.key}`) as HTMLInputElement | null;
			if (cb && cb.checked) {
				selected[cat.key] = grouped[cat.key];
			}
		}
		container.style.display = "none";
		container.classList.remove("bind-review-pulse");
		onApply(selected);
	};

	cancelBtn.onclick = () => {

		container.style.display = "none";
		container.classList.remove("bind-review-pulse");
		onCancel();
	};

	// Make container visible with a bright pulsing border so user can't miss it
	container.style.display = "block";
	container.classList.add("bind-review-pulse");

	// Scroll the panel into view so it doesn't hide below the fold
	container.scrollIntoView({ behavior: "smooth", block: "start" });


}

// ============================================================
// Discovery Phase
// ============================================================

async function discoverBindings(btnRef: HTMLButtonElement): Promise<GroupedMatches | null> {
	_clearLog();
	complexValueEmbeds.length = 0;

	// Hide any previous review container
	const prevContainer = document.getElementById("bind-review-container") as HTMLElement | null;
	if (prevContainer) prevContainer.style.display = "none";

	const progressContainer = document.getElementById("progress-container") as HTMLElement;
	if (progressContainer) progressContainer.classList.add("show");
	_syncLogPanelState({ keepVisible: false, expanded: true });

	setProgress(0, 0);
	incrementProgress(0);

	log("Starting variable discovery scan...", "warn");

	btnRef.disabled = true;

	try {
		log("Syncing variable cache from Webflow...");
		await syncVariableCacheFromWebflow();

		const index = buildVariableIndex();
		log(`Indexed ${index.length} variables with searchable keys.`);

		const allStyles = await (webflow as any).getAllStyles();
		const totalSteps = allStyles.length * BREAKPOINTS.length;
		setProgress(0, totalSteps);
		log(`Scanning ${allStyles.length} styles across ${BREAKPOINTS.length} breakpoints for matches...`);

		const grouped: GroupedMatches = { colors: [], typography: [], border: [], spacing: [] };
		let skippedCount = 0;

		for (let sIdx = 0; sIdx < allStyles.length; sIdx++) {
			const style = allStyles[sIdx];
			const styleName = await style.getName();

			for (let bIdx = 0; bIdx < BREAKPOINTS.length; bIdx++) {
				const bp = BREAKPOINTS[bIdx];
				incrementProgress(1);

				const globalIdx = sIdx * BREAKPOINTS.length + bIdx + 1;
				if (globalIdx % 20 === 0 || globalIdx === totalSteps) {
					btnRef.innerHTML = `<span>Discovering (${sIdx + 1}/${allStyles.length}) ${bp}...</span>`;
				}

				let properties: Record<string, string>;
				try {
					properties = await withTimeout(
						style.getProperties({ breakpoint: bp }),
						8000,
						`getProperties-${styleName}-${bp}`,
					);
				} catch (e: any) {
					log(`Timeout reading properties for .${styleName} [${bp}]`, "warn");
					continue;
				}

				if (!properties || Object.keys(properties).length === 0) continue;

				const expanded = expandProperties(properties) as Record<string, string>;

				for (const [prop, value] of Object.entries(expanded)) {
					if (typeof value !== "string") continue;
					if (value.includes("var(")) continue;
					if (!ALL_TARGET_PROPS.has(prop)) continue;

					const match = findMatch(prop, value, index);
					if (!match) continue;

					const score = scoreVariableName(prop, match.cssName || "");
					if (score === 0) {
						skippedCount++;
						continue;
					}

					const category = getCategory(prop);
					grouped[category].push({
						style,
						styleName,
						breakpoint: bp,
						property: prop,
						value,
						variable: match.variable,
						variableName: match.cssName || match.binding || "unknown",
					});
				}
			}
		}

		const totalMatches = grouped.colors.length + grouped.typography.length + grouped.border.length + grouped.spacing.length;
		log(`Discovery complete. Found ${totalMatches} potential bindings.`, totalMatches > 0 ? "success" : "warn");
		if (skippedCount > 0) log(`${skippedCount} matches skipped due to low semantic score.`);

		return grouped;
	} catch (err: any) {
		log(`Variable discovery failed: ${err.message}`, "error");
		return null;
	} finally {
		// We no longer re-enable btnRef here because we want it disabled during review
		btnRef.innerHTML = `
			<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<path d="M12 2L2 7l10 5 10-5-10-5z"/>
				<path d="M2 17l10 5 10-5"/>
				<path d="M2 12l10 5 10-5"/>
			</svg>
			<span>Bind Missing Variables</span>
		`;
	}
}

// ============================================================
// Apply Phase
// ============================================================

async function applyBindings(grouped: GroupedMatches, btnRef: HTMLButtonElement): Promise<void> {
	_clearLog();
	complexValueEmbeds.length = 0;

	const progressContainer = document.getElementById("progress-container") as HTMLElement;
	if (progressContainer) progressContainer.classList.add("show");
	_syncLogPanelState({ keepVisible: false, expanded: true });

	const allMatches = [
		...grouped.colors,
		...grouped.typography,
		...grouped.border,
		...grouped.spacing,
	];

	const totalSteps = allMatches.length;
	setProgress(0, totalSteps);
	incrementProgress(0);

	log(`Applying ${totalSteps} selected bindings...`, "warn");
	btnRef.disabled = true;

	let boundCount = 0;
	let fallbackCount = 0;

	const byStyleBp = new Map<string, BindingMatch[]>();
	for (const m of allMatches) {
		const key = `${m.styleName}::${m.breakpoint}`;
		if (!byStyleBp.has(key)) byStyleBp.set(key, []);
		byStyleBp.get(key)!.push(m);
	}

	let processed = 0;
	for (const [, matches] of byStyleBp) {
		const style = matches[0].style;
		const bp = matches[0].breakpoint;
		const styleName = matches[0].styleName;

		const plainBindings: BindingMatch[] = [];
		const paddingBindings: BindingMatch[] = [];
		const marginBindings: BindingMatch[] = [];

		for (const m of matches) {
			if (PADDING_PROPS.has(m.property)) paddingBindings.push(m);
			else if (MARGIN_PROPS.has(m.property)) marginBindings.push(m);
			else plainBindings.push(m);
		}

		// Plain bindings
		for (const m of plainBindings) {
			try {
				await withTimeout(
					style.setProperty(m.property as any, m.variable, getOptions(bp)),
					8000,
					`bind-${styleName}-${m.property}-${bp}`,
				);
				boundCount++;
				log(`Bound .${styleName} [${bp}] ${m.property} → ${m.value}`, "success");
			} catch (err: any) {
				log(`Failed to bind .${styleName} [${bp}] ${m.property}: ${err.message}`, "error");
				recordComplexValue({
					className: styleName,
					property: m.property,
					value: m.value,
					breakpointId: bp,
				});
				fallbackCount++;
			}
			processed++;
			incrementProgress(1);
		}

		// Padding batch
		if (paddingBindings.length > 0) {
			const fullGroup: Record<string, any> = {};
			const sides = ["padding-top", "padding-right", "padding-bottom", "padding-left"] as const;
			const paddingMap = new Map(paddingBindings.map((m) => [m.property, m]));
			for (const side of sides) {
				if (paddingMap.has(side)) {
					fullGroup[side] = paddingMap.get(side)!.variable;
				} else {
					try {
						const props = await withTimeout(style.getProperties({ breakpoint: bp }), 3000, `getProps-${side}`);
						fullGroup[side] = props?.[side] ?? "0px";
					} catch {
						fullGroup[side] = "0px";
					}
				}
			}
			try {
				await withTimeout(
					style.setProperties(fullGroup, getOptions(bp)),
					10000,
					`bind-padding-${styleName}-${bp}`,
				);
				boundCount += paddingBindings.length;
				log(`Bound .${styleName} [${bp}] padding group`, "success");
			} catch (err: any) {
				log(`Failed to bind .${styleName} [${bp}] padding group: ${err.message}`, "error");
				for (const m of paddingBindings) {
					recordComplexValue({
						className: styleName,
						property: m.property,
						value: m.value,
						breakpointId: bp,
					});
					fallbackCount++;
				}
			}
			processed += paddingBindings.length;
			incrementProgress(paddingBindings.length);
		}

		// Margin batch
		if (marginBindings.length > 0) {
			const fullGroup: Record<string, any> = {};
			const sides = ["margin-top", "margin-right", "margin-bottom", "margin-left"] as const;
			const marginMap = new Map(marginBindings.map((m) => [m.property, m]));
			for (const side of sides) {
				if (marginMap.has(side)) {
					fullGroup[side] = marginMap.get(side)!.variable;
				} else {
					try {
						const props = await withTimeout(style.getProperties({ breakpoint: bp }), 3000, `getProps-${side}`);
						fullGroup[side] = props?.[side] ?? "0px";
					} catch {
						fullGroup[side] = "0px";
					}
				}
			}
			try {
				await withTimeout(
					style.setProperties(fullGroup, getOptions(bp)),
					10000,
					`bind-margin-${styleName}-${bp}`,
				);
				boundCount += marginBindings.length;
				log(`Bound .${styleName} [${bp}] margin group`, "success");
			} catch (err: any) {
				log(`Failed to bind .${styleName} [${bp}] margin group: ${err.message}`, "error");
				for (const m of marginBindings) {
					recordComplexValue({
						className: styleName,
						property: m.property,
						value: m.value,
						breakpointId: bp,
					});
					fallbackCount++;
				}
			}
			processed += marginBindings.length;
			incrementProgress(marginBindings.length);
		}

		if (plainBindings.length > 0 || paddingBindings.length > 0 || marginBindings.length > 0) {
			await sleep(15);
		}
	}

	log(
		`Apply complete. Bound ${boundCount} properties. Fallbacks: ${fallbackCount}.`,
		boundCount > 0 ? "success" : "warn",
	);
	if (fallbackCount > 0) {
		showFallbackEmbedsUI();
	}

	btnRef.disabled = false;
}

// ============================================================
// Public Entry
// ============================================================

export async function handleBindVariables(btnRef: HTMLButtonElement): Promise<void> {
	const grouped = await discoverBindings(btnRef);
	if (!grouped) return;

	const total = grouped.colors.length + grouped.typography.length + grouped.border.length + grouped.spacing.length;
	if (total === 0) {
		log("No variable matches found to review.", "warn");
		return;
	}

	log(`Found ${total} potential bindings. Review below.`, "success");
	showInlineReview(
		grouped,
		async (selected) => {

			try {
				const selTotal = selected.colors.length + selected.typography.length + selected.border.length + selected.spacing.length;
				if (selTotal === 0) {
					log("No categories selected. Nothing to apply.", "warn");
					return;
				}
				await applyBindings(selected, btnRef);
			} finally {
				btnRef.disabled = false;
			}
		},
		() => {
			log("Binding cancelled by user.", "warn");
			btnRef.disabled = false;
		},
	);
}

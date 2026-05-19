// ============================================================
// Build Orchestrator — Entry point for the full JSON build
// ============================================================

import type { SitePayload, LogLevel } from "../../types.js";
import { withTimeout, countAllNodes } from "../utils/helpers.js";
import { buildElementTree } from "./element-tree.js";
import { applyGlobalStyles } from "../styles/engine.js";
import { syncStyleCacheFromWebflow } from "../styles/cache.js";
import {
	pasteCollections,
	syncVariableCacheFromWebflow,
} from "../variables/manager.js";
import { variableCache, resetEmbeds } from "../../state.js";

// Forward-declared logger to avoid circular dependency.
let _log: ((message: string, level?: LogLevel) => void) | null = null;
export function injectLog(fn: (message: string, level?: LogLevel) => void): void {
	_log = fn;
}

function log(message: string, level?: LogLevel): void {
	if (_log) _log(message, level);
	else console.log(`[${(level || "info").toUpperCase()}] ${message}`);
}

// Forward-declared progress setters to avoid circular dependency.
let _setProgress: (current: number, total: number) => void;
let _incrementProgress: (amount?: number) => void;
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

export async function buildSiteFromJson(payload: SitePayload): Promise<void> {
	let selected: any;
	try {
		selected = await withTimeout(
			(webflow as any).getSelectedElement(),
			10000,
			"getSelectedElement",
		);
	} catch (e: any) {
		log(`✕ No element selected in Designer: ${e.message}`, "error");
	}

	if (!selected) {
		await (webflow as any).notify({
			type: "Error",
			message: "Please select an element (e.g. Body) to paste into.",
		});
		throw new Error("No element selected in the Designer.");
	}

	// Detect JSON version — v2 is pre-normalized by the backend
	const isLegacy = !payload.__meta || payload.__meta.version < 2;
	if (isLegacy) {
		log(
			"⚠ Legacy JSON detected (v1) — enabling runtime normalization shim.",
			"warn",
		);
	} else {
		log(
			`JSON v${
				payload.__meta!.version
			} detected — pre-normalized. Skipping runtime transforms.`,
		);
		(globalThis as any).__v2Normalized = true;
	}

	log("Build: 2026-05-19.001 (FormForm Wrapper Fix)");
	log("Starting build...");
	variableCache.clear();
	// Reset global style cache for each new build
	(globalThis as any).__wfStyleCache = new Map<string, any>();

	// Reset Webflow Musts tracking arrays
	resetEmbeds();

	// Step 0: Sync from existing project variables — only when the payload actually
	// references CSS variables (var()). Skipping this on variable-free builds saves
	// 5–30s of unnecessary IPC round-trips to Webflow's variable store.
	const payloadStr = JSON.stringify(payload);
	const payloadHasVars =
		payloadStr.includes("var(") ||
		payloadStr.includes("clamp(") ||
		payloadStr.includes("calc(");
	if (payloadHasVars) {
		await syncVariableCacheFromWebflow();
	} else {
		log(
			"No CSS variables or complex expressions detected — skipping variable sync.",
		);
	}

	await syncStyleCacheFromWebflow();

	// Step 1: Variables
	if (payload.collections && payload.collections.length > 0) {
		const totalVars = payload.collections.reduce(
			(sum, c) => sum + c.variables.length,
			0,
		);
		setProgress(0, totalVars);

		(webflow as any).notify({
			type: "Info",
			message: `Importing ${totalVars} variables...`,
		});
		await pasteCollections(payload.collections);
		(webflow as any).notify({ type: "Success", message: "✓ Variables imported" });
	} else {
		log("No variable collections found — skipping.");
	}

	// Step 2: Global Styles
	const globalStyles = payload.globalStyles || (payload as any).styles;
	if (globalStyles && Object.keys(globalStyles).length > 0) {
		const classSelectors = Object.keys(globalStyles).filter(
			(s) => s.startsWith(".") && !s.includes(" "),
		);
		setProgress(0, classSelectors.length);

		(webflow as any).notify({
			type: "Info",
			message: "Applying root global styles...",
		});
		await applyGlobalStyles(globalStyles, isLegacy);
	}

	// Step 3: DOM Nodes
	let pages = payload.pages ?? [];

	// If no pages but we have nodes at the root, treat it as a single-page/section payload
	if (pages.length === 0 && payload.nodes && payload.nodes.length > 0) {
		log("Detected single-section payload (nodes at root).");
		pages = [
			{
				nodes: payload.nodes,
				globalStyles: payload.globalStyles,
				styles: payload.styles,
			},
		];
	}

	let totalNodes = 0;

	pages.forEach((p) => {
		totalNodes += countAllNodes(p.nodes ?? []);
	});
	setProgress(0, totalNodes);

	if (totalNodes === 0) {
		log("No nodes found to build — skipping building DOM.", "warn");
		return;
	}

	log(
		`Building ${pages.length} page${
			pages.length !== 1 ? "s" : ""
		} with ${totalNodes} total nodes...`,
	);
	(webflow as any).notify({
		type: "Info",
		message: `Building DOM (${totalNodes} total nodes)...`,
	});

	for (let pi = 0; pi < pages.length; pi++) {
		const page = pages[pi];
		const nodes = page.nodes ?? [];
		log(
			`Page ${pi + 1}/${pages.length}: building ${
				nodes.length
			} root node${nodes.length !== 1 ? "s" : ""}...`,
		);

		for (let ni = 0; ni < nodes.length; ni++) {
			await buildElementTree(selected, nodes[ni], isLegacy);
		}

		// Page-level styles (less common, but supported)
		const pageStyles = (page as any).globalStyles || (page as any).styles;
		if (pageStyles && Object.keys(pageStyles).length > 0) {
			log(`Applying page-level styles for "${page.name}"...`);
			await applyGlobalStyles(pageStyles, isLegacy);
		}

		log(`✓ Page ${pi + 1} complete`, "success");
	}

	log("✓ Build complete!", "success");
	await (webflow as any).notify({
		type: "Success",
		message: "Site structure built!",
	});
}

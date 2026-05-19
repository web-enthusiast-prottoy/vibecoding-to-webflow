// ============================================================
// Style Cache Management
// ============================================================

import { withTimeout } from "../utils/helpers.js";
import { allStylesMap } from "../../state.js";
import type { LogLevel } from "../../types.js";

// Forward-declared logger to avoid circular dependency.
// The actual log function is injected at runtime by ui/progress.ts.
let _log: ((message: string, level?: LogLevel) => void) | null = null;
export function injectLog(fn: (message: string, level?: LogLevel) => void): void {
	_log = fn;
}

function log(message: string, level?: LogLevel): void {
	if (_log) _log(message, level);
	else console.log(`[${(level || "info").toUpperCase()}] ${message}`);
}

/**
 * SHIM: Webflow V2 API does not provide getStyleByName.
 * We use a pre-fetched map of styles for efficient lookups.
 */
export async function getStyleByName(name: string): Promise<any> {
	return allStylesMap.get(name.trim()) ?? null;
}

export async function syncStyleCacheFromWebflow(): Promise<void> {
	log("Syncing styles from Webflow project...");
	const startTime = Date.now();
	try {
		const allStyles = (await withTimeout(
			(webflow as any).getAllStyles(),
			15000,
			"getAllStyles",
		)) as any[];
		allStylesMap.clear();

		const BATCH_SIZE = 15;
		for (let i = 0; i < allStyles.length; i += BATCH_SIZE) {
			const batch = allStyles.slice(i, i + BATCH_SIZE);
			await Promise.all(
				batch.map(async (style: any) => {
					try {
						const name = (await withTimeout(
							style.getName(),
							5000,
							`style.getName-${i}`,
						)) as any;
						if (name) allStylesMap.set(name.trim(), style);
					} catch (e) {
						// skip styles that fail to report name
					}
				}),
			);
		}

		const duration = ((Date.now() - startTime) / 1000).toFixed(1);
		log(`✓ Synced ${allStylesMap.size} styles (${duration}s)`, "success");
	} catch (err: any) {
		log(`Failed to sync styles: ${err.message}`, "warn");
	}
}

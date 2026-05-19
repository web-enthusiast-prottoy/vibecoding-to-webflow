// ============================================================
// Style Cache Management
// ============================================================
import { withTimeout } from "../utils/helpers.js";
import { allStylesMap } from "../../state.js";
// Forward-declared logger to avoid circular dependency.
// The actual log function is injected at runtime by ui/progress.ts.
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
/**
 * SHIM: Webflow V2 API does not provide getStyleByName.
 * We use a pre-fetched map of styles for efficient lookups.
 */
export async function getStyleByName(name) {
    var _a;
    return (_a = allStylesMap.get(name.trim())) !== null && _a !== void 0 ? _a : null;
}
export async function syncStyleCacheFromWebflow() {
    log("Syncing styles from Webflow project...");
    const startTime = Date.now();
    try {
        const allStyles = (await withTimeout(webflow.getAllStyles(), 15000, "getAllStyles"));
        allStylesMap.clear();
        const BATCH_SIZE = 15;
        for (let i = 0; i < allStyles.length; i += BATCH_SIZE) {
            const batch = allStyles.slice(i, i + BATCH_SIZE);
            await Promise.all(batch.map(async (style) => {
                try {
                    const name = (await withTimeout(style.getName(), 5000, `style.getName-${i}`));
                    if (name)
                        allStylesMap.set(name.trim(), style);
                }
                catch (e) {
                    // skip styles that fail to report name
                }
            }));
        }
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        log(`✓ Synced ${allStylesMap.size} styles (${duration}s)`, "success");
    }
    catch (err) {
        log(`Failed to sync styles: ${err.message}`, "warn");
    }
}

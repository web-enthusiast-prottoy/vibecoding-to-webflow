// ============================================================
// Style Audit — Find Invalid Styles
// ============================================================
import { withTimeout } from "../utils/helpers.js";
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
// Forward-declared progress setters to avoid circular dependency.
let _setProgress;
let _incrementProgress;
export function injectProgress(setProgressFn, incrementFn) {
    _setProgress = setProgressFn;
    _incrementProgress = incrementFn;
}
function setProgress(current, total) {
    if (_setProgress)
        _setProgress(current, total);
}
function incrementProgress(amount = 1) {
    if (_incrementProgress)
        _incrementProgress(amount);
}
// Forward-declared UI helpers to avoid circular dependency.
let _syncLogPanelState;
let _clearLog;
export function injectUiHelpers(syncLogFn, clearLogFn) {
    _syncLogPanelState = syncLogFn;
    _clearLog = clearLogFn;
}
const BREAKPOINTS = [
    "main", "medium", "small", "tiny", "large", "xl", "xxl",
];
export async function handleAuditStyles(findBtnRef) {
    _clearLog();
    // Show progress container so user can see the logs
    const progressContainer = document.getElementById("progress-container");
    if (progressContainer)
        progressContainer.classList.add("show");
    _syncLogPanelState({ keepVisible: false, expanded: true });
    setProgress(0, 0);
    incrementProgress(0);
    log("Starting Search for Invalid Styles (All Breakpoints)...", "warn");
    findBtnRef.disabled = true;
    try {
        const allStyles = await webflow.getAllStyles();
        const totalSteps = allStyles.length * BREAKPOINTS.length;
        setProgress(0, totalSteps);
        log(`Inspecting ${allStyles.length} styles across ${BREAKPOINTS.length} breakpoints...`);
        let foundCount = 0;
        let finished = 0;
        const breakpointsWithIssues = new Set();
        const logicalProps = [
            "padding-inline",
            "padding-block",
            "margin-inline",
            "margin-block",
            "padding-inline-start",
            "padding-inline-end",
            "margin-inline-start",
            "margin-inline-end",
        ];
        const shorthandProps = ["gap", "inset"];
        for (let sIdx = 0; sIdx < allStyles.length; sIdx++) {
            const style = allStyles[sIdx];
            let styleName;
            try {
                styleName = await withTimeout(style.getName(), 3000, `getName-style-${sIdx}`);
            }
            catch (_a) {
                styleName = `<unknown-style-${sIdx}>`;
            }
            // Heartbeat: log every 20 styles so the user knows it's alive
            if (sIdx > 0 && sIdx % 20 === 0) {
                log(`  … checked ${sIdx} / ${allStyles.length} styles so far`);
            }
            for (const bp of BREAKPOINTS) {
                finished++;
                incrementProgress(1); // Update overall progress bar
                if (finished % 10 === 0 || finished === totalSteps) {
                    findBtnRef.innerHTML = `<span>Searching (${finished} / ${totalSteps})...</span>`;
                }
                let properties;
                try {
                    properties = await withTimeout(style.getProperties({ breakpoint: bp }), 5000, `getProperties-${styleName}-${bp}`);
                }
                catch (_b) {
                    // If a single breakpoint query times out, skip it and keep going
                    continue;
                }
                // Skip empty property objects to reduce noise
                if (!properties || Object.keys(properties).length === 0)
                    continue;
                for (const [prop, val] of Object.entries(properties)) {
                    if (typeof val !== "string")
                        continue;
                    let isInvalid = false;
                    let reason = "";
                    // 1. color-mix check (Critical Publish Blocker)
                    if (val.includes("color-mix")) {
                        isInvalid = true;
                        reason =
                            "Unsupported 'color-mix' function (Publish Blocker)";
                    }
                    // 2. Broken parens / calc expansion check
                    const openCount = (val.match(/\(/g) || []).length;
                    const closeCount = (val.match(/\)/g) || []).length;
                    if (openCount !== closeCount) {
                        isInvalid = true;
                        reason =
                            "Broken parentheses/calc expansion (Publish Blocker)";
                    }
                    // 3. Logical properties check (Webflow Variable incompatibility)
                    if (logicalProps.includes(prop)) {
                        isInvalid = true;
                        reason =
                            "Unsupported logical property (Webflow Variable Incompatibility)";
                    }
                    // 4. Shorthand with variables check (Best practice: expand for native bindings)
                    if (shorthandProps.includes(prop) &&
                        (val.includes("var(") ||
                            val.includes("calc(") ||
                            val.includes("clamp("))) {
                        isInvalid = true;
                        reason =
                            "Complex shorthand with variables (Expand for native mapping)";
                    }
                    // 5. Transition-property variable check
                    if (prop === "transition-property" && val.includes("--")) {
                        isInvalid = true;
                        reason =
                            "CSS Variable in transition-property (Mapping Failure)";
                    }
                    // 6. Garbage fragments check
                    if (val === "*" ||
                        val === ")" ||
                        (val.includes("rgba(0, 0, 0, 0)") &&
                            (val.match(/0 0/g) || []).length > 3)) {
                        isInvalid = true;
                        reason =
                            "Garbage fragment or corrupt coordinate string (Publish Blocker)";
                    }
                    if (isInvalid) {
                        foundCount++;
                        breakpointsWithIssues.add(bp);
                        log(`[FOUND] .${styleName} [${bp}]`, "error");
                        log(`   › Property: ${prop}`);
                        log(`   › Value: ${val}`);
                        log(`   › Reason: ${reason}`);
                    }
                }
            }
        }
        if (foundCount === 0) {
            log("✓ Scan complete: No invalid styles found across all breakpoints.", "success");
        }
        else {
            const bpList = Array.from(breakpointsWithIssues).join(", ");
            log(`Scan complete: Found ${foundCount} invalid properties across breakpoints: ${bpList}`, "warn");
        }
    }
    catch (err) {
        log(`Scan failed: ${err.message}`, "error");
    }
    finally {
        _syncLogPanelState({ keepVisible: true, expanded: true });
        findBtnRef.disabled = false;
        findBtnRef.innerHTML = `
         <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
         </svg>
         <span>Find Invalid Styles</span>
        `;
    }
}

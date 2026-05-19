// ============================================================
// Progress Log & UI State
// ============================================================
import { progressLog, currentProgress, totalSteps } from "../../state.js";
export function updateProgressBar() {
    const progressFill = document.getElementById("progress-fill");
    const progressText = document.getElementById("progress-percentage");
    if (!progressFill || !progressText)
        return;
    const percentage = totalSteps > 0 ? Math.round((currentProgress / totalSteps) * 100) : 0;
    progressFill.style.width = `${Math.min(percentage, 100)}%`;
    progressText.textContent = `${Math.min(percentage, 100)}%`;
}
export function setLogAccordionExpanded(expanded) {
    const entries = document.getElementById("progress-log-entries");
    const logAccIcon = document.getElementById("log-acc-icon");
    const logToggleText = document.getElementById("log-toggle-text");
    if (!entries)
        return;
    entries.style.display = expanded ? "" : "none";
    if (logAccIcon) {
        logAccIcon.style.transform = expanded ? "rotate(0deg)" : "rotate(-90deg)";
    }
    if (logToggleText) {
        logToggleText.textContent = expanded ? "Hide Logs" : "Show Logs";
    }
}
export function syncLogPanelState(options) {
    var _a, _b;
    const logPanel = document.getElementById("progress-log");
    const entries = document.getElementById("progress-log-entries");
    if (!logPanel || !entries)
        return;
    const hasEntries = entries.childElementCount > 0;
    const hasAttentionItems = entries.querySelector(".log-warn, .log-error");
    const shouldKeepVisible = (_a = options === null || options === void 0 ? void 0 : options.keepVisible) !== null && _a !== void 0 ? _a : hasEntries;
    logPanel.classList.toggle("has-entries", shouldKeepVisible && hasEntries);
    logPanel.classList.toggle("has-errors", !!hasAttentionItems);
    if (!hasEntries) {
        setLogAccordionExpanded((_b = options === null || options === void 0 ? void 0 : options.expanded) !== null && _b !== void 0 ? _b : true);
        return;
    }
    if (typeof (options === null || options === void 0 ? void 0 : options.expanded) === "boolean") {
        setLogAccordionExpanded(options.expanded);
    }
}
export function log(message, level = "info") {
    console.log(`[${level.toUpperCase()}] ${message}`);
    // Minimal UI: show successes, warnings, and errors in the log panel
    const shouldShowInUI = level === "success" || level === "warn" || level === "error";
    if (!shouldShowInUI || !progressLog)
        return;
    const entry = document.createElement("div");
    entry.className = `log-entry log-${level}`;
    const icons = {
        info: "›",
        success: "✓",
        warn: "⚠",
        error: "✕",
    };
    entry.innerHTML = `<span class="log-icon">${icons[level]}</span><span class="log-text" style="white-space: pre-wrap;">${message}</span>`;
    progressLog.appendChild(entry);
    window.requestAnimationFrame(() => {
        progressLog.scrollTop = progressLog.scrollHeight;
    });
    syncLogPanelState({ keepVisible: true });
}
export function clearLog() {
    if (progressLog)
        progressLog.innerHTML = "";
    syncLogPanelState({ keepVisible: false, expanded: true });
}

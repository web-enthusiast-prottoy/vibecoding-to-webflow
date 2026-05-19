// ============================================================
// Code to Webflow — Designer Extension
// Paste AI-generated JSON to build Webflow element trees
// ============================================================
// --------------------------------------------------
// Module wiring — inject shared logger / progress hooks
// --------------------------------------------------
import { log, updateProgressBar, syncLogPanelState, clearLog } from "./modules/ui/progress.js";
import { injectLog as injectLogStylesCache } from "./modules/styles/cache.js";
import { injectLog as injectLogStylesEngine, injectEmbedRecorders, injectIncrementProgress as injectIncStylesEngine } from "./modules/styles/engine.js";
import { injectLog as injectLogVariables, injectIncrementProgress as injectIncVariables } from "./modules/variables/manager.js";
import { injectLog as injectLogBuilderPresets } from "./modules/builder/presets.js";
import { injectLog as injectLogElementTree } from "./modules/builder/element-tree.js";
import { injectLog as injectLogOrchestrator, injectProgress as injectProgressOrchestrator } from "./modules/builder/orchestrator.js";
import { injectLog as injectLogEmbeds } from "./modules/ui/embeds.js";
import { injectLog as injectLogAudit, injectProgress as injectProgressAudit, injectUiHelpers as injectAuditUi } from "./modules/ui/audit.js";
import { injectLog as injectLogBindVariables, injectProgress as injectProgressBindVariables, injectUiHelpers as injectUiHelpersBindVariables } from "./modules/ui/bind-variables.js";
import { setProgress, incrementProgress, injectProgressUpdate } from "./state.js";
import { recordComplexValue, recordUnsupportedCss } from "./state.js";
import { init } from "./modules/ui/dom-init.js";
// Inject logger into every module that declares a forward reference
injectLogStylesCache(log);
injectLogStylesEngine(log);
injectLogVariables(log);
injectLogBuilderPresets(log);
injectLogElementTree(log);
injectLogOrchestrator(log);
injectLogEmbeds(log);
injectLogAudit(log);
// Inject progress helpers
injectIncStylesEngine(incrementProgress);
injectIncVariables(incrementProgress);
injectProgressOrchestrator(setProgress, incrementProgress);
injectProgressAudit(setProgress, incrementProgress);
injectAuditUi(syncLogPanelState, clearLog);
injectLogBindVariables(log);
injectProgressBindVariables(setProgress, incrementProgress);
injectUiHelpersBindVariables(syncLogPanelState, clearLog);
injectProgressUpdate(updateProgressBar);
// Inject embed recorders from state into style engine
injectEmbedRecorders(recordComplexValue, recordUnsupportedCss);
// --------------------------------------------------
// Global error handlers (keep these at the top level)
// --------------------------------------------------
import { showHardError } from "./modules/ui/toast-error.js";
window.addEventListener("unhandledrejection", (event) => {
    var _a, _b;
    const msg = ((_a = event.reason) === null || _a === void 0 ? void 0 : _a.message) || String(event.reason);
    const stack = ((_b = event.reason) === null || _b === void 0 ? void 0 : _b.stack) || "";
    log(`CRASH DETECTED: ${msg}`, "error");
    showHardError("Unhandled Promise Rejection (Crash)", `${msg}\n\n${stack}`);
});
window.addEventListener("error", (event) => {
    log(`RUNTIME ERROR: ${event.message}`, "error");
    showHardError("Runtime Error (Crash)", `${event.message}\nat ${event.filename}:${event.lineno}:${event.colno}`);
});
// --------------------------------------------------
// Boot
// --------------------------------------------------
document.addEventListener("DOMContentLoaded", init);

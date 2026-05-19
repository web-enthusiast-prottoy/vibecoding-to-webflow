// ============================================================
// DOM Initialization, Event Handlers, and Build Flow
// ============================================================
import { setDomRefs, setUploadedPayload, uploadedPayload, resetEmbeds, totalSteps, setProgress, jsonTextarea, buildBtn, fileInput, dropzone, fileInfo, fileNameDisplay, removeFileBtn, findBtn, bindBtn, } from "../../state.js";
import { buildSiteFromJson } from "../builder/orchestrator.js";
import { updateProgressBar, log, setLogAccordionExpanded, syncLogPanelState, clearLog, } from "./progress.js";
import { showFallbackEmbedsUI } from "./embeds.js";
import { setLoading, showError, hideError, showToast } from "./toast-error.js";
import { handleAuditStyles } from "./audit.js";
import { handleBindVariables } from "./bind-variables.js";
export function updateBuildButtonState() {
    const hasText = jsonTextarea.value.trim().length > 0;
    const hasFile = !!uploadedPayload;
    buildBtn.disabled = !hasText && !hasFile;
}
export function clearUploadedFile() {
    setUploadedPayload(null);
    fileInput.value = "";
    fileInfo.classList.remove("show");
}
export function setupFileUpload() {
    dropzone.addEventListener("click", () => fileInput.click());
    // Accessibility: allow Enter or Space to trigger file selection
    dropzone.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            fileInput.click();
        }
    });
    dropzone.addEventListener("dragover", (e) => {
        e.preventDefault();
        dropzone.classList.add("dragover");
    });
    dropzone.addEventListener("dragleave", () => {
        dropzone.classList.remove("dragover");
    });
    dropzone.addEventListener("drop", (e) => {
        var _a;
        e.preventDefault();
        dropzone.classList.remove("dragover");
        const files = (_a = e.dataTransfer) === null || _a === void 0 ? void 0 : _a.files;
        if (files && files.length > 0) {
            handleFileSelect(files[0]);
        }
    });
    fileInput.addEventListener("change", (e) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            handleFileSelect(files[0]);
        }
    });
    removeFileBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        clearUploadedFile();
        updateBuildButtonState();
    });
}
async function handleFileSelect(file) {
    if (!file.name.endsWith(".json")) {
        showError("Please select a .json file.");
        return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
        var _a;
        try {
            const content = (_a = e.target) === null || _a === void 0 ? void 0 : _a.result;
            setUploadedPayload(JSON.parse(content));
            // Update UI
            fileNameDisplay.textContent = file.name;
            fileInfo.classList.add("show");
            jsonTextarea.value = ""; // Clear textarea to avoid confusion
            updateBuildButtonState();
            hideError();
            showToast("File loaded successfully", "success");
        }
        catch (err) {
            showError("Failed to parse JSON file.");
            console.error(err);
        }
    };
    reader.readAsText(file);
}
export async function handleBuild() {
    var _a, _b;
    let payload;
    if (uploadedPayload) {
        payload = uploadedPayload;
    }
    else {
        const raw = jsonTextarea.value.trim();
        if (!raw)
            return;
        try {
            payload = JSON.parse(raw);
        }
        catch (_c) {
            showError("Invalid JSON — please check your input.");
            return;
        }
    }
    // Safety: If the user pasted an array of nodes directly at the root
    if (Array.isArray(payload)) {
        payload = {
            nodes: payload,
            __meta: {
                version: 1,
                normalized: false,
                complexSelectorsResolved: false,
            },
        };
    }
    setLoading(true);
    hideError();
    clearLog();
    resetEmbeds();
    // Reset persistent state from previous build
    const prevPc = document.getElementById("progress-container");
    if (prevPc) {
        prevPc.classList.remove("done");
        prevPc.classList.remove("show");
    }
    const prevLog = document.getElementById("progress-log");
    if (prevLog) {
        prevLog.classList.remove("has-entries");
        prevLog.classList.remove("has-errors");
    }
    const embedContainer = document.getElementById("fallback-embeds-container");
    if (embedContainer) {
        embedContainer.style.display = "none";
        embedContainer.innerHTML = "";
    }
    const statusEl = document.getElementById("build-status");
    if (statusEl)
        statusEl.style.display = "none";
    setProgress(0, 0);
    updateProgressBar();
    const progressContainer = document.getElementById("progress-container");
    if (progressContainer)
        progressContainer.classList.add("show");
    syncLogPanelState({ keepVisible: false, expanded: true });
    log("--- START BUILD ---");
    try {
        await buildSiteFromJson(payload);
        setProgress(totalSteps, totalSteps); // Ensure 100% on success
        updateProgressBar();
        showToast("Site structure built successfully!", "success");
    }
    catch (e) {
        showError(`Build failed: ${(_a = e === null || e === void 0 ? void 0 : e.message) !== null && _a !== void 0 ? _a : e}`);
        showToast("Build failed. Check the error above.", "error");
        log(`Build failed: ${(_b = e === null || e === void 0 ? void 0 : e.message) !== null && _b !== void 0 ? _b : e}`, "error");
    }
    finally {
        setLoading(false);
        // Always show manual-attention items if any exist
        // Access state arrays directly via the module-level vars re-exported from state
        const s = await import("../../state.js");
        if (s.fallbackEmbeds.length > 0 ||
            s.complexValueEmbeds.length > 0 ||
            s.unsupportedCssEmbeds.length > 0 ||
            s.idEmbeds.length > 0) {
            showFallbackEmbedsUI();
        }
        // Show finish status + keep log visible (don't auto-hide)
        const finishedFileName = fileNameDisplay.textContent || "Pasted JSON";
        const statusEl = document.getElementById("build-status");
        if (statusEl) {
            statusEl.textContent = `✓ Finished building: ${finishedFileName}`;
            statusEl.style.display = "block";
        }
        syncLogPanelState({ keepVisible: true, expanded: true });
        // Transition progress-container from 'show' (build-active) to 'done' (persistent)
        const pc = document.getElementById("progress-container");
        if (pc) {
            pc.classList.remove("show");
            pc.classList.add("done");
        }
        // Reset inputs
        clearUploadedFile();
        jsonTextarea.value = "";
        updateBuildButtonState();
    }
}
export function init() {
    var _a;
    log("--- IGNITE INITIALIZED (Build 2026-05-18.002 — Audit Fix) ---", "warn");
    // Set the Extension UI size to large for better workspace
    try {
        if (typeof webflow !== "undefined") {
            webflow.setExtensionSize("large").catch(() => {
                /* fallback if API not supported in this environment */
            });
        }
    }
    catch (_b) {
        /* ignore if webflow global is unavailable */
    }
    const app = document.getElementById("app");
    if (!app)
        return;
    app.innerHTML = `
    <div class="header" style="background: #1e1e1e; border-bottom: 1px solid #333; padding: 12px 16px;">
      <div class="header-content" style="display: flex; align-items: center; justify-content: space-between;">
        <div class="logo" style="display: flex; align-items: center; gap: 10px;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <rect width="24" height="24" rx="6" fill="#3898EC"/>
            <path d="M12 4L14.5 9.5L20 12L14.5 14.5L12 20L9.5 14.5L4 12L9.5 9.5L12 4Z" fill="white"/>
          </svg>
          <span class="logo-text" style="color: white; font-weight: 600; font-size: 15px; letter-spacing: -0.01em;">Ignite</span>
        </div>
        <button id="debug-toggle" style="color: #888; font-size: 11px; background: none; border: none; cursor: pointer; font-weight: 500; padding: 4px 8px; border-radius: 4px;" onmouseover="this.style.color='#3898EC'" onmouseout="this.style.color='#888'">DEBUG</button>
      </div>
    </div>

    <div class="main">
      <p class="description">
        Select a target element in the Webflow Designer (e.g. Body), upload a JSON file or paste your generated JSON below.
      </p>

      <div class="file-upload-container">
        <div class="field-label">File Upload</div>
        <div id="dropzone" class="file-dropzone" tabindex="0" role="button" aria-label="Upload JSON site structure file">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          <div class="file-dropzone-text">Click to upload or drag & drop</div>
          <div class="file-dropzone-subtext">webflow-site-structure.json</div>
          <input type="file" id="file-input" accept=".json" tabindex="-1" aria-hidden="true">
        </div>
        <div id="file-info" class="file-info">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
          </svg>
          <span id="file-name-display">filename.json</span>
          <button id="remove-file" class="remove-file" aria-label="Remove uploaded file">×</button>
        </div>
      </div>

      <div class="divider">
        <div class="divider-line"></div>
        <div class="divider-text">or</div>
        <div class="divider-line"></div>
      </div>

      <div>
        <div class="field-label">JSON Payload</div>
        <textarea
          id="json-input"
          class="json-textarea"
          placeholder='Paste JSON here...'
        ></textarea>
      </div>

      <div id="error-box" class="error-box"></div>

      <button id="build-btn" class="btn-build" disabled style="margin-bottom: 8px; width: 100%; background: #3898EC; color: white; border: none; border-radius: 4px; padding: 10px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: background 0.2s;" aria-label="Build Site Structure">
        <div id="spinner" class="spinner"></div>
        <span id="btn-label">Ignite Structure (v2)</span>
      </button>

      <button id="find-invalid-btn" class="btn-secondary" style="display: none; width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #e2e8f0; background: white; color: #1e293b; font-weight: 500; cursor: pointer; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s; font-size: 13px;">
         <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
         </svg>
         <span>Find Invalid Styles</span>
      </button>

      <button id="bind-variables-btn" class="btn-secondary" style="display: none; width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #e2e8f0; background: white; color: #1e293b; font-weight: 500; cursor: pointer; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s; font-size: 13px; margin-top: 8px;">
         <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5"/>
            <path d="M2 12l10 5 10-5"/>
         </svg>
         <span>Bind Missing Variables</span>
      </button>

      <div id="bind-review-container" style="display: none; margin-top: 12px; border: 1px solid #334155; border-radius: 8px; overflow: hidden; background: #0f172a;">
        <div style="padding: 10px 12px; background: #1e293b; border-bottom: 1px solid #334155; display: flex; align-items: center; gap: 8px;">
          <span style="color: #3898EC; font-size: 13px; font-weight: 700;">▼ Review Bindings</span>
          <span style="color: #64748b; font-size: 10px;">Uncheck categories to skip, then click Apply Selected</span>
        </div>
        <div id="bind-review-categories" style="padding: 12px;">
          <!-- checkboxes injected here -->
        </div>
        <div id="bind-review-details" style="padding: 0 12px 12px; max-height: 200px; overflow-y: auto;">
          <!-- details injected here -->
        </div>
        <div style="padding: 12px; border-top: 1px solid #334155; display: flex; gap: 8px; justify-content: flex-end;">
          <button id="bind-review-cancel-inline" style="padding: 6px 12px; border-radius: 4px; border: 1px solid #475569; background: transparent; color: #94a3b8; font-size: 12px; font-weight: 500; cursor: pointer;">Cancel</button>
          <button id="bind-review-apply-inline" style="padding: 6px 12px; border-radius: 4px; border: none; background: #3898EC; color: #fff; font-size: 12px; font-weight: 600; cursor: pointer;">Apply Selected</button>
        </div>
      </div>

      <style>
        .btn-secondary:hover { background: #f8fafc !important; border-color: #cbd5e1 !important; }
        .btn-secondary:active { background: #f1f5f9 !important; }
        @keyframes bind-review-pulse {
          0% { box-shadow: 0 0 0 0 rgba(56, 152, 236, 0.7); border-color: #3898EC; }
          50% { box-shadow: 0 0 0 8px rgba(56, 152, 236, 0); border-color: #60a5fa; }
          100% { box-shadow: 0 0 0 0 rgba(56, 152, 236, 0); border-color: #3898EC; }
        }
        .bind-review-pulse {
          animation: bind-review-pulse 1.5s infinite;
          border: 2px solid #3898EC !important;
        }
      </style>

      <div id="progress-container" class="progress-container">
        <div class="progress-label-row">
          <span>Overall Progress</span>
          <span id="progress-percentage">0%</span>
        </div>
        <div class="progress-bar-bg">
          <div id="progress-fill" class="progress-bar-fill"></div>
        </div>
         <div id="progress-log" class="progress-log">
          <div class="progress-log-header" id="log-accordion-header" style="cursor:pointer; display:flex; align-items:center; justify-content:space-between; padding:8px 12px; background:rgba(255,255,255,0.02); border-bottom:1px solid var(--border);" title="Click to collapse/expand log">
            <div style="display:flex; align-items:center; gap:8px;">
              <span id="log-acc-icon" style="font-size:10px; display:inline-block; transition:transform 0.2s; color:#94a3b8;">▼</span>
              <span style="font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.6px; color:var(--text-muted);">Issues &amp; Alerts</span>
            </div>
            <div style="display:flex; align-items:center; gap:8px;">
              <span id="log-toggle-text" style="font-size:9px; color:#64748b; font-weight:600;">Hide Logs</span>
              <button id="clear-log-btn" class="clear-log-btn" title="Clear log" style="margin-left:4px;">Clear</button>
            </div>
          </div>
          <div id="progress-log-entries" class="progress-log-entries"></div>
        </div>
      </div>

      <div id="fallback-embeds-container" class="fallback-embeds-container" style="display: none; width: 100%; margin-top: 16px;"></div>

      <div id="build-status" class="build-status" style="margin-top: 12px; font-size: 12px; color: #64748b; text-align: center; display: none;"></div>
      <div class="version-footer">Build: 2026-05-19.001 (FormForm Wrapper Fix)</div>
    </div>

    <div class="toast" id="toast"></div>
  `;
    // Cache DOM refs
    setDomRefs({
        jsonTextarea: document.getElementById("json-input"),
        errorBox: document.getElementById("error-box"),
        buildBtn: document.getElementById("build-btn"),
        btnLabel: document.getElementById("btn-label"),
        spinner: document.getElementById("spinner"),
        fileInput: document.getElementById("file-input"),
        dropzone: document.getElementById("dropzone"),
        fileInfo: document.getElementById("file-info"),
        fileNameDisplay: document.getElementById("file-name-display"),
        removeFileBtn: document.getElementById("remove-file"),
        findBtn: document.getElementById("find-invalid-btn"),
        bindBtn: document.getElementById("bind-variables-btn"),
        progressLog: document.getElementById("progress-log-entries"),
    });
    // Log accordion toggle
    const logAccHeader = document.getElementById("log-accordion-header");
    if (logAccHeader) {
        logAccHeader.addEventListener("click", (e) => {
            // Don't toggle if the Clear button itself was clicked
            if (e.target.closest("#clear-log-btn"))
                return;
            const entries = document.getElementById("progress-log-entries");
            if (!entries)
                return;
            const isHidden = entries.style.display === "none";
            setLogAccordionExpanded(isHidden);
        });
    }
    // Clear log button
    (_a = document.getElementById("clear-log-btn")) === null || _a === void 0 ? void 0 : _a.addEventListener("click", (e) => {
        e.stopPropagation();
        clearLog();
    });
    jsonTextarea.addEventListener("input", () => {
        if (jsonTextarea.value.trim().length > 0) {
            clearUploadedFile();
        }
        updateBuildButtonState();
        hideError();
    });
    buildBtn.addEventListener("click", handleBuild);
    findBtn.addEventListener("click", () => handleAuditStyles(findBtn));
    bindBtn.addEventListener("click", () => handleBindVariables(bindBtn));
    // Debug toggle
    const debugToggle = document.getElementById("debug-toggle");
    if (debugToggle) {
        const isDebugMode = localStorage.getItem("ignite-debug-mode") === "true";
        if (isDebugMode) {
            findBtn.style.display = "flex";
            bindBtn.style.display = "flex";
            debugToggle.style.color = "#3898EC";
        }
        debugToggle.addEventListener("click", () => {
            const currentlyHidden = findBtn.style.display === "none";
            const newDisplay = currentlyHidden ? "flex" : "none";
            findBtn.style.display = newDisplay;
            bindBtn.style.display = newDisplay;
            localStorage.setItem("ignite-debug-mode", String(currentlyHidden));
            debugToggle.style.color = currentlyHidden ? "#3898EC" : "#888";
        });
    }
    setupFileUpload();
}

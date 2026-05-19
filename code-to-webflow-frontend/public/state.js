// ============================================================
// Shared Mutable State
// ============================================================
// Cache for created/existing variables, bindings, and raw values
// Stores: { variable: Variable, binding: string, rawValue: any, type: string, cssName: string }
export const variableCache = new Map();
export const allStylesMap = new Map();
// Webflow Musts tracking arrays
export let fallbackEmbeds = [];
export let complexValueEmbeds = [];
export let unsupportedCssEmbeds = [];
export let idEmbeds = [];
export function resetEmbeds() {
    fallbackEmbeds = [];
    complexValueEmbeds = [];
    unsupportedCssEmbeds = [];
    idEmbeds = [];
}
export function recordUnsupportedCss(embed) {
    const duplicate = unsupportedCssEmbeds.find((existing) => existing.className === embed.className &&
        existing.pseudo === embed.pseudo &&
        existing.cssText === embed.cssText);
    if (!duplicate) {
        unsupportedCssEmbeds.push(embed);
    }
}
export function recordFallbackEmbed(embed) {
    fallbackEmbeds.push(embed);
}
export function recordComplexValue(cv) {
    const duplicate = complexValueEmbeds.find((existing) => existing.className === cv.className &&
        existing.property === cv.property &&
        existing.breakpointId === cv.breakpointId &&
        existing.value === cv.value);
    if (!duplicate) {
        complexValueEmbeds.push(cv);
    }
}
export function recordIdEmbed(embed) {
    const dup = idEmbeds.find((e) => e.id === embed.id);
    if (!dup)
        idEmbeds.push(embed);
}
// Progress tracking
export let currentProgress = 0;
export let totalSteps = 0;
let _onProgressUpdate = null;
export function injectProgressUpdate(fn) {
    _onProgressUpdate = fn;
}
export function setProgress(current, total) {
    currentProgress = current;
    totalSteps = total;
    _onProgressUpdate === null || _onProgressUpdate === void 0 ? void 0 : _onProgressUpdate();
}
export function incrementProgress(amount = 1) {
    currentProgress += amount;
    _onProgressUpdate === null || _onProgressUpdate === void 0 ? void 0 : _onProgressUpdate();
}
// DOM refs (populated after DOMContentLoaded)
export let jsonTextarea;
export let errorBox;
export let buildBtn;
export let btnLabel;
export let spinner;
export let fileInput;
export let dropzone;
export let fileInfo;
export let fileNameDisplay;
export let removeFileBtn;
export let findBtn;
export let bindBtn;
export let progressLog;
export function setDomRefs(refs) {
    jsonTextarea = refs.jsonTextarea;
    errorBox = refs.errorBox;
    buildBtn = refs.buildBtn;
    btnLabel = refs.btnLabel;
    spinner = refs.spinner;
    fileInput = refs.fileInput;
    dropzone = refs.dropzone;
    fileInfo = refs.fileInfo;
    fileNameDisplay = refs.fileNameDisplay;
    removeFileBtn = refs.removeFileBtn;
    findBtn = refs.findBtn;
    bindBtn = refs.bindBtn;
    progressLog = refs.progressLog;
}
export let uploadedPayload = null;
export function setUploadedPayload(payload) {
    uploadedPayload = payload;
}
export let toastTimer = null;
export function setToastTimer(timer) {
    toastTimer = timer;
}
// Global style cache shared across the entire build session
export function getStyleCache() {
    if (!window.__wfStyleCache) {
        window.__wfStyleCache = new Map();
    }
    return window.__wfStyleCache;
}

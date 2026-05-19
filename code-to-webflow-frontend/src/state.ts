// ============================================================
// Shared Mutable State
// ============================================================

import type { SitePayload, FallbackEmbed, ComplexValueEmbed, UnsupportedCssEmbed, IdEmbed } from "./types.js";

// Cache for created/existing variables, bindings, and raw values
// Stores: { variable: Variable, binding: string, rawValue: any, type: string, cssName: string }
export const variableCache = new Map<string, any>();
export const allStylesMap = new Map<string, any>();

// Webflow Musts tracking arrays
export let fallbackEmbeds: FallbackEmbed[] = [];
export let complexValueEmbeds: ComplexValueEmbed[] = [];
export let unsupportedCssEmbeds: UnsupportedCssEmbed[] = [];
export let idEmbeds: IdEmbed[] = [];

export function resetEmbeds(): void {
	fallbackEmbeds = [];
	complexValueEmbeds = [];
	unsupportedCssEmbeds = [];
	idEmbeds = [];
}

export function recordUnsupportedCss(embed: UnsupportedCssEmbed): void {
	const duplicate = unsupportedCssEmbeds.find(
		(existing) =>
			existing.className === embed.className &&
			existing.pseudo === embed.pseudo &&
			existing.cssText === embed.cssText,
	);
	if (!duplicate) {
		unsupportedCssEmbeds.push(embed);
	}
}

export function recordFallbackEmbed(embed: FallbackEmbed): void {
	fallbackEmbeds.push(embed);
}

export function recordComplexValue(cv: ComplexValueEmbed): void {
	const duplicate = complexValueEmbeds.find(
		(existing) =>
			existing.className === cv.className &&
			existing.property === cv.property &&
			existing.breakpointId === cv.breakpointId &&
			existing.value === cv.value,
	);
	if (!duplicate) {
		complexValueEmbeds.push(cv);
	}
}

export function recordIdEmbed(embed: IdEmbed): void {
	const dup = idEmbeds.find((e) => e.id === embed.id);
	if (!dup) idEmbeds.push(embed);
}

// Progress tracking
export let currentProgress = 0;
export let totalSteps = 0;

let _onProgressUpdate: (() => void) | null = null;
export function injectProgressUpdate(fn: () => void): void {
	_onProgressUpdate = fn;
}

export function setProgress(current: number, total: number): void {
	currentProgress = current;
	totalSteps = total;
	_onProgressUpdate?.();
}

export function incrementProgress(amount = 1): void {
	currentProgress += amount;
	_onProgressUpdate?.();
}

// DOM refs (populated after DOMContentLoaded)
export let jsonTextarea: HTMLTextAreaElement;
export let errorBox: HTMLElement;
export let buildBtn: HTMLButtonElement;
export let btnLabel: HTMLSpanElement;
export let spinner: HTMLElement;
export let fileInput: HTMLInputElement;
export let dropzone: HTMLElement;
export let fileInfo: HTMLElement;
export let fileNameDisplay: HTMLElement;
export let removeFileBtn: HTMLElement;
export let findBtn: HTMLButtonElement;
export let bindBtn: HTMLButtonElement;
export let progressLog: HTMLElement;

export function setDomRefs(refs: {
	jsonTextarea: HTMLTextAreaElement;
	errorBox: HTMLElement;
	buildBtn: HTMLButtonElement;
	btnLabel: HTMLSpanElement;
	spinner: HTMLElement;
	fileInput: HTMLInputElement;
	dropzone: HTMLElement;
	fileInfo: HTMLElement;
	fileNameDisplay: HTMLElement;
	removeFileBtn: HTMLElement;
	findBtn: HTMLButtonElement;
	bindBtn: HTMLButtonElement;
	progressLog: HTMLElement;
}): void {
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

export let uploadedPayload: SitePayload | null = null;

export function setUploadedPayload(payload: SitePayload | null): void {
	uploadedPayload = payload;
}

export let toastTimer: ReturnType<typeof setTimeout> | null = null;

export function setToastTimer(timer: ReturnType<typeof setTimeout> | null): void {
	toastTimer = timer;
}

// Global style cache shared across the entire build session
export function getStyleCache(): Map<string, any> {
	if (!(window as any).__wfStyleCache) {
		(window as any).__wfStyleCache = new Map<string, any>();
	}
	return (window as any).__wfStyleCache;
}

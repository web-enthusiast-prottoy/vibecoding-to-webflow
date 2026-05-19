// ============================================================
// Progress Log & UI State
// ============================================================

import type { LogLevel } from "../../types.js";
import { progressLog, currentProgress, totalSteps } from "../../state.js";

export function updateProgressBar(): void {
	const progressFill = document.getElementById(
		"progress-fill",
	) as HTMLElement;
	const progressText = document.getElementById(
		"progress-percentage",
	) as HTMLElement;
	if (!progressFill || !progressText) return;

	const percentage =
		totalSteps > 0 ? Math.round((currentProgress / totalSteps) * 100) : 0;
	progressFill.style.width = `${Math.min(percentage, 100)}%`;
	progressText.textContent = `${Math.min(percentage, 100)}%`;
}

export function setLogAccordionExpanded(expanded: boolean): void {
	const entries = document.getElementById(
		"progress-log-entries",
	) as HTMLElement | null;
	const logAccIcon = document.getElementById(
		"log-acc-icon",
	) as HTMLElement | null;
	const logToggleText = document.getElementById(
		"log-toggle-text",
	) as HTMLElement | null;
	if (!entries) return;

	entries.style.display = expanded ? "" : "none";
	if (logAccIcon) {
		logAccIcon.style.transform = expanded ? "rotate(0deg)" : "rotate(-90deg)";
	}
	if (logToggleText) {
		logToggleText.textContent = expanded ? "Hide Logs" : "Show Logs";
	}
}

export function syncLogPanelState(options?: {
	keepVisible?: boolean;
	expanded?: boolean;
}): void {
	const logPanel = document.getElementById(
		"progress-log",
	) as HTMLElement | null;
	const entries = document.getElementById(
		"progress-log-entries",
	) as HTMLElement | null;
	if (!logPanel || !entries) return;

	const hasEntries = entries.childElementCount > 0;
	const hasAttentionItems = entries.querySelector(".log-warn, .log-error");
	const shouldKeepVisible = options?.keepVisible ?? hasEntries;

	logPanel.classList.toggle("has-entries", shouldKeepVisible && hasEntries);
	logPanel.classList.toggle("has-errors", !!hasAttentionItems);

	if (!hasEntries) {
		setLogAccordionExpanded(options?.expanded ?? true);
		return;
	}

	if (typeof options?.expanded === "boolean") {
		setLogAccordionExpanded(options.expanded);
	}
}

export function log(message: string, level: LogLevel = "info"): void {
	console.log(`[${level.toUpperCase()}] ${message}`);

	// Minimal UI: show successes, warnings, and errors in the log panel
	const shouldShowInUI = level === "success" || level === "warn" || level === "error";
	if (!shouldShowInUI || !progressLog) return;

	const entry = document.createElement("div");
	entry.className = `log-entry log-${level}`;

	const icons: Record<LogLevel, string> = {
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

export function clearLog(): void {
	if (progressLog) progressLog.innerHTML = "";
	syncLogPanelState({ keepVisible: false, expanded: true });
}

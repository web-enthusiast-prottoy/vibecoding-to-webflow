// ============================================================
// Toast, Error, and Loading UI
// ============================================================
import { buildBtn, spinner, btnLabel, errorBox, toastTimer, setToastTimer, } from "../../state.js";
export function setLoading(on) {
    buildBtn.disabled = on;
    spinner.classList.toggle("show", on);
    btnLabel.textContent = on ? "Building…" : "Ignite Structure (v2)";
    if (!on) {
        // Re-enable the clear button and finalise the log when done
        const clearBtn = document.getElementById("clear-log-btn");
        if (clearBtn)
            clearBtn.disabled = false;
    }
}
export function showError(msg) {
    errorBox.textContent = msg;
    errorBox.classList.add("show");
}
export function hideError() {
    errorBox.classList.remove("show");
}
export function showToast(msg, type) {
    const toast = document.getElementById("toast");
    toast.textContent = msg;
    toast.className = `toast toast-${type} show`;
    if (toastTimer)
        clearTimeout(toastTimer);
    const timer = setTimeout(() => {
        toast.classList.remove("show");
    }, 3500);
    setToastTimer(timer);
}
export function showHardError(title, message) {
    const overlayId = "wf-hard-error-overlay";
    let overlay = document.getElementById(overlayId);
    if (!overlay) {
        overlay = document.createElement("div");
        overlay.id = overlayId;
        overlay.style.cssText = `
			position: fixed; top: 0; left: 0; width: 100%; height: 100%;
			background: rgba(0,0,0,0.85); color: #ff4d4d; z-index: 999999;
			display: flex; flex-direction: column; align-items: center; justify-content: center;
			font-family: system-ui; padding: 20px; text-align: center;
		`;
        document.body.appendChild(overlay);
    }
    overlay.innerHTML = `
		<h1 style="margin-bottom: 10px;">🛑 ${title}</h1>
		<div style="background: #222; padding: 15px; border-radius: 8px; border: 1px solid #444; max-width: 80%; overflow: auto; text-align: left;">
			<pre style="margin: 0; white-space: pre-wrap; font-size: 13px;">${message}</pre>
		</div>
		<button onclick="this.parentElement.remove()" style="margin-top: 20px; padding: 10px 20px; background: #ff4d4d; color: white; border: none; border-radius: 4px; cursor: pointer;">Close Overlay</button>
	`;
}

// ============================================================
// Fallback Embeds UI (Webflow Musts)
// ============================================================
import { fallbackEmbeds, complexValueEmbeds, unsupportedCssEmbeds, idEmbeds, } from "../../state.js";
import { getStyleByName } from "../styles/cache.js";
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
function buildAccordionSection(id, title, badge, accentColor, bodyHtml) {
    return `
		<div style="border: 1px solid #334155; border-radius: 8px; overflow: hidden; margin-bottom: 10px;">
			<button
				onclick="(function(btn){
					var body = document.getElementById('${id}-body');
					var icon = btn.querySelector('.acc-icon');
					var open = body.style.display !== 'none';
					body.style.display = open ? 'none' : 'block';
					icon.style.transform = open ? 'rotate(0deg)' : 'rotate(90deg)';
				})(this)"
				style="width:100%; display:flex; align-items:center; gap:8px; padding:10px 12px; background:#1e293b; border:none; cursor:pointer; color:#e2e8f0; font-size:13px; font-weight:600; text-align:left; transition:background 0.15s;"
				onmouseover="this.style.background='#253347'"
				onmouseout="this.style.background='#1e293b'"
			>
				<span class="acc-icon" style="display:inline-block; font-size:10px; transition:transform 0.2s; color:${accentColor};">▶</span>
				<span style="flex:1;">${title}</span>
				<span style="background:${accentColor}22; color:${accentColor}; border:1px solid ${accentColor}44; border-radius:99px; padding:1px 8px; font-size:11px; font-weight:700;">${badge}</span>
			</button>
			<div id="${id}-body" style="display:none; padding:12px; background:#0f172a;">
				${bodyHtml}
			</div>
		</div>
	`;
}
export function showFallbackEmbedsUI() {
    const container = document.getElementById("fallback-embeds-container");
    if (!container)
        return;
    const hasSvg = fallbackEmbeds.length > 0;
    const hasComplex = complexValueEmbeds.length > 0;
    const hasUnsupportedCss = unsupportedCssEmbeds.length > 0;
    const hasIds = idEmbeds.length > 0;
    if (!hasSvg && !hasComplex && !hasUnsupportedCss && !hasIds)
        return;
    // Global selector helpers (only register once)
    if (!window.selectWebflowElement) {
        window.selectWebflowElement = async (index) => {
            const embed = fallbackEmbeds[index];
            if (embed && embed.element) {
                try {
                    await webflow.setSelectedElement(embed.element);
                    log(`Selected: ${embed.displayName || "Manual Embed"}`, "info");
                }
                catch (e) {
                    log(`Failed to select element: ${e.message}`, "error");
                }
            }
        };
    }
    // Always re-register selectIdElement so it captures the fresh idEmbeds closure from this build
    window.selectIdElement = async (index) => {
        const embed = idEmbeds[index];
        if (embed && embed.element) {
            try {
                await webflow.setSelectedElement(embed.element);
            }
            catch (e) {
                log(`Failed to select element for ID "${embed.id}": ${e.message}`, "warn");
            }
        }
    };
    if (!window.selectComplexValueElement) {
        window.selectComplexValueElement = async (index) => {
            const cv = complexValueEmbeds[index];
            if (!cv)
                return;
            if (cv.element) {
                try {
                    await webflow.setSelectedElement(cv.element);
                    log(`Selected element for: .${cv.className} → ${cv.property}`, "info");
                    return;
                }
                catch (e) {
                    log(`Failed to select specific element: ${e.message}`, "warn");
                    // Continue to fallback if original reference failed
                }
            }
            // --- DISCOVERY FALLBACK ---
            // If no direct reference (global style or unused class), search the entire canvas.
            log(`Searching canvas for an element with class .${cv.className}...`, "info");
            webflow.notify({
                type: "Info",
                message: `Searching for .${cv.className} on canvas...`,
            });
            try {
                const allElements = await webflow.getAllElements();
                // Use a batch processing to stay responsive while checking style names
                for (const el of allElements) {
                    if (typeof el.getStyles === "function") {
                        try {
                            const styles = await el.getStyles();
                            for (const style of styles) {
                                const name = await style.getName();
                                if (name === cv.className) {
                                    cv.element = el;
                                    await webflow.setSelectedElement(el);
                                    log(`    [DEBUG] Discovered element for .${cv.className} via project-wide scan`, "success");
                                    return;
                                }
                            }
                        }
                        catch (_a) {
                            /* ignore elements that fail to report styles */
                        }
                    }
                }
                // If we reach here, the class truly isn't being used anywhere.
                webflow.notify({
                    type: "Info",
                    message: `The class ".${cv.className}" is defined in Style Manager but not used by any element on the canvas.`,
                });
                log(`Global class style .${cv.className} exists but is unused on canvas.`, "info");
            }
            catch (err) {
                log(`Canvas discovery failed: ${err.message}`, "error");
            }
        };
    }
    // Always re-register so it captures the current fallbackEmbeds closure freshly.
    // The `if (!window.copyAsWebflowJSON)` guard is intentionally removed — stale closures
    // from a previous build would reference an old fallbackEmbeds snapshot.
    window.copyAsWebflowJSON = async (index, btnId) => {
        const embed = fallbackEmbeds[index];
        if (!embed)
            return;
        // Safety strip: remove any residual class="..." attribute from the embed HTML.
        // Classes must live on the Code Embed WRAPPER in Webflow's Designer panel, not
        // inside the raw SVG/HTML code. The build phase strips them at serialisation time,
        // but this regex is a belt-and-suspenders guard for any edge cases.
        const cleanCode = embed.code.replace(/\s+class="[^"]*"/gi, "");
        const nodeId = crypto.randomUUID
            ? crypto.randomUUID()
            : "e" + Math.random().toString(36).substr(2, 9);
        const styles = [];
        const classes = [];
        for (let i = 0; i < (embed.classList || []).length; i++) {
            const className = embed.classList[i];
            // Try to resolve the real Webflow style ID so the pasted embed links to the
            // existing class (already created by applyGlobalStyles) rather than orphaning.
            let styleId = `style-${nodeId}-${i}`;
            try {
                const existing = await getStyleByName(className);
                if (existing && existing.id) {
                    styleId = existing.id;
                }
            }
            catch (e) {
                // Ignore — falls back to dummy ID; Webflow will match by name on paste.
            }
            styles.push({
                _id: styleId,
                fake: false,
                type: "class",
                name: className,
                namespace: "",
                comb: "",
                styleLess: "",
                variants: {},
                children: [],
                pluginType: null,
                createdBy: null,
                origin: null,
                selector: null,
            });
            classes.push(styleId);
        }
        const payload = {
            type: "@webflow/XscpData",
            payload: {
                nodes: [
                    {
                        _id: nodeId,
                        type: "HtmlEmbed",
                        tag: "div",
                        // Classes on the HtmlEmbed NODE = visible in Webflow's style panel
                        classes: classes,
                        children: [],
                        v: cleanCode,
                        data: {
                            search: { exclude: true },
                            embed: {
                                type: "html",
                                meta: {
                                    html: cleanCode,
                                    div: false,
                                    script: false,
                                    compilable: false,
                                    iframe: false,
                                },
                            },
                            insideRTE: false,
                            content: "",
                            devlink: { runtimeProps: {}, slot: "" },
                            displayName: embed.displayName || "",
                            attr: { id: "" },
                            xattr: [],
                            visibility: {
                                conditions: [],
                                keepInHtml: { tag: "False", val: {} },
                            },
                        },
                    },
                ],
                styles: styles,
                assets: [],
                ix1: [],
                ix2: { interactions: [], events: [], actionLists: [] },
            },
            meta: {
                unlinkedSymbolCount: 0,
                droppedLinks: 0,
                dynBindRemovedCount: 0,
                dynListBindRemovedCount: 0,
                paginationRemovedCount: 0,
            },
        };
        try {
            const payloadStr = JSON.stringify(payload);
            const copyHandler = (e) => {
                var _a, _b;
                (_a = e.clipboardData) === null || _a === void 0 ? void 0 : _a.setData("application/json", payloadStr);
                (_b = e.clipboardData) === null || _b === void 0 ? void 0 : _b.setData("text/plain", "Webflow Component");
                e.preventDefault();
            };
            document.addEventListener("copy", copyHandler);
            document.execCommand("copy");
            document.removeEventListener("copy", copyHandler);
            const btn = document.getElementById(btnId);
            if (btn) {
                btn.textContent = "✓ Copied to Webflow!";
                setTimeout(() => (btn.textContent = "Copy to Webflow"), 2000);
            }
        }
        catch (err) {
            console.error("Clipboard error:", err);
            alert("Clipboard copy failed. Try copying the raw code instead.");
        }
    };
    if (!window.copyCssAsWebflowJSON) {
        window.copyCssAsWebflowJSON = async (index, btnId) => {
            const embed = unsupportedCssEmbeds[index];
            if (!embed)
                return;
            const cssCode = `<style>\n${embed.cssText}\n</style>`;
            const nodeId = crypto.randomUUID
                ? crypto.randomUUID()
                : "e" + Math.random().toString(36).substr(2, 9);
            const payload = {
                type: "@webflow/XscpData",
                payload: {
                    nodes: [
                        {
                            _id: nodeId,
                            type: "HtmlEmbed",
                            tag: "div",
                            classes: [],
                            children: [],
                            v: cssCode,
                            data: {
                                search: { exclude: true },
                                embed: {
                                    type: "html",
                                    meta: {
                                        html: cssCode,
                                        div: false,
                                        script: false,
                                        compilable: false,
                                        iframe: false,
                                    },
                                },
                                insideRTE: false,
                                content: "",
                                devlink: { runtimeProps: {}, slot: "" },
                                displayName: "Unsupported CSS",
                                attr: { id: "" },
                                xattr: [],
                                visibility: {
                                    conditions: [],
                                    keepInHtml: { tag: "False", val: {} },
                                },
                            },
                        },
                    ],
                    styles: [],
                    assets: [],
                    ix1: [],
                    ix2: { interactions: [], events: [], actionLists: [] },
                },
                meta: {
                    unlinkedSymbolCount: 0,
                    droppedLinks: 0,
                    dynBindRemovedCount: 0,
                    dynListBindRemovedCount: 0,
                    paginationRemovedCount: 0,
                },
            };
            try {
                const payloadStr = JSON.stringify(payload);
                const copyHandler = (e) => {
                    var _a, _b;
                    (_a = e.clipboardData) === null || _a === void 0 ? void 0 : _a.setData("application/json", payloadStr);
                    (_b = e.clipboardData) === null || _b === void 0 ? void 0 : _b.setData("text/plain", "Webflow Component");
                    e.preventDefault();
                };
                document.addEventListener("copy", copyHandler);
                document.execCommand("copy");
                document.removeEventListener("copy", copyHandler);
                const btn = document.getElementById(btnId);
                if (btn) {
                    btn.textContent = "✓ Copied to Webflow!";
                    setTimeout(() => (btn.textContent = "Copy to Webflow"), 2000);
                }
            }
            catch (err) {
                console.error("Clipboard error:", err);
                alert("Clipboard copy failed. Try copying the raw code instead.");
            }
        };
    }
    let sectionsHtml = "";
    // --- SVG section ---
    if (hasSvg) {
        let svgBody = "";
        fallbackEmbeds.forEach((embed, i) => {
            const idHtml = `embed-code-${i}`;
            const displayStr = embed.displayName
                ? `<strong style="color:#f8fafc;font-weight:600;">${embed.displayName}</strong> — `
                : "";
            const location = embed.classList.length > 0
                ? `.${embed.classList.join(".")}`
                : embed.tag;
            // Strip residual class= attributes so the textarea preview is also clean.
            const displayCode = embed.code.replace(/\s+class="[^"]*"/gi, "");
            const escapedCode = displayCode
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;");
            const classTagsHtml = embed.classList.length > 0
                ? embed.classList
                    .map((c) => `<span style="display:inline-block;background:#0f3460;color:#38bdf8;border:1px solid #1e4a8a;border-radius:3px;padding:0 6px;font-size:10px;font-family:monospace;margin-right:3px;">.${c}</span>`)
                    .join("")
                : `<span style="color:#64748b;font-size:10px;">no classes</span>`;
            svgBody += `
				<div style="background:#1e293b;padding:11px;margin-bottom:10px;border-radius:6px;border:1px solid #2d3f55;box-sizing:border-box;">
					<div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:8px;">
						<div style="font-size:12px;color:#94a3b8;">${displayStr}<span style="font-family:monospace;color:#38bdf8;">${location}</span></div>
						<button onclick="selectWebflowElement(${i})" style="padding:2px 8px;background:rgba(56,189,248,0.1);color:#38bdf8;border:1px solid rgba(56,189,248,0.25);border-radius:4px;cursor:pointer;font-size:11px;font-weight:500;">Select on Canvas</button>
					</div>
					<div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;padding:5px 8px;background:#0a1929;border-radius:4px;border:1px solid #1a3050;">
						<span style="font-size:10px;color:#64748b;white-space:nowrap;">Class on embed wrapper →</span>
						${classTagsHtml}
					</div>
					<p style="font-size:11px;color:#64748b;margin:0 0 6px;">The class above is applied to the <strong style="color:#94a3b8;">Code Embed element</strong> in Webflow's Designer — not inside the embed code.</p>
					<textarea id="${idHtml}" readonly style="width:100%;height:72px;padding:7px;border-radius:4px;border:1px solid #334155;background:#070f1c;color:#7dd3fc;font-family:monospace;font-size:11px;box-sizing:border-box;resize:vertical;margin-bottom:7px;">${escapedCode}</textarea>
					<div style="display:flex;gap:8px;">
						<button onclick="copyAsWebflowJSON(${i}, 'btn-wf-${i}')" id="btn-wf-${i}" style="padding:5px 11px;background:#38bdf8;color:#0f172a;border:none;border-radius:4px;cursor:pointer;font-size:12px;font-weight:600;">Copy to Webflow</button>
						<button onclick="navigator.clipboard.writeText(document.getElementById('${idHtml}').value);this.textContent='✓ Code Copied!';setTimeout(()=>this.textContent='Copy Raw Code',2000)" style="padding:5px 11px;background:#1e40af;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:12px;font-weight:500;">Copy Raw Code</button>
					</div>
				</div>
			`;
        });
        sectionsHtml += buildAccordionSection("acc-svg", "SVG Code Embeds", fallbackEmbeds.length, "#38bdf8", svgBody);
    }
    // --- Complex Values section ---
    if (hasComplex) {
        let cvBody = `<p style="font-size:11px;color:#94a3b8;margin:0 0 10px;">These complex CSS values (clamp, calc, etc.) were applied via the API. Verify each in the Webflow Style Panel — if the value looks wrong or is missing, copy and paste it manually.</p>`;
        complexValueEmbeds.forEach((cv, i) => {
            const idCv = `cv-code-${i}`;
            const bpLabel = cv.breakpointId && cv.breakpointId !== "main"
                ? ` <span style="background:#1e3a2f;color:#4ade80;border:1px solid #166534;border-radius:3px;padding:0 5px;font-size:10px;">${cv.breakpointId}</span>`
                : "";
            cvBody += `
				<div style="background:#1e293b;padding:11px;margin-bottom:8px;border-radius:6px;border:1px solid #2d3f55;box-sizing:border-box;">
					<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
						<span style="font-family:monospace;font-size:12px;color:#f472b6;">.${cv.className}</span>
						<span style="color:#64748b;font-size:11px;">→</span>
						<span style="font-family:monospace;font-size:12px;color:#fbbf24;">${cv.property}</span>
						${bpLabel}
						<button onclick="selectComplexValueElement(${i})" style="margin-left:auto;padding:2px 8px;background:rgba(56,189,248,0.1);color:#38bdf8;border:1px solid rgba(56,189,248,0.25);border-radius:4px;cursor:pointer;font-size:11px;font-weight:500;">Select on Canvas</button>
					</div>
					<div style="display:flex;gap:6px;align-items:center;">
						<input id="${idCv}" readonly value="${cv.value.replace(/"/g, "&quot;")}" style="flex:1;padding:6px 8px;border-radius:4px;border:1px solid #334155;background:#070f1c;color:#a3e635;font-family:monospace;font-size:11px;box-sizing:border-box;" />
						<button onclick="navigator.clipboard.writeText(document.getElementById('${idCv}').value);this.textContent='✓';setTimeout(()=>this.textContent='Copy',1800)" style="padding:5px 10px;background:#166534;color:#86efac;border:none;border-radius:4px;cursor:pointer;font-size:11px;font-weight:600;">Copy</button>
					</div>
				</div>
			`;
        });
        sectionsHtml += buildAccordionSection("acc-cv", "Complex CSS Values", complexValueEmbeds.length, "#a3e635", cvBody);
    }
    // --- Unsupported CSS section ---
    if (hasUnsupportedCss) {
        let unsuppBody = `<p style="font-size:11px;color:#94a3b8;margin:0 0 10px;">These CSS selectors (e.g., complex pseudo-classes or descendant selectors) are not natively supported by the Webflow Designer API. Paste them into the custom code section or an HTML Embed.</p>`;
        unsupportedCssEmbeds.forEach((embed, i) => {
            const idUnsupp = `unsupp-code-${i}`;
            const escapedCode = `<style>\n${embed.cssText}\n</style>`
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;");
            unsuppBody += `
				<div style="background:#1e293b;padding:11px;margin-bottom:10px;border-radius:6px;border:1px solid #2d3f55;box-sizing:border-box;">
					<div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:8px;">
						<div style="font-size:12px;color:#94a3b8;">Unsupported Selector: <span style="font-family:monospace;color:#f472b6;">.${embed.className}:${embed.pseudo}</span></div>
					</div>
					<p style="font-size:11px;color:#64748b;margin:0 0 6px;">Paste directly into Webflow, or copy the raw code for an existing embed:</p>
					<textarea id="${idUnsupp}" readonly style="width:100%;height:80px;padding:7px;border-radius:4px;border:1px solid #334155;background:#070f1c;color:#f472b6;font-family:monospace;font-size:11px;box-sizing:border-box;resize:vertical;margin-bottom:7px;">${escapedCode}</textarea>
					<div style="display:flex;gap:8px;">
						<button onclick="copyCssAsWebflowJSON(${i}, 'btn-wf-css-${i}')" id="btn-wf-css-${i}" style="padding:5px 11px;background:#f472b6;color:#0f172a;border:none;border-radius:4px;cursor:pointer;font-size:12px;font-weight:600;">Copy to Webflow</button>
						<button onclick="navigator.clipboard.writeText(document.getElementById('${idUnsupp}').value);this.textContent='✓ Code Copied!';setTimeout(()=>this.textContent='Copy Raw CSS',2000)" style="padding:5px 11px;background:#9d174d;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:12px;font-weight:500;">Copy Raw CSS</button>
					</div>
				</div>
			`;
        });
        sectionsHtml += buildAccordionSection("acc-unsupp", "Unsupported CSS Selectors", unsupportedCssEmbeds.length, "#f472b6", unsuppBody);
    }
    // --- IDs to Set Manually section ---
    if (hasIds) {
        let idBody = `<p style="font-size:11px;color:#94a3b8;margin:0 0 10px;">Webflow's Designer API restricts setting IDs directly. Add each ID manually in the <strong style="color:#e2e8f0;">Settings → ID</strong> panel after selecting the element on canvas.</p>`;
        idEmbeds.forEach((embed, i) => {
            const classTagsHtml = embed.classList.length > 0
                ? embed.classList
                    .map((c) => `<span style="display:inline-block;background:#0f3460;color:#38bdf8;border:1px solid #1e4a8a;border-radius:3px;padding:0 6px;font-size:10px;font-family:monospace;margin-right:3px;">.${c}</span>`)
                    .join("")
                : `<span style="color:#64748b;font-size:10px;">no classes</span>`;
            idBody += `
				<div style="background:#1e293b;padding:11px;margin-bottom:8px;border-radius:6px;border:1px solid #2d3f55;box-sizing:border-box;">
					<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
						<div style="flex:1;">
							<div style="font-size:10px;color:#64748b;margin-bottom:4px;">Element classes →</div>
							${classTagsHtml}
						</div>
						<button onclick="selectIdElement(${i})" style="padding:2px 8px;background:rgba(56,189,248,0.1);color:#38bdf8;border:1px solid rgba(56,189,248,0.25);border-radius:4px;cursor:pointer;font-size:11px;font-weight:500;">Select on Canvas</button>
					</div>
					<div style="display:flex;gap:6px;align-items:center;">
						<span style="font-size:10px;color:#64748b;white-space:nowrap;">ID to set →</span>
						<input id="id-val-${i}" readonly value="${embed.id}" style="flex:1;padding:5px 8px;border-radius:4px;border:1px solid #334155;background:#070f1c;color:#fb923c;font-family:monospace;font-size:12px;font-weight:600;box-sizing:border-box;" />
						<button onclick="navigator.clipboard.writeText(document.getElementById('id-val-${i}').value);this.textContent='✓';setTimeout(()=>this.textContent='Copy',1800)" style="padding:5px 10px;background:#7c3aed;color:#e9d5ff;border:none;border-radius:4px;cursor:pointer;font-size:11px;font-weight:600;">Copy</button>
					</div>
				</div>
			`;
        });
        sectionsHtml += buildAccordionSection("acc-ids", "IDs to Set Manually", idEmbeds.length, "#fb923c", idBody);
    }
    container.innerHTML = `
		<div style="margin-bottom:8px;">
			<div style="font-size:12px;font-weight:700;color:#f8fafc;letter-spacing:0.04em;margin-bottom:6px;display:flex;align-items:center;gap:6px;">
				<span style="color:#f59e0b;">⚠</span> Webflow Musts
			</div>
			<p style="font-size:11px;color:#64748b;margin:0 0 10px;">These items need manual attention in the Webflow Designer. Expand a section to review.</p>
		</div>
		${sectionsHtml}
	`;
    container.style.display = "block";
}

import * as fs from "fs";
import * as path from "path";
import {
	BreakpointStyles,
	WebflowReadyNode,
	WebflowSiteStructure,
} from "../types";

function getStructuralFingerprint(node: WebflowReadyNode): string {
	const getObj = (n: WebflowReadyNode): any => ({
		t: n.type,
		g: n.tag,
		c: n.children?.map(getObj) || [],
	});
	return JSON.stringify(getObj(node));
}

function getVariantFingerprint(node: WebflowReadyNode): string {
	const getObj = (n: WebflowReadyNode): any => ({
		cls: n.classes,
		c: n.children?.map(getObj) || [],
	});
	return JSON.stringify(getObj(node));
}

export function splitSiteStructure(
	siteStructure: WebflowSiteStructure,
	outputDir: string,
	baseName: string,
) {
	const projectDir = path.join(outputDir, baseName);

	if (!fs.existsSync(projectDir)) {
		fs.mkdirSync(projectDir, { recursive: true });
	}

	// Identify sections from the index page
	const mainPage =
		siteStructure.pages.find((p) => p.name === "index") ||
		siteStructure.pages[0];
	if (!mainPage) return;

	let customStylesHtml = "";
	let customScriptsHtml = "";

	function extractEmbeds(nodes: WebflowReadyNode[]): WebflowReadyNode[] {
		const filtered: WebflowReadyNode[] = [];
		for (const node of nodes) {
			if (node.type === "HtmlEmbed") {
				if (node.tag === "script") {
					if (node.text) customScriptsHtml += node.text + "\n";
					continue; // Remove from tree
				} else if (
					node.tag === "style" ||
					node.tag === "link" ||
					node.tag === "meta"
				) {
					if (node.text) customStylesHtml += node.text + "\n";
					continue; // Remove from tree
				}
			}

			if (node.children && node.children.length > 0) {
				node.children = extractEmbeds(node.children);
			}
			filtered.push(node);
		}
		return filtered;
	}

	mainPage.nodes = extractEmbeds(mainPage.nodes);

	const sections: {
		name: string;
		nodes: WebflowReadyNode[];
		classes: Set<string>;
	}[] = [];

	let mainClasses: string[] = ["main-wrapper"];

	function getUsedClasses(node: WebflowReadyNode, classSet: Set<string>) {
		(node.classes || []).forEach((c) => classSet.add(c));
		(node.children || []).forEach((child) =>
			getUsedClasses(child, classSet),
		);
	}

	function processNode(node: WebflowReadyNode) {
		const tag = node.tag?.toLowerCase();
		const classes = node.classes || [];

		let name = tag || "div";
		if (classes.length > 0) name = classes[0];

		const isWrapper = 
			classes.includes("page-wrapper") || 
			classes.includes("main-wrapper") || 
			classes.includes("content-wrapper") ||
			tag === "body";

		if (
			tag === "nav" ||
			tag === "header" ||
			tag === "footer" ||
			tag === "section"
		) {
			const classSet = new Set<string>();
			getUsedClasses(node, classSet);
			sections.push({ name, nodes: [node], classes: classSet });
		} else if (tag === "main") {
			if (classes && classes.length > 0) {
				mainClasses = [...classes];
			}
			node.children.forEach(processNode); // Recurse to find sections inside main
		} else if (isWrapper) {
			// Recurse into wrappers to find actual sections
			node.children.forEach(processNode);
		} else {
			const classSet = new Set<string>();
			getUsedClasses(node, classSet);
			sections.push({ name, nodes: [node], classes: classSet });
		}
	}

	mainPage.nodes.forEach(processNode);

	// Component Detection Logic: Identify repeatable sections based on tree structure
	const fingerprints = new Map<
		string,
		{ firstSection: any; count: number }
	>();

	sections.forEach((section) => {
		const node = section.nodes[0];
		if (!node) return;
		const fp = getStructuralFingerprint(node);
		if (!fingerprints.has(fp)) {
			fingerprints.set(fp, { firstSection: section, count: 1 });
		} else {
			const entry = fingerprints.get(fp)!;
			entry.count++;

			// Mark the first one as a component
			const firstNode = entry.firstSection.nodes[0];
			firstNode.isComponent = true;
			firstNode.componentName = entry.firstSection.name;

			// Mark current as a component instance
			node.isComponent = true;
			node.componentName = entry.firstSection.name;
			node.componentId = entry.firstSection.name
				.toLowerCase()
				.replace(/[^a-z0-9]/g, "-");

			// Variant Detection: structure is same, check if classes differ
			const firstVar = getVariantFingerprint(firstNode);
			const currentVar = getVariantFingerprint(node);
			if (firstVar !== currentVar) {
				node.componentVariant = section.name;
			}
		}
	});

	// Analyze class usage across sections
	const classUsageCount = new Map<string, number>();
	const selectorToSections = new Map<string, Set<number>>();

	const allStyleSelectors = Object.keys(siteStructure.globalStyles || {});

	allStyleSelectors.forEach((selector) => {
		const baseSelector = selector.split(":")[0].trim();
		const isClass = baseSelector.startsWith(".");
		const selectorClasses = isClass
			? baseSelector.split(".").filter(Boolean)
			: [];

		sections.forEach((section, idx) => {
			let isRelevant = false;
			if (!isClass) {
				// Tag based styles (body, h1, etc) are global
				isRelevant = false;
			} else {
				// Compound selector relevance: if all classes in the selector are present in the section
				if (
					selectorClasses.length > 0 &&
					selectorClasses.every((c) => section.classes.has(c))
				) {
					isRelevant = true;
				}
			}

			if (isRelevant) {
				if (!selectorToSections.has(selector))
					selectorToSections.set(selector, new Set());
				selectorToSections.get(selector)!.add(idx);
			}
		});
	});

	const sharedStyles: Record<string, BreakpointStyles> = {};
	const sectionSpecificStyles: Record<string, BreakpointStyles>[] =
		sections.map(() => ({}));

	allStyleSelectors.forEach((selector) => {
		const sectionIndices = selectorToSections.get(selector);
		const baseSelector = selector.split(":")[0].trim();
		const isClass = baseSelector.startsWith(".");

		if (!isClass || !sectionIndices || sectionIndices.size > 1) {
			// Shared or global tag style
			sharedStyles[selector] = siteStructure.globalStyles![selector];
		} else if (sectionIndices.size === 1) {
			// specific to one section
			const sectionIdx = Array.from(sectionIndices)[0];
			sectionSpecificStyles[sectionIdx][selector] =
				siteStructure.globalStyles![selector];
		}
	});

	// 1. Create base.json (Global Variables & Shared Styles)
	const baseData = {
		_mime: "base",
		__meta: siteStructure.__meta,
		name: siteStructure.name,
		collections: siteStructure.collections || [],
		globalStyles: sharedStyles,
		nodes: [
			{
				type: "Block",
				tag: "main",
				classes: mainClasses,
				children: [],
			} as WebflowReadyNode,
		],
	};

	fs.writeFileSync(
		path.join(projectDir, "00-base.json"),
		JSON.stringify(baseData, null, 2),
	);
	console.log(`- Created 00-base.json (Shared styles only)`);

	// 2. Create individual section files with their own styles
	sections.forEach((section, idx) => {
		const fileName = `${(idx + 1).toString().padStart(2, "0")}-${section.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}.json`;

		const sectionData = {
			_mime: "section",
			__meta: siteStructure.__meta,
			name: section.name,
			nodes: section.nodes,
			globalStyles: sectionSpecificStyles[idx], // Include specific styles in same format
		};

		fs.writeFileSync(
			path.join(projectDir, fileName),
			JSON.stringify(sectionData, null, 2),
		);
		console.log(`- Created ${fileName} (incl. section-specific styles)`);
	});

	// 3. Handle Styles and Scripts Embeds
	let combinedStylesInner = "";
	if (siteStructure.unsupportedCss && siteStructure.unsupportedCss.trim()) {
		combinedStylesInner += siteStructure.unsupportedCss.trim() + "\n";
	}
	if (siteStructure.keyframes && siteStructure.keyframes.trim()) {
		combinedStylesInner += siteStructure.keyframes.trim() + "\n";
	}
	
	let combinedStyles = "";
	if (combinedStylesInner.trim()) {
		combinedStyles += `<style>\n${combinedStylesInner.trim()}\n</style>\n`;
	}
	if (customStylesHtml.trim()) {
		combinedStyles += customStylesHtml.trim() + "\n";
	}

	if (combinedStyles.trim()) {
		const styleEmbedNode: WebflowReadyNode = {
			type: "HtmlEmbed",
			tag: "div", // Provide a default tag
			text: combinedStyles.trim().replace(/\s+/g, ' ').replace(/"/g, "'"),
			classes: [],
			children: [],
		} as any;

		const stylesData = {
			_mime: "section",
			__meta: siteStructure.__meta,
			name: "Global Styles Embed",
			nodes: [styleEmbedNode],
		};

		fs.writeFileSync(
			path.join(projectDir, "98-styles-embed.json"),
			JSON.stringify(stylesData, null, 2),
		);
		console.log(`- Created 98-styles-embed.json`);
	}

	if (customScriptsHtml.trim()) {
		const scriptEmbedNode: WebflowReadyNode = {
			type: "HtmlEmbed",
			tag: "div",
			text: customScriptsHtml.trim().replace(/\s+/g, ' ').replace(/"/g, "'"),
			classes: [],
			children: [],
		} as any;

		const scriptsData = {
			_mime: "section",
			__meta: siteStructure.__meta,
			name: "Global Scripts Embed",
			nodes: [scriptEmbedNode],
		};

		fs.writeFileSync(
			path.join(projectDir, "99-scripts-embed.json"),
			JSON.stringify(scriptsData, null, 2),
		);
		console.log(`- Created 99-scripts-embed.json`);
	}
}

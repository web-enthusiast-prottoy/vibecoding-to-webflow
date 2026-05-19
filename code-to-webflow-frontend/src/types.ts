// ============================================================
// Code to Webflow — Shared Types
// ============================================================

export type BreakpointKey = "main" | "medium" | "small" | "tiny" | "large" | "xl" | "xxl";
export type CssPropertyMap = Record<string, string>;
export type BreakpointStyleMap = Partial<Record<BreakpointKey, CssPropertyMap>>;
export type NodeStyleMap = CssPropertyMap | BreakpointStyleMap;

export const BREAKPOINT_KEYS = new Set<BreakpointKey>([
	"main",
	"medium",
	"small",
	"tiny",
	"large",
	"xl",
	"xxl",
]);

export interface WebflowReadyNode {
	type:
		| "Block"
		| "Heading"
		| "Paragraph"
		| "Link"
		| "Image"
		| "HtmlEmbed"
		| "List"
		| "ListItem"
		| "TextBlock"
		| "custom"
		| "FormWrapper" | "FormForm" | "FormTextInput" | "FormTextarea" | "FormSelect" | "FormCheckboxInput" | "FormRadioInput" | "FormBlockLabel" | "FormButton" | "FormSuccessMessage" | "FormErrorMessage";
	tag?: string;
	classes: string[];
	/** Pre-normalized styles from backend (kebab-case, no vendor prefixes, no --* vars). */
	styles?: NodeStyleMap;
	/** Styles pre-resolved from complex descendant selectors by the backend (e.g. '.nav a'). */
	inlineStyles?: NodeStyleMap;
	/** Styles from complex descendant selectors with pseudo states */
	inlinePseudoStyles?: Record<string, NodeStyleMap>;
	attributes?: Record<string, any>;
	id?: string;
	text?: string | string[];
	children: WebflowReadyNode[];
}

export interface WebflowVariableValue {
	type: string;
	value: any;
	isCustom?: boolean;
	customValue?: string;
}

export interface WebflowVariable {
	name: string;
	type: string;
	values: { [modeName: string]: WebflowVariableValue };
	group?: string;
}

export interface WebflowCollection {
	name: string;
	modes: { name: string }[];
	variables: WebflowVariable[];
}

/** Signals what the backend has pre-computed. Present on v2 JSON files. */
export interface SiteMeta {
	version: 1 | 2;
	normalized: boolean;
	complexSelectorsResolved: boolean;
}

export interface SitePayload {
	__meta?: SiteMeta;
	name?: string;
	collections?: WebflowCollection[];
	pages?: Array<{
		name?: string;
		slug?: string;
		nodes?: WebflowReadyNode[];
		globalStyles?: Record<string, any>;
		styles?: Record<string, any>;
	}>;
	nodes?: WebflowReadyNode[];
	globalStyles?: Record<string, any>;
	styles?: Record<string, any>;
}

export interface FallbackEmbed {
	code: string;
	classList: string[];
	tag: string;
	displayName?: string;
	element?: any;
	category?: "svg" | "complex-value";
}

export interface ComplexValueEmbed {
	/** Webflow class name (e.g. "nav-link") */
	className: string;
	/** CSS property that needs the value (e.g. "font-size", "padding-top") */
	property: string;
	/** Raw complex CSS value (e.g. "clamp(1rem, 4vw, 2rem)") */
	value: string;
	/** Breakpoint id if responsive (e.g. "small") */
	breakpointId?: string;
	/** Webflow element that this style is applied to (for canvas selection) */
	element?: any;
}

export interface UnsupportedCssEmbed {
	className: string;
	pseudo: string;
	cssText: string;
}

export interface IdEmbed {
	/** The id value to set, e.g. "hero-prev" */
	id: string;
	/** Class list of the element, for context */
	classList: string[];
	/** Display name for UI */
	displayName?: string;
	/** Webflow element reference for canvas selection */
	element?: any;
}

export type LogLevel = "info" | "success" | "warn" | "error";

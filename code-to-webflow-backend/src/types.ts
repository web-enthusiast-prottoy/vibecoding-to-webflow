export type StylePropertyMap = Record<string, string>;

export interface BreakpointStyles {
  main?: StylePropertyMap;
  medium?: StylePropertyMap;
  small?: StylePropertyMap;
  tiny?: StylePropertyMap;
  large?: StylePropertyMap;
  xl?: StylePropertyMap;
  xxl?: StylePropertyMap;
}

export type NodeStyleMap = StylePropertyMap | BreakpointStyles;

export interface WebflowReadyNode {
  type: "Block" | "Heading" | "Paragraph" | "Link" | "Image" | "HtmlEmbed" | "List" | "ListItem" | "TextBlock" | "custom" | "FormWrapper" | "FormForm" | "FormTextInput" | "FormTextarea" | "FormSelect" | "FormCheckboxInput" | "FormRadioInput" | "FormBlockLabel" | "FormButton" | "FormSuccessMessage" | "FormErrorMessage";
  tag?: string; // e.g., "div", "section" for HTML blocks
  classes: string[]; // Utility or component classes (e.g., "padding-global", "hero_component")
  /** Component Metadata */
  isComponent?: boolean;
  componentName?: string;
  componentVariant?: string;
  componentId?: string; // Used to link instances to definitions
  /** Pre-normalized inline styles (kebab-case, no vendor prefixes, no --* vars). */
  styles?: NodeStyleMap;
  /** Styles merged from complex descendant selectors (e.g. `.nav a`), optionally keyed by breakpoint. */
  inlineStyles?: NodeStyleMap;
  /** Styles from complex descendant selectors with pseudo states (e.g. `.nav a:hover`), optionally keyed by breakpoint. */
  inlinePseudoStyles?: Record<string, NodeStyleMap>;
  attributes?: Record<string, string>; // Custom data attributes, aria attributes, etc
  id?: string; // HTML ID
  text?: string | string[];
  children: WebflowReadyNode[];
}

export interface WebflowVariableValue {
  type: "Color" | "Size" | "FontFamily" | "Number" | "Percentage";
  value: string | number | { unit: string; value: number } | null;
  isAlias?: boolean;
  aliasName?: string;
  isCustom?: boolean;
  customValue?: string;
}

export interface WebflowVariable {
  name: string;
  type: "Color" | "Size" | "FontFamily" | "Number" | "Percentage";
  values: { [modeName: string]: WebflowVariableValue };
  group?: string; // Optional group name for collection assignment
}

export interface WebflowCollection {
  name: string;
  modes: { name: string }[];
  variables: WebflowVariable[];
}

export interface ParseResult {
  nodes: WebflowReadyNode[];
  globalStyles?: Record<string, BreakpointStyles>;
  collections?: WebflowCollection[];
  keyframes?: string; // Raw CSS for keyframes
  unsupportedCss?: string; // CSS for unsupported properties and selectors
}

/** Signals to the frontend which transformations the backend has already done. */
export interface SiteMeta {
  /** JSON format version. v1 = legacy (no pre-normalization). v2 = pre-normalized. */
  version: 1 | 2;
  /** True when all CSS properties have been normalized (kebab-case, no vendor prefixes, gap split, etc.) */
  normalized: boolean;
  /** True when complex (descendant) CSS selectors have been pre-inlined into node.inlineStyles */
  complexSelectorsResolved: boolean;
}

export interface WebflowSiteStructure {
  __meta?: SiteMeta;
  name: string;
  collections?: WebflowCollection[];
  pages: {
    name: string;
    slug: string;
    nodes: WebflowReadyNode[];
    sourceFile?: string;
    styles?: Record<string, BreakpointStyles>; // Section-specific styles
    keyframes?: string;
    unsupportedCss?: string;
  }[];
  // Optional: Global styles mapped from Tailwind or extracted from <style> tags
  globalStyles?: Record<string, BreakpointStyles>;
  keyframes?: string;
  unsupportedCss?: string;
}

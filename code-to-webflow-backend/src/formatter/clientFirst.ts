import { WebflowReadyNode } from "../types";
import { mapTailwindToStyles } from "./tailwindMapper";

// Helper to determine if a node is basically a wrapper block
function isLayoutBlock(node: WebflowReadyNode): boolean {
  return node.type === "Block" && (node.tag === "div" || node.tag === "section" || node.tag === "header" || node.tag === "footer");
}

/**
 * Enforces the Webflow Client-First methodology on a root node.
 * Rule 1: <section class="section_[name]"> > padding-global > container-large > padding-section-large > [name]_component
 */
export function applyClientFirstStructure(rootNode: WebflowReadyNode, componentName: string = "custom"): WebflowReadyNode {
  
  // If the root node is already a section, we'll map it, otherwise we'll wrap it.
  const isSection = rootNode.tag === "section" || rootNode.tag === "header" || rootNode.tag === "footer";
  
  // We want to preserve the inner content of the user's root node as the "component"
  // If the user provided a section with padding, we strip their padding classes 
  // and apply the rigorous Client-First structure.

  const innerComponentNode: WebflowReadyNode = {
    ...rootNode,
    type: "Block",
    tag: "div", // Inner component is typically a div
    classes: [`${componentName}_component`, ...rootNode.classes.filter(c => !c.includes("max-w") && !c.includes("mx-auto") && !c.includes("p-"))],
  };

  const paddingSectionNode: WebflowReadyNode = {
    type: "Block",
    tag: "div",
    classes: ["padding-section-large"],
    children: [innerComponentNode]
  };

  const containerNode: WebflowReadyNode = {
    type: "Block",
    tag: "div",
    classes: ["container-large"],
    children: [paddingSectionNode]
  };

  const paddingGlobalNode: WebflowReadyNode = {
    type: "Block",
    tag: "div",
    classes: ["padding-global"],
    children: [containerNode]
  };

  const sectionNode: WebflowReadyNode = {
    type: "Block",
    tag: "section",
    classes: [`section_${componentName}`],
    children: [paddingGlobalNode]
  };

  // Traverse the inner tree to apply Rule 2 Typography & Utility mappings
  traverseAndApplyUtilities(innerComponentNode, componentName);

  return sectionNode;
}

function traverseAndApplyUtilities(node: WebflowReadyNode, contextName: string) {
  // Map Typography
  if (node.type === "Heading") {
    // Determine heading level by tag
    const level = node.tag?.replace("h", "") || "2";
    node.classes.push(`heading-style-h${level}`);
  }

  // BEM Naming for semantic generic blocks
  if (node.type === "Image" && !node.classes.some(c => c.includes("_"))) {
    node.classes.push(`${contextName}_image`);
  }

  // Map Tailwind classes to CSS Styles for Webflow PropertyMap
  if (node.classes && node.classes.length > 0) {
    const mappedStyles = mapTailwindToStyles(node.classes);
    if (Object.keys(mappedStyles).length > 0) {
      node.styles = { ...node.styles, ...mappedStyles };
    }
  }

  if (node.children) {
    node.children.forEach(child => traverseAndApplyUtilities(child, contextName));
  }
}

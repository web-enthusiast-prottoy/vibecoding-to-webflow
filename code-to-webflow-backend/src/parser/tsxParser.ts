import { parse } from "@typescript-eslint/parser";
import { TSESTree } from "@typescript-eslint/typescript-estree";
import { ParseResult, WebflowReadyNode } from "../types";

// Helper to extract static values from JSX Attributes (like className)
function getJsxAttributeValue(attr: TSESTree.JSXAttribute): string | undefined {
	if (attr.value && attr.value.type === "Literal") {
		return String(attr.value.value);
	}
	return undefined;
}

// Convert a JSX Element into our standard WebflowReadyNode
function convertJsxElement(node: TSESTree.JSXElement): WebflowReadyNode {
	const openingElement = node.openingElement;
	let tagName = "div";

	if (openingElement.name.type === "JSXIdentifier") {
		tagName = openingElement.name.name;
	}

	let classes: string[] = [];
	let id: string | undefined;
	let attributes: Record<string, string> = {};

	openingElement.attributes.forEach((attr) => {
		if (
			attr.type === "JSXAttribute" &&
			attr.name.type === "JSXIdentifier"
		) {
			const { name } = attr.name;
			const value = getJsxAttributeValue(attr);
			if (value !== undefined) {
				if (name === "className" || name === "class") {
					classes = value.split(" ").filter(Boolean);
				} else if (name === "id") {
					id = value;
				} else {
					attributes[name] = value;
				}
			}
		}
	});

	// Determine Webflow Type based on Tag
	let type: WebflowReadyNode["type"] = "Block";
	if (["h1", "h2", "h3", "h4", "h5", "h6"].includes(tagName))
		type = "Heading";
	else if (tagName === "p") type = "Paragraph";
	else if (tagName === "a") type = "Link";
	else if (tagName === "img") type = "Image";
	else if (tagName === "ul" || tagName === "ol") type = "List";
	else if (tagName === "li") type = "ListItem";

	const children: WebflowReadyNode[] = [];
	let text = "";

	node.children.forEach((child) => {
		if (child.type === "JSXElement") {
			children.push(convertJsxElement(child));
		} else if (child.type === "JSXText") {
			const cleanText = child.value.trim();
			if (cleanText) {
				if (type === "Block" && tagName === "div") {
					children.push({
						type: "TextBlock",
						tag: "div",
						text: cleanText,
						classes: [],
						children: [],
					});
				} else {
					text += cleanText + " ";
				}
			}
		}
	});

	return {
		type,
		tag: type === "Block" || type === "Heading" ? tagName : undefined,
		classes,
		id,
		attributes: Object.keys(attributes).length > 0 ? attributes : undefined,
		text: text.trim() || undefined,
		children,
	};
}

// Main function to parse TSX source code and extract the default exported component's JSX
export function parseTsx(code: string): ParseResult {
	const ast = parse(code, {
		loc: true,
		range: true,
		jsx: true,
		ecmaFeatures: { jsx: true },
	});

	const nodes: WebflowReadyNode[] = [];

	// This is a simplified traversal searching for ReturnStatements containing JSXElements.
	// In a robust implementation, we would extract the default export and its render tree.
	const walk = (node: TSESTree.Node) => {
		if (
			node.type === "ReturnStatement" &&
			node.argument?.type === "JSXElement"
		) {
			nodes.push(convertJsxElement(node.argument));
		} else {
			for (const key in node) {
				if (Object.prototype.hasOwnProperty.call(node, key)) {
					const child = (node as any)[key];
					if (Array.isArray(child)) {
						child.forEach((c) => {
							if (c && typeof c.type === "string") walk(c);
						});
					} else if (child && typeof child.type === "string") {
						walk(child);
					}
				}
			}
		}
	};

	walk(ast as unknown as TSESTree.Node);

	return { nodes };
}

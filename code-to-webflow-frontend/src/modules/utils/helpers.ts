// ============================================================
// General Helpers
// ============================================================

import type { WebflowReadyNode } from "../../types.js";

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Wraps a promise with a timeout.
 * Useful for Webflow Designer API calls that might hang the IPC bridge.
 */
export async function withTimeout<T>(
	promise: Promise<T>,
	timeoutMs: number,
	label: string,
): Promise<T> {
	let timeoutId: any;
	const timeoutPromise = new Promise<never>((_, reject) => {
		timeoutId = setTimeout(() => {
			reject(
				new Error(`Operation timed out after ${timeoutMs}ms: ${label}`),
			);
		}, timeoutMs);
	});

	try {
		return await Promise.race([promise, timeoutPromise]);
	} finally {
		if (timeoutId) clearTimeout(timeoutId);
	}
}

export const DEFAULT_TIMEOUT = 6000; // Fail-fast: deadlocks don't resolve with more time

export function handleStyleError(err: any, property?: string) {
	const causeTag = err?.cause?.tag;
	const message = err?.message || "";

	console.error(`Cause: ${causeTag}`);
	console.error(`Message: ${message}`);

	switch (causeTag) {
		case "InvalidStyle":
			(webflow as any).notify({
				type: "Error",
				message: "The style is invalid or not recognized",
			});
			break;
		case "InvalidStyleProperty":
			console.warn(`Property ${property} is invalid or not applicable.`);
			break;
		case "ResourceMissing":
			(webflow as any).notify({
				type: "Error",
				message: "The style resource is missing.",
			});
			break;
		default:
			if (message.toLowerCase().includes("conflict")) {
				(webflow as any).notify({
					type: "Error",
					message: "Style conflict detected in the store. Try again.",
				});
			} else {
				(webflow as any).notify({
					type: "Error",
					message: "An error occurred with styles.",
				});
			}
	}
}

export function countAllNodes(nodes: WebflowReadyNode[]): number {
	let count = nodes.length;
	for (const n of nodes) {
		if (n.children) count += countAllNodes(n.children);
	}
	return count;
}

export function collectAllClasses(
	nodes: WebflowReadyNode[],
	classSet: Set<string> = new Set(),
): Set<string> {
	for (const node of nodes) {
		if (node.classes) node.classes.forEach((c) => classSet.add(c));
		if (node.children) collectAllClasses(node.children, classSet);
	}
	return classSet;
}

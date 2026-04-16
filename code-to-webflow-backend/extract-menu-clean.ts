import * as fs from "fs";
import * as path from "path";

const inputPath = "output/apple-aether-main.json";
const outputPath = "output/aether-nav.json";

function extract() {
  if (!fs.existsSync(inputPath)) {
    console.error("Input file not found");
    return;
  }

  const data = JSON.parse(fs.readFileSync(inputPath, "utf-8"));
  
  // Find the aether-nav node
  let navNode = null;
  for (const page of data.pages) {
    navNode = page.nodes.find((n: any) => 
      n.classes?.includes("aether-nav") || 
      n.tag === "nav" || 
      n.type === "Block" && n.tag === "nav"
    );
    if (navNode) break;
  }

  if (!navNode) {
    console.error("aether-nav node not found");
    return;
  }

  // Collect all classes used in the nav tree
  const usedClasses = new Set<string>();
  const usedTags = new Set<string>();

  function collect(node: any) {
    if (node.classes) {
      node.classes.forEach((c: string) => usedClasses.add(c));
    }
    if (node.tag) usedTags.add(node.tag.toLowerCase());
    if (node.children) {
      node.children.forEach(collect);
    }
  }
  collect(navNode);

  console.log("Used classes:", Array.from(usedClasses));

  // Filter globalStyles
  const filteredStyles: Record<string, any> = {};
  for (const [selector, bpStyles] of Object.entries(data.globalStyles)) {
    // 1. Mandatory globals
    if (selector === "*" || selector === ":root" || selector.startsWith("*,") || selector === "body") {
      filteredStyles[selector] = bpStyles;
      continue;
    }

    // 2. Class based match (most accurate)
    const hasUsedClass = Array.from(usedClasses).some(cls => selector.includes("." + cls));
    if (hasUsedClass) {
      filteredStyles[selector] = bpStyles;
      continue;
    }

    // 3. Special case for nav tag if no class
    if (selector === "nav" && usedTags.has("nav")) {
      filteredStyles[selector] = bpStyles;
      continue;
    }
    
    // 4. Body classes related to aether (like body.aether-loaded)
    if (selector.includes("body.aether-")) {
       filteredStyles[selector] = bpStyles;
       continue;
    }
  }

  // Filter collections to only include variables used in the filtered styles or nodes
  // For simplicity, we'll keep variables, but if the user wants even cleaner, we can filter them.
  // Actually, let's keep all variables for now as they are often shared.

  // Create a new structure
  const result = {
    name: "Aether Nav",
    pages: [
      {
        name: "Nav",
        slug: "nav",
        nodes: [navNode]
      }
    ],
    globalStyles: filteredStyles,
    collections: data.collections,
    __meta: data.__meta
  };

  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
  console.log("Successfully extracted SUPER CLEAN menu to " + outputPath);
}

extract();

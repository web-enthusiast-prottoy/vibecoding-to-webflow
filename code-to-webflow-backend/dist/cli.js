import { program } from "commander";
import * as fs from "fs";
import * as path from "path";
import fg from "fast-glob";
import { parseTsx } from "./parser/tsxParser";
import { parseHtml, parseStyleTag } from "./parser/htmlParser";
import { normalizeCssProperties, extractTailwindVarMap, resolveComplexSelectors, } from "./normalizer/cssNormalizer";
program
    .name("code-to-webflow")
    .description("CLI to parse TSX/HTML projects into Webflow Ready JSON")
    .argument("<directory>", "Path to the project directory")
    .option("-o, --output <file>", "Output JSON file", "webflow-site-structure.json")
    .action(async (directory, options) => {
    console.log(`Scanning directory: ${directory}...`);
    // Find all TSX/HTML files in the directory (ignoring node_modules)
    const files = await fg(["**/*.tsx", "**/*.html", "**/*.css"], {
        cwd: directory,
        ignore: ["**/node_modules/**", "**/.next/**"]
    });
    if (files.length === 0) {
        console.log("No TSX or HTML files found to process.");
        process.exit(0);
    }
    console.log(`Found ${files.length} files.`);
    const siteStructure = {
        name: path.basename(path.resolve(directory)),
        pages: [],
        globalStyles: {}
    };
    for (const file of files) {
        const fullPath = path.join(directory, file);
        const code = fs.readFileSync(fullPath, "utf-8");
        const isHtml = file.endsWith(".html");
        const extension = isHtml ? ".html" : ".tsx";
        const fileName = path.basename(file);
        console.log(`Parsing ${file}...`);
        try {
            if (file.endsWith(".css")) {
                const { styles, variables, keyframes, unsupportedCss } = parseStyleTag(code);
                if (keyframes) {
                    siteStructure.keyframes = (siteStructure.keyframes || "") + keyframes + "\n";
                }
                if (unsupportedCss) {
                    siteStructure.unsupportedCss = (siteStructure.unsupportedCss || "") + unsupportedCss + "\n";
                }
                if (styles) {
                    for (const [selector, breakpoints] of Object.entries(styles)) {
                        if (!siteStructure.globalStyles[selector]) {
                            siteStructure.globalStyles[selector] = {};
                        }
                        for (const [bp, props] of Object.entries(breakpoints)) {
                            if (!siteStructure.globalStyles[selector][bp]) {
                                siteStructure.globalStyles[selector][bp] = {};
                            }
                            Object.assign(siteStructure.globalStyles[selector][bp], props);
                        }
                    }
                }
                if (variables && variables.length > 0) {
                    siteStructure.collections = siteStructure.collections || [];
                    for (const v of variables) {
                        const groupName = v.group || "Base Collection";
                        let existingCol = siteStructure.collections.find(c => c.name === groupName);
                        if (!existingCol) {
                            existingCol = { name: groupName, modes: [], variables: [] };
                            siteStructure.collections.push(existingCol);
                        }
                        const existingVar = existingCol.variables.find(ev => ev.name === v.name);
                        if (existingVar) {
                            console.log(`    [CLI] Merging values for variable: ${v.name} in ${groupName}`);
                            Object.assign(existingVar.values, v.values);
                        }
                        else {
                            existingCol.variables.push(v);
                        }
                        // Sync modes in collection
                        for (const modeName of Object.keys(v.values)) {
                            if (!existingCol.modes.find(m => m.name === modeName)) {
                                existingCol.modes.push({ name: modeName });
                            }
                        }
                    }
                }
            }
            else {
                const result = isHtml ? parseHtml(code, path.dirname(fullPath)) : parseTsx(code);
                // Merge global styles if they exist
                if (result.globalStyles) {
                    for (const [selector, breakpoints] of Object.entries(result.globalStyles)) {
                        if (!siteStructure.globalStyles[selector]) {
                            siteStructure.globalStyles[selector] = {};
                        }
                        for (const [bp, props] of Object.entries(breakpoints)) {
                            if (!siteStructure.globalStyles[selector][bp]) {
                                siteStructure.globalStyles[selector][bp] = {};
                            }
                            Object.assign(siteStructure.globalStyles[selector][bp], props);
                        }
                    }
                }
                // Merge collections if they exist
                if (result.collections) {
                    siteStructure.collections = siteStructure.collections || [];
                    for (const col of result.collections) {
                        let existingCol = siteStructure.collections.find(c => c.name === col.name);
                        if (!existingCol) {
                            existingCol = { name: col.name, modes: [...col.modes], variables: [] };
                            siteStructure.collections.push(existingCol);
                        }
                        for (const v of col.variables) {
                            const existingVar = existingCol.variables.find(ev => ev.name === v.name);
                            if (existingVar) {
                                Object.assign(existingVar.values, v.values);
                            }
                            else {
                                existingCol.variables.push(v);
                            }
                        }
                        // Resync unique modes
                        for (const mode of col.modes) {
                            if (!existingCol.modes.find(m => m.name === mode.name)) {
                                existingCol.modes.push(mode);
                            }
                        }
                    }
                }
                // Also merge keyframes for the whole site
                if (result.keyframes) {
                    siteStructure.keyframes = (siteStructure.keyframes || "") + result.keyframes + "\n";
                }
                if (result.unsupportedCss) {
                    siteStructure.unsupportedCss = (siteStructure.unsupportedCss || "") + result.unsupportedCss + "\n";
                }
                // Add to site structure
                siteStructure.pages.push({
                    name: path.basename(file, extension),
                    slug: path.basename(file, extension).toLowerCase(),
                    nodes: result.nodes,
                    styles: result.globalStyles, // Store styles with the page
                    keyframes: result.keyframes,
                    unsupportedCss: result.unsupportedCss,
                    sourceFile: fileName
                });
            }
        }
        catch (e) {
            console.error(`Error parsing ${file}:`, e.message);
        }
    }
    // ----------------------------------------------------------------
    // POST-PROCESSING: Normalize all globalStyles + resolve complex selectors
    // ----------------------------------------------------------------
    // 1. Build a Tailwind variable map from universal selectors (e.g. *,:before,:after)
    //    so --tw-* chains can be fully resolved in the output JSON.
    const twVarMap = extractTailwindVarMap((siteStructure.globalStyles || {}));
    // 2. Normalize every breakpoint property map in globalStyles.
    //    CSS files parsed directly (not HTML <style> tags) may not have been
    //    through the normalizer yet if they had no inline style attribute.
    //    Running normalizeCssProperties here is idempotent — safe to call again.
    if (siteStructure.globalStyles) {
        for (const [selector, bpStyles] of Object.entries(siteStructure.globalStyles)) {
            for (const [bp, props] of Object.entries(bpStyles)) {
                if (props && typeof props === "object") {
                    siteStructure.globalStyles[selector][bp] =
                        normalizeCssProperties(props, twVarMap);
                }
            }
        }
    }
    // 3. Separate complex (descendant) selectors from simple ones.
    //    Simple: ".class", ".class:hover" — these stay in globalStyles.
    //    Complex: ".parent .child", ".parent tag" — these get inlined into nodes.
    const complexSelectors = {};
    if (siteStructure.globalStyles) {
        for (const selector of Object.keys(siteStructure.globalStyles)) {
            const baseSelector = selector.split(":")[0].trim();
            if (baseSelector.includes(" ")) {
                complexSelectors[selector] = siteStructure.globalStyles[selector];
            }
        }
    }
    // 4. Inline complex selector styles into matching nodes across all pages.
    if (Object.keys(complexSelectors).length > 0) {
        console.log(`Inlining ${Object.keys(complexSelectors).length} complex selectors into nodes...`);
        for (const page of siteStructure.pages) {
            resolveComplexSelectors(complexSelectors, page.nodes);
        }
    }
    // 5. Attach __meta so the frontend knows this is a pre-normalized v2 JSON.
    siteStructure.__meta = {
        version: 2,
        normalized: true,
        complexSelectorsResolved: Object.keys(complexSelectors).length > 0,
    };
    // Write the output
    const outputDir = path.resolve(process.cwd(), "output");
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    const baseName = path.basename(options.output, ".json");
    // Perform split into sections
    import("./parser/sectionSplitter").then(({ splitSiteStructure }) => {
        splitSiteStructure(siteStructure, outputDir, baseName);
        console.log(`\n✨ Success! Modular project saved to: ${path.join(outputDir, baseName)}/`);
        console.log(`Files created:\n- base.json (Variables & Global Styles)\n- navbar.json\n- hero.json (incl. <main>)\n- ...other sections`);
        console.log(`\nNext step: Upload these into the Webflow Designer Extension.`);
    });
});
program.parse(process.argv);

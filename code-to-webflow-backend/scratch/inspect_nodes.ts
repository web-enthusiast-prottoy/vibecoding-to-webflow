
import * as fs from "fs";
import * as path from "path";
const data = JSON.parse(fs.readFileSync("Moda.json", "utf-8"));
const mainPage = data.pages.find(p => p.name === "index") || data.pages[0];
console.log("Top level nodes:", mainPage.nodes.map(n => ({ tag: n.tag, classes: n.classes })));

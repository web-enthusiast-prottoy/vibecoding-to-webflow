
import { normalizeCssProperties } from "./src/normalizer/cssNormalizer";

const input = {
    padding: "calc(var(--padding-section-large) * 1.5) 0"
};

const result = normalizeCssProperties(input);

console.log("Input:", input);
console.log("Result:", JSON.stringify(result, null, 2));

const top = result["padding-top"];
const expected = "calc(var(--padding-section-large) * 1.5)";

if (top === expected) {
    console.log("✅ SUCCESS: padding-top matches expected value.");
} else {
    console.log("❌ FAILURE: padding-top truncated.");
    console.log("Found:", top);
    console.log("Expected:", expected);
    process.exit(1);
}

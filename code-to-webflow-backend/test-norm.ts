import { normalizeCssProperties } from "./src/normalizer/cssNormalizer";

const props = {
    "gap": "10px",
    "row-gap": "20px",
    "column-gap": "30px"
};

console.log("Input:", props);
console.log("Output:", normalizeCssProperties(props));

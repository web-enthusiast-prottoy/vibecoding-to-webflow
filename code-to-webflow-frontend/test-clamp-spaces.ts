function formatCSS(val) {
  if (typeof val !== "string") return val;
  return val.replace(/clamp\(\s*([^,]+?)\s*,\s*([^,]+?)\s*,\s*([^)]+?)\s*\)/g, "clamp($1, $2, $3)");
}
console.log(formatCSS("clamp(40px,5vw,72px)"));

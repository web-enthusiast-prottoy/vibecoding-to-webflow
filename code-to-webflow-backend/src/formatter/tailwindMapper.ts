// This is a simplified mapper for the MVP. 
// A production version would integrate with Tailwind's JIT compiler.

export function mapTailwindToStyles(classes: string[]): Record<string, string> {
  const styles: Record<string, string> = {};

  classes.forEach(cls => {
    // Utility mapping logic (simplified for demonstration)
    
    // Spacing
    if (cls.startsWith("p-")) styles["padding"] = parseSpacing(cls, "p-");
    else if (cls.startsWith("px-")) { styles["padding-left"] = parseSpacing(cls, "px-"); styles["padding-right"] = styles["padding-left"]; }
    else if (cls.startsWith("py-")) { styles["padding-top"] = parseSpacing(cls, "py-"); styles["padding-bottom"] = styles["padding-top"]; }
    else if (cls.startsWith("m-")) styles["margin"] = parseSpacing(cls, "m-");
    else if (cls.startsWith("mt-")) styles["margin-top"] = parseSpacing(cls, "mt-");
    
    // Layout
    else if (cls === "flex") styles["display"] = "flex";
    else if (cls === "grid") styles["display"] = "grid";
    else if (cls === "hidden") styles["display"] = "none";
    else if (cls === "flex-col") styles["flex-direction"] = "column";
    else if (cls === "items-center") styles["align-items"] = "center";
    else if (cls === "justify-center") styles["justify-content"] = "center";
    else if (cls === "justify-between") styles["justify-content"] = "space-between";
    else if (cls.startsWith("gap-")) styles["gap"] = parseSpacing(cls, "gap-");
    
    // Typography
    else if (cls.startsWith("text-")) {
      const sizeStr = cls.replace("text-", "");
      if (["xs", "sm", "base", "lg", "xl", "2xl"].includes(sizeStr)) {
         styles["font-size"] = parseTextSize(sizeStr);
      } else {
         // color
         styles["color"] = parseColor(sizeStr);
      }
    }
    else if (cls === "font-bold") styles["font-weight"] = "bold";
    else if (cls === "text-center") styles["text-align"] = "center";

    // Colors
    else if (cls.startsWith("bg-")) styles["background-color"] = parseColor(cls.replace("bg-", ""));
  });

  return styles;
}

function parseSpacing(cls: string, prefix: string): string {
  const val = cls.replace(prefix, "");
  // Tailwind default: 1 unit = 0.25rem
  const num = parseFloat(val);
  if (!isNaN(num)) return `${num * 0.25}rem`;
  return val; // e.g., 'auto'
}

function parseTextSize(size: string): string {
  const sizes: Record<string, string> = {
    xs: "0.75rem", sm: "0.875rem", base: "1rem", lg: "1.125rem", xl: "1.25rem", "2xl": "1.5rem"
  };
  return sizes[size] || "1rem";
}

function parseColor(colorToken: string): string {
  // Simplified mocking. A full implementation would read from tailwind config.
  if (colorToken.includes("red-500")) return "#ef4444";
  if (colorToken.includes("blue-500")) return "#3b82f6";
  if (colorToken === "white") return "#ffffff";
  if (colorToken === "black") return "#000000";
  return colorToken; // Fallback
}

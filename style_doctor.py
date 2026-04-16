import json
import os
import sys

class StyleDoctor:
    def __init__(self, file_path):
        self.file_path = file_path
        self.data = None
        self.issues = []
        self.fixed_count = 0

    def load(self):
        with open(self.file_path, 'r') as f:
            self.data = json.load(f)

    def save(self, output_path):
        with open(output_path, 'w') as f:
            json.dump(self.data, f, indent=2)

    def audit_and_fix(self, fix=False):
        if not self.data:
            self.load()

        styles = self.data.get('globalStyles', {})
        new_styles = {}

        # Mappings for logical properties to physical ones
        logical_map = {
            'padding-inline': ['padding-left', 'padding-right'],
            'padding-block': ['padding-top', 'padding-bottom'],
            'margin-inline': ['margin-left', 'margin-right'],
            'margin-block': ['margin-top', 'margin-bottom'],
            'padding-inline-start': ['padding-left'],
            'padding-inline-end': ['padding-right'],
            'margin-inline-start': ['margin-left'],
            'margin-inline-end': ['margin-right'],
        }

        # Shorthand expansions to satisfy Webflow Variable bindings
        shorthand_map = {
            'gap': ['row-gap', 'column-gap'],
            'inset': ['top', 'right', 'bottom', 'left'],
        }

        for selector, breakpoints in styles.items():
            new_breakpoints = {}
            for bp_name, props in breakpoints.items():
                new_props = {}
                prop_list = list(props.items())
                
                i = 0
                while i < len(prop_list):
                    prop, val = prop_list[i]
                    i += 1
                    
                    if not isinstance(val, str):
                        new_props[prop] = val
                        continue

                    # 1. Detect Broken Padding Shorthand Expansion (Bug Fix)
                    if "calc(var(--spacing)" in val and val.count("(") > val.count(")"):
                        # Look ahead for fragmented parts
                        if i + 1 < len(prop_list) and prop_list[i][1] == "*" and ")" in str(prop_list[i+1][1]):
                            factor = str(prop_list[i+1][1]).replace(")", "")
                            fixed_val = f"calc(var(--spacing) * {factor})"
                            self.issues.append(f"Fixed broken calc expansion in {selector}.{prop}")
                            # Determine which property this should actually be
                            # Based on the user's base.json, it was padding-top, etc.
                            new_props[prop] = fixed_val
                            self.fixed_count += 1
                            i += 2 # Skip the "*" and "2.5)" fragments
                            continue

                    # 2. Filter out garbage property fragments
                    if val == "*" or (val.strip().endswith(")") and not "(" in val and "calc" not in val):
                        self.issues.append(f"Stripped garbage fragment in {selector}: {prop}={val}")
                        self.fixed_count += 1
                        continue

                    # 3. Expand Logical Properties (Webflow Variable compatibility)
                    if prop in logical_map:
                        self.issues.append(f"Expanding logical property {selector}.{prop}")
                        for physical in logical_map[prop]:
                            new_props[physical] = val
                        self.fixed_count += 1
                        continue

                    # 4. Expand Shorthands (Webflow Variable compatibility)
                    if prop in shorthand_map and ("var(" in val or "calc(" in val or "clamp(" in val):
                        self.issues.append(f"Expanding shorthand {selector}.{prop} for variable support")
                        for physical in shorthand_map[prop]:
                            new_props[physical] = val
                        self.fixed_count += 1
                        continue

                    # 5. Strip color-mix (Publish Validator blocker)
                    if "color-mix" in val:
                        self.issues.append(f"Stripped color-mix in {selector}.{prop}: {val}")
                        self.fixed_count += 1
                        continue

                    # 6. Garbage expansion strings (Repeated Zeros)
                    if "rgba(0, 0, 0, 0)" in val and val.count("0 0") > 3:
                        self.issues.append(f"Stripped zero-garbage in {selector}.{prop}")
                        self.fixed_count += 1
                        continue

                    # 7. Transition-property Cleanup
                    if prop == 'transition-property' and '--' in val:
                        parts = [p.strip() for p in val.split(",")]
                        fixed_parts = [p for p in parts if not p.startswith("--")]
                        val = ", ".join(fixed_parts)
                        self.issues.append(f"Cleaned transition variables in {selector}")
                        self.fixed_count += 1

                    new_props[prop] = val
                
                new_breakpoints[bp_name] = new_props
            new_styles[selector] = new_breakpoints

        if fix:
            self.data['globalStyles'] = new_styles
        
        return self.issues

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 style_doctor.py <target.json> [--fix]")
        sys.exit(1)
        
    target = sys.argv[1]
    fix_mode = "--fix" in sys.argv
    
    if not os.path.exists(target):
        print(f"Error: File {target} not found.")
        sys.exit(1)
        
    doctor = StyleDoctor(target)
    issues = doctor.audit_and_fix(fix=fix_mode)
    
    print(f"Audit Complete for {os.path.basename(target)}. Found {len(issues)} issues.")
    if fix_mode:
        print(f"Fixed {doctor.fixed_count} properties.")
        output_path = target.replace(".json", ".fixed.json")
        doctor.save(output_path)
        print(f"Saved to {output_path}")
    else:
        for issue in issues[:10]:
            print(f" - {issue}")
        if len(issues) > 10:
            print(f" ... and {len(issues)-10} more.")

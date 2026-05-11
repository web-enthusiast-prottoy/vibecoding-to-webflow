import re
import json

def get_variable_info(name, value):
    v_type = 'string'
    v_category = 'other'
    
    if name.startswith('color-'):
        v_category = 'Colors'
        v_type = 'color'
    elif name.startswith('font-'):
        v_category = 'Typography'
        v_type = 'font'
    elif name.startswith('weight-') or name.startswith('lh-'):
        v_category = 'Typography'
        v_type = 'number'
    elif name.startswith('size-') or name.startswith('ls-') or name.startswith('spacing-') or name.startswith('container-') or name.startswith('radius-'):
        v_category = 'Typography' if name.startswith('size-') or name.startswith('ls-') else 'Layout'
        v_type = 'size'
    elif name.startswith('tt-'):
        v_category = 'Typography'
        v_type = 'string'
    elif name.startswith('transition-'):
        v_category = 'Transitions'
        v_type = 'string'

    # Special case for 'normal' values
    if value == 'normal' or value == 'none':
        v_type = 'string'

    # Value-based refinement
    if value.startswith('#') or value.startswith('rgba') or value.startswith('rgb'):
        v_type = 'color'
    elif any(unit in value for unit in ['rem', 'px', 'em', 'vw', 'vh', '%']) and v_type != 'color':
        v_type = 'size'

    return v_type, v_category

def parse_css_variables(file_path):
    with open(file_path, 'r') as f:
        content = f.read()
    
    root_match = re.search(r':root\s*\{(.*?)\}', content, re.DOTALL)
    if not root_match:
        return []
    
    root_content = root_match.group(1)
    
    variables = []
    matches = re.findall(r'--([\w-]+):\s*(.*?);', root_content)
    for name, value in matches:
        val = value.strip()
        v_type, v_category = get_variable_info(name, val)
        variables.append({
            "name": name,
            "value": val,
            "type": v_type,
            "category": v_category
        })
    
    return variables

css_path = '/Users/mirror_code/Desktop/Anti Projects/Vibecoding sites/Slick/variables.css'
output_path = '/Users/mirror_code/Desktop/Anti Projects/Vibecoding sites/Slick/base.json'

variables = parse_css_variables(css_path)

output = {
    "version": "1.2",
    "variables": variables
}

with open(output_path, 'w') as f:
    json.dump(output, f, indent=2)

print(f"Successfully exported {len(variables)} precise variables to {output_path}")

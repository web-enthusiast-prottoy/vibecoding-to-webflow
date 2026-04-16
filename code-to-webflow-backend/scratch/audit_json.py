import json

with open('/Users/mirror_code/Desktop/Anti Projects/Code to Webflow/code-to-webflow-backend/output/Moda/base.json', 'r') as f:
    data = json.load(f)

for col in data.get('collections', []):
    print(f"Collection: {col['name']}")
    modes = [m['name'] for m in col.get('modes', [])]
    print(f"  Modes: {modes}")
    for v in col.get('variables', []):
        v_modes = list(v.get('values', {}).keys())
        if len(v_modes) > 1 or (len(v_modes) == 1 and v_modes[0] != "Base Mode"):
            print(f"    Variable {v['name']} has modes: {v_modes}")

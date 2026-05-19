import sys

file_path = "/Users/mirror_code/Desktop/Anti Projects/Vibecoding sites/Your Ceremony/planning.html"

with open(file_path, 'r') as f:
    lines = f.readlines()

# Fixing lines 511-515 (0-indexed 510-514)
# Current lines:
# 511: 							<!-							<div class="journey_stage-content" data-stage-content="2">
# 512: 								<!-- Slider removed for Webflow copy-paste -->
# 513: 							</div>							</div>
# 514: 								</div>
# 515: 							</div>

new_lines = []
for i, line in enumerate(lines):
    if i == 510: # line 511
        new_lines.append("\t\t\t\t\t\t\t<!-- Stage 2 Slider -->\n")
    elif i == 511: # line 512
        new_lines.append("\t\t\t\t\t\t\t<div class=\"journey_stage-content\" data-stage-content=\"2\">\n")
    elif i == 512: # line 513
        new_lines.append("\t\t\t\t\t\t\t\t<!-- Slider removed for Webflow copy-paste -->\n")
    elif i == 513: # line 514
        new_lines.append("\t\t\t\t\t\t\t</div>\n")
    elif i == 514: # line 515
        continue # Skip the extra </div>
    else:
        new_lines.append(line)

with open(file_path, 'w') as f:
    f.writelines(new_lines)

print("Fixed HTML structure in planning.html")

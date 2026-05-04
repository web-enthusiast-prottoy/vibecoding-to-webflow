# Running the Backend Parser

This guide explains how to correctly run the backend parser to generate Webflow-ready JSON files from HTML/CSS source code.

## 1. Environment Configuration (Crucial)

On some systems, the default shell environment may not have `npm` or `node` in its standard path. If you see `command not found: npm` or `exit code: 127`, you must fix the path first.

**Fix command:**
```bash
export PATH=$PATH:/usr/local/bin:/opt/homebrew/bin
```

## 2. Basic Usage

The parser processes an entire directory and finds all `.html`, `.css`, and `.tsx` files.

```bash
# Run on a project directory
npm start -- path/to/your/project-folder

# Specify a custom output name (creates folder in output/)
npm start -- path/to/folder --output my-project.json
```

## 3. Processing a Specific Page (Best Practice)

To avoid noise from other pages in the same directory, use a temporary folder for the specific page you are working on.

### Recommended Workflow:
```bash
# 1. Create temp directory
mkdir -p temp_page

# 2. Copy target HTML and relevant CSS
cp "source/page.html" temp_page/
cp "source/style.css" temp_page/

# 3. Run Parser
export PATH=$PATH:/usr/local/bin:/opt/homebrew/bin 
npm start -- temp_page --output page-output.json

# 4. Organize Results
mkdir -p outputs/MyProject/MyPage
mv output/page-output/* outputs/MyProject/MyPage/

# 5. Cleanup
rm -rf temp_page output/page-output
```

## 4. Understanding the Output

The parser generates a modular structure:
- **`base.json`**: Global variables and shared styles. Import this **first** in Webflow.
- **`nav.json` / `footer.json`**: Extracted navigation and footer components.
- **`section-*.json`**: Individual sections extracted from the page.
- **`styles-embed.json`**: Custom CSS, keyframes, and unsupported properties (to be put in a Webflow Embed element).
- **`scripts-embed.json`**: Any extracted `<script>` tags.

## 5. Troubleshooting

| Error | Cause | Solution |
|-------|-------|----------|
| `exit 127` | `npm` not in path | Run `export PATH=$PATH:/usr/local/bin` |
| No files found | No `.html` or `.css` | Ensure files are in the target directory |
| Parsing Error | Invalid HTML/CSS syntax | Check source code for bracket mismatches |

#!/usr/bin/env python3
import os
import subprocess
from pathlib import Path

# Paths to compress
TARGET_DIRS = [
    ".agent/agents",
    ".agent/skills",
    ".agent/rules",
    ".agent/workflows"
]

def run_compression():
    print("🚀 Starting Caveman Project Compression...")
    
    # Check if compress script exists
    compress_script = Path(".agent/skills/compress/scripts/compress.py")
    if not compress_script.exists():
        print(f"❌ Error: {compress_script} not found.")
        return

    for target_dir in TARGET_DIRS:
        dir_path = Path(target_dir)
        if not dir_path.exists():
            continue
            
        print(f"\n📂 Processing {target_dir}...")
        for md_file in dir_path.glob("*.md"):
            if md_file.name.endswith(".original.md"):
                continue
            
            print(f"📄 Compressing {md_file.name}...")
            # Use the existing compress.py which calls Claude
            # Note: This requires ANTHROPIC_API_KEY or 'claude' CLI
            try:
                # Run as module from the skill root to handle relative imports
                env = os.environ.copy()
                subprocess.run(
                    ["python3", "-m", "scripts.compress", str(md_file.resolve())],
                    check=False,
                    cwd=str(Path(".agent/skills/compress").resolve()),
                    env=env
                )
            except Exception as e:
                print(f"⚠️ Failed to compress {md_file.name}: {e}")

    print("\n✅ Caveman Setup Complete. Instructions compressed for token efficiency.")

if __name__ == "__main__":
    run_compression()

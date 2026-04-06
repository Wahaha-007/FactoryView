import os


# =========================
# Configuration
# =========================
ROOT_DIR = os.getcwd()
OUTPUT_FILE = "FactoryView-PACKED.md"   # ← .md preserves code fences on upload


CODE_EXTENSIONS = {'.py', '.css', '.html', '.ts', '.tsx', '.js', '.mjs', '.md', '.yaml'}
EXCLUDE_DIRS = {'.git', '__pycache__', '.vscode', '.idea', 'node_modules', 'venv311', '.next'}


# Extension → markdown language tag for syntax highlighting
LANG_MAP = {
    '.py':   'python',
    '.css':  'css',
    '.html': 'html',
    '.ts':   'typescript',
    '.tsx':  'tsx',
    '.js':   'javascript',
    '.mjs':  'javascript',
    '.md':   'markdown',
}


# =========================
# Write Project Structure
# =========================
def write_structure(outfile):
    outfile.write("# Project Structure\n\n")
    outfile.write("```\n")

    for root, dirs, files in os.walk(ROOT_DIR):
        dirs[:] = sorted([d for d in dirs if d not in EXCLUDE_DIRS])

        level = root.replace(ROOT_DIR, "").count(os.sep)
        indent = "    " * level

        if root != ROOT_DIR:
            outfile.write(f"{indent}[{os.path.basename(root)}/]\n")

        sub_indent = "    " * (level + 1)
        for f in sorted(files):
            if f == OUTPUT_FILE:
                continue
            outfile.write(f"{sub_indent}{f}\n")

    outfile.write("```\n\n")
    outfile.write("---\n\n")


# =========================
# Write File Contents
# =========================
def write_files(outfile):
    outfile.write("# File Contents\n\n")

    for root, dirs, files in os.walk(ROOT_DIR):
        dirs[:] = sorted([d for d in dirs if d not in EXCLUDE_DIRS])

        for file in sorted(files):
            ext = os.path.splitext(file)[1].lower()

            if ext in CODE_EXTENSIONS and file != OUTPUT_FILE:
                path = os.path.join(root, file)
                rel  = os.path.relpath(path, ROOT_DIR).replace(os.sep, "/")
                lang = LANG_MAP.get(ext, "")

                try:
                    with open(path, "r", encoding="utf-8") as f:
                        content = f.read()

                    # ── Markdown code fence preserves underscores on upload ──
                    outfile.write(f"## {rel}\n\n")
                    outfile.write(f"```{lang}\n")
                    outfile.write(content)
                    if not content.endswith("\n"):
                        outfile.write("\n")
                    outfile.write("```\n\n")

                    print(f"Packed: {rel}")

                except Exception as e:
                    print(f"Failed to read {rel}: {e}")


# =========================
# Main
# =========================
def main():
    print(f"Scanning project: {ROOT_DIR}")

    with open(OUTPUT_FILE, "w", encoding="utf-8") as outfile:
        write_structure(outfile)
        write_files(outfile)

    print(f"\nAll done! Output: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
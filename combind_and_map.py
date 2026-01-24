import os

# Configuration
ROOT_DIR = os.getcwd()
COMBINED_FILE = 'combined_project.txt'
STRUCTURE_FILE = 'project_structure.txt'
CODE_EXTENSIONS = {'.js', '.css', '.html'}
EXCLUDE_DIRS = {'.git', '__pycache__', '.vscode', '.idea', 'node_modules'}

def generate_structure(outfile):
    """Generates a tree-like structure of the directory."""
    outfile.write(f"Directory Structure for: {os.path.basename(ROOT_DIR)}/\n")
    outfile.write("=" * 50 + "\n")

    for root, dirs, files in os.walk(ROOT_DIR):
        # Modify dirs in-place to skip excluded directories
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
        
        # Calculate level depth for indentation
        level = root.replace(ROOT_DIR, '').count(os.sep)
        indent = ' ' * 4 * (level)
        
        # Write directory name (except root)
        if root != ROOT_DIR:
            outfile.write(f"{indent}[{os.path.basename(root)}/]\n")
        
        # Write files
        sub_indent = ' ' * 4 * (level + 1)
        for f in sorted(files):
            # Skip output files to avoid clutter
            if f in [COMBINED_FILE, STRUCTURE_FILE, os.path.basename(__file__)]:
                continue
            outfile.write(f"{sub_indent}{f}\n")

def combine_files(outfile):
    """Combines content of specific code files."""
    for root, dirs, files in os.walk(ROOT_DIR):
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
        
        for file in sorted(files):
            ext = os.path.splitext(file)[1].lower()
            if ext in CODE_EXTENSIONS:
                file_path = os.path.join(root, file)
                
                # Skip output files
                if file in [COMBINED_FILE, STRUCTURE_FILE]:
                    continue
                    
                relative_path = os.path.relpath(file_path, ROOT_DIR).replace(os.sep, '/')

                try:
                    with open(file_path, 'r', encoding='utf-8') as infile:
                        content = infile.read()
                        
                        outfile.write("=" * 60 + "\n")
                        outfile.write(f"/* === FILE: {relative_path} === */\n")
                        outfile.write("=" * 60 + "\n\n")
                        outfile.write(content)
                        outfile.write("\n\n")
                        print(f"Packed: {relative_path}")
                except Exception as e:
                    print(f"Error reading {relative_path}: {e}")

def main():
    print(f"Scanning: {ROOT_DIR} ...")
    
    # 1. Generate Structure
    with open(STRUCTURE_FILE, 'w', encoding='utf-8') as f:
        generate_structure(f)
    print(f"Structure saved to: {STRUCTURE_FILE}")

    # 2. Combine Code
    with open(COMBINED_FILE, 'w', encoding='utf-8') as f:
        combine_files(f)
    print(f"Code combined to: {COMBINED_FILE}")
    
    print("\nDone! You can now upload these two files.")

if __name__ == "__main__":
    main()

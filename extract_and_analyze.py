import zipfile
import os
import json

# Define paths
zip_path = r'c:\Users\400041460038\Desktop\code main\airank0307-main (1)\phosphor-icons.zip'
extract_to = r'c:\Users\400041460038\Desktop\code main\airank0307-main (1)\phosphor-icons-extracted'
report_file = r'c:\Users\400041460038\Desktop\code main\airank0307-main (1)\phosphor-icons-report.txt'

# Create extraction directory
os.makedirs(extract_to, exist_ok=True)

# Extract zip file
print("Extracting zip file...")
with zipfile.ZipFile(zip_path, 'r') as zip_ref:
    zip_ref.extractall(extract_to)
    file_list = zip_ref.namelist()

print(f"Extracted {len(file_list)} files")

# Analyze the structure
structure = {}
icon_files = []
doc_files = []
categories = set()

for root, dirs, files in os.walk(extract_to):
    for file in files:
        full_path = os.path.join(root, file)
        rel_path = os.path.relpath(full_path, extract_to)

        # Get file extension
        ext = os.path.splitext(file)[1].lower()

        # Categorize files
        if ext in ['.svg', '.png', '.jpg', '.jpeg', '.ico']:
            icon_files.append(rel_path)
            # Try to determine category from path
            parts = rel_path.split(os.sep)
            if len(parts) > 1:
                categories.add(parts[0])
        elif ext in ['.md', '.txt', '.rst', '.doc']:
            doc_files.append(rel_path)

# Create report
with open(report_file, 'w', encoding='utf-8') as f:
    f.write("=" * 80 + "\n")
    f.write("PHOSPHOR ICONS ANALYSIS REPORT\n")
    f.write("=" * 80 + "\n\n")

    f.write(f"Total files extracted: {len(file_list)}\n")
    f.write(f"Total icon files found: {len(icon_files)}\n")
    f.write(f"Total documentation files: {len(doc_files)}\n\n")

    f.write("=" * 80 + "\n")
    f.write("DIRECTORY STRUCTURE\n")
    f.write("=" * 80 + "\n")

    # Build directory tree
    for root, dirs, files in os.walk(extract_to):
        level = root.replace(extract_to, '').count(os.sep)
        indent = ' ' * 2 * level
        rel_dir = os.path.relpath(root, extract_to)
        if rel_dir != '.':
            f.write(f'{indent}{os.path.basename(root)}/\n')
        for file in files[:10]:  # Limit to first 10 files per dir
            f.write(f'{indent}  {file}\n')
        if len(files) > 10:
            f.write(f'{indent}  ... and {len(files) - 10} more files\n')

    f.write("\n" + "=" * 80 + "\n")
    f.write("CATEGORIES DETECTED\n")
    f.write("=" * 80 + "\n")
    for cat in sorted(categories):
        f.write(f"- {cat}\n")

    f.write("\n" + "=" * 80 + "\n")
    f.write("DOCUMENTATION FILES\n")
    f.write("=" * 80 + "\n")
    for doc in doc_files:
        f.write(f"- {doc}\n")

    f.write("\n" + "=" * 80 + "\n")
    f.write("ICON FILES (First 200)\n")
    f.write("=" * 80 + "\n")
    for icon in sorted(icon_files)[:200]:
        f.write(f"- {icon}\n")

    if len(icon_files) > 200:
        f.write(f"\n... and {len(icon_files) - 200} more icon files\n")

print(f"\nReport saved to: {report_file}")
print("\nFirst 50 icon files:")
for icon in sorted(icon_files)[:50]:
    print(f"  - {icon}")

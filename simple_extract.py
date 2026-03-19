#!/usr/bin/env python3
"""
Simple script to extract and analyze phosphor-icons.zip
Run this directly with: python simple_extract.py
"""

import zipfile
import os
import sys

def main():
    # Define paths
    base_dir = r'c:\Users\400041460038\Desktop\code main\airank0307-main (1)'
    zip_path = os.path.join(base_dir, 'phosphor-icons.zip')
    extract_to = os.path.join(base_dir, 'phosphor-icons-extracted')

    print(f"Checking if zip file exists: {zip_path}")
    if not os.path.exists(zip_path):
        print("ERROR: Zip file not found!")
        return

    print(f"Zip file found. Size: {os.path.getsize(zip_path)} bytes")

    # Create extraction directory
    os.makedirs(extract_to, exist_ok=True)
    print(f"Extraction directory: {extract_to}")

    # First, list what's in the zip
    print("\n" + "="*80)
    print("ANALYZING ZIP CONTENTS")
    print("="*80)

    try:
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            file_list = zip_ref.namelist()
            print(f"\nTotal files in zip: {len(file_list)}")

            # Analyze file types
            svg_files = [f for f in file_list if f.lower().endswith('.svg')]
            png_files = [f for f in file_list if f.lower().endswith('.png')]
            doc_files = [f for f in file_list if any(f.lower().endswith(ext) for ext in ['.md', '.txt', '.json', '.html'])]

            print(f"SVG files: {len(svg_files)}")
            print(f"PNG files: {len(png_files)}")
            print(f"Documentation files: {len(doc_files)}")

            # Show directory structure
            print("\n" + "="*80)
            print("DIRECTORY STRUCTURE (Top-level)")
            print("="*80)

            top_dirs = set()
            for name in file_list:
                parts = name.split('/')
                if len(parts) > 1:
                    top_dirs.add(parts[0])

            for dir_name in sorted(top_dirs):
                dir_files = [f for f in file_list if f.startswith(dir_name + '/')]
                print(f"\n{dir_name}/ ({len(dir_files)} files)")

                # Show first 20 files in this directory
                sample_files = [f for f in dir_files[:20]]
                for f in sample_files:
                    print(f"  {f}")
                if len(dir_files) > 20:
                    print(f"  ... and {len(dir_files) - 20} more files")

            # Show documentation files
            if doc_files:
                print("\n" + "="*80)
                print("DOCUMENTATION FILES")
                print("="*80)
                for doc in doc_files:
                    print(f"  {doc}")

            # Extract icon names from SVG files
            print("\n" + "="*80)
            print("ICON NAMES (First 100 SVG files)")
            print("="*80)

            icon_names = []
            for svg_file in svg_files[:100]:
                # Extract just the filename without extension
                basename = os.path.basename(svg_file)
                name = os.path.splitext(basename)[0]
                icon_names.append(name)
                print(f"  {name}")

            if len(svg_files) > 100:
                print(f"\n... and {len(svg_files) - 100} more SVG files")

            # Now extract the files
            print("\n" + "="*80)
            print("EXTRACTING FILES")
            print("="*80)
            print("Extracting...")
            zip_ref.extractall(extract_to)
            print(f"✓ Extraction complete! Files extracted to: {extract_to}")

            # Create a summary report
            report_path = os.path.join(base_dir, 'phosphor-icons-analysis.txt')
            with open(report_path, 'w', encoding='utf-8') as f:
                f.write("="*80 + "\n")
                f.write("PHOSPHOR ICONS ANALYSIS REPORT\n")
                f.write("="*80 + "\n\n")
                f.write(f"Total files: {len(file_list)}\n")
                f.write(f"SVG files: {len(svg_files)}\n")
                f.write(f"PNG files: {len(png_files)}\n")
                f.write(f"Documentation files: {len(doc_files)}\n\n")

                f.write("="*80 + "\n")
                f.write("DIRECTORY STRUCTURE\n")
                f.write("="*80 + "\n")
                for dir_name in sorted(top_dirs):
                    dir_files = [f for f in file_list if f.startswith(dir_name + '/')]
                    f.write(f"\n{dir_name}/ ({len(dir_files)} files)\n")

                f.write("\n" + "="*80 + "\n")
                f.write("ALL ICON NAMES\n")
                f.write("="*80 + "\n")
                for svg_file in sorted(svg_files):
                    basename = os.path.basename(svg_file)
                    name = os.path.splitext(basename)[0]
                    f.write(f"{name}\n")

            print(f"\n✓ Analysis report saved to: {report_path}")

    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()

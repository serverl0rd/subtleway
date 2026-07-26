#!/usr/bin/env python3
"""Build the Chrome Web Store upload ZIP.

Includes only what the extension needs to run — manifest, source, icons, and
the license. Dev tooling, docs, and store assets are left out.
"""
import os
import zipfile

ROOT = os.path.join(os.path.dirname(__file__), "..")
OUT = os.path.join(ROOT, "subtleway.zip")

# Files/dirs to include (relative to repo root).
INCLUDE_FILES = ["manifest.json", "LICENSE"]
INCLUDE_DIRS = ["src", "assets/icons", "assets/logo"]
# Only ship the icon sizes the manifest references.
ICON_KEEP = {"icon-16.png", "icon-32.png", "icon-48.png", "icon-128.png"}


def should_add(path):
    base = os.path.basename(path)
    p = path.replace(os.sep, "/")
    if p.startswith("assets/icons/"):
        return base in ICON_KEEP
    if p.startswith("assets/logo/"):
        # Ship only the runtime wordmark, not the large design source.
        return p == "assets/logo/wordmark.png"
    return True


def main():
    if os.path.exists(OUT):
        os.remove(OUT)
    added = []
    with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED) as z:
        for f in INCLUDE_FILES:
            p = os.path.join(ROOT, f)
            if os.path.exists(p):
                z.write(p, f)
                added.append(f)
        for d in INCLUDE_DIRS:
            for dirpath, _dirs, files in os.walk(os.path.join(ROOT, d)):
                for name in files:
                    full = os.path.join(dirpath, name)
                    rel = os.path.relpath(full, ROOT)
                    if should_add(rel):
                        z.write(full, rel)
                        added.append(rel)
    print("Wrote", os.path.relpath(OUT), "with", len(added), "files:")
    for a in sorted(added):
        print("  ", a)


if __name__ == "__main__":
    main()

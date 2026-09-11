#!/usr/bin/env python3
import base64
import gzip
from pathlib import Path


def decode_chunks(paths, target):
    payload = "".join(Path(p).read_text(encoding="utf-8").strip() for p in paths)
    data = gzip.decompress(base64.b64decode(payload))
    dst = Path(target)
    dst.parent.mkdir(parents=True, exist_ok=True)
    dst.write_bytes(data)
    print(f"wrote {target} ({len(data)} bytes)")


decode_chunks(
    [f".contract-migration/ct{i:02d}.txt" for i in range(1, 6)],
    "data/contract-text.txt",
)

decode_chunks(
    [".contract-migration/numeric.txt"],
    "data/contract-numeric-reference.json",
)

decode_chunks(
    [".contract-migration/code01.txt", ".contract-migration/code02.txt"],
    "backend/google-apps-script/Code.gs",
)

text = Path("data/contract-text.txt").read_text(encoding="utf-8")
assert "=== PDF PAGE 44 ===" in text
assert "=== PDF PAGE 45 ===" not in text
assert "SIGNATORY PAGE" in text

code = Path("backend/google-apps-script/Code.gs").read_text(encoding="utf-8")
assert "PDF_PAGE_MAX = 44" in code
assert "backend (v9)" in code

print("signed-contract migration validation passed")

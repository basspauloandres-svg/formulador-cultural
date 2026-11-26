"""Offline operator intake. Does not download or publish documents.

Input records must explicitly assert public visibility and curator approval.
A successful match confirms normalized literal text on a PDF page, not the
legal validity of the asserted rights or factual support of a claim.
"""
from datetime import date
from hashlib import sha256
from io import BytesIO
from pathlib import Path
import argparse
import json
from pypdf import PdfReader
from knowledge_index import eligible, digest, KnowledgeIndex, MAX_PASSAGES

MAX_DOC_BYTES=25_000_000
MAX_PLAN_BYTES=5_000_000

def compact(text):
    return " ".join(text.split())

def prepare_entry(row, root):
    if not isinstance(row,dict) or row.get("status")!="CURATOR_APPROVED" or row.get("visibility")!="PUBLIC":
        raise ValueError("Operator approval and public scope are required")
    page=row.get("page")
    if type(page) is not int or page<1:
        raise ValueError("A positive PDF page number is required")
    if not isinstance(row.get("excerpt"),str):
        raise ValueError("A literal excerpt is required")
    excerpt=compact(row["excerpt"])
    path=(root / row["file"]).resolve(strict=True)
    if not path.is_relative_to(root) or path.suffix.casefold()!=".pdf":
        raise ValueError("Source must be a PDF within the designated corpus directory")
    with path.open("rb") as f:
        raw=f.read(MAX_DOC_BYTES+1)
    if not raw.startswith(b"%PDF") or len(raw)>MAX_DOC_BYTES:
        raise ValueError("Invalid or oversized PDF")
    reader=PdfReader(BytesIO(raw),strict=False)
    if page>len(reader.pages):
        raise ValueError("Page outside the document")
    if excerpt not in compact(reader.pages[page-1].extract_text() or ""):
        raise ValueError("Excerpt not located literally on the specified page")
    date.fromisoformat(row["reviewed_at"])
    keys=("id","title","publisher","edition","url","topics","rights_basis","reviewed_by","reviewed_at","visibility","status")
    result={k:row[k] for k in keys}
    result.update(locator=f"PDF p. {page}",document_sha256=sha256(raw).hexdigest(),
                  excerpt_sha256=digest(excerpt),excerpt=excerpt)
    if eligible(result) is None:
        raise ValueError("Incomplete or inadmissible provenance")
    return result

def prepare_manifest(plan,root):
    root=Path(root).resolve(strict=True)
    if not isinstance(plan,list) or len(plan)>MAX_PASSAGES:
        raise ValueError("Invalid or oversized intake plan")
    records=[prepare_entry(row,root) for row in plan]
    KnowledgeIndex(records)  # Reject duplicate passage identifiers.
    return records

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--plan",required=True,type=Path)
    p.add_argument("--root",required=True,type=Path)
    p.add_argument("--output",required=True,type=Path)
    args=p.parse_args()
    with args.plan.open("rb") as f:
        raw=f.read(MAX_PLAN_BYTES+1)
    if len(raw)>MAX_PLAN_BYTES:
        raise ValueError("Intake plan too large")
    records=prepare_manifest(json.loads(raw),args.root)
    # Exclusive creation avoids silently replacing an approved manifest.
    with args.output.open("x",encoding="utf-8") as f:
        json.dump(records,f,ensure_ascii=False,indent=2)
    print("Prepared passages:",len(records),"version:",KnowledgeIndex(records).version)

if __name__=="__main__":
    main()

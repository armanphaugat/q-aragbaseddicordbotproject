import sys
import os
import pandas as pd
from pathlib import Path
from io import BytesIO
sys.path.append(os.path.join(os.path.dirname(os.path.dirname(__file__)), "python"))

from ingest import webscraper, split_texts, create_vectorstore, read_pdf
from query import answer_query
CONTACTS_DIR = Path(__file__).parent / "contacts"


def _load_df(source) -> pd.DataFrame:
    """
    Load and normalise an xlsx faculty sheet.
    source can be a file path (str/Path) or a BytesIO object.
    Returns a cleaned DataFrame with standardised column names.
    """
    if isinstance(source, (str, Path)):
        df = pd.read_excel(source, header=1)
    else:
        source.seek(0)
        df = pd.read_excel(source, header=1)

    # Normalise column names — strip whitespace
    df.columns = [str(c).strip() for c in df.columns]

    df = df.rename(columns={
        "Name of Faculty": "name",
        "Designation":     "designation",
        "Specialization":  "specialization",
        "Seating":         "seating",
        "Ext. No.":        "ext",
        "Mobile No":       "mobile",
        "E-mail ID":       "email",
    })

    keep = [c for c in ["name","designation","specialization","seating","ext","mobile","email"]
            if c in df.columns]
    df = df[keep].copy()

    # Coerce types safely
    df["name"] = df["name"].astype(str).str.strip()

    if "mobile" in df.columns:
        df["mobile"] = df["mobile"].apply(
            lambda x: str(int(x)) if pd.notna(x) and str(x).replace(".","").isdigit()
            else (str(x).strip() if pd.notna(x) else "")
        )
    if "ext" in df.columns:
        df["ext"] = df["ext"].apply(
            lambda x: str(int(x)) if pd.notna(x) and str(x).replace(".","").isdigit()
            else (str(x).strip() if pd.notna(x) else "")
        )
    for col in ["email", "seating", "designation", "specialization"]:
        if col in df.columns:
            df[col] = df[col].fillna("").astype(str).str.strip()

    # Drop rows with no name
    df = df[df["name"].str.strip().str.len() > 0].reset_index(drop=True)
    return df


def df_to_chunks(df: pd.DataFrame) -> list:
    """
    Convert each DataFrame row into a single self-contained text chunk.

    Each chunk has ALL fields on labelled lines so the LLM can read
    any field from context — e.g.:

        Name: Prof. (Dr) Neha Chaudhary
        Designation: Professor & HoD CSE
        Specialization: Software Testing, AI
        Mobile: 9785500056
        Email: chaudhary.neha@jaipur.manipal.edu
        Cabin: AB2, FB-6, Cabin 364
        Extension: 768

    One row = one chunk. No splitting — each contact record stays atomic
    so retrieval always returns the complete record.
    """
    chunks = []
    for _, row in df.iterrows():
        lines = []

        name = row.get("name", "").strip()
        if not name or name.lower() in ("nan", ""):
            continue

        lines.append(f"Name: {name}")

        desig = row.get("designation", "").strip()
        if desig and desig.lower() != "nan":
            lines.append(f"Designation: {desig}")

        spec = row.get("specialization", "").strip()
        if spec and spec.lower() != "nan":
            lines.append(f"Specialization: {spec}")

        mobile = row.get("mobile", "").strip()
        if mobile and mobile.lower() != "nan":
            lines.append(f"Mobile: {mobile}")
            lines.append(f"Phone: {mobile}")          # duplicate label — helps retrieval

        email = row.get("email", "").strip()
        if email and email.lower() != "nan":
            lines.append(f"Email: {email}")

        seating = row.get("seating", "").strip()
        if seating and seating.lower() != "nan":
            lines.append(f"Cabin: {seating}")
            lines.append(f"Seating: {seating}")       # duplicate label — helps retrieval

        ext = row.get("ext", "").strip()
        if ext and ext.lower() != "nan":
            lines.append(f"Extension: {ext}")

        if len(lines) > 1:                            # at least name + one field
            chunks.append("\n".join(lines))

    return chunks


def ingest_contacts_to_vectorstore(source, guild_id: str) -> dict:
    """
    Load an xlsx, convert to chunks, ingest into the guild's FAISS vectorstore.

    Parameters
    ----------
    source    : file path (str/Path) or BytesIO
    guild_id  : the FAISS namespace (Discord guild / vector store ID)

    Returns
    -------
    dict with keys: rows, chunks, status, error
    """
    try:
        df = _load_df(source)
    except Exception as e:
        return {"rows": 0, "chunks": 0, "status": "error", "error": f"Failed to read xlsx: {e}"}

    if df.empty:
        return {"rows": 0, "chunks": 0, "status": "error", "error": "No valid rows found in sheet."}

    chunks = df_to_chunks(df)
    if not chunks:
        return {"rows": len(df), "chunks": 0, "status": "error", "error": "No chunks generated from rows."}

    # Import here to avoid circular imports at module load time
    from ingest import create_vectorstore

    try:
        # Each chunk is already short (one faculty record ≈ 8 lines / ~120 chars)
        # so we skip split_texts — pass chunks directly to FAISS
        success = create_vectorstore(chunks, guild_id)
    except Exception as e:
        return {"rows": len(df), "chunks": len(chunks), "status": "error", "error": f"FAISS ingestion failed: {e}"}

    if not success:
        return {"rows": len(df), "chunks": len(chunks), "status": "error", "error": "create_vectorstore returned False."}

    return {
        "rows":   len(df),
        "chunks": len(chunks),
        "status": "success",
        "error":  None,
    }
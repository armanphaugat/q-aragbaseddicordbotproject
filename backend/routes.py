from fastapi import FastAPI, Request, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
from io import BytesIO
import sys
import os
import asyncio
import re

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

sys.path.append(os.path.join(os.path.dirname(os.path.dirname(__file__)), "python"))
from ingest import webscraper, split_texts, create_vectorstore, read_pdf
from query import answer_query

url_pattern = r"(https?://[^\s]+)"


@app.get("/")
def home():
    return {"message": "RAG API running"}


@app.post("/query")
async def query_api(request: Request):
    try:
        data = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body.")

    question = (data.get("question") or "").strip()
    server = (data.get("server") or "").strip()

    if not question:
        raise HTTPException(status_code=400, detail="'question' is required.")
    if not server:
        raise HTTPException(status_code=400, detail="'server' is required.")

    try:
        loop = asyncio.get_running_loop()
        answer = await loop.run_in_executor(None, answer_query, question, server)
        return {"answer": answer}
    except Exception as e:
        print(f"[query_api] Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to process query.")


@app.put("/upload")
async def upload_api(
    guild_id: str = Form(...),                        # ← moved to top (required first)
    files: Optional[List[UploadFile]] = File(None),
    urls: Optional[str] = Form(None),
):
    guild_id = guild_id.strip()
    if not guild_id:
        raise HTTPException(status_code=400, detail="'guild_id' cannot be empty.")

    pdf_files = [f for f in (files or []) if f.filename]  # filter empty file inputs
    links = re.findall(url_pattern, urls) if urls else []

    if not pdf_files and not links:
        raise HTTPException(status_code=400, detail="No PDFs or URLs provided.")

    texts = []

    for link in links:
        try:
            scraped_text = webscraper(link)
            if scraped_text:
                texts.extend(scraped_text)
        except Exception as e:
            print(f"[upload] Scrape error for {link}: {e}")

    for pdf in pdf_files:
        try:
            file_bytes = await pdf.read()
            if not file_bytes:
                print(f"[upload] Empty file: {pdf.filename}")
                continue
            pdf_text = read_pdf(BytesIO(file_bytes))
            if pdf_text:
                texts.append(pdf_text)
        except Exception as e:
            print(f"[upload] PDF read error for {pdf.filename}: {e}")

    if not texts:
        raise HTTPException(status_code=400, detail="No valid content extracted.")

    try:
        chunked_text = split_texts(texts)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Text splitting failed: {e}")

    try:
        created_vector = create_vectorstore(chunked_text, guild_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Vector store creation failed: {e}")

    if not created_vector:
        raise HTTPException(status_code=500, detail="Vector store creation returned falsy.")

    return {
        "status": "success",
        "message": f"Processed {len(chunked_text)} chunks",
        "urls_processed": len(links),
        "pdfs_processed": len(pdf_files),
    }
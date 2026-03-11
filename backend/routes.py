from fastapi import FastAPI, Request, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
from io import BytesIO
import sys
import os
import asyncio
import re

app = FastAPI()

# Allow frontend (React dev server) to call the API
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
    data = await request.json()
    question = data.get("question")
    server = data.get("server")

    if not question:
        raise HTTPException(status_code=400, detail="Question not provided")
    if not server:
        raise HTTPException(status_code=400, detail="Server ID not provided")

    loop = asyncio.get_running_loop()
    answer = await loop.run_in_executor(None, answer_query, question, server)
    return {"answer": answer}


@app.put("/upload")
async def upload_api(
    files: Optional[List[UploadFile]] = File(None),
    urls: Optional[str] = Form(None),
    guild_id: str = Form(...)
):
    try:
        pdf_files = files or []
        links = re.findall(url_pattern, urls) if urls else []

        if not pdf_files and not links:
            raise HTTPException(status_code=400, detail="No PDFs or URLs provided.")

        texts = []

        for link in links:
            try:
                scraped_text = webscraper(link)
                texts.extend(scraped_text)
            except Exception as e:
                print(f"Error scraping {link}: {e}")

        for pdf in pdf_files:
            try:
                file_bytes = await pdf.read()
                pdf_text = read_pdf(BytesIO(file_bytes))
                texts.append(pdf_text)
            except Exception as e:
                print(f"Error reading {pdf.filename}: {e}")

        if not texts:
            raise HTTPException(status_code=400, detail="No valid content extracted.")

        chunked_text = split_texts(texts)
        created_vector = create_vectorstore(chunked_text, guild_id)

        if not created_vector:
            raise HTTPException(status_code=500, detail="Vector store creation failed.")

        return {
            "status": "success",
            "message": f"Processed {len(chunked_text)} chunks",
            "urls_processed": len(links),
            "pdfs_processed": len(pdf_files)
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Upload API error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
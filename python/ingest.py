import os
import re
from langchain_community.vectorstores import FAISS
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import WebBaseLoader
from langchain_huggingface import HuggingFaceEmbeddings
from bs4 import SoupStrainer
import PyPDF2
import pdfplumber
from io import BytesIO
embeddings = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-MiniLM-L6-v2"
)

TAGS = [
    "h1", "h2", "h3", "h4", "h5", "h6",
    "p", "span", "strong", "b", "em",
    "ul", "ol", "li", "dl", "dt", "dd",
    "table", "thead", "tbody", "tr", "th", "td", "caption",
    "div", "section", "article", "aside", "main",
    "header", "footer", "nav", "figure", "figcaption",
    "label", "legend", "a", "details", "summary",
    "address", "time", "blockquote"
]

def webscraper(url):
    try:
        loader = WebBaseLoader(
            url,
            bs_kwargs={"parse_only": SoupStrainer(TAGS)}
        )
        docs = loader.load()
        cleaned = []
        for doc in docs:
            # ✅ Always return plain strings never tuples
            if not isinstance(doc.page_content, str):
                continue
            lines = doc.page_content.splitlines()
            lines = [line.strip() for line in lines if line.strip()]
            lines = list(dict.fromkeys(lines))
            content = "\n".join(lines).lower()
            if len(content.strip()) > 100:
                cleaned.append(content)
        return cleaned  # ✅ always List[str]
    except Exception as e:
        print(f"❌ Scraper error for {url}: {e}")
        return []

def read_pdf(file):
    text = ""
    if isinstance(file, BytesIO):
        file.seek(0)
    elif isinstance(file, str):
        file = open(file, "rb")
    else:
        raise ValueError("file must be a file path or BytesIO object")
    try:
        if isinstance(file, BytesIO):
            file.seek(0)
        with pdfplumber.open(file) as pdf:
            if len(pdf.pages) == 0:
                raise ValueError("PDF has no pages")
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text.lower() + "\n"
                tables = page.extract_tables()
                for table in tables:
                    for row in table:
                        row_text = " | ".join(
                            str(cell).strip() for cell in row if cell
                        )
                        if row_text.strip():
                            text += row_text.lower() + "\n"
        if text.strip():
            return text
    except Exception as e:
        print(f"⚠️ pdfplumber failed: {e} — trying PyPDF2")
    try:
        if isinstance(file, BytesIO):
            file.seek(0)
        reader = PyPDF2.PdfReader(file)
        if reader.is_encrypted:
            try:
                reader.decrypt("")
            except:
                raise ValueError("PDF is password protected")
        for page in reader.pages:
            try:
                page_text = page.extract_text()
                if page_text:
                    text += page_text.lower() + "\n"
            except Exception as e:
                print(f"⚠️ Skipping page: {e}")
                continue
    except ValueError:
        raise
    except Exception as e:
        raise ValueError(f"Failed to read PDF: {e}")

    if not text.strip():
        raise ValueError("No text extracted — PDF might be a scanned image")

    return text

def split_texts(texts):
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=100,
        separators=["\n\n", "\n", ".", " ", ""]
    )
    chunks = []
    for text in texts:
        if isinstance(text, tuple):
            text = text[0]
        if isinstance(text, list):
            text = " ".join(str(t) for t in text)
        if not isinstance(text, str):
            text = str(text)
        text = text.strip()
        if text:
            chunks.extend(splitter.split_text(text))
    return chunks

def create_vectorstore(texts, server_id):
    server_id_str = str(server_id)
    DB_DIR = f"vectorstore/{server_id_str}/faiss_index"
    os.makedirs(DB_DIR, exist_ok=True)
    seen = set()
    unique_texts = []
    for t in texts:
        if isinstance(t, tuple):
            t = t[0]
        if not isinstance(t, str):
            t = str(t)
        cleaned = t.strip()
        if cleaned and cleaned not in seen and len(cleaned) > 30:
            seen.add(cleaned)
            unique_texts.append(cleaned)
    print(f"Deduplicated: {len(texts)} → {len(unique_texts)} chunks")

    if not unique_texts:
        print("No valid texts to store")
        return False

    try:
        if os.path.exists(os.path.join(DB_DIR, "index.faiss")):
            print(f"Appending to existing vectorstore for {server_id_str}")
            vectorstore = FAISS.load_local(
                DB_DIR,
                embeddings,
                allow_dangerous_deserialization=True
            )
            vectorstore.add_texts(unique_texts)
        else:
            print(f"Creating new vectorstore for {server_id_str}")
            vectorstore = FAISS.from_texts(unique_texts, embeddings)

        vectorstore.save_local(DB_DIR)
        print(f"Vectorstore saved to {DB_DIR}")
        return True

    except Exception as e:
        import traceback
        print(f"Vectorstore error: {e}")
        print(traceback.format_exc())
        return False

def load_vectorstore(server_id):
    server_id_str = str(server_id)
    DB_DIR = f"vectorstore/{server_id_str}/faiss_index"
    if not os.path.exists(os.path.join(DB_DIR, "index.faiss")):
        print(f"Vectorstore not found at {DB_DIR}")
        return None
    return FAISS.load_local(
        DB_DIR,
        embeddings,
        allow_dangerous_deserialization=True
    )
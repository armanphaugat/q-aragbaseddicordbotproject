import os
from langchain_community.vectorstores import FAISS
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import WebBaseLoader
from langchain_community.embeddings import HuggingFaceEmbeddings
from bs4 import SoupStrainer
import PyPDF2
from io import BytesIO
TAGS = ["h1", "h2", "h3", "p", "li", "div", "section"]
def webscraper(url):
    loader = WebBaseLoader(
        url,
        bs_kwargs={"parse_only": SoupStrainer(TAGS)}
    )
    docs = loader.load()
    print(docs)
    return [doc.page_content for doc in docs]
def read_pdf(file):
    text = ""
    if isinstance(file, str):
        f = open(file, "rb")
    elif isinstance(file, BytesIO):
        f = file
    else:
        raise ValueError("file must be a file path or BytesIO object")
    with f:
        reader = PyPDF2.PdfReader(f)
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
    return text
def combine(url=None, file_path=None):
    texts = []
    if url:
        texts.extend(webscraper(url))
    if file_path:
        texts.append(read_pdf(file_path))
    return texts
def split_texts(texts):
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=400,
        chunk_overlap=60,
        separators=["\n\n", "\n", ".", " ", ""]
    )
    chunks = []
    for text in texts:
        chunks.extend(splitter.split_text(text))

    return chunks
def create_embeddings():
    return HuggingFaceEmbeddings(
        model_name="sentence-transformers/all-MiniLM-L6-v2"
    )
def create_vectorstore(texts, server_id):
    server_id_str = str(server_id)
    DB_DIR = f"vectorstore/{server_id_str}"
    os.makedirs(DB_DIR, exist_ok=True)
    embeddings = create_embeddings()
    if os.path.exists(os.path.join(DB_DIR, "index.faiss")):
        print(f"Loading existing vectorstore for server {server_id_str}")
        vectorstore = FAISS.load_local(
            DB_DIR,  # Pass directory only
            embeddings,
            allow_dangerous_deserialization=True
        )
        vectorstore.add_texts(texts)
        print(texts)
        print(vectorstore)
    else:
        vectorstore = FAISS.from_texts(texts, embeddings)
    vectorstore.save_local(DB_DIR)
    print(f"Vectorstore saved to {DB_DIR}")
    return True

def load_vectorstore(server_id):
    server_id_str = str(server_id)
    DB_DIR = f"vectorstore/{server_id_str}"
    if not os.path.exists(os.path.join(DB_DIR, "index.faiss")):
        print(f"Vectorstore not found at {DB_DIR}/index.faiss")
        return None
    embeddings = create_embeddings()
    return FAISS.load_local(
        DB_DIR,  # Pass directory only
        embeddings,
        allow_dangerous_deserialization=True
    )
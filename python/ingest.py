import os
from langchain_community.vectorstores import FAISS
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import WebBaseLoader
from langchain_community.embeddings import HuggingFaceEmbeddings
from bs4 import SoupStrainer
import PyPDF2
from io import BytesIO
TAGS = ["h1", "h2", "h3", "p", "li"]
def webscraper(url):
    loader = WebBaseLoader(
        url,
        bs_kwargs={"parse_only": SoupStrainer(TAGS)}
    )
    docs = loader.load()
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
        chunk_size=1000,
        chunk_overlap=200
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
    DB_PATH = f"vectorstore/{server_id}/faiss_index"
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    embeddings = create_embeddings()
    if  os.path.isdir(DB_PATH):
        vectorstore=FAISS.load_local(DB_PATH,embeddings,allow_dangerous_deserialization=True)
        vectorstore.add_texts(texts)
    else:
        vectorstore = FAISS.from_texts(texts, embeddings)
    vectorstore.save_local(DB_PATH)
    return vectorstore

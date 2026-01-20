import os
from langchain_community.vectorstores import FAISS
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import WebBaseLoader
from langchain_community.embeddings import HuggingFaceEmbeddings
from bs4 import SoupStrainer
import PyPDF2

DB_PATH = "vectorstore/faiss_zomato"
URL = "https://www.zomato.com/policies/terms-of-service"
TAGS = ["h1", "h2", "h3", "p", "li"]

def webscraper(url):
    loader = WebBaseLoader(url, bs_kwargs={"parse_only": SoupStrainer(TAGS)})
    return loader.load()

def read_pdf(file_path):
    with open(file_path, "rb") as f:
        reader = PyPDF2.PdfReader(f)
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n"
    return text

def combine(url, file_path):
    docs = webscraper(url)
    pdfs = read_pdf(file_path)
    return docs + pdfs

def split_documents(docs):
    splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    return splitter.split_documents(docs)

def create_embeddings():
    return HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")

def create_vectorstore(docs, embeddings):
    vectorstore = FAISS.from_documents(docs, embeddings)
    os.makedirs("vectorstore", exist_ok=True)
    vectorstore.save_local(DB_PATH)
    return vectorstore


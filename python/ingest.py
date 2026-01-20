import os
from langchain_community.vectorstores import FAISS
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import WebBaseLoader
from langchain_community.embeddings import HuggingFaceEmbeddings
from bs4 import SoupStrainer
DB_PATH = "vectorstore/faiss_zomato"
URL = "https://www.zomato.com/policies/terms-of-service"
TAGS = ["h1", "h2", "h3", "p", "li"]
def webscraper(url):
    loader = WebBaseLoader(url, bs_kwargs={"parse_only": SoupStrainer(TAGS)})
    return loader.load()
docs = webscraper(URL)
splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
splits = splitter.split_documents(docs)
embeddings = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-MiniLM-L6-v2"
)
vectorstore = FAISS.from_documents(splits, embeddings)
os.makedirs("vectorstore", exist_ok=True)
vectorstore.save_local(DB_PATH)

print(f"✅ FAISS vector store saved locally at: {DB_PATH}")

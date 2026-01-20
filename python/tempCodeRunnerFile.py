# Fixed RAG Implementation

# Imports
from langchain.embeddings.openai import OpenAIEmbeddings  # fixed import
from langchain.vectorstores.faiss import FAISS             # fixed import
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import WebBaseLoader
from bs4 import SoupStrainer
tags_to_extract = ["h1", "h2", "h3", "p", "li"]
def webscrapper(publicurl):
    loader = WebBaseLoader(publicurl, bs_kwargs={
        "parse_only": SoupStrainer(tags_to_extract)
    })
    data = loader.load()
    return data
docs = webscrapper("https://www.zomato.com/policies/terms-of-service/")
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=200
)
splits = text_splitter.split_documents(docs)
vectorstore = FAISS.from_documents(documents=splits, embedding=OpenAIEmbeddings())
print("Total vectors in FAISS:", vectorstore.index.ntotal)

from dotenv import load_dotenv
import os
load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser
from langchain_groq import ChatGroq
embeddings = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-MiniLM-L6-v2"
)
llm = ChatGroq(
    model="llama-3.3-70b-versatile",
    temperature=0
)
prompt = ChatPromptTemplate.from_template("""
Answer the question based only on the following context:

{context}

Question: {question}

Answer:
""")

def format_docs(docs):
    return "\n\n".join(doc.page_content for doc in docs)
def load_vectorstore(server_id):
    server_id_str = str(server_id)
    DB_DIR = f"vectorstore/{server_id_str}/faiss_index"
    print(f"Attempting to load vectorstore from: {DB_DIR}")
    if not os.path.exists(os.path.join(DB_DIR, "index.faiss")):
        print(f"Vectorstore not found at {DB_DIR}/index.faiss")
        return None
    print(f"Vectorstore found, loading...")
    return FAISS.load_local(
        DB_DIR,  # Pass the directory, not the file path
        embeddings,
        allow_dangerous_deserialization=True
    )
def answer_query(question: str, server_id: int):
    vectorstore = load_vectorstore(server_id)
    if vectorstore is None:
        return "⚠️ No content has been uploaded yet. Use `-upload` with URLs or PDF attachments first."
    retriever = vectorstore.as_retriever(search_kwargs={"k": 4})
    qa_chain = (
        {"context": retriever | format_docs, "question": RunnablePassthrough()}
        | prompt
        | llm
        | StrOutputParser()
    )
    return qa_chain.invoke(question)
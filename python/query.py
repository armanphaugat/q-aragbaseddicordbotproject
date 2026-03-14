from dotenv import load_dotenv
import os
load_dotenv(override=True)
GROQ_API_KEY = os.getenv("API_KEY")
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
You are an expert assistant for Manipal University Jaipur (MUJ).
Answer using ONLY the information provided in the context below.

Rules:
- Never mention "chunk", "context", "source" or any internal references
- Never say "according to the context" or "as mentioned in the context"  
- Answer directly and naturally like a knowledgeable human assistant
- ALWAYS prefer Indian rupee fees over international dollar fees
- NEVER use dollar or USD fees for Indian student calculations
- Indian fee is always the smaller INR number without dollar sign

For fee combination questions:
- Even if only SOME fees are found in context use them
- Show whatever fees ARE available and calculate with those
- Never say you don't have information if you found AT LEAST ONE fee
- Clearly label which fee is missing instead of refusing to answer
- For 4 year calculation: multiply annual fees by 4
- Always show step by step breakdown

Fee calculation format:
Annual Tuition Fee:        ₹X
Annual Hostel Fee:         ₹X  
Annual Mess Fee:           ₹X
─────────────────────────────
Total Annual Cost:         ₹X
Total 4 Year Cost (×4):   ₹X

Context:
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
    question=question.lower()
    vectorstore = load_vectorstore(server_id)
    if vectorstore is None:
        return "⚠️ No content has been uploaded yet. Use `-upload` with URLs or PDF attachments first."
    retriever = vectorstore.as_retriever(
    search_type="mmr",
    search_kwargs={
        "k": 20,
        "fetch_k": 80,
        "lambda_mult": 0.3
    }
    )
    qa_chain = (
        {"context": retriever | format_docs, "question": RunnablePassthrough()}
        | prompt
        | llm
        | StrOutputParser()
    )
    return qa_chain.invoke(question)
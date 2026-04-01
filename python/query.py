from dotenv import load_dotenv
import os
import re
load_dotenv(override=True)

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
You are the official AI assistant for Manipal University Jaipur (MUJ).
You respond like a helpful, knowledgeable university counselor — clear, structured, and natural.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CORE RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• Use ONLY the information provided in the CONTEXT.
• Do NOT use outside knowledge or assumptions.
• If no relevant information exists → reply exactly:
  "I don't have that information."
• If partial information exists → return only available details.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
UNDERSTAND THE QUESTION TYPE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Identify the intent and respond accordingly:

1. Faculty / Contact → return clean contact details
2. Process / How-to → return ordered steps
3. Fees / Cost → return breakdown and calculate if required
4. General Info → return concise structured answer

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FEE HANDLING (IMPORTANT)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• Extract all fee components mentioned:
  Tuition, Hostel, Mess, Other

• Treat each as separate unless explicitly stated otherwise

• If question asks for total:
  - Show breakdown
  - Multiply by years if mentioned
  - Then give final total

• If multiple hostel types exist:
  - Show each option separately

• If mess fee is present:
  - Always include it

• Never assume missing values

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FACULTY / CONTACT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Return only fields present:
Name, Designation, Specialization, Mobile, Email, Cabin, Extension

If multiple matches → list separately  
If only one field asked → return only that  

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROCESS / STEPS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• Return steps in correct order  
• Use numbered format  
• Do not add extra steps  

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RESPONSE STYLE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• Keep answers concise but natural  
• Vary formatting:
  - bullets
  - short paragraphs
  - mini tables (if useful)

• Highlight key values using **bold**
• Avoid repeating rigid phrases
• Do not add unnecessary explanations

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONTEXT:
{context}

QUESTION:
{question}

ANSWER:
""")
_vectorstore_cache: dict = {}

def get_db_dir(server_id):
    return f"vectorstore/{str(server_id)}/faiss_index"

def get_vectorstore(server_id):
    server_id_str = str(server_id)
    if server_id_str not in _vectorstore_cache:
        vs = load_vectorstore(server_id)
        if vs is None:
            return None
        _vectorstore_cache[server_id_str] = vs
    return _vectorstore_cache[server_id_str]

def invalidate_cache(server_id):
    _vectorstore_cache.pop(str(server_id), None)

def load_vectorstore(server_id):
    DB_DIR = get_db_dir(server_id)
    if not os.path.exists(os.path.join(DB_DIR, "index.faiss")):
        print(f"Vectorstore not found at {DB_DIR}")
        return None
    return FAISS.load_local(
        DB_DIR,
        embeddings,
        allow_dangerous_deserialization=True
    )

def format_docs(docs):
    return "\n\n".join(doc.page_content for doc in docs)

def expand_query(question: str) -> str:
    expansions = {
    "cse": "computer science & engineering",
    "it": "information technology",
    "ece": "electronics communication",
    "eee": "electrical electronics engineering",
    "me": "mechanical engineering",
    "ce": "civil engineering",
    "btech": "b.tech bachelor technology",
    "mtech": "m.tech master technology",
    "bca": "bachelor computer applications",
    "mca": "master computer applications",
    "mba": "master business administration",
    "bba": "bachelor business administration",
    "muj": "manipal university jaipur",
    "fee": "fee structure tuition annual charges cost indian rupee inr per year",
    "fees": "fee structure tuition annual charges cost indian rupee inr per year",
    "hostel": "hostel fees hostel cost accommodation hostel charges hostel fee structure hostel double occupancy hostel price mess fees food charges annual hostel fees",
    "mess": "mess food dining canteen charges fee annual full year 2025 2026",
    "total": "total combined complete fee charges yearly annual tuition hostel mess",
    "cost": "total cost fee charges tuition annual indian rupee inr breakdown",
    "hod": "head of department hod director professor incharge",
    "head": "head department hod director incharge",
    "faculty": "faculty teacher professor staff member",
    "placement": "placement recruitment job salary package",
    "scholarship": "scholarship financial aid merit discount",
    "admission": "admission eligibility criteria apply process",
    "phd": "phd doctoral research fellowship program",
    "contact": "contact details email phone number mobile",
    }
    q = question.lower().strip()
    q = re.sub(r'[^\w\s]', '', q)
    for short, full in expansions.items():
        if short in q.split():
            q = q + " " + full
    return q

def answer_query(question: str, server_id: int):

    question = expand_query(question.lower())

    vectorstore = get_vectorstore(server_id)
    if vectorstore is None:
        return "⚠️ No content has been uploaded yet. Use `-upload` with URLs or PDF attachments first."

    retriever = vectorstore.as_retriever(
        search_type="mmr",
        search_kwargs={
            "k": 30,
            "fetch_k": 90,
            "lambda_mult": 0.4
        }
    )

    qa_chain = (
        {"context": retriever | format_docs, "question": RunnablePassthrough()}
        | prompt
        | llm
        | StrOutputParser()
    )
    return qa_chain.invoke(question)
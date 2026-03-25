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
You are an expert assistant for Manipal University Jaipur (MUJ).
Answer using ONLY the information provided in the context below.

Rules:
- Never mention "chunk", "context", "source" or any internal references
- Never say "according to the context" or "as mentioned in the context"
- Answer directly and naturally like a knowledgeable human assistant
- ALWAYS prefer Indian rupee fees over international dollar fees
- NEVER use dollar or USD fees for Indian student calculations
- Indian fee is always the smaller INR number without dollar sign

For fee questions:
- When a fee table is found, extract and show ONLY the rows relevant to the question
- Do NOT show the entire fee table — only show the specific program or fee type asked
- For example if asked about BTech CSE fee show only the BTech CSE row not all BTech rows
- For hostel fee show only the occupancy type asked (double or triple) not all hostel rows
- Always show fees in this clean format:

  Fee Type            Amount
  ─────────────────────────────
  Tuition (annual)    ₹X
  Registration        ₹X (one time)
  Caution Deposit     ₹X (refundable)
  ─────────────────────────────
  Total at Admission  ₹X

For fee combination questions:
- Combine only the relevant rows from each fee table
- Even if only SOME fees are found use them
- Never say you dont have information if you found AT LEAST ONE fee
- Clearly label which fee is missing instead of refusing to answer
- For 4 year calculation multiply annual fees by 4
- Always show step by step breakdown:

  Annual Tuition Fee:        ₹X
  Annual Hostel Fee:         ₹X
  Annual Mess Fee:           ₹X
  ─────────────────────────────
  Total Annual Cost:         ₹X
  Total 4 Year Cost (×4):   ₹X

For people and faculty questions:
- Look for names with titles like Dr. Prof. Mr. Ms. HOD Director Dean
- If HOD name is found mention it with full designation
- If faculty info is not found say which page needs to be checked

If information is truly not found say exactly:
I dont have that information in my knowledge base.

Context:
{context}

Question: {question}

Answer:
""")

# ✅ Cache
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
    "hostel": "hostel accommodation boarding residence  fee structure fee double occupancy annual charges",
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
    }
    q = question.lower().strip()
    q = re.sub(r'[^\w\s]', '', q)
    for short, full in expansions.items():
        if short in q.split():
            q = q + " " + full
    return q

def answer_query(question: str, server_id: int):
    question = expand_query(question.lower().strip())

    vectorstore = get_vectorstore(server_id)
    if vectorstore is None:
        return "⚠️ No content has been uploaded yet. Use `-upload` with URLs or PDF attachments first."

    retriever = vectorstore.as_retriever(
        search_type="mmr",
        search_kwargs={
            "k": 20,
            "fetch_k": 80,
            "lambda_mult": 0.5
        }
    )

    qa_chain = (
        {"context": retriever | format_docs, "question": RunnablePassthrough()}
        | prompt
        | llm
        | StrOutputParser()
    )

    return qa_chain.invoke(question)

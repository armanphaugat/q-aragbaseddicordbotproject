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
You are Arya, the official AI assistant for Manipal University Jaipur (MUJ).
You speak like a knowledgeable, friendly university counselor — direct, warm, and precise.
 
════════════════════════════════════════
ABSOLUTE RULES (never break these)
════════════════════════════════════════
1. Answer ONLY from the context provided. Do not hallucinate or infer beyond it.
2. NEVER use words like "chunk", "context", "source", "document", "as mentioned", "according to".
3. Speak naturally — as if you already know this information, not as if you're reading it.
4. For Indian students: ALWAYS use INR (₹). NEVER use USD/$ figures. The INR fee is always the smaller number without a dollar sign.
5. If information is truly absent from the context, say exactly:
   "I don't have that detail right now. Please contact MUJ admissions at admissions@jaipur.manipal.edu or call 1800-102-0128."
 
════════════════════════════════════════
FEE DISPLAY RULES
════════════════════════════════════════
- Show ONLY the fee rows relevant to the question. Never dump the full table.
- If asked about B.Tech CSE → show only the CSE row, not all B.Tech rows.
- If asked about double occupancy hostel → show only double occupancy row.
- Always render fees in this exact format:
 
  Fee Type                    Amount
  ──────────────────────────────────────
  Tuition (annual)            ₹X,XX,XXX
  Registration Fee            ₹X,XXX     (one-time)
  Caution Deposit             ₹XX,XXX    (refundable)
  ──────────────────────────────────────
  Total at Admission          ₹X,XX,XXX
 
════════════════════════════════════════
FEE COMBINATION & CALCULATION RULES
════════════════════════════════════════
- When asked for a combined total (e.g. tuition + hostel + mess):
  → Use every fee figure available in the context.
  → If a specific fee is not in the context, label it clearly as "Not available" but still show all other fees and their subtotal.
  → NEVER refuse to answer just because one component is missing.
  → NEVER say a fee is "missing" if it was mentioned anywhere in the conversation.
 
- Always show a step-by-step breakdown:
 
  Annual Tuition Fee:              ₹X,XX,XXX
  Annual Hostel Fee (double):      ₹X,XX,XXX
  Annual Mess Fee:                 ₹X,XX,XXX
  ──────────────────────────────────────────
  Total Annual Cost:               ₹X,XX,XXX
  Total 4-Year Cost (× 4):        ₹XX,XX,XXX
 
  (Add one-time fees separately below the table)
  Registration Fee (one-time):     ₹X,XXX
  Caution Deposit (refundable):    ₹XX,XXX
  Hostel Security Deposit:         ₹XX,XXX (refundable)
 
════════════════════════════════════════
PEOPLE, FACULTY & ADMINISTRATION RULES
════════════════════════════════════════
- Look for names with titles: Dr., Prof., Mr., Ms., HOD, Director, Dean, Associate Dean.
- Always include full name + designation + department when found.
- If a person's info is not in the context, say:
  "I don't have that information. You can find the faculty directory at manipal.edu/muj or contact the department directly."
 
════════════════════════════════════════
FORMATTING RULES
════════════════════════════════════════
- Use **bold** for important figures, names, and deadlines.
- Use bullet points for lists of 3 or more items.
- Keep answers concise — no padding, no repetition.
- For complex answers (fees, eligibility, process), use structured sections with clear headers.
- End with a helpful next step or contact when relevant.
 
════════════════════════════════════════
CONTEXT
════════════════════════════════════════
{context}
 
════════════════════════════════════════
QUESTION
════════════════════════════════════════
{question}
 
════════════════════════════════════════
ANSWER
════════════════════════════════════════
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
    

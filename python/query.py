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
════════════════════════════════════════
ABSOLUTE RULES (STRICT ENFORCEMENT)
════════════════════════════════════════

1. You MUST answer ONLY using information that is explicitly present in the CONTEXT.

2. You are NOT allowed to use prior knowledge, assumptions, or general knowledge.

3. If any part of the answer is not clearly found in the CONTEXT, DO NOT include that part.

4. NEVER combine unrelated pieces of information unless they clearly belong together.

5. NEVER generate examples, estimates, or additional data not present in the CONTEXT.

6. MISSING vs PARTIAL DATA RULE:

   * If the requested information is COMPLETELY missing → respond EXACTLY with:
     "I don't have that information."
   * If the information is PARTIALLY available → return ONLY the available parts.
   * NEVER refuse if at least some relevant information exists.

════════════════════════════════════════
ANTI-HALLUCINATION GUARD (CRITICAL)
════════════════════════════════════════

Before answering, internally verify:
✔ Every fact comes from the CONTEXT
✔ No extra assumptions are added
✔ The response does not go beyond available data

DO NOT:

* Infer missing values
* Fill gaps using logic
* Use similar or related data
* Expand beyond the given information

════════════════════════════════════════
STRICT SCOPING RULE
════════════════════════════════════════

* Answer ONLY what is asked.
* DO NOT add extra or related information unless explicitly requested.

Example:
If asked "What is X?" → ONLY explain X.
DO NOT add related topics.

════════════════════════════════════════
STRUCTURED DATA RULE
════════════════════════════════════════

* When returning lists or structured information:

  * Use clean formatting
  * Include ONLY relevant fields
  * Do NOT invent missing fields

* If a specific field is requested:
  → Return ONLY that field if present.

════════════════════════════════════════
FORMATTING RULES
════════════════════════════════════════

* Use **bold** for important values or names.
* Use bullet points for 3 or more items.
* Keep responses concise and direct.
* NO explanations beyond what is necessary.
* NO padding or filler text.

════════════════════════════════════════
RESPONSE CLEANLINESS RULE
════════════════════════════════════════

* NEVER add:

  * disclaimers
  * assumptions
  * advisory statements
  * generic warnings

* DO NOT add conclusions or summaries.

* End the response immediately after the answer.

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
    "contact": "contact details email phone number mobile",
    }
    q = question.lower().strip()
    q = re.sub(r'[^\w\s]', '', q)
    for short, full in expansions.items():
        if short in q.split():
            q = q + " " + full
    return q

def answer_query(question: str, server_id: int):

    question = expand_query(original_question.lower())

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
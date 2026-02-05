from fastapi import FastAPI,Request,HTTPException
import sys
import os
import asyncio
app=FastAPI()
sys.path.append(os.path.join(os.path.dirname(os.path.dirname(__file__)), "python"))
from query import answer_query
@app.get("/query")
async def query_api(request:Request):
    data=await request.json()
    question=data.get("question")
    server=data.get("server")
    if  not question:
        raise HTTPException(status_code=404,detail="Question Not Found")
    if  not server:
        raise HTTPException(status_code=404,detail="Server Not Found")
    loop = asyncio.get_running_loop()
    answer =await loop.run_in_executor(None, answer_query, question, server)
    return {"answer":answer}
    
    
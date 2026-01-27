import os
import discord
from dotenv import load_dotenv
from discord.ext import commands
import sys
from io import BytesIO
sys.path.append(os.path.join(os.path.dirname(os.path.dirname(__file__)), "python"))
from ingest import webscraper, combine, split_texts, create_vectorstore,read_pdf
from query import answer_query
import re
import asyncio
url_pattern = r"(https?://\S+)"
load_dotenv()
DISCORD_BOT_KEY=os.getenv("DISCORD_BOT_KEY")
intents=discord.Intents.all()
bot = commands.Bot(command_prefix='-', intents=intents,help_command=None)
@bot.event
async def on_ready():
    print(f"Logged in as {bot.user}")

@bot.command()
async def upload(ctx):
    pdf_files=[]
    links=[]
    if(ctx.message.attachments):
        for attachment in ctx.message.attachments:
            if attachment.filename.lower().endswith(".pdf"):
                pdf_files.append(attachment)
    links=re.findall(url_pattern,ctx.message.content)
    web_url_text=""
    pdf_text=""
    for link in links:
        scrapped_text=webscraper(link)
        web_url_text+=" ".join(scrapped_text) +" "
    for pdf in pdf_files:
        file_bytes=await pdf.read()
        pdf_text += read_pdf(BytesIO(file_bytes)) + " "
    total_text=web_url_text
    total_text+=" "
    total_text+=pdf_text
    chunked_text=split_texts([total_text])
    created_vector=create_vectorstore(chunked_text,ctx.guild.id)
    if(created_vector):
        await ctx.send("Uploaded SuccesFully")
    else:
        await ctx.send("ReUpload The File")

@bot.command()
async def ask(ctx,*,question):
    loop=asyncio.get_running_loop()
    answer=await loop.run_in_executor(None,answer_query,question)
    if answer:
        await ctx.send(answer)
    else:
        await ctx.send("No Answer Found")

bot.run(DISCORD_BOT_KEY)
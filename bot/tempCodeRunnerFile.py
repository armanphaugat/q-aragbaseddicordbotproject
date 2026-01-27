import os
import sys
import discord
from discord.ext import commands
from dotenv import load_dotenv
from io import BytesIO
import re

# Add python folder to sys.path
sys.path.append(os.path.join(os.path.dirname(os.path.dirname(__file__)), "python"))

from ingest import webscraper, split_texts, create_vectorstore, read_pdf
from query import answer_query

os.environ["USER_AGENT"] = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
load_dotenv()
DISCORD_BOT_KEY = os.getenv("DISCORD_BOT_KEY")

intents = discord.Intents.all()
bot = commands.Bot(command_prefix="-", intents=intents, help_command=None)
url_pattern = r"(https?://\S+)"

@bot.event
async def on_ready():
    print(f"Logged in as {bot.user}")

@bot.command()
async def upload(ctx):
    texts = []
    links = re.findall(url_pattern, ctx.message.content)
    for link in links:
        scraped = webscraper(link)
        texts.extend(scraped)
    for attachment in ctx.message.attachments:
        if attachment.filename.lower().endswith(".pdf"):
            file_bytes = await attachment.read()
            pdf_text = read_pdf(BytesIO(file_bytes))
            texts.append(pdf_text)
    if not texts:
        await ctx.send("❌ No valid content found to upload.")
        return
    chunked_text = split_texts(texts)
    success = create_vectorstore(chunked_text, ctx.guild.id)
    if success:
        await ctx.send("✅ Uploaded Successfully")
    else:
        await ctx.send("❌ Upload Failed")

@bot.command()
async def ask(ctx):
    content = ctx.message.content
    question = content[len("-ask"):].strip()
    if not question:
        await ctx.send("❌ Please provide a question after -ask")
        return
    answer = answer_query(question, ctx.guild.id)
    await ctx.send(answer)

bot.run(DISCORD_BOT_KEY)

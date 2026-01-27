import os
import discord
from dotenv import load_dotenv
from discord.ext import commands
import sys
from io import BytesIO
import re
import asyncio

# Add python folder to sys.path
sys.path.append(os.path.join(os.path.dirname(os.path.dirname(__file__)), "python"))

from ingest import webscraper, split_texts, create_vectorstore, read_pdf
from query import answer_query

# Set user agent for web scraping
os.environ["USER_AGENT"] = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"

url_pattern = r"(https?://\S+)"

load_dotenv()
DISCORD_BOT_KEY = os.getenv("DISCORD_BOT_KEY")

intents = discord.Intents.all()
bot = commands.Bot(command_prefix='-', intents=intents, help_command=None)

@bot.event
async def on_ready():
    print(f"✅ Logged in as {bot.user}")
    print(f"📊 Connected to {len(bot.guilds)} server(s)")

@bot.command()
async def upload(ctx):
    """Upload PDFs and/or URLs to the knowledge base"""
    try:
        pdf_files = []
        links = []
        
        # Collect PDF attachments
        if ctx.message.attachments:
            for attachment in ctx.message.attachments:
                if attachment.filename.lower().endswith(".pdf"):
                    pdf_files.append(attachment)
        
        # Extract URLs from message
        links = re.findall(url_pattern, ctx.message.content)
        
        # Check if there's content to upload
        if not pdf_files and not links:
            await ctx.send("❌ No PDFs or URLs found. Please attach PDFs or include URLs in your message.")
            return
        
        # Send processing message
        processing_msg = await ctx.send("⏳ Processing your content...")
        
        texts = []
        
        # Scrape web URLs
        for link in links:
            try:
                scraped_text = webscraper(link)
                texts.extend(scraped_text)
            except Exception as e:
                await ctx.send(f"⚠️ Error scraping {link}: {str(e)}")
        
        # Read PDFs
        for pdf in pdf_files:
            try:
                file_bytes = await pdf.read()
                pdf_text = read_pdf(BytesIO(file_bytes))
                texts.append(pdf_text)
            except Exception as e:
                await ctx.send(f"⚠️ Error reading {pdf.filename}: {str(e)}")
        
        # Check if we have any content
        if not texts:
            await processing_msg.edit(content="❌ No valid content extracted from the provided sources.")
            return
        
        # Split texts into chunks
        chunked_text = split_texts(texts)
        
        # Create vectorstore
        created_vector = create_vectorstore(chunked_text, ctx.guild.id)
        
        if created_vector:
            await processing_msg.edit(content=f"✅ Successfully uploaded! Processed {len(chunked_text)} chunks from {len(links)} URL(s) and {len(pdf_files)} PDF(s).")
        else:
            await processing_msg.edit(content="❌ Upload failed. Please try again.")
    
    except Exception as e:
        await ctx.send(f"❌ An error occurred: {str(e)}")
        print(f"Error in upload command: {e}")

@bot.command()
async def ask(ctx, *, question: str = None):
    try:
        if not question:
            await ctx.send("❌ Please provide a question after `-ask`")
            return
        thinking_msg = await ctx.send("🤔 Thinking...")
        loop = asyncio.get_running_loop()
        answer = await loop.run_in_executor(None, answer_query, question, ctx.guild.id)
        await thinking_msg.edit(content=answer)
    except Exception as e:
        await ctx.send(f"❌ An error occurred: {str(e)}")
        print(f"Error in ask command: {e}")

@bot.command()
async def help(ctx):
    help_text = """
**📚 RAG Bot Commands**

`-upload [URLs] [PDF attachments]`
Upload content to the knowledge base. You can include URLs in your message and/or attach PDF files.

`-ask <question>`
Ask a question based on the uploaded content.

`-help`
Show this help message.

**Example:**
`-upload https://example.com` (with PDF attached)
`-ask What is the main topic discussed?`
    """
    await ctx.send(help_text)
bot.run(DISCORD_BOT_KEY)
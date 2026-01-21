import discord
from dotenv import load_dotenv
from discord.ext import commands
import os
load_dotenv()
DISCORD_BOT_KEY=os.getenv("DISCORD_BOT_KEY")
intents=discord.Intents.all()
bot = commands.Bot(command_prefix='-', intents=intents,help_command=None)
bot.run(DISCORD_BOT_KEY)
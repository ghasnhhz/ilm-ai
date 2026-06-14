from pathlib import Path

from dotenv import load_dotenv

# Load the repo-root .env so `python -m bot.main` works from any CWD without
# manually exporting TELEGRAM_BOT_TOKEN/SECRET. override=False keeps any value
# already set in the shell (e.g. BACKEND_INTERNAL_URL=http://localhost:8000) and
# matches how the backend loads its config (backend/app/core/config.py).
load_dotenv(Path(__file__).resolve().parent.parent.parent / ".env", override=False)

import logging
import os

from telegram import Update
from telegram.ext import Application, CommandHandler, ContextTypes

logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger(__name__)

TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(
        "Salom! I'm Ilm AI — your learning companion.\n\n"
        "Link this chat to your account, then use /quiz for a quick 5-question "
        "session, /reminder HH:MM to schedule daily nudges, and /streak to see "
        "your run.\n\n(Commands are wired up in Phase 7.)"
    )


def build_app() -> Application:
    if not TELEGRAM_BOT_TOKEN:
        raise RuntimeError("TELEGRAM_BOT_TOKEN is not set")
    app = Application.builder().token(TELEGRAM_BOT_TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    return app


def main() -> None:
    app = build_app()
    logger.info("Ilm AI bot starting (polling)...")
    app.run_polling()


if __name__ == "__main__":
    main()

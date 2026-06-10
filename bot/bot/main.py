import logging
import os

from telegram import InlineKeyboardButton, InlineKeyboardMarkup, Update
from telegram.ext import (
    Application,
    CallbackQueryHandler,
    CommandHandler,
    ContextTypes,
)

from bot import api

logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger(__name__)

TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")

LINK_HINT = (
    "This chat isn't linked to an Ilm AI account yet.\n\n"
    "Open Ilm AI → Profile → *Connect Telegram*, then tap the button there to link."
)


# --- /start (with optional link token) ---------------------------------------

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if context.args:
        token = context.args[0]
        try:
            result = await api.link(token, update.effective_chat.id)
            await update.message.reply_text(
                f"✅ Linked! Welcome, {result.get('name', 'learner')}.\n\n"
                "Use /quiz for a quick 5-question session, /flashcards to study cards "
                "from your materials, /reminder HH:MM to schedule daily nudges, and "
                "/streak to track your run."
            )
        except api.BackendError as e:
            await update.message.reply_text(f"Couldn't link this chat: {e}")
        return

    await update.message.reply_text(
        "Salom! I'm Ilm AI — your learning companion.\n\n"
        "Use /quiz for a quick 5-question session, /flashcards to study cards from your "
        "materials, /reminder HH:MM to schedule daily nudges, /streak to see your run, "
        "and /status to check your link.\n\n"
        + LINK_HINT,
        parse_mode="Markdown",
    )


# --- /quiz (inline multiple-choice) ------------------------------------------

def _question_keyboard(options: list[str]) -> InlineKeyboardMarkup:
    buttons = [
        [InlineKeyboardButton(opt[:60], callback_data=f"ans:{opt[0].upper()}")]
        for opt in options
        if opt
    ]
    return InlineKeyboardMarkup(buttons)


async def _send_question(chat, context: ContextTypes.DEFAULT_TYPE) -> None:
    quiz = context.user_data["quiz"]
    q = quiz["questions"][quiz["idx"]]
    n = len(quiz["questions"])
    header = f"Q{quiz['idx'] + 1}/{n}"
    if q.get("concept"):
        header += f"  ·  {q['concept']}"
    await chat.send_message(
        f"{header}\n\n{q['prompt']}", reply_markup=_question_keyboard(q["options"])
    )


async def quiz(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    chat_id = update.effective_chat.id
    await update.message.reply_text("Putting together your quiz… one moment.")
    try:
        data = await api.quiz_generate(chat_id)
    except api.BackendError as e:
        msg = str(e)
        if "linked" in msg.lower():
            await update.message.reply_text(LINK_HINT, parse_mode="Markdown")
        else:
            await update.message.reply_text(f"Couldn't start a quiz: {msg}")
        return

    questions = data.get("questions", [])
    if not questions:
        await update.message.reply_text(
            "I couldn't make multiple-choice questions from your materials yet. "
            "Upload some study materials in the app first."
        )
        return

    context.user_data["quiz"] = {"questions": questions, "idx": 0, "score": 0}
    await _send_question(update.effective_chat, context)


async def on_answer(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    await query.answer()

    quiz_state = context.user_data.get("quiz")
    if not quiz_state:
        await query.edit_message_text("This quiz has expired. Send /quiz to start a new one.")
        return

    letter = query.data.split(":", 1)[1]
    q = quiz_state["questions"][quiz_state["idx"]]
    try:
        result = await api.quiz_answer(query.message.chat_id, q["id"], letter)
    except api.BackendError as e:
        await query.edit_message_text(f"Couldn't grade that answer: {e}")
        return

    mark = "✅ Correct!" if result["is_correct"] else "❌ Not quite."
    feedback = f"{q['prompt']}\n\n{mark}"
    if not result["is_correct"]:
        feedback += f"\nCorrect answer: {result['correct_answer']}"
    if result.get("explanation"):
        feedback += f"\n\n{result['explanation']}"
    await query.edit_message_text(feedback)

    if result["is_correct"]:
        quiz_state["score"] += 1
    quiz_state["idx"] += 1

    if quiz_state["idx"] >= len(quiz_state["questions"]):
        total = len(quiz_state["questions"])
        score = quiz_state["score"]
        streak = result.get("streak")
        summary = f"🏁 Done! You scored {score}/{total}."
        if streak:
            summary += f"\n🔥 Current streak: {streak} day(s)."
        await query.message.chat.send_message(summary)
        context.user_data.pop("quiz", None)
    else:
        await _send_question(query.message.chat, context)


# --- /flashcards -------------------------------------------------------------

async def flashcards(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    chat_id = update.effective_chat.id
    await update.message.reply_text("Making your flashcards… one moment.")
    try:
        data = await api.flashcards_generate(chat_id)
    except api.BackendError as e:
        msg = str(e)
        if "linked" in msg.lower():
            await update.message.reply_text(LINK_HINT, parse_mode="Markdown")
        else:
            await update.message.reply_text(f"Couldn't make flashcards: {msg}")
        return

    cards = data.get("flashcards", [])
    if not cards:
        await update.message.reply_text(
            "I couldn't make flashcards from your materials yet. "
            "Upload some study materials in the app first."
        )
        return

    n = len(cards)
    await update.message.reply_text(f"🃏 {n} flashcards from your materials:")
    for i, card in enumerate(cards, start=1):
        header = f"🃏 Card {i}/{n}"
        if card.get("concept"):
            header += f"  ·  {card['concept']}"
        await update.effective_chat.send_message(
            f"{header}\n\n❓ {card['front']}\n\n💡 {card['back']}"
        )


# --- /reminder, /streak, /status ---------------------------------------------

async def reminder(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    chat_id = update.effective_chat.id
    args = context.args

    if args and args[0].lower() == "off":
        try:
            await api.set_reminder(chat_id, None, None)
            await update.message.reply_text("🔕 Daily reminders turned off.")
        except api.BackendError as e:
            await update.message.reply_text(str(e))
        return

    if not args or ":" not in args[0]:
        await update.message.reply_text(
            "Usage: /reminder HH:MM  (e.g. /reminder 20:30), or /reminder off"
        )
        return

    try:
        hh, mm = args[0].split(":", 1)
        hour, minute = int(hh), int(mm)
        if not (0 <= hour <= 23 and 0 <= minute <= 59):
            raise ValueError
    except ValueError:
        await update.message.reply_text("That doesn't look like a valid time. Try /reminder 20:30")
        return

    try:
        await api.set_reminder(chat_id, hour, minute)
        await update.message.reply_text(f"⏰ Daily reminder set for {hour:02d}:{minute:02d}.")
    except api.BackendError as e:
        msg = str(e)
        if "linked" in msg.lower():
            await update.message.reply_text(LINK_HINT, parse_mode="Markdown")
        else:
            await update.message.reply_text(msg)


async def _status_text(chat_id: int) -> str:
    data = await api.status(chat_id)
    if not data.get("linked"):
        return LINK_HINT
    lines = [
        f"🔥 Current streak: {data.get('current_streak', 0)} day(s)",
        f"🏆 Longest streak: {data.get('longest_streak', 0)} day(s)",
    ]
    rem = data.get("reminder")
    if rem:
        lines.append(f"⏰ Daily reminder: {rem['hour']:02d}:{rem['minute']:02d}")
    else:
        lines.append("⏰ No daily reminder set (use /reminder HH:MM)")
    return "\n".join(lines)


async def streak(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    text = await _status_text(update.effective_chat.id)
    await update.message.reply_text(text, parse_mode="Markdown")


async def status(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    text = await _status_text(update.effective_chat.id)
    await update.message.reply_text(text, parse_mode="Markdown")


# --- Daily reminder job ------------------------------------------------------

async def remind_tick(context: ContextTypes.DEFAULT_TYPE) -> None:
    try:
        due = await api.reminders_due()
    except api.BackendError as e:
        logger.warning("reminders_due failed: %s", e)
        return
    for item in due:
        streak_n = item.get("streak", 0)
        text = "📚 Time to learn! A few minutes now keeps your streak alive. Send /quiz."
        if streak_n and streak_n % 7 == 0:
            text = (
                f"🎉 {streak_n}-day streak! Incredible consistency. "
                "Keep it going with a quick /quiz."
            )
        try:
            await context.bot.send_message(chat_id=item["chat_id"], text=text)
        except Exception as e:  # noqa: BLE001 - one bad chat shouldn't stop the rest
            logger.warning("failed to send reminder to %s: %s", item["chat_id"], e)


def build_app() -> Application:
    if not TELEGRAM_BOT_TOKEN:
        raise RuntimeError("TELEGRAM_BOT_TOKEN is not set")
    app = Application.builder().token(TELEGRAM_BOT_TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("quiz", quiz))
    app.add_handler(CommandHandler("flashcards", flashcards))
    app.add_handler(CommandHandler("reminder", reminder))
    app.add_handler(CommandHandler("streak", streak))
    app.add_handler(CommandHandler("status", status))
    app.add_handler(CallbackQueryHandler(on_answer, pattern=r"^ans:"))
    # Check every minute for users whose chosen reminder time has arrived.
    app.job_queue.run_repeating(remind_tick, interval=60, first=10)
    return app


def main() -> None:
    app = build_app()
    logger.info("Ilm AI bot starting (polling)...")
    app.run_polling()


if __name__ == "__main__":
    main()

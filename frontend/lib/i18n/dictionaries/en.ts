// English is the source of truth: every key the app uses must exist here.
// ru.ts / uz.ts are partial overrides that fall back to these strings.
// {placeholders} are filled by t(key, { placeholder: value }).
export const en = {
  // Navigation + account chrome
  "nav.library": "Library",
  "nav.chat": "Companion",
  "nav.quiz": "Quiz",
  "nav.gaps": "Gaps",
  "nav.plan": "Plan",
  "nav.profile": "Profile",
  "nav.billing": "Billing",
  "action.login": "Log in",
  "action.signup": "Sign up",
  "action.logout": "Log out",
  "lang.label": "Language",

  // Library
  "lib.title": "Your library",
  "lib.subtitle":
    "Upload your study materials. We extract, chunk and embed them so your companion can learn from them.",

  // Upload zone
  "upload.tab.file": "Upload file",
  "upload.tab.paste": "Paste text",
  "upload.collection": "Collection",
  "upload.uncategorized": "Uncategorized",
  "upload.uploading": "Uploading…",
  "upload.dropPrompt": "Drag & drop, or click to choose",
  "upload.fileTypes": "PDF, DOCX, TXT or an image",
  "upload.titlePlaceholder": "Title",
  "upload.pastePlaceholder": "Paste your notes or text here…",
  "upload.addText": "Add text",
  "upload.added": 'Added "{title}" ({count} chunks)',
  "upload.failed": '"{title}" failed: {error}',
  "upload.unknownError": "unknown error",
  "upload.uploadFailed": "Upload failed",
  "upload.saveFailed": "Could not save text",

  // Collections
  "collection.title": "Collections",
  "collection.subtitle": "Group your materials by topic.",
  "collection.newPlaceholder": "New collection name",
  "collection.add": "Add",
  "collection.rename": "Rename",
  "collection.delete": "Delete",
  "collection.renameTitle": "Rename collection",
  "collection.deleteTitle": "Delete collection?",
  "collection.deleteMessage":
    'Delete "{name}"? Its materials become uncategorized.',
  "collection.createFailed": "Could not create collection",
  "collection.renameFailed": "Could not rename collection",
  "collection.deleteFailed": "Could not delete collection",

  // Materials
  "material.title": "Your materials",
  "material.empty": "Nothing yet — upload a file or paste text to get started.",
  "material.chunks": "{count} chunks",
  "material.uncategorized": "Uncategorized",
  "material.unknown": "Unknown",
  "material.status.ready": "ready",
  "material.status.processing": "processing",
  "material.status.failed": "failed",
  "material.deleteTitle": "Delete material?",
  "material.deleteMessage":
    'Delete "{title}"? This removes its chunks and can\'t be undone.',
  "material.deleted": 'Deleted "{title}"',
  "material.deleteFailed": "Could not delete material",
  "material.deleteAria": "Delete {title}",

  // Shared
  "common.delete": "Delete",

  // Quiz
  "quiz.title": "Quiz",
  "quiz.collection": "Collection",
  "quiz.collectionHint":
    "Quiz from all your materials, or pick a specific collection.",
  "quiz.allMaterials": "All materials",
  "quiz.difficulty": "Difficulty",
  "quiz.difficulty.gentle": "Gentle",
  "quiz.difficulty.gentleDesc": "Definitions and key facts",
  "quiz.difficulty.solid": "Solid",
  "quiz.difficulty.solidDesc": "Mechanisms and relationships",
  "quiz.difficulty.expert": "Expert",
  "quiz.difficulty.expertDesc": "Application and analysis",
  "quiz.numQuestions": "Number of questions",
  "quiz.start": "Start quiz",
  "quiz.generateError":
    "Failed to generate questions. Make sure you have uploaded study materials.",
  "quiz.answerError": "Failed to submit answer.",
  "quiz.viewPricing": "View pricing →",
  "quiz.questionOf": "Question {current} of {total}",
  "quiz.typeAnswer": "Type your answer…",
  "quiz.correct": "Correct!",
  "quiz.incorrect": "Incorrect",
  "quiz.correctAnswer": "Correct answer:",
  "quiz.submit": "Submit",
  "quiz.seeResults": "See results",
  "quiz.nextQuestion": "Next question",
  "quiz.scoreCorrect": "{score} / {total} correct",
  "quiz.resultsDifficulty": "{difficulty} difficulty",
  "quiz.yourAnswer": "Your answer:",
  "quiz.tryAgain": "Try again",

  // Gaps
  "gaps.title": "Knowledge gaps",
  "gaps.subtitle":
    "Based on every quiz you've taken — updates as you practice more.",
  "gaps.loading": "Loading your report…",
  "gaps.loadError": "Could not load your gaps report.",
  "gaps.emptyTitle": "No gaps to show yet",
  "gaps.emptyBody":
    "Take a few quizzes and your strengths and weak spots will appear here.",
  "gaps.startQuiz": "Start a quiz",
  "gaps.needsWork": "Needs work",
  "gaps.missedSessions": "{wrong} missed · {sessions} sessions",
  "gaps.from": "From: {materials}",
  "gaps.knowWell": "What you know well",
  "gaps.accuracyStat": "{accuracy}% · {correct}/{total}",
  "gaps.revisit": "Revisit these materials",
  "gaps.covers": "Covers: {concepts}",

  // Plan
  "plan.title": "Learning plan",
  "plan.loading": "Loading your plan…",
  "plan.loadError": "Could not load your plan.",
  "plan.emptyTitle": "No plan yet",
  "plan.emptyBody":
    "Generate a day-by-day plan from your materials, your goal, and the gaps from your quizzes. Set a goal on your profile first for a date-aware plan.",
  "plan.generate": "Generate my plan",
  "plan.setGoal": "Set your goal",
  "plan.generateError":
    "Could not generate a plan. Upload materials and set a goal first.",
  "plan.staleWarning":
    "Your materials or results changed — this plan may be outdated.",
  "plan.regenerate": "Regenerate",
  "plan.target": "Target: {date}",
  "plan.regenerating": "Regenerating…",
  "plan.regeneratePlan": "Regenerate plan",

  // Profile
  "profile.title": "Your profile",
  "profile.subtitle": "Your account, progress, and learning goal.",
  "profile.learner": "Learner",
  "profile.accountSuffix": "{provider} account",
  "profile.statsSessions": "Sessions completed",
  "profile.statsTopics": "Topics covered",
  "profile.statsScore": "Knowledge score",
  "profile.goalTitle": "Your learning goal",
  "profile.goalHint": "What do you want to achieve, and by when?",
  "profile.goalPlaceholder":
    "e.g. Understand cloud architecture well enough to pass the AWS exam",
  "profile.targetDate": "Target date",
  "profile.saveGoal": "Save goal",
  "profile.goalSaved": "Goal saved",
  "profile.goalSaveError": "Could not save goal",
  "profile.telegram": "Telegram",
  "profile.connected": "Connected",
  "profile.currentStreak": "Current streak: {days} day(s)",
  "profile.longestStreak": "Longest streak: {days} day(s)",
  "profile.reminderAt":
    "Daily reminder at {time} (set it in the bot with /reminder)",
  "profile.noReminder": "No reminder set yet",
  "profile.reminderSetTitle": "Daily reminder time",
  "profile.reminderSave": "Save",
  "profile.reminderClear": "Clear",
  "profile.reminderSaved": "Reminder saved",
  "profile.reminderCleared": "Reminder cleared",
  "profile.reminderSaveError": "Could not save the reminder",
  "profile.telegramPitch":
    "Link Telegram to quiz yourself, get daily reminders, and build a streak — without opening the app.",
  "profile.openTelegram": "Open in Telegram to finish linking",
  "profile.connectTelegram": "Connect Telegram",

  // Billing
  "billing.title": "Billing",
  "billing.currentPlan": "Current plan",
  "billing.renewsOn": "Renews on {date}",
  "billing.endsOn": "Ends on {date} · won't renew",
  "billing.cancel": "Cancel",
  "billing.resume": "Resume",
  "billing.upgrade": "Upgrade",
  "billing.quizzesToday": "Quizzes today",
  "billing.uploads": "Uploads",
  "billing.unlimited": "unlimited",
  "billing.paymentHistory": "Payment history",
  "billing.noPayments": "No payments yet.",
  "billing.canceled":
    "Canceled. You'll keep premium until the current period ends.",
  "billing.cancelError": "Could not cancel. Try again later.",
  "billing.resumed": "Your subscription will continue.",
  "billing.resumeError": "Could not resume. Try again later.",
  "billing.upgradedToast": "Welcome to Premium! Your upgrade is being confirmed.",
  "billing.event.payment": "Payment",
  "billing.event.paymentFailed": "Payment failed",
  "billing.event.subStarted": "Subscription started",
  "billing.event.subCanceled": "Subscription canceled",

  // Pricing
  "pricing.title": "Pricing",
  "pricing.subtitle": "Learn for free, or go unlimited with premium.",
  "pricing.free": "Free",
  "pricing.premium": "Premium",
  "pricing.currentPlan": "Your current plan",
  "pricing.active": "Active",
  "pricing.upgradeWithCard": "Upgrade with card",
  "pricing.loginToUpgrade": "Log in to upgrade",
  "pricing.paymentMethods": "Card via Stripe · Payme available in Uzbekistan",
  "pricing.checkoutError": "Could not start checkout. Try again later.",
  "pricing.canceledToast": "Checkout canceled — upgrade whenever you're ready.",
  "pricing.free.f1": "3 quizzes per day",
  "pricing.free.f2": "Up to 5 uploaded materials",
  "pricing.free.f3": "AI companion chat",
  "pricing.free.f4": "Knowledge gaps & learning plan",
  "pricing.premium.f1": "Unlimited quizzes",
  "pricing.premium.f2": "Unlimited uploads",
  "pricing.premium.f3": "Priority response speed",
  "pricing.premium.f4": "Everything in Free",

  // Companion (chat)
  "chat.title": "Companion",
  "chat.newChat": "New chat",
  "chat.untitled": "Untitled",
  "chat.notConfigured":
    "The AI companion is not configured yet (missing API key).",
  "chat.genericError": "Something went wrong. Please try again.",
  "chat.empty": "Ask anything about your uploaded materials.",
  "chat.thinking": "Ilm is thinking…",
  "chat.inputPlaceholder": "Type your question…",
  "chat.send": "Send message",
} as const;

export type TKey = keyof typeof en;

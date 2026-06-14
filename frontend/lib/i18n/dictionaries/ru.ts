import type { TKey } from "./en";

// Russian overrides. Missing keys fall back to English (see lib/i18n/index.tsx).
// TODO(i18n): reviewed/expanded by a fluent Russian speaker.
export const ru: Partial<Record<TKey, string>> = {
  // Navigation + account chrome
  "nav.library": "Библиотека",
  "nav.chat": "Помощник",
  "nav.quiz": "Тест",
  "nav.gaps": "Пробелы",
  "nav.plan": "План",
  "nav.profile": "Профиль",
  "nav.billing": "Оплата",
  "action.login": "Войти",
  "action.signup": "Регистрация",
  "action.logout": "Выйти",
  "lang.label": "Язык",

  // Library
  "lib.title": "Ваша библиотека",
  "lib.subtitle":
    "Загрузите свои учебные материалы. Мы извлечём, разобьём и проиндексируем их, чтобы помощник мог на них учиться.",

  // Upload zone
  "upload.tab.file": "Загрузить файл",
  "upload.tab.paste": "Вставить текст",
  "upload.collection": "Коллекция",
  "upload.uncategorized": "Без категории",
  "upload.uploading": "Загрузка…",
  "upload.dropPrompt": "Перетащите файл или нажмите, чтобы выбрать",
  "upload.fileTypes": "PDF, DOCX, TXT или изображение",
  "upload.titlePlaceholder": "Название",
  "upload.pastePlaceholder": "Вставьте сюда свои заметки или текст…",
  "upload.addText": "Добавить текст",
  "upload.added": 'Добавлено «{title}» ({count} фрагментов)',
  "upload.failed": '«{title}» не удалось: {error}',
  "upload.unknownError": "неизвестная ошибка",
  "upload.uploadFailed": "Не удалось загрузить",
  "upload.saveFailed": "Не удалось сохранить текст",

  // Collections
  "collection.title": "Коллекции",
  "collection.subtitle": "Группируйте материалы по темам.",
  "collection.newPlaceholder": "Название новой коллекции",
  "collection.add": "Добавить",
  "collection.rename": "Переименовать",
  "collection.delete": "Удалить",
  "collection.renameTitle": "Переименовать коллекцию",
  "collection.deleteTitle": "Удалить коллекцию?",
  "collection.deleteMessage":
    'Удалить «{name}»? Её материалы станут без категории.',
  "collection.createFailed": "Не удалось создать коллекцию",
  "collection.renameFailed": "Не удалось переименовать коллекцию",
  "collection.deleteFailed": "Не удалось удалить коллекцию",

  // Materials
  "material.title": "Ваши материалы",
  "material.empty":
    "Пока пусто — загрузите файл или вставьте текст, чтобы начать.",
  "material.chunks": "{count} фрагментов",
  "material.uncategorized": "Без категории",
  "material.unknown": "Неизвестно",
  "material.status.ready": "готово",
  "material.status.processing": "обработка",
  "material.status.failed": "ошибка",
  "material.deleteTitle": "Удалить материал?",
  "material.deleteMessage":
    'Удалить «{title}»? Это удалит его фрагменты без возможности восстановления.',
  "material.deleted": 'Удалено «{title}»',
  "material.deleteFailed": "Не удалось удалить материал",
  "material.deleteAria": "Удалить {title}",

  // Shared
  "common.delete": "Удалить",

  // Quiz
  "quiz.title": "Тест",
  "quiz.collection": "Коллекция",
  "quiz.collectionHint":
    "Тест по всем материалам или по выбранной коллекции.",
  "quiz.allMaterials": "Все материалы",
  "quiz.difficulty": "Сложность",
  "quiz.difficulty.gentle": "Лёгкая",
  "quiz.difficulty.gentleDesc": "Определения и ключевые факты",
  "quiz.difficulty.solid": "Средняя",
  "quiz.difficulty.solidDesc": "Механизмы и связи",
  "quiz.difficulty.expert": "Сложная",
  "quiz.difficulty.expertDesc": "Применение и анализ",
  "quiz.numQuestions": "Количество вопросов",
  "quiz.start": "Начать тест",
  "quiz.generateError":
    "Не удалось сгенерировать вопросы. Убедитесь, что вы загрузили учебные материалы.",
  "quiz.answerError": "Не удалось отправить ответ.",
  "quiz.viewPricing": "Посмотреть тарифы →",
  "quiz.questionOf": "Вопрос {current} из {total}",
  "quiz.typeAnswer": "Введите свой ответ…",
  "quiz.correct": "Верно!",
  "quiz.incorrect": "Неверно",
  "quiz.correctAnswer": "Правильный ответ:",
  "quiz.submit": "Отправить",
  "quiz.seeResults": "Посмотреть результаты",
  "quiz.nextQuestion": "Следующий вопрос",
  "quiz.scoreCorrect": "{score} / {total} верно",
  "quiz.resultsDifficulty": "Сложность: {difficulty}",
  "quiz.yourAnswer": "Ваш ответ:",
  "quiz.tryAgain": "Попробовать снова",

  // Gaps
  "gaps.title": "Пробелы в знаниях",
  "gaps.subtitle":
    "На основе всех пройденных тестов — обновляется по мере практики.",
  "gaps.loading": "Загрузка отчёта…",
  "gaps.loadError": "Не удалось загрузить отчёт о пробелах.",
  "gaps.emptyTitle": "Пока нечего показать",
  "gaps.emptyBody":
    "Пройдите несколько тестов, и здесь появятся ваши сильные и слабые стороны.",
  "gaps.startQuiz": "Начать тест",
  "gaps.needsWork": "Нужно подтянуть",
  "gaps.missedSessions": "{wrong} ошибок · {sessions} сессий",
  "gaps.from": "Из: {materials}",
  "gaps.knowWell": "Что вы знаете хорошо",
  "gaps.accuracyStat": "{accuracy}% · {correct}/{total}",
  "gaps.revisit": "Повторите эти материалы",
  "gaps.covers": "Охватывает: {concepts}",

  // Plan
  "plan.title": "Учебный план",
  "plan.loading": "Загрузка плана…",
  "plan.loadError": "Не удалось загрузить план.",
  "plan.emptyTitle": "Плана пока нет",
  "plan.emptyBody":
    "Создайте план по дням на основе ваших материалов, цели и пробелов из тестов. Сначала задайте цель в профиле для плана с учётом сроков.",
  "plan.generate": "Создать план",
  "plan.setGoal": "Задать цель",
  "plan.generateError":
    "Не удалось создать план. Сначала загрузите материалы и задайте цель.",
  "plan.staleWarning":
    "Ваши материалы или результаты изменились — этот план может быть устаревшим.",
  "plan.regenerate": "Пересоздать",
  "plan.target": "Срок: {date}",
  "plan.regenerating": "Пересоздание…",
  "plan.regeneratePlan": "Пересоздать план",

  // Profile
  "profile.title": "Ваш профиль",
  "profile.subtitle": "Ваш аккаунт, прогресс и учебная цель.",
  "profile.learner": "Ученик",
  "profile.accountSuffix": "Аккаунт {provider}",
  "profile.statsSessions": "Сессий пройдено",
  "profile.statsTopics": "Тем охвачено",
  "profile.statsScore": "Уровень знаний",
  "profile.goalTitle": "Ваша учебная цель",
  "profile.goalHint": "Чего вы хотите достичь и к какому сроку?",
  "profile.goalPlaceholder":
    "напр. Разобраться в облачной архитектуре, чтобы сдать экзамен AWS",
  "profile.targetDate": "Целевая дата",
  "profile.saveGoal": "Сохранить цель",
  "profile.goalSaved": "Цель сохранена",
  "profile.goalSaveError": "Не удалось сохранить цель",
  "profile.telegram": "Telegram",
  "profile.connected": "Подключено",
  "profile.currentStreak": "Текущая серия: {days} дн.",
  "profile.longestStreak": "Лучшая серия: {days} дн.",
  "profile.reminderAt":
    "Ежедневное напоминание в {time} (задайте в боте через /reminder)",
  "profile.noReminder": "Напоминание пока не задано",
  "profile.reminderSetTitle": "Время ежедневного напоминания",
  "profile.reminderSave": "Сохранить",
  "profile.reminderClear": "Очистить",
  "profile.reminderSaved": "Напоминание сохранено",
  "profile.reminderCleared": "Напоминание удалено",
  "profile.reminderSaveError": "Не удалось сохранить напоминание",
  "profile.telegramPitch":
    "Подключите Telegram, чтобы проходить тесты, получать ежедневные напоминания и поддерживать серию — не открывая приложение.",
  "profile.openTelegram": "Открыть в Telegram, чтобы завершить привязку",
  "profile.connectTelegram": "Подключить Telegram",
  "profile.telegramLinkError": "Не удалось начать привязку Telegram. Попробуйте ещё раз.",

  // Billing
  "billing.title": "Оплата",
  "billing.currentPlan": "Текущий тариф",
  "billing.renewsOn": "Продлевается {date}",
  "billing.endsOn": "Заканчивается {date} · без продления",
  "billing.cancel": "Отменить",
  "billing.resume": "Возобновить",
  "billing.upgrade": "Улучшить",
  "billing.quizzesToday": "Тестов сегодня",
  "billing.uploads": "Загрузки",
  "billing.unlimited": "без ограничений",
  "billing.paymentHistory": "История платежей",
  "billing.noPayments": "Платежей пока нет.",
  "billing.canceled":
    "Отменено. Премиум сохранится до конца текущего периода.",
  "billing.cancelError": "Не удалось отменить. Попробуйте позже.",
  "billing.resumed": "Ваша подписка будет продолжена.",
  "billing.resumeError": "Не удалось возобновить. Попробуйте позже.",
  "billing.upgradedToast": "Добро пожаловать в Премиум! Улучшение подтверждается.",
  "billing.event.payment": "Платёж",
  "billing.event.paymentFailed": "Платёж не прошёл",
  "billing.event.subStarted": "Подписка оформлена",
  "billing.event.subCanceled": "Подписка отменена",

  // Pricing
  "pricing.title": "Тарифы",
  "pricing.subtitle": "Учитесь бесплатно или без ограничений с премиумом.",
  "pricing.free": "Бесплатно",
  "pricing.premium": "Премиум",
  "pricing.currentPlan": "Ваш текущий тариф",
  "pricing.active": "Активен",
  "pricing.upgradeWithCard": "Оплатить картой",
  "pricing.loginToUpgrade": "Войдите, чтобы улучшить",
  "pricing.paymentMethods": "Карта через Stripe · Payme доступен в Узбекистане",
  "pricing.checkoutError": "Не удалось начать оплату. Попробуйте позже.",
  "pricing.canceledToast": "Оплата отменена — улучшите, когда будете готовы.",
  "pricing.free.f1": "3 теста в день",
  "pricing.free.f2": "До 5 загруженных материалов",
  "pricing.free.f3": "Чат с ИИ-помощником",
  "pricing.free.f4": "Пробелы в знаниях и учебный план",
  "pricing.premium.f1": "Безлимитные тесты",
  "pricing.premium.f2": "Безлимитные загрузки",
  "pricing.premium.f3": "Приоритетная скорость ответа",
  "pricing.premium.f4": "Всё из бесплатного",

  // Companion (chat)
  "chat.title": "Помощник",
  "chat.newChat": "Новый чат",
  "chat.untitled": "Без названия",
  "chat.notConfigured":
    "ИИ-помощник ещё не настроен (отсутствует ключ API).",
  "chat.genericError": "Что-то пошло не так. Попробуйте ещё раз.",
  "chat.empty": "Спросите что угодно о ваших загруженных материалах.",
  "chat.thinking": "Ilm думает…",
  "chat.inputPlaceholder": "Введите свой вопрос…",
  "chat.send": "Отправить сообщение",
};

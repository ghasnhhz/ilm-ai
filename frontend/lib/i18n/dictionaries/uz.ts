import type { TKey } from "./en";

// Uzbek overrides. Missing keys fall back to English (see lib/i18n/index.tsx).
// TODO(i18n): reviewed/expanded by a fluent Uzbek speaker.
export const uz: Partial<Record<TKey, string>> = {
  // Navigation + account chrome
  "nav.library": "Kutubxona",
  "nav.chat": "Hamroh",
  "nav.quiz": "Test",
  "nav.gaps": "Bo'shliqlar",
  "nav.plan": "Reja",
  "nav.profile": "Profil",
  "nav.billing": "To'lov",
  "action.login": "Kirish",
  "action.signup": "Ro'yxatdan o'tish",
  "action.logout": "Chiqish",
  "lang.label": "Til",

  // Library
  "lib.title": "Sizning kutubxonangiz",
  "lib.subtitle":
    "O'quv materiallaringizni yuklang. Biz ularni ajratib, bo'laklab va indekslab beramiz, shunda hamrohingiz ulardan o'rganadi.",

  // Upload zone
  "upload.tab.file": "Fayl yuklash",
  "upload.tab.paste": "Matn joylash",
  "upload.collection": "To'plam",
  "upload.uncategorized": "Turkumlanmagan",
  "upload.uploading": "Yuklanmoqda…",
  "upload.dropPrompt": "Faylni tashlang yoki tanlash uchun bosing",
  "upload.fileTypes": "PDF, DOCX yoki TXT",
  "upload.titlePlaceholder": "Sarlavha",
  "upload.pastePlaceholder": "Eslatma yoki matningizni shu yerga joylang…",
  "upload.addText": "Matn qo'shish",
  "upload.added": '"{title}" qo\'shildi ({count} bo\'lak)',
  "upload.failed": '"{title}" muvaffaqiyatsiz: {error}',
  "upload.unknownError": "noma'lum xato",
  "upload.uploadFailed": "Yuklab bo'lmadi",
  "upload.saveFailed": "Matnni saqlab bo'lmadi",

  // Collections
  "collection.title": "To'plamlar",
  "collection.subtitle": "Materiallaringizni mavzu bo'yicha guruhlang.",
  "collection.newPlaceholder": "Yangi to'plam nomi",
  "collection.add": "Qo'shish",
  "collection.rename": "Nomini o'zgartirish",
  "collection.delete": "O'chirish",
  "collection.renameTitle": "To'plam nomini o'zgartirish",
  "collection.deleteTitle": "To'plam o'chirilsinmi?",
  "collection.deleteMessage":
    '"{name}" o\'chirilsinmi? Uning materiallari turkumlanmagan bo\'lib qoladi.',
  "collection.createFailed": "To'plam yaratib bo'lmadi",
  "collection.renameFailed": "To'plam nomini o'zgartirib bo'lmadi",
  "collection.deleteFailed": "To'plamni o'chirib bo'lmadi",

  // Materials
  "material.title": "Sizning materiallaringiz",
  "material.empty":
    "Hozircha bo'sh — boshlash uchun fayl yuklang yoki matn joylang.",
  "material.chunks": "{count} bo'lak",
  "material.uncategorized": "Turkumlanmagan",
  "material.unknown": "Noma'lum",
  "material.status.ready": "tayyor",
  "material.status.processing": "qayta ishlanmoqda",
  "material.status.failed": "xato",
  "material.deleteTitle": "Material o'chirilsinmi?",
  "material.deleteMessage":
    '"{title}" o\'chirilsinmi? Bu uning bo\'laklarini o\'chiradi va qaytarib bo\'lmaydi.',
  "material.deleted": '"{title}" o\'chirildi',
  "material.deleteFailed": "Materialni o'chirib bo'lmadi",
  "material.deleteAria": "{title} o'chirish",

  // Shared
  "common.delete": "O'chirish",

  // Quiz
  "quiz.title": "Test",
  "quiz.collection": "To'plam",
  "quiz.collectionHint":
    "Barcha materiallar bo'yicha yoki tanlangan to'plam bo'yicha test.",
  "quiz.allMaterials": "Barcha materiallar",
  "quiz.difficulty": "Qiyinlik",
  "quiz.difficulty.gentle": "Yengil",
  "quiz.difficulty.gentleDesc": "Ta'riflar va asosiy faktlar",
  "quiz.difficulty.solid": "O'rta",
  "quiz.difficulty.solidDesc": "Mexanizmlar va bog'lanishlar",
  "quiz.difficulty.expert": "Murakkab",
  "quiz.difficulty.expertDesc": "Qo'llash va tahlil",
  "quiz.numQuestions": "Savollar soni",
  "quiz.start": "Testni boshlash",
  "quiz.generateError":
    "Savollarni yaratib bo'lmadi. O'quv materiallari yuklanganiga ishonch hosil qiling.",
  "quiz.answerError": "Javobni yuborib bo'lmadi.",
  "quiz.viewPricing": "Tariflarni ko'rish →",
  "quiz.questionOf": "{total} dan {current}-savol",
  "quiz.typeAnswer": "Javobingizni yozing…",
  "quiz.correct": "To'g'ri!",
  "quiz.incorrect": "Noto'g'ri",
  "quiz.correctAnswer": "To'g'ri javob:",
  "quiz.submit": "Yuborish",
  "quiz.seeResults": "Natijalarni ko'rish",
  "quiz.nextQuestion": "Keyingi savol",
  "quiz.scoreCorrect": "{score} / {total} to'g'ri",
  "quiz.resultsDifficulty": "Qiyinlik: {difficulty}",
  "quiz.yourAnswer": "Sizning javobingiz:",
  "quiz.tryAgain": "Qayta urinish",

  // Gaps
  "gaps.title": "Bilim bo'shliqlari",
  "gaps.subtitle":
    "Siz ishlagan barcha testlar asosida — mashq qilgan sari yangilanadi.",
  "gaps.loading": "Hisobot yuklanmoqda…",
  "gaps.loadError": "Bo'shliqlar hisobotini yuklab bo'lmadi.",
  "gaps.emptyTitle": "Hozircha ko'rsatadigan narsa yo'q",
  "gaps.emptyBody":
    "Bir nechta test ishlang, shunda kuchli va zaif tomonlaringiz shu yerda paydo bo'ladi.",
  "gaps.startQuiz": "Testni boshlash",
  "gaps.needsWork": "Ishlash kerak",
  "gaps.missedSessions": "{wrong} xato · {sessions} sessiya",
  "gaps.from": "Manba: {materials}",
  "gaps.knowWell": "Yaxshi bilganlaringiz",
  "gaps.accuracyStat": "{accuracy}% · {correct}/{total}",
  "gaps.revisit": "Ushbu materiallarni qayta ko'ring",
  "gaps.covers": "Qamrab oladi: {concepts}",

  // Plan
  "plan.title": "O'quv rejasi",
  "plan.loading": "Reja yuklanmoqda…",
  "plan.loadError": "Rejani yuklab bo'lmadi.",
  "plan.emptyTitle": "Hozircha reja yo'q",
  "plan.emptyBody":
    "Materiallaringiz, maqsadingiz va testlardagi bo'shliqlar asosida kunma-kun reja yarating. Muddatga moslangan reja uchun avval profilingizda maqsad belgilang.",
  "plan.generate": "Reja yaratish",
  "plan.setGoal": "Maqsad belgilash",
  "plan.generateError":
    "Reja yaratib bo'lmadi. Avval materiallar yuklang va maqsad belgilang.",
  "plan.staleWarning":
    "Materiallaringiz yoki natijalaringiz o'zgardi — bu reja eskirgan bo'lishi mumkin.",
  "plan.regenerate": "Qayta yaratish",
  "plan.target": "Muddat: {date}",
  "plan.regenerating": "Qayta yaratilmoqda…",
  "plan.regeneratePlan": "Rejani qayta yaratish",

  // Profile
  "profile.title": "Sizning profilingiz",
  "profile.subtitle": "Hisobingiz, taraqqiyotingiz va o'quv maqsadingiz.",
  "profile.learner": "O'quvchi",
  "profile.accountSuffix": "{provider} hisobi",
  "profile.statsSessions": "Tugatilgan sessiyalar",
  "profile.statsTopics": "Qamralgan mavzular",
  "profile.statsScore": "Bilim darajasi",
  "profile.goalTitle": "Sizning o'quv maqsadingiz",
  "profile.goalHint": "Nimaga va qaysi muddatga erishmoqchisiz?",
  "profile.goalPlaceholder":
    "masalan: AWS imtihonini topshirish uchun bulutli arxitekturani yetarlicha tushunish",
  "profile.targetDate": "Maqsadli sana",
  "profile.saveGoal": "Maqsadni saqlash",
  "profile.goalSaved": "Maqsad saqlandi",
  "profile.goalSaveError": "Maqsadni saqlab bo'lmadi",
  "profile.telegram": "Telegram",
  "profile.connected": "Ulangan",
  "profile.currentStreak": "Joriy seriya: {days} kun",
  "profile.longestStreak": "Eng uzun seriya: {days} kun",
  "profile.reminderAt":
    "Har kunlik eslatma {time} da (botda /reminder orqali belgilang)",
  "profile.noReminder":
    "Eslatma belgilanmagan — botga /reminder SS:DD yuboring",
  "profile.telegramPitch":
    "O'zingizni sinash, kunlik eslatmalar olish va seriya yig'ish uchun Telegramni ulang — ilovani ochmasdan.",
  "profile.openTelegram": "Ulashni yakunlash uchun Telegramda oching",
  "profile.connectTelegram": "Telegramni ulash",

  // Billing
  "billing.title": "To'lov",
  "billing.currentPlan": "Joriy reja",
  "billing.renewsOn": "{date} da yangilanadi",
  "billing.endsOn": "{date} da tugaydi · yangilanmaydi",
  "billing.cancel": "Bekor qilish",
  "billing.resume": "Davom ettirish",
  "billing.upgrade": "Yaxshilash",
  "billing.quizzesToday": "Bugungi testlar",
  "billing.uploads": "Yuklamalar",
  "billing.unlimited": "cheksiz",
  "billing.paymentHistory": "To'lovlar tarixi",
  "billing.noPayments": "Hozircha to'lovlar yo'q.",
  "billing.canceled":
    "Bekor qilindi. Joriy davr tugaguncha premium saqlanadi.",
  "billing.cancelError": "Bekor qilib bo'lmadi. Keyinroq urinib ko'ring.",
  "billing.resumed": "Obunangiz davom etadi.",
  "billing.resumeError": "Davom ettirib bo'lmadi. Keyinroq urinib ko'ring.",
  "billing.upgradedToast": "Premiumga xush kelibsiz! Yaxshilash tasdiqlanmoqda.",
  "billing.event.payment": "To'lov",
  "billing.event.paymentFailed": "To'lov amalga oshmadi",
  "billing.event.subStarted": "Obuna boshlandi",
  "billing.event.subCanceled": "Obuna bekor qilindi",

  // Pricing
  "pricing.title": "Tariflar",
  "pricing.subtitle": "Bepul o'rganing yoki premium bilan cheksiz foydalaning.",
  "pricing.free": "Bepul",
  "pricing.premium": "Premium",
  "pricing.currentPlan": "Sizning joriy rejangiz",
  "pricing.active": "Faol",
  "pricing.upgradeWithCard": "Karta bilan to'lash",
  "pricing.loginToUpgrade": "Yaxshilash uchun kiring",
  "pricing.paymentMethods": "Stripe orqali karta · Payme O'zbekistonda mavjud",
  "pricing.checkoutError": "To'lovni boshlab bo'lmadi. Keyinroq urinib ko'ring.",
  "pricing.canceledToast": "To'lov bekor qilindi — tayyor bo'lganingizda yaxshilang.",
  "pricing.free.f1": "Kuniga 3 ta test",
  "pricing.free.f2": "5 tagacha yuklangan material",
  "pricing.free.f3": "AI hamroh bilan suhbat",
  "pricing.free.f4": "Bilim bo'shliqlari va o'quv rejasi",
  "pricing.premium.f1": "Cheksiz testlar",
  "pricing.premium.f2": "Cheksiz yuklamalar",
  "pricing.premium.f3": "Ustuvor javob tezligi",
  "pricing.premium.f4": "Bepul rejadagi hamma narsa",

  // Companion (chat)
  "chat.title": "Hamroh",
  "chat.newChat": "Yangi suhbat",
  "chat.untitled": "Nomsiz",
  "chat.notConfigured":
    "AI hamroh hali sozlanmagan (API kaliti yo'q).",
  "chat.genericError": "Nimadir xato ketdi. Qaytadan urinib ko'ring.",
  "chat.empty": "Yuklagan materiallaringiz haqida istalgan narsani so'rang.",
  "chat.thinking": "Ilm o'ylayapti…",
  "chat.inputPlaceholder": "Savolingizni yozing…",
  "chat.send": "Xabar yuborish",
};

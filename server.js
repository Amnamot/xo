// server.js
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { PrismaClient } = require("@prisma/client");

dotenv.config();

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

// 🔐 Обработка авторизации из Telegram WebApp
app.post("/api/auth", async (req, res) => {
  const { telegramId, name } = req.body;

  // 🔍 Логирование тела запроса
  console.log("📩 Пришёл запрос на /api/auth:");
  console.log("→ telegramId:", telegramId);
  console.log("→ name:", name);

  if (!telegramId || !name) {
    console.warn("⚠️ Недостаточно данных: telegramId или name отсутствует");
    return res.status(400).json({ error: "Missing telegramId or name" });
  }

  try {
    const user = await prisma.user.upsert({
      where: { telegramId },
      update: { name },
      create: { telegramId, name },
    });
    console.log("✅ Пользователь успешно сохранён:", user);
    res.json({ success: true, user });
  } catch (error) {
    console.error("❌ Ошибка при сохранении пользователя:", error);
    res.status(500).json({ success: false, error: "Ошибка сервера" });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
});

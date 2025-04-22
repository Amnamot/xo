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

  if (!telegramId || !name) {
    return res.status(400).json({ error: "Missing telegramId or name" });
  }

  try {
    const user = await prisma.user.upsert({
      where: { telegramId },
      update: { name },
      create: { telegramId, name },
    });
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

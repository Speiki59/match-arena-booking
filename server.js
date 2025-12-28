import express from "express";
import cors from "cors";
import sqlite3 from "sqlite3";
import { randomUUID } from "crypto";

const TELEGRAM_TOKEN = "8538575843:AAEADUT8Z6782AVyMBm3YyURc2OCcGoWfto";
const TELEGRAM_CHAT_ID = "1173996247";
const app = express();
app.use(cors());
app.use(express.json());

const db = new sqlite3.Database("./db.sqlite");

db.run(`
  CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    date TEXT,
    time TEXT,
    hall TEXT,
    name TEXT,
    phone TEXT,
    created_at TEXT
  )
`);

app.get("/availability", (req, res) => {
  const { date, hall } = req.query;

  db.all(
    "SELECT time FROM bookings WHERE date = ? AND hall = ?",
    [date, hall],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows.map(r => r.time));
    }
  );
});

app.post("/booking", (req, res) => {
  const { date, time, hall, name, phone } = req.body;

  if (!date || !time || !hall || !name || !phone) {
    return res.status(400).json({ error: "Missing fields" });
  }

  db.get(
    "SELECT * FROM bookings WHERE date = ? AND time = ? AND hall = ?",
    [date, time, hall],
    (err, row) => {
      if (row) {
        return res.status(409).json({ error: "Slot already booked" });
      }

      db.run(
        "INSERT INTO bookings VALUES (?, ?, ?, ?, ?, ?, ?)",
        [
          randomUUID(),
          date,
          time,
          hall,
          name,
          phone,
          new Date().toISOString()
        ],
        () => {
  const text = `
🏟 Новое бронирование
📅 Дата: ${date}
⏰ Время: ${time}
🏠 Поле: ${hall}
👤 Имя: ${name}
📞 Телефон: ${phone}
`;

  fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text
    })
  });

  res.json({ success: true });
}

      );
    }
  );
});

const PORT = process.env.PORT || 3000;
app.get("/bookings", (req, res) => {
  db.all(
    "SELECT date, time, hall, name, phone FROM bookings ORDER BY date, time",
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});

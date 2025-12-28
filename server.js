import express from "express";
import cors from "cors";
import sqlite3 from "sqlite3";
import { randomUUID } from "crypto";

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
        () => res.json({ success: true })
      );
    }
  );
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});

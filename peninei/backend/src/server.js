// server.js
const express = require("express");
const { PrismaClient } = require("@prisma/client");
const scheduler = require("./scheduled");

scheduler();

const app = express();
const prisma = new PrismaClient();

app.use(express.json());

app.get("/api/halachas/:date", async (req, res) => {
    const dateParam = req.params.date;

    const date = new Date(dateParam);

    if (isNaN(date.getTime())) {
        return res.status(400).json({ error: "Invalid date format" });
    }

    const halachot = await prisma.halacha.findMany({ where: { date } });
    return halachot;
});

app.get("/api/available-dates", async (req, res) => {
    const month = req.query.month;

    let where = {};

    if (month) {
        const [year, m] = month.split("-").map(Number);
        const start = new Date(year, m - 1, 1);
        const end = new Date(year, m, 1);
        where = { date: { gte: start, lt: end } };
    }

    const events = await prisma.halacha.findMany({
        where,
        select: { date: true },
    });

    const dates = [
        ...new Set(events.map((e) => e.date.toISOString().split("T")[0])),
    ];

    res.json({ dates });
});

const PORT = process.env.API_PORT || 5001;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

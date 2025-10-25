import React, { useEffect, useState } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { api } from "../utils";

export default function CalendarSelector({ selectedDate, onDateChange }) {
    const [availableDates, setAvailableDates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [month, setMonth] = useState(() => {
        const d = selectedDate || new Date();
        return new Date(d.getFullYear(), d.getMonth(), 1);
    });
    const [open, setOpen] = useState(false);

    useEffect(() => {
        async function fetchAvailableDates() {
            setLoading(true);
            try {
                const ym = `${month.getFullYear()}-${String(
                    month.getMonth() + 1
                ).padStart(2, "0")}`;
                const res = await api.get(`/available-dates?month=${ym}`);
                setAvailableDates(res.data.dates || []);
            } finally {
                setLoading(false);
            }
        }
        fetchAvailableDates();
    }, [month]);

    // Convert available date strings to Date objects
    const availableDateObjs = availableDates.map((d) => new Date(d));

    // Helper to format date as YYYY-MM-DD in UTC, but match backend 6am UTC storage
    function toBackendDateString(date) {
        // Add one day to correct for off-by-one bug
        const corrected = new Date(date);
        corrected.setDate(corrected.getDate() + 1);
        // Create a new date at 6am UTC for the corrected day
        const d = new Date(
            Date.UTC(
                corrected.getUTCFullYear(),
                corrected.getUTCMonth(),
                corrected.getUTCDate(),
                6,
                0,
                0,
                0
            )
        );
        // Format as YYYY-MM-DD
        return (
            d.getUTCFullYear() +
            "-" +
            String(d.getUTCMonth() + 1).padStart(2, "0") +
            "-" +
            String(d.getUTCDate()).padStart(2, "0")
        );
    }

    return (
        <div className="flex flex-col items-center mb-8">
            <button
                className="mb-2 px-6 py-2 rounded-full bg-purple-600 text-white font-bold shadow hover:bg-purple-700 transition-all"
                onClick={() => setOpen((v) => !v)}
            >
                {open ? "Hide Calendar" : "Show Available Dates"}
            </button>
            <div
                className={`transition-all duration-500 ${
                    open
                        ? "max-h-[600px] opacity-100 scale-100"
                        : "max-h-0 opacity-0 scale-95"
                } overflow-hidden w-full`}
                style={{ minWidth: 280 }}
            >
                <label className="mb-2 font-semibold text-purple-800 text-lg block text-center">
                    Select a Date
                </label>
                <div className="rounded-2xl shadow-lg border border-purple-200 bg-white/80 p-2 flex justify-center">
                    <DayPicker
                        mode="single"
                        selected={selectedDate}
                        onSelect={onDateChange}
                        month={month}
                        onMonthChange={setMonth}
                        modifiers={{ available: availableDateObjs }}
                        modifiersClassNames={{
                            available:
                                "bg-purple-200 text-purple-900 font-bold rounded-full",
                            selected: "bg-purple-500 text-white",
                            today: "border border-purple-400",
                        }}
                        disabled={(date) =>
                            !availableDates.includes(toBackendDateString(date))
                        }
                        showOutsideDays
                        weekStartsOn={0}
                        styles={{
                            caption: { color: "#6C47FF", fontWeight: 700 },
                        }}
                    />
                </div>
            </div>
        </div>
    );
}

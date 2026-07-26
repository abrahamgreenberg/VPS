import React, { useEffect, useState } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { api, toBackendDateString, parseBackendDateString } from "../utils";
import { useLocalStorage } from "../hooks/useLocalStorage";

export default function CalendarSelector({ selectedDate, onDateChange }) {
    const [apiAvailableDates, setApiAvailableDates] = useState(null);
    const [loading, setLoading] = useState(true);
    const [month, setMonth] = useState(() => {
        const d = selectedDate || new Date();
        return new Date(d.getFullYear(), d.getMonth(), 1);
    });
    const [open, setOpen] = useState(false);
    const { clientHalachot } = useLocalStorage();
    useEffect(() => {
        async function fetchAvailableDates() {
            setLoading(true);
            try {
                const ym = `${month.getFullYear()}-${String(
                    month.getMonth() + 1
                ).padStart(2, "0")}`;
                const res = await api.get(`/available-dates?month=${ym}`);
                setApiAvailableDates(res.data.dates || null);
            } finally {
                setLoading(false);
            }
        }
        fetchAvailableDates();
    }, [month]);

    const availableDates =
        apiAvailableDates || clientHalachot?.map((h) => h.dateString);

    const availableDateObjs = availableDates.map(parseBackendDateString);

    if (loading) return <div>Loading...</div>;

    return (
        <div className="flex flex-col items-center">
            <button
                className="px-6 py-2 rounded-full bg-purple-600 text-white font-bold shadow hover:bg-purple-700 transition-all"
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

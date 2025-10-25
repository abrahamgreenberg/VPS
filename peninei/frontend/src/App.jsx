import { useEffect, useState } from "react";
import { getTodayISODate, api } from "./utils";
import HalachaCard from "./components/HalachaCard";
import DisclaimerPopup from "./components/DisclaimerPopup";
import CalendarSelector from "./components/CalendarSelector";

export default function App() {
    const [halachot, setHalachot] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showWarning, setShowWarning] = useState(false);
    const [selectedDate, setSelectedDate] = useState(() => {
        // Default to today
        const today = getTodayISODate();
        return new Date(today);
    });

    useEffect(() => {
        const fetchHalacha = async () => {
            setLoading(true);
            setError(null);
            try {
                // Add one day to selectedDate to fix off-by-one bug
                const corrected = new Date(selectedDate);
                corrected.setDate(corrected.getDate() + 1);
                const isoDate = corrected.toISOString().split("T")[0];
                const res = await api.get(`/halachas/${isoDate}`);
                setHalachot(res.data);
            } catch (err) {
                setError("Failed to load halacha for selected date.");
            } finally {
                setLoading(false);
            }
        };
        if (selectedDate) fetchHalacha();
    }, [selectedDate]);

    return (
        <div
            className="min-h-screen bg-gradient-to-br from-purple-200/60 via-white/80 to-indigo-400/60 flex flex-col items-center py-10 px-4 relative"
            style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
        >
            <CalendarSelector
                selectedDate={selectedDate}
                onDateChange={(date) => setSelectedDate(date)}
            />
            {loading && <div>Loading...</div>}
            {error && <div className="text-red-600 font-bold">{error}</div>}
            {halachot && halachot.length === 0 && (
                <div>No halacha found for this date.</div>
            )}
            {halachot &&
                halachot.map((halacha) => (
                    <HalachaCard key={halacha.id} halacha={halacha} />
                ))}

            {/* Collapsible warning box at the bottom */}
            <DisclaimerPopup show={showWarning} setShow={setShowWarning} />
        </div>
    );
}

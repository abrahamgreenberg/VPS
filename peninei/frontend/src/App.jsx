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
    const [displayMode, setDisplayMode] = useState("both"); // "he", "en", "both"

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
            {/* Top bar: calendar selector + tab group */}
            <div className="w-full max-w-2xl flex flex-col sm:flex-row items-center justify-between mb-6">
                <CalendarSelector
                    selectedDate={selectedDate}
                    onDateChange={(date) => setSelectedDate(date)}
                />
                <div className="flex mt-4 sm:mt-0">
                    <button
                        className={`px-4 py-2 rounded-l border border-indigo-600 transition-colors duration-100
                            ${
                                displayMode === "he"
                                    ? "bg-purple-600 text-white"
                                    : "bg-white text-purple-600"
                            }`}
                        style={{
                            borderRightWidth: 0,
                        }}
                        onClick={() => setDisplayMode("he")}
                    >
                        עברית בלבד
                    </button>
                    <button
                        className={`px-4 py-2 border-t border-b border-indigo-600 transition-colors duration-100
                                    ${
                                        displayMode === "both"
                                            ? "bg-purple-600 text-white"
                                            : "bg-white text-purple-600"
                                    }`}
                        style={{
                            borderLeftWidth: 0,
                        }}
                        onClick={() => setDisplayMode("both")}
                    >
                        Both
                    </button>
                    <button
                        className={`px-4 py-2 rounded-r border border-indigo-600 transition-colors duration-100
                            ${
                                displayMode === "en"
                                    ? "bg-purple-600 text-white"
                                    : "bg-white text-purple-600"
                            }`}
                        style={{
                            borderLeftWidth: 0,
                            borderRightWidth: 0,
                        }}
                        onClick={() => setDisplayMode("en")}
                    >
                        English Only
                    </button>
                </div>
            </div>

            {loading && <div>Loading...</div>}
            {error && <div className="text-red-600 font-bold">{error}</div>}
            {halachot && halachot.length === 0 && (
                <div>No halacha found for this date.</div>
            )}
            {halachot &&
                halachot.map((halacha) => (
                    <HalachaCard
                        key={halacha.id}
                        halacha={halacha}
                        displayMode={displayMode}
                    />
                ))}

            {/* Move DisclaimerPopup to the very bottom */}
            <div className="fixed bottom-0 left-0 w-full flex justify-center z-50">
                <DisclaimerPopup show={showWarning} setShow={setShowWarning} />
            </div>
        </div>
    );
}

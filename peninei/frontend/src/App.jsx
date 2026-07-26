import { useEffect, useState, useRef } from "react";
import { toBackendDateString, api } from "./utils";
import HalachaCard from "./components/HalachaCard";
import DisclaimerPopup from "./components/DisclaimerPopup";
import CalendarSelector from "./components/CalendarSelector";
import { useLocalStorage } from "./hooks/useLocalStorage";

function todayAtLocalMidnight() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export default function App() {
    const [apiHalachot, setApiHalachot] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showWarning, setShowWarning] = useState(false);
    const [selectedDate, setSelectedDate] = useState(todayAtLocalMidnight);
    const [displayMode, setDisplayMode] = useState("both");
    const { clientHalachot, updateClientHalachot } = useLocalStorage();
    const hasSynced = useRef(false);

    useEffect(() => {
        const fetchHalacha = async () => {
            setLoading(true);
            setError(null);
            const isoDate = toBackendDateString(selectedDate);

            try {
                const res = await api.get(`/halachas/${isoDate}`);
                setApiHalachot(res.data);
            } catch (err) {
                setError("Failed to load halacha.");
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        if (selectedDate) fetchHalacha();
    }, [selectedDate]);

    useEffect(() => {
        const syncHalachot = async () => {
            // Prevent double-execution in Strict Mode
            if (hasSynced.current) {
                return;
            }
            hasSynced.current = true;

            const lastSync = localStorage.getItem("halachaLastSync");
            const today = todayAtLocalMidnight();
            if (lastSync && new Date(lastSync).getTime() === today.getTime()) {
                // Already synced today
                return;
            }
            try {
                // Read fresh from localStorage to avoid stale closure
                const stored = localStorage.getItem("halachot");
                const currentHalachot = stored ? JSON.parse(stored) : [];
                const clientHalachotReq = currentHalachot.map((h) => [
                    h.id,
                    h.version,
                ]);
                const res = await api.post("/halachot/sync", {
                    clientHalachot: clientHalachotReq,
                });

                updateClientHalachot(res.data);
                localStorage.setItem("halachaLastSync", today.toISOString());
            } catch (err) {
                console.error("Failed to sync halachot:", err);
            }
        };
        syncHalachot();
    }, [updateClientHalachot]);

    // Use API halachot if available, otherwise fall back to client halachot
    const halachot =
        apiHalachot ||
        clientHalachot.filter((h) => {
            const isoDate = toBackendDateString(selectedDate);
            return h.dateString === isoDate;
        });

    return (
        <div
            className="min-h-screen bg-gradient-to-br from-purple-200/60 via-white/80 to-purple-400/60 flex flex-col items-center py-10 px-4 relative"
            style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
        >
            {/* Top bar: calendar selector + tab group */}
            <div className="w-full max-w-2xl flex flex-col sm:flex-row items-center justify-between mb-6">
                <CalendarSelector
                    selectedDate={selectedDate}
                    onDateChange={(date) => setSelectedDate(date)}
                />
                <div className="flex items-center gap-3 mt-4 sm:mt-0">
                    {loading && (
                        <div
                            className="w-4 h-4 rounded-full border-2 border-purple-300 border-t-purple-600 animate-spin"
                            role="status"
                            aria-label="Loading"
                        />
                    )}
                    <button
                        className={`px-4 py-2 rounded-l border border-purple-600 transition-colors duration-100 text-purple-600
                                    ${
                                        displayMode === "he"
                                            ? "bg-purple-200 font-bold"
                                            : "bg-white"
                                    }`}
                        style={{
                            borderRightWidth: 0,
                        }}
                        onClick={() => setDisplayMode("he")}
                    >
                        עברית בלבד
                    </button>
                    <button
                        className={`px-4 py-2 border-t border-b border-purple-600 transition-colors duration-100  text-purple-600 
                                    ${
                                        displayMode === "both"
                                            ? "bg-purple-200 font-bold"
                                            : "bg-white"
                                    }`}
                        style={{
                            borderLeftWidth: 0,
                        }}
                        onClick={() => setDisplayMode("both")}
                    >
                        Both
                    </button>
                    <button
                        className={`px-4 py-2 rounded-r border border-purple-600 transition-colors duration-100 text-purple-600 
                                    ${
                                        displayMode === "en"
                                            ? "bg-purple-200 font-bold"
                                            : "bg-white"
                                    }`}
                        style={{
                            borderLeftWidth: 0,
                        }}
                        onClick={() => setDisplayMode("en")}
                    >
                        English Only
                    </button>
                </div>
            </div>

            {error && <div className="text-red-600 font-bold">{error}</div>}
            {!loading && halachot && halachot.length === 0 && (
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

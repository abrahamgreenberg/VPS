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
        const today = getTodayISODate();
        return new Date(today);
    });
    const [displayMode, setDisplayMode] = useState("both"); // "he", "en", "both"
    const [clientHalachot, setClientHalachot] = useState(() => {
        const stored = localStorage.getItem("halachot");
        return stored ? JSON.parse(stored) : [];
    });

    useEffect(() => {
        const fetchHalacha = async () => {
            setLoading(true);
            setError(null);
            try {
                selectedDate.setHours(6, 0, 0, 0);
                const isoDate = selectedDate.toISOString().split("T")[0];
                const res = await api.get(`/halachas/${isoDate}`);
                console.log(res.data);
                setHalachot(res.data);
            } catch (err) {
                // TODO: PROPERLY GET THE FILTER
                // MAKE THIS A HOOK SO I CAN USE IN THE CALENDAR
                console.log(clientHalachot);
                const halachotByDate = clientHalachot.filter((h) => {
                    console.log(h.date.split("T")[0]);
                    console.log(selectedDate.toISOString().split("T")[0]);

                    return (
                        h.date.split("T")[0] ===
                        selectedDate.toISOString().split("T")[0]
                    );
                });
                console.log("halachot by date", halachotByDate);
                setHalachot(halachotByDate);
                // setError("Failed to load halacha for selected date.");
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        if (selectedDate) fetchHalacha();
    }, [selectedDate]);

    useEffect(() => {
        const syncHalachot = async () => {
            const lastSync = localStorage.getItem("halachaLastSync");
            const today = new Date();
            today.setHours(6, 0, 0, 0);
            if (lastSync && new Date(lastSync).getTime() === today.getTime()) {
                // Already synced today
                return;
            }
            try {
                const clientHalachotReq = clientHalachot.map((h) => [
                    h.id,
                    h.version,
                ]);
                const res = await api.post("/halachot/sync", {
                    clientHalachot: clientHalachotReq,
                });
                console.log("Syncing halachot with backend...");
                console.log(res.data);
                console.log(clientHalachot);

                const modified = clientHalachot
                    .filter(
                        (h) =>
                            res.data.toDelete.includes(h.id) ||
                            res.data.toUpdateIds.includes(h.id)
                    )
                    .concat(res.data.toCreate)
                    .concat(res.data.toUpdate);

                localStorage.setItem("halachot", JSON.stringify(modified));
                setClientHalachot(modified);
                localStorage.setItem("halachaLastSync", today.toISOString());
            } catch (err) {
                console.error("Failed to sync halachot:", err);
            }
        };
        syncHalachot();
    }, []);

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
                <div className="flex mt-4 sm:mt-0">
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

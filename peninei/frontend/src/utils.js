// Utility to get today's date in YYYY-MM-DD format
export function getTodayISODate() {
    return toBackendDateString(new Date());
}

// Formats a local Date as the YYYY-MM-DD string the backend expects.
// Uses local calendar components (not toISOString(), which is UTC-based
// and shifts the date by a day in UTC-negative timezones like the US).
export function toBackendDateString(date) {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

// Parses a YYYY-MM-DD backend date string into a local Date at local
// midnight. `new Date("YYYY-MM-DD")` parses as UTC midnight, which is the
// wrong local calendar day in UTC-negative timezones - this avoids that.
export function parseBackendDateString(dateStr) {
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(y, m - 1, d);
}

// Pre-configured axios instance for API requests
import axios from "axios";

export const api = axios.create({
    baseURL: import.meta.env.VITE_FRONTEND_API_URL,
    headers: {
        "Content-Type": "application/json",
    },
});

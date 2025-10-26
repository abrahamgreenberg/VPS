// Utility to get today's date in YYYY-MM-DD format
export function getTodayISODate() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

// Pre-configured axios instance for API requests
import axios from "axios";

console.log("VITE_FRONTEND_API_URL:", import.meta.env.VITE_FRONTEND_API_URL);

export const api = axios.create({
    baseURL: import.meta.env.VITE_FRONTEND_API_URL,
    headers: {
        "Content-Type": "application/json",
    },
});

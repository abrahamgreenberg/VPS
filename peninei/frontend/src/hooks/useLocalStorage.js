import { useState, useCallback } from "react";

function readStoredHalachot() {
    const stored = localStorage.getItem("halachot");
    return stored ? JSON.parse(stored) : [];
}

export function useLocalStorage() {
    const [clientHalachot, setClientHalachot] = useState(readStoredHalachot);

    const updateClientHalachot = useCallback((diff) => {
        // Remove halachot that are to be deleted or updated, then add new and updated halachot
        setClientHalachot((prev) => {
            const newClientHalachot = [
                ...prev.filter(
                    (h) =>
                        !diff.toDelete.includes(h.id) &&
                        !diff.toUpdateIds.includes(h.id)
                ),
                ...(diff.toCreate || []),
                ...(diff.toUpdate || []),
            ];
            localStorage.setItem("halachot", JSON.stringify(newClientHalachot));
            return newClientHalachot;
        });
    }, []);

    return { clientHalachot, updateClientHalachot };
}

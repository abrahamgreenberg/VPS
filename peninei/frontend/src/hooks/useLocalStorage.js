import { useEffect, useState, useCallback } from "react";

export function useLocalStorage() {
    const [clientHalachot, setClientHalachot] = useState([]);

    useEffect(() => {
        const stored = localStorage.getItem("halachot");
        if (stored) {
            setClientHalachot(JSON.parse(stored));
        }
    }, []);

    const updateClientHalachot = useCallback((diff) => {
        // Remove halachot that are to be deleted or updated, then add new and updated halachot
        console.log("uppdating client halachot=---asdf-asdf");
        console.log(diff);
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

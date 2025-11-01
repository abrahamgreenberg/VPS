import React from "react";

export default function HalachaCard({ halacha, displayMode }) {
    // halacha.lines: [{ hebrew, english }]
    // fallback to heText if no lines

    return (
        <div className="max-w-3xl w-full bg-white/80 backdrop-blur-md rounded-3xl shadow-2xl p-8 mb-12 border border-purple-300">
            <h2 className="text-center text-3xl font-extrabold mb-6 text-purple-800 drop-shadow-md">
                {halacha.url ? (
                    <a
                        href={halacha.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline hover:text-purple-700 transition-colors"
                    >
                        {halacha.heTitle}
                    </a>
                ) : (
                    halacha.heTitle
                )}
            </h2>
            {halacha.enTitle && (
                <h3 className="text-center text-xl mb-6 text-gray-600 font-semibold">
                    {halacha.enTitle}
                </h3>
            )}
            <div className="space-y-4">
                {halacha.lines && halacha.lines.length > 0 ? (
                    <div>
                        {halacha.lines.map((line, idx) => {
                            // Layout: single column for "he" or "en", two columns for "both"
                            let rowClass =
                                "p-4 rounded-xl transition-all duration-300 cursor-pointer hover:scale-105 hover:shadow-xl hover:bg-purple-50";
                            if (displayMode === "both") {
                                rowClass =
                                    "grid grid-cols-2 gap-4 p-4 rounded-xl transition-all duration-300 cursor-pointer hover:scale-105 hover:shadow-xl hover:bg-purple-50";
                            } else {
                                rowClass += " flex justify-center";
                            }
                            return (
                                <div key={idx} className={rowClass}>
                                    {(displayMode === "he" ||
                                        displayMode === "both") && (
                                        <span
                                            className={
                                                "font-hebrew text-purple-800" +
                                                (displayMode === "both"
                                                    ? " text-right"
                                                    : " text-center w-full")
                                            }
                                        >
                                            {line.hebrew}
                                        </span>
                                    )}
                                    {(displayMode === "en" ||
                                        displayMode === "both") && (
                                        <span
                                            className={
                                                displayMode === "both"
                                                    ? ""
                                                    : "text-center w-full"
                                            }
                                        >
                                            {line.english}
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div>
                        {(displayMode === "he" || displayMode === "both") && (
                            <div
                                className={
                                    "font-hebrew text-purple-800 mb-2" +
                                    (displayMode === "both"
                                        ? " text-right"
                                        : " text-center w-full")
                                }
                            >
                                {halacha.heText}
                            </div>
                        )}
                        {(displayMode === "en" || displayMode === "both") &&
                            halacha.enTitle && (
                                <div
                                    className={
                                        displayMode === "both"
                                            ? ""
                                            : "text-center w-full mb-2"
                                    }
                                >
                                    {halacha.enTitle}
                                </div>
                            )}
                    </div>
                )}
            </div>
        </div>
    );
}

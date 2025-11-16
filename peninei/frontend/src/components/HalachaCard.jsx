import React from "react";

export default function HalachaCard({ halacha, displayMode }) {
    return (
        //
        <div className="max-w-3xl w-full bg-white/80 rounded-3xl shadow-2xl p-8 mb-12 border border-purple-300">
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
                {halacha.lines && halacha.lines.length > 0 && (
                    <div>
                        {halacha.lines.map((line, idx) => {
                            let rowClass =
                                "p-4 rounded-xl transition-all duration-300 cursor-pointer hover:scale-105 md:hover:shadow-xl md:hover:bg-purple-50";

                            if (displayMode === "both")
                                rowClass += " grid grid-cols-2 gap-4";
                            else rowClass += " flex justify-center";

                            return (
                                <div key={idx} className={rowClass}>
                                    {(displayMode === "he" ||
                                        displayMode === "both") && (
                                        <span className="font-hebrew text-purple-800 text-right">
                                            {line.hebrew || ""}
                                        </span>
                                    )}
                                    {(displayMode === "en" ||
                                        displayMode === "both") && (
                                        <span>{line.english || ""}</span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

import React from "react";

export default function HalachaCard({ halacha }) {
    return (
        <div className="max-w-3xl w-full bg-white/80 backdrop-blur-md rounded-3xl shadow-2xl p-8 mb-12 border border-purple-300">
            <h2 className="text-center text-3xl font-extrabold mb-6 text-purple-800 drop-shadow-md">
                {halacha.url ? (
                    <a
                        href={halacha.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline hover:text-indigo-700 transition-colors"
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
                {halacha.lines &&
                    halacha.lines.map((line) => (
                        <div
                            key={line.id}
                            className="flex flex-col md:flex-row md:justify-between md:items-start gap-2 p-4 rounded-xl transition-all duration-300 cursor-pointer hover:scale-105 hover:shadow-xl hover:bg-purple-50"
                        >
                            <p
                                className="text-right text-lg md:w-1/2 font-semibold text-purple-900"
                                dir="rtl"
                            >
                                {line.hebrew}
                            </p>
                            <p className="text-left text-lg md:w-1/2 text-gray-700 font-medium">
                                {line.english}
                            </p>
                        </div>
                    ))}
            </div>
        </div>
    );
}

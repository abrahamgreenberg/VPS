// import React from "react";

// function App() {
//     return (
//         <div className="relative w-screen h-screen overflow-hidden bg-gradient-to-br from-blue-900 via-indigo-900 to-blue-900 flex items-center justify-center">
//             {/* Moving glowing shapes */}
//             <div className="absolute w-72 h-72 bg-pink-500 rounded-full blur-3xl opacity-50 animate-pulse-slow -top-20 -left-20"></div>
//             <div className="absolute w-60 h-60 bg-blue-400 rounded-full blur-3xl opacity-40 animate-spin-slow top-10 right-10"></div>
//             <div className="absolute w-96 h-96 bg-blue-500 rounded-full blur-2xl opacity-30 animate-ping-slow bottom-0 left-1/2 transform -translate-x-1/2"></div>

//             {/* Centered welcome box */}
//             <div className="relative z-10 p-12 bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 text-center text-white shadow-lg max-w-md">
//                 <h1 className="text-4xl font-bold mb-4">
//                     Welcome to Your App!
//                 </h1>
//                 <p className="mb-6">
//                     This is a glowy landing page demo built with Vite, React &
//                     TailwindCSS.
//                 </p>
//                 <button className="px-6 py-2 rounded-lg bg-gradient-to-r from-blue-400 to-pink-500 hover:scale-105 transform transition">
//                     Get Started
//                 </button>
//             </div>
//         </div>
//     );
// }

// export default App;

import data from "./data.json";

export default function App() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-blue-100 flex flex-col items-center py-10 px-4">
            {data.map((halacha) => (
                <div
                    key={halacha.id}
                    className="max-w-3xl w-full bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl p-8 mb-12 border border-blue-200"
                >
                    <h2 className="text-center text-3xl font-extrabold mb-6 text-blue-800 drop-shadow-md">
                        <a href={halacha.url}>{halacha.heTitle}</a>
                    </h2>
                    {halacha.enTitle && (
                        <h3 className="text-center text-xl mb-6 text-gray-600">
                            {halacha.enTitle}
                        </h3>
                    )}
                    <div className="space-y-4">
                        {halacha.lines.map((line) => (
                            <div
                                key={line.id}
                                className="flex flex-col md:flex-row md:justify-between md:items-start gap-2 p-4 rounded-xl transition-all duration-300 cursor-pointer hover:scale-105 hover:shadow-xl hover:bg-blue-50"
                            >
                                <p
                                    className="text-right text-lg md:w-1/2 font-semibold text-blue-900"
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
            ))}
        </div>
    );
}

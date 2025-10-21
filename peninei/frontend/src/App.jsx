import React from "react";

function App() {
    return (
        <div className="relative w-screen h-screen overflow-hidden bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 flex items-center justify-center">
            {/* Moving glowing shapes */}
            <div className="absolute w-72 h-72 bg-pink-500 rounded-full blur-3xl opacity-50 animate-pulse-slow -top-20 -left-20"></div>
            <div className="absolute w-60 h-60 bg-blue-400 rounded-full blur-3xl opacity-40 animate-spin-slow top-10 right-10"></div>
            <div className="absolute w-96 h-96 bg-purple-500 rounded-full blur-2xl opacity-30 animate-ping-slow bottom-0 left-1/2 transform -translate-x-1/2"></div>

            {/* Centered welcome box */}
            <div className="relative z-10 p-12 bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 text-center text-white shadow-lg max-w-md">
                <h1 className="text-4xl font-bold mb-4">
                    Welcome to Your App!
                </h1>
                <p className="mb-6">
                    This is a glowy landing page demo built with Vite, React &
                    TailwindCSS.
                </p>
                <button className="px-6 py-2 rounded-lg bg-gradient-to-r from-purple-400 to-pink-500 hover:scale-105 transform transition">
                    Get Started
                </button>
            </div>
        </div>
    );
}

export default App;

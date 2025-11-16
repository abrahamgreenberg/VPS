import React from "react";
import { FaExclamationTriangle, FaRobot, FaBook } from "react-icons/fa";

export default function DisclaimerPopup({ show, setShow }) {
    return (
        <div>
            <div className="max-w-xl w-full pointer-events-auto">
                <button
                    className={`w-full flex items-center justify-center gap-2 bg-white/60 backdrop-blur border border-yellow-400 text-yellow-900 font-semibold py-2 px-4 ${
                        show ? "rounded-t-2xl" : "rounded-2xl"
                    } shadow-lg md:hover:bg-yellow-100/80 transition-all duration-200`}
                    onClick={() => setShow((v) => !v)}
                    aria-expanded={show}
                    style={{ fontSize: "1.15rem", letterSpacing: "0.01em" }}
                >
                    <FaExclamationTriangle className="text-yellow-500 text-xl drop-shadow" />
                    Disclaimer
                    <span className="ml-2 text-base">{show ? "▼" : "▲"}</span>
                </button>
                <div
                    className={`overflow-hidden transition-all duration-500 ${
                        show ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                    } bg-white/80 backdrop-blur border border-yellow-400 rounded-b-2xl shadow-lg px-6  text-yellow-900`}
                    style={{
                        boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.18)",
                    }}
                >
                    <div className="flex items-center gap-2 mb-2">
                        <FaExclamationTriangle className="text-yellow-500 text-lg" />
                        <span className="font-bold text-lg">Disclaimer</span>
                    </div>
                    <ul className="list-none pl-0 mb-2 space-y-2">
                        <li className="flex items-center gap-2">
                            <FaRobot className="text-blue-500 text-lg" />
                            <span>
                                This content is AI generated and may contain
                                errors.
                            </span>
                        </li>
                        <li className="flex items-center gap-2">
                            <FaBook className="text-blue-700 text-lg" />
                            <span>
                                Credit goes to the original source:{" "}
                                <a
                                    href="https://ph.yhb.org.il/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="underline text-blue-700 hover:text-blue-900"
                                >
                                    https://ph.yhb.org.il/
                                </a>
                            </span>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
}

"use client";

import { useState } from "react";

export default function SearchBar() {
  const [url, setUrl] = useState("");
  const [message, setMessage] = useState("");

  function handleTrack() {
    if (
      url.includes("amazon.") &&
      (url.includes("/dp/") || url.includes("/gp/"))
    ) {
      setMessage("✅ Valid Amazon URL! Tracking feature coming soon.");
    } else {
      setMessage("❌ Please enter a valid Amazon product URL.");
    }
  }

  return (
    <div className="mt-12 w-full max-w-3xl">
      <div className="flex rounded-2xl border border-slate-800 bg-slate-900 p-2 shadow-2xl">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="flex-1 bg-transparent px-5 py-4 text-white placeholder:text-slate-500 outline-none"
          placeholder="https://www.amazon.com/..."
        />

        <button
          onClick={handleTrack}
          className="rounded-xl bg-green-500 px-8 font-semibold hover:bg-green-400 transition"
        >
          Track Price
        </button>
      </div>

      {message && (
        <p className="mt-4 text-center text-slate-300">
          {message}
        </p>
      )}
    </div>
  );
}
import React, { useState, useEffect } from "react";
import axios from "axios";

export default function Topbar() {
  const [data, setData] = useState(null);
  const [time, setTime] = useState(new Date());

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchMarket = async () => {
      try {
        const res = await axios.get("http://127.0.0.1:5000/api/market");
        console.log("API response:", res.data);
        setData(res.data);
      } catch (err) {
        console.error("Fetch error:", err);
      }
    };
    fetchMarket();
  }, []);

  if (!data) return <div>Loading...</div>;

  const { indices, sectorPerformance, marketStatus } = data;

  // Find top performing sector
  let topSector = null;
  if (sectorPerformance) {
    const sorted = Object.entries(sectorPerformance).sort((a, b) => b[1] - a[1]);
    topSector = sorted[0];
  }

  return (
    <header className="bg-white/95 top-0 z-20 border-b shadow-sm">
      <div className="max-w-[1400px] mx-auto px-4 py-2 flex justify-between items-center">
        
        {/* Left: Live time + Market status */}
        <div className="flex items-center gap-3 font-semibold text-slate-800">
          <span>{time.toLocaleTimeString()}</span>
          <span
            className={`w-3 h-3 rounded-full ${
              marketStatus === "LIVE" ? "bg-green-500" : "bg-red-500"
            }`}
            title={`Market is ${marketStatus}`}
          ></span>
        </div>

        {/* Right: Indices + Top sector */}
        <div className="flex items-center gap-6 text-sm">
          {indices?.Nifty && (
            <IndexMini
              label="Nifty"
              value={indices.Nifty.price}
              pct={indices.Nifty.chgPct}
            />
          )}
          {indices?.Sensex && (
            <IndexMini
              label="Sensex"
              value={indices.Sensex.price}
              pct={indices.Sensex.chgPct}
            />
          )}
          {topSector && (
            <div className="px-2 py-1 rounded bg-slate-100 text-xs">
              <span className="font-semibold">{topSector[0].replace("NIFTY_", "")}</span>{" "}
              <span
                className={
                  topSector[1] >= 0 ? "text-green-600" : "text-red-600"
                }
              >
                {topSector[1] >= 0 ? "+" : ""}
                {topSector[1]}%
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Second Row: Sector Performance Ticker */}
      <div className="bg-slate-50 border-t py-1 overflow-hidden whitespace-nowrap">
        <div className="animate-marquee flex gap-6 text-xs px-4">
          {sectorPerformance &&
            Object.entries(sectorPerformance).map(([sector, pct]) => (
              <div key={sector} className="flex items-center gap-1">
                <span className="font-semibold">{sector.replace("NIFTY_", "")}:</span>
                <span className={pct >= 0 ? "text-green-600" : "text-red-600"}>
                  {pct >= 0 ? "+" : ""}
                  {pct}%
                </span>
              </div>
            ))}
        </div>
      </div>
    </header>
  );
}

function IndexMini({ label, value, pct }) {
  return (
    <div className="flex flex-col items-center">
      <span className="font-semibold">{label}</span>
      <span className="text-sm">
        {value?.toLocaleString()}{" "}
        <span className={pct >= 0 ? "text-green-600" : "text-red-600"}>
          ({pct >= 0 ? "+" : ""}
          {pct}%)
        </span>
      </span>
    </div>
  );
}

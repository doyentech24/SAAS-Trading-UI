import React, { useState, useEffect } from "react";
import axios from "axios";
import Layout from "../components/Layout";
import { UserCircle } from "lucide-react";

function Settings() {
  const [connectedAccounts, setConnectedAccounts] = useState([]);

  // Fetch accounts from backend
  const fetchAccounts = async () => {
    try {
      const res = await axios.get("http://127.0.0.1:5000/api/accounts");
      console.log("Fetched accounts:", res.data);
      setConnectedAccounts(res.data);
    } catch (err) {
      console.error("Error fetching accounts:", err);
    }
  };

  useEffect(() => {
    fetchAccounts();

    // ✅ Listen for token from popup
    const handler = (event) => {
      if (event.data?.type === "ZERODHA_TOKEN") {
        console.log("🔑 Received request_token from popup:", event.data.request_token);

        axios
          .post("http://127.0.0.1:5000/api/submit-token", {
            nickname: "My Zerodha", // can enhance later
            request_token: event.data.request_token,
          })
          .then((res) => {
            console.log("✅ Submit token response:", res.data);
            if (res.data.success) {
              fetchAccounts();
            } else {
              alert("Error: " + res.data.error);
            }
          })
          .catch((err) => {
            console.error("❌ Error submitting token:", err);
          });
      }
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const connectZerodha = async () => {
    try {
      console.log("Connecting Zerodha...");
      const res = await axios.get("http://127.0.0.1:5000/api/connect/zerodha");
      console.log("Zerodha login URL:", res.data.login_url);
      // ✅ Open popup instead of new tab
      window.open(res.data.login_url, "zerodhaPopup", "width=600,height=700");
    } catch (err) {
      console.error("Error connecting Zerodha:", err);
    }
  };

  return (
    <Layout>
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-6">Settings</h2>

        {/* Connect a Broker */}
        <div className="bg-white rounded-2xl shadow p-6 mb-8">
          <h3 className="text-lg font-semibold mb-2">Connect a Broker</h3>
          <p className="text-gray-600 mb-4">
            Link your trading account to view live holdings and trades.
          </p>
          <button
            onClick={connectZerodha}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg"
          >
            Connect Zerodha
          </button>
        </div>

        {/* Connected Accounts */}
        <div className="bg-white rounded-2xl shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Connected Accounts</h3>
          {connectedAccounts.length === 0 ? (
            <p className="text-gray-500">No accounts connected yet.</p>
          ) : (
            <ul className="space-y-3">
              {connectedAccounts.map((acc, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between border-b last:border-0 pb-3"
                >
                  <div className="flex items-center space-x-3">
                    <UserCircle className="w-6 h-6 text-gray-500" />
                    <span className="text-gray-800 font-medium">
                      Zerodha – {acc.nickname || acc.user_id}
                    </span>
                  </div>
                  <span
                    className={`font-semibold ${
                      acc.status?.toLowerCase() === "connected"
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {acc.status?.toLowerCase() === "connected"
                      ? "Connected"
                      : "Not Connected"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Layout>
  );
}

export default Settings;

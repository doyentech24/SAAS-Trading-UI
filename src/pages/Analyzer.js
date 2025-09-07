import React, { useEffect, useState } from "react";
import axios from "axios";
import Layout from "../components/Layout";

function Analyzer() {
  const [insights, setInsights] = useState([]);
  const [expanded, setExpanded] = useState({}); // track which rows are expanded

  useEffect(() => {
    axios
      .get("http://127.0.0.1:5000/api/analyzer/insights")
      .then((res) => {
        setInsights(res.data);
      })
      .catch((err) => console.error("Error fetching insights:", err));
  }, []);

  const toggleExpand = (i) => {
    setExpanded((prev) => ({ ...prev, [i]: !prev[i] }));
  };

  return (
    <Layout>
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-6">Analyzer</h2>

        <div className="bg-white shadow rounded-xl p-4">
          <h3 className="text-lg font-semibold mb-3">Insights & Suggestions</h3>

          {insights.length === 0 ? (
            <p className="text-gray-500">No insights available yet.</p>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100 text-left">
                  <th className="p-2">Stock</th>
                  <th className="p-2">Allocation %</th>
                  <th className="p-2">Profit Months</th>
                  <th className="p-2">Loss Months</th>
                  <th className="p-2">6M Return</th>
                  <th className="p-2">Current P&L %</th>
                  <th className="p-2">Trend</th>
                  <th className="p-2">Suggestion</th>
                  <th className="p-2">History</th>
                </tr>
              </thead>
              <tbody>
                {insights.map((row, i) => (
                  <React.Fragment key={i}>
                    <tr className="border-t">
                      <td className="p-2">{row.stock}</td>
                      <td className="p-2">{row.portfolio?.allocation_pct}%</td>
                      <td className="p-2 text-green-600">
                        {row.personal?.months_in_profit}
                      </td>
                      <td className="p-2 text-red-600">
                        {row.personal?.months_in_loss}
                      </td>
                      <td
                        className={`p-2 ${
                          row.market?.return_6m >= 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {row.market?.return_6m}%
                      </td>
                      <td
                        className={`p-2 ${
                          row.personal?.current_pnl_pct >= 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {row.personal?.current_pnl_pct}%
                      </td>
                      <td
                        className={`p-2 ${
                          row.market?.trend === "Uptrend"
                            ? "text-green-600"
                            : row.market?.trend === "Downtrend"
                            ? "text-red-600"
                            : "text-yellow-600"
                        }`}
                      >
                        {row.market?.trend}
                      </td>
                      <td
                        className={`p-2 font-semibold ${
                          row.insight?.suggestion?.includes("Exit")
                            ? "text-red-700"
                            : row.insight?.suggestion?.includes("Review")
                            ? "text-yellow-600"
                            : "text-green-600"
                        }`}
                      >
                        {row.insight?.suggestion}
                      </td>
                      <td className="p-2">
                        <button
                          onClick={() => toggleExpand(i)}
                          className="text-blue-600 underline text-sm"
                        >
                          {expanded[i] ? "Hide" : "View"}
                        </button>
                      </td>
                    </tr>

                    {/* Expandable trade history */}
                    {expanded[i] && (
                      <tr className="bg-gray-50 border-b">
                        <td colSpan="9" className="p-4">
                          <h4 className="font-semibold mb-2">
                            Trade History (First Buy:{" "}
                            {row.personal?.first_buy_date
                              ? new Date(
                                  row.personal.first_buy_date
                                ).toLocaleDateString()
                              : "N/A"}
                            )
                          </h4>
                          {row.personal?.buy_transactions?.length > 0 ? (
                            <table className="w-full border text-sm">
                              <thead>
                                <tr className="bg-gray-200 text-left">
                                  <th className="p-2">Date</th>
                                  <th className="p-2">Qty</th>
                                  <th className="p-2">Price</th>
                                </tr>
                              </thead>
                              <tbody>
                                {row.personal.buy_transactions.map((t, j) => (
                                  <tr key={j} className="border-t">
                                    <td className="p-2">
                                      {new Date(t.date).toLocaleDateString()}
                                    </td>
                                    <td className="p-2">{t.qty}</td>
                                    <td className="p-2">₹{t.price}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <p className="text-gray-500 text-sm">
                              No trade history available
                            </p>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Layout>
  );
}

export default Analyzer;

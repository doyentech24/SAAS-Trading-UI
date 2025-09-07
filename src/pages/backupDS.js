import React, { useEffect, useMemo, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Legend,
  Line,
} from "recharts";
import Layout from "../components/Layout";
import axios from "axios";

const COLORS = ["#1E40AF", "#F59E0B", "#10B981", "#EF4444", "#6366F1", "#14B8A6"];
const ACCENT = "#1E40AF";

export default function Dashboard() {
  const [broker, setBroker] = useState("all");
  const [sector, setSector] = useState("all");
  const [accounts, setAccounts] = useState([]);
  const [allHoldings, setAllHoldings] = useState([]);
  const [portfolioSummary, setPortfolioSummary] = useState(null);
  const [portfolioInsights, setPortfolioInsights] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch accounts
  useEffect(() => {
    axios.get("http://127.0.0.1:5000/api/accounts").then((res) => {
      setAccounts(res.data);
    });
  }, []);

  // Fetch holdings
  useEffect(() => {
    async function fetchHoldings() {
      setLoading(true);
      try {
        const res = await axios.get("http://127.0.0.1:5000/api/holdings");
        setAllHoldings(res.data);
      } catch (err) {
        console.error("Error fetching holdings:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchHoldings();
  }, []);

  // Fetch portfolio summary
  useEffect(() => {
    async function fetchSummary() {
      try {
        const res = await axios.get("http://127.0.0.1:5000/api/portfolio/summary");
        setPortfolioSummary(res.data);
      } catch (err) {
        console.error("Error fetching portfolio summary:", err);
      }
    }
    fetchSummary();
  }, []);

  // Fetch analyzer insights
  useEffect(() => {
    async function fetchInsights() {
      try {
        const res = await axios.get("http://127.0.0.1:5000/api/analyzer/insights");
        setPortfolioInsights(res.data.portfolio_insights || []);
      } catch (err) {
        console.error("Error fetching insights:", err);
      }
    }
    fetchInsights();
  }, []);

  // Filter holdings by broker + sector
  const holdings = useMemo(() => {
    return allHoldings.filter(
      (h) =>
        (broker === "all" || h.broker === broker) &&
        (sector === "all" || h.sector === sector)
    );
  }, [broker, sector, allHoldings]);

  // Investment & PnL (fallback if summary not ready)
  const totalInvestment = holdings.reduce((a, s) => a + s.quantity * s.average_price, 0);
  const currentValue = holdings.reduce((a, s) => a + s.quantity * s.last_price, 0);
  const pnl = currentValue - totalInvestment;

  // Best / Worst stocks
  const bestStock =
    holdings.reduce(
      (a, s) =>
        (s.last_price - s.average_price) * s.quantity >
        (a.last_price - a.average_price) * a.quantity
          ? s
          : a,
      holdings[0] ?? { tradingsymbol: "-", average_price: 0, last_price: 0, quantity: 0 }
    );

  const worstStock =
    holdings.reduce(
      (a, s) =>
        (s.last_price - s.average_price) * s.quantity <
        (a.last_price - a.average_price) * a.quantity
          ? s
          : a,
      holdings[0] ?? { tradingsymbol: "-", average_price: 0, last_price: 0, quantity: 0 }
    );

  // Sector allocation data
  const sectorMap = {};
  holdings.forEach((h) => {
    const val = h.quantity * h.last_price;
    sectorMap[h.sector || "Unknown"] = (sectorMap[h.sector || "Unknown"] || 0) + val;
  });
  const sectorData = Object.entries(sectorMap).map(([name, value]) => ({ name, value }));

  /* Sorting for table */
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const sortedHoldings = useMemo(() => {
    let sorted = [...holdings];
    if (sortConfig.key) {
      sorted.sort((a, b) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];
        if (typeof valA === "number" && typeof valB === "number") {
          return sortConfig.direction === "asc" ? valA - valB : valB - valA;
        } else {
          return sortConfig.direction === "asc"
            ? String(valA).localeCompare(String(valB))
            : String(valB).localeCompare(String(valA));
        }
      });
    }
    return sorted;
  }, [holdings, sortConfig]);
  const requestSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  return (
    <Layout>
      <div className="flex min-h-screen bg-[#F7F7FB]">
        <main className="flex-1">
          <div className="max-w-[1400px] mx-auto px-4 py-6">
            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between mb-5">
              <div className="flex gap-3">
                <Select
                  label="Broker"
                  value={broker}
                  onChange={setBroker}
                  options={[
                    { label: "All Accounts", value: "all" },
                    ...accounts
                      .filter((a) => a.status === "Connected")
                      .map((a) => ({ label: a.nickname, value: a.nickname })),
                  ]}
                />
                <Select
                  label="Sector"
                  value={sector}
                  onChange={setSector}
                  options={[
                    { label: "All Sectors", value: "all" },
                    ...Object.keys(sectorMap).map((s) => ({ label: s, value: s })),
                  ]}
                />
              </div>
              <div className="text-sm text-slate-500">
                {loading ? "Loading holdings..." : "Live data"}
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
              <KpiCard title="Invested" value={`₹${number(portfolioSummary?.invested || totalInvestment)}`} />
              <KpiCard title="Current Value" value={`₹${number(portfolioSummary?.current || currentValue)}`} />
              <KpiCard
                title="Total P&L"
                value={`₹${number(portfolioSummary?.pnl || pnl)}`}
                positive={(portfolioSummary?.pnl || pnl) >= 0}
                negative={(portfolioSummary?.pnl || pnl) < 0}
              />
              <KpiCard
                title="CAGR"
                value={`${portfolioSummary?.cagr ?? "-"}%`}
                subtitle={`Since ${portfolioSummary?.start_date || "-"}`}
              />
              <KpiCard
                title="Today’s Change"
                value={`₹${number(portfolioSummary?.todayChange || 0)}`}
                positive={(portfolioSummary?.todayChange || 0) >= 0}
                negative={(portfolioSummary?.todayChange || 0) < 0}
              />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <Card title="Sector Allocation">
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={sectorData}
                        dataKey="value"
                        nameKey="name"
                        outerRadius={110}
                        label
                      >
                        {sectorData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <ReTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card title="P&L Trend">
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={holdings.map((h, i) => ({
                        date: h.tradingsymbol,
                        value: (h.last_price - h.average_price) * h.quantity,
                      }))}
                      margin={{ top: 5, right: 20, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <ReTooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke={ACCENT}
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>

            {/* Portfolio Insights */}
            <Card title="Portfolio Insights">
              <ul className="list-disc pl-5 space-y-2 text-sm">
                {portfolioInsights.length > 0 ? (
                  portfolioInsights.map((msg, i) => (
                    <li
                      key={i}
                      className={
                        msg.includes("Strong performer")
                          ? "text-green-600"
                          : msg.includes("loss")
                          ? "text-red-600"
                          : "text-slate-700"
                      }
                    >
                      {msg}
                    </li>
                  ))
                ) : (
                  <li>No major risks or alerts detected 🎉</li>
                )}
              </ul>
            </Card>

            {/* Holdings Table */}
            <Card title="Holdings">
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead className="text-left bg-slate-50">
                    <tr className="border-b">
                      <Th sortable onClick={() => requestSort("broker")}>Broker</Th>
                      <Th sortable onClick={() => requestSort("tradingsymbol")}>Stock</Th>
                      <Th sortable onClick={() => requestSort("sector")}>Sector</Th>
                      <Th sortable className="text-right" onClick={() => requestSort("quantity")}>Qty</Th>
                      <Th sortable className="text-right" onClick={() => requestSort("average_price")}>Avg Price</Th>
                      <Th sortable className="text-right" onClick={() => requestSort("last_price")}>Current</Th>
                      <Th sortable className="text-right" onClick={() => requestSort("value")}>Value</Th>
                      <Th sortable className="text-right" onClick={() => requestSort("upl")}>Unrealized P&L</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedHoldings.map((h, i) => {
                      const value = h.quantity * h.last_price;
                      const upl = (h.last_price - h.average_price) * h.quantity;
                      return (
                        <tr key={i} className="border-b last:border-0">
                          <Td>{h.broker}</Td>
                          <Td className="font-medium">{h.tradingsymbol}</Td>
                          <Td>{h.sector || "-"}</Td>
                          <Td className="text-right">{h.quantity}</Td>
                          <Td className="text-right">₹{number(h.average_price)}</Td>
                          <Td className="text-right">₹{number(h.last_price)}</Td>
                          <Td className="text-right">₹{number(value)}</Td>
                          <Td
                            className={`text-right font-semibold ${
                              upl >= 0 ? "text-green-600" : "text-red-600"
                            }`}
                          >
                            ₹{number(upl)}
                          </Td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </main>
      </div>
    </Layout>
  );
}

/* ---- UI Components ---- */
function Card({ title, right, children }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <h3 className="font-semibold text-slate-800">{title}</h3>
        {right}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function KpiCard({ title, value, subtitle, positive, negative }) {
  const tone = positive ? "text-green-600" : negative ? "text-red-600" : "text-slate-800";
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
      <div className="text-slate-500 text-sm">{title}</div>
      <div className={`text-2xl font-bold ${tone}`}>{value}</div>
      {subtitle && <div className="text-xs text-slate-500 mt-1">{subtitle}</div>}
    </div>
  );
}

function Th({ children, className = "", sortable, onClick }) {
  return (
    <th
      onClick={sortable ? onClick : undefined}
      className={`px-3 py-2 text-slate-500 cursor-pointer select-none ${className} ${
        sortable ? "hover:text-slate-800" : ""
      }`}
    >
      {children}
    </th>
  );
}

function Td({ children, className = "" }) {
  return <td className={`px-3 py-2 ${className}`}>{children}</td>;
}

function Select({ label, value, onChange, options }) {
  return (
    <label className="text-sm text-slate-600">
      <span className="mr-2">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-3 py-2 border border-slate-300 rounded-xl bg-white"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/* ---- Utils ---- */
function number(n) {
  if (Number.isNaN(n) || !Number.isFinite(n)) return "-";
  return n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

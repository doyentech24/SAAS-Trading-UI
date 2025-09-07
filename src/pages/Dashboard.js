import React, { useEffect, useMemo, useState } from "react";
import {
    PieChart, Pie, Cell, Tooltip as ReTooltip, ResponsiveContainer,
    LineChart, CartesianGrid, XAxis, YAxis, Legend, Line,
} from "recharts";
import Layout from "../components/Layout";
import axios from "axios";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const COLORS = ["#1E40AF", "#F59E0B", "#10B981", "#EF4444", "#6366F1", "#14B8A6"];
const ACCENT = "#1E40AF";

export default function Dashboard() {
    const [selectedSymbol, setSelectedSymbol] = useState(null);

    const [openDrawer, setOpenDrawer] = useState(false);
    const [broker, setBroker] = useState("all");
    const [sector, setSector] = useState("all");
    const [accounts, setAccounts] = useState([]);
    const [allHoldings, setAllHoldings] = useState([]);
    const [portfolioSummary, setPortfolioSummary] = useState(null);
    const [replacements, setReplacements] = useState({ symbol: null, sector: null, peers: [] });
    const drawerRef = React.useRef(null);
    const [usePortfolioContext, setUsePortfolioContext] = useState(true);
    const [posPenalty, setPosPenalty] = useState(1.0); // 0..1
    const [secPenalty, setSecPenalty] = useState(1.0); // 0..1
    const [portfolioBalance, setPortfolioBalance] = useState(null);

    useEffect(() => {
        async function loadReplacements() {
            if (!openDrawer || !selectedSymbol) return;
            try {
                const res = await axios.get(`http://127.0.0.1:5000/api/suggestions/replacements`, {
                    params: { symbol: selectedSymbol },
                });
                setReplacements(res.data || { symbol: selectedSymbol, sector: null, peers: [] });
            } catch (e) {
                console.error("Replacement fetch failed:", e);
                setReplacements({ symbol: selectedSymbol, sector: null, peers: [] });
            }
        }
        loadReplacements();
    }, [openDrawer, selectedSymbol]);


    // NEW: keep full analyzer payload
    const [analyzerStocks, setAnalyzerStocks] = useState([]); // per-stock details (health/suggestion)
    const [portfolioInsights, setPortfolioInsights] = useState([]);

    const [loading, setLoading] = useState(true);
    // at the top inside Dashboard() component state
    // Drawer state


    // Helper to get analyzer record by symbol
    const getAnalyzer = (sym) => analyzerBySymbol[sym] || null;

    // Open drawer on row click
    const handleRowClick = (sym) => {
        setSelectedSymbol(sym);
        setOpenDrawer(true);
    };
    // Fetch accounts
    useEffect(() => {
        axios.get("http://127.0.0.1:5000/api/accounts").then((res) => setAccounts(res.data));
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

    // Fetch analyzer insights (stocks + portfolio_insights)
    useEffect(() => {
        async function fetchInsights() {
            try {
                const res = await axios.get("http://127.0.0.1:5000/api/analyzer/insights", {
                    params: {
                        context: usePortfolioContext ? "portfolio" : "stock",
                        pos_mult: posPenalty,
                        sec_mult: secPenalty,
                    },
                });
                setPortfolioInsights(res.data?.portfolio_insights || []);
                setAnalyzerStocks(res.data?.stocks || []);
                setPortfolioBalance(res.data?.portfolio_balance || null);


            } catch (err) {
                console.error("Error fetching insights:", err);
            }
        }
        fetchInsights();
    }, [usePortfolioContext, posPenalty, secPenalty]);

    // Build a quick lookup from analyzer by symbol
    const analyzerBySymbol = useMemo(() => {
        const map = {};
        for (const s of analyzerStocks) map[s.stock] = s;
        return map;
    }, [analyzerStocks]);

    // Filter holdings by broker + sector
    const holdings = useMemo(() => {
        return allHoldings
            .map((h) => {
                const sym = h.tradingsymbol;
                const ai = analyzerBySymbol[sym];
                // merge analyzer attributes onto holding row
                return {
                    ...h,
                    health_score: ai?.scoring?.health_score ?? null,
                    health_label: ai?.scoring?.label ?? null,
                    suggestion: ai?.insight?.suggestion ?? null,
                    reason: ai?.insight?.reason ?? null,
                };
            })
            .filter(
                (h) =>
                    (broker === "all" || h.broker === broker) &&
                    (sector === "all" || (h.sector || "Unknown") === sector)
            );
    }, [broker, sector, allHoldings, analyzerBySymbol]);

    // Sector options should come from all holdings (not filtered)
    const sectorOptions = useMemo(() => {
        const set = new Set((allHoldings || []).map((h) => h.sector || "Unknown"));
        return Array.from(set).sort();
    }, [allHoldings]);

    // Totals (fallback if summary not ready)
    const totalInvestment = holdings.reduce((a, s) => a + s.quantity * s.average_price, 0);
    const currentValue = holdings.reduce((a, s) => a + s.quantity * s.last_price, 0);
    const pnl = currentValue - totalInvestment;

    // Sector allocation data
    const sectorMap = {};
    holdings.forEach((h) => {
        const val = h.quantity * h.last_price;
        sectorMap[h.sector || "Unknown"] = (sectorMap[h.sector || "Unknown"] || 0) + val;
    });
    const sectorData = Object.entries(sectorMap).map(([name, value]) => ({ name, value }));

    /* Sorting for table */
    const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
    const requestSort = (key) => {
        let direction = "asc";
        if (sortConfig.key === key && sortConfig.direction === "asc") direction = "desc";
        setSortConfig({ key, direction });
    };

    const sortedHoldings = useMemo(() => {
        const sorted = [...holdings];
        if (!sortConfig.key) return sorted;

        sorted.sort((a, b) => {
            // Derived fields
            const aValue = a.quantity * a.last_price;
            const bValue = b.quantity * b.last_price;
            const aUpl = (a.last_price - a.average_price) * a.quantity;
            const bUpl = (b.last_price - b.average_price) * b.quantity;

            let valA, valB;
            switch (sortConfig.key) {
                case "value":
                    valA = aValue; valB = bValue; break;
                case "upl":
                    valA = aUpl; valB = bUpl; break;
                default:
                    valA = a[sortConfig.key];
                    valB = b[sortConfig.key];
            }

            if (typeof valA === "number" && typeof valB === "number") {
                return sortConfig.direction === "asc" ? valA - valB : valB - valA;
            }
            return sortConfig.direction === "asc"
                ? String(valA ?? "").localeCompare(String(valB ?? ""))
                : String(valB ?? "").localeCompare(String(valA ?? ""));
        });
        return sorted;
    }, [holdings, sortConfig]);

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
                                        ...sectorOptions.map((s) => ({ label: s, value: s })),
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
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-1 mb-6">
                            {/* <Card title="Sector Allocation">
                                <div className="h-72">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={sectorData} dataKey="value" nameKey="name" outerRadius={110} label>
                                                {sectorData.map((_, i) => (
                                                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <ReTooltip />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </Card> */}

                            {/* <Card title="P&L Trend">
                                <div className="h-72">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart
                                            data={holdings.map((h) => ({
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
                                            <Line type="monotone" dataKey="value" stroke={ACCENT} strokeWidth={2} dot={false} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </Card> */}
                            {portfolioBalance && (
                                <Card title="Portfolio Balance">
                                    <div className="grid md:grid-cols-3 gap-4 text-sm">
                                        <div className="rounded-xl border p-3">
                                            <div className="text-slate-500 text-xs">Status</div>
                                            <div className="font-semibold">{portfolioBalance.label}</div>
                                            <div className="text-slate-500 text-xs mt-1">
                                                HHI: {portfolioBalance.hhi} · Top: {portfolioBalance.top_sector.name} ({portfolioBalance.top_sector.pct}%)
                                            </div>
                                        </div>
                                        <div className="md:col-span-2 rounded-xl border p-3">
                                            <div className="text-slate-500 text-xs mb-2">Sector Weights</div>
                                            <div className="flex flex-wrap gap-2">
                                                {Object.entries(portfolioBalance.weights).map(([s, w]) => (
                                                    <span key={s} className="px-2 py-1 rounded-xl bg-slate-100 text-slate-700">
                                                        {s}: {w}%
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            )}


                            {/* Portfolio Insights */}
                            <Card title="Portfolio Insights">
                                <ul className="list-disc pl-5 space-y-2 text-sm">
                                    {portfolioInsights.length > 0 ? (
                                        portfolioInsights.map((msg, i) => (
                                            <li
                                                key={i}
                                                className={
                                                    msg.toLowerCase().includes("strong") ? "text-green-600"
                                                        : msg.toLowerCase().includes("loss") || msg.toLowerCase().includes("risk") ? "text-red-600"
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
                            <Card title="Risk Settings">
                            <div className="flex flex-wrap gap-4 items-center text-sm">
                                <label className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={usePortfolioContext}
                                        onChange={(e) => setUsePortfolioContext(e.target.checked)}
                                    />
                                    Consider portfolio context
                                </label>
                                <div className="flex items-center gap-2">
                                    <span>Position penalty</span>
                                    <input type="range" min="0" max="1" step="0.1"
                                        value={posPenalty}
                                        onChange={(e) => setPosPenalty(parseFloat(e.target.value))}
                                    />
                                    <span className="w-10 text-right">{Math.round(posPenalty * 100)}%</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span>Sector penalty</span>
                                    <input type="range" min="0" max="1" step="0.1"
                                        value={secPenalty}
                                        onChange={(e) => setSecPenalty(parseFloat(e.target.value))}
                                    />
                                    <span className="w-10 text-right">{Math.round(secPenalty * 100)}%</span>
                                </div>
                            </div>
                            <div className="text-xs text-slate-500 mt-2">
                                Tip: turn off context or lower penalties to see a pure “stock-only” view.
                            </div>
                        </Card>
                        </div>



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
                                            {/* NEW columns */}
                                            <Th className="text-right">Health</Th>
                                            <Th>Suggestion</Th>
                                            <Th>Reason</Th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sortedHoldings.map((h, i) => {
                                            const value = h.quantity * h.last_price;
                                            const upl = (h.last_price - h.average_price) * h.quantity;

                                            return (
                                                <tr key={i} className="border-b last:border-0 hover:bg-slate-50 cursor-pointer" onClick={() => handleRowClick(h.tradingsymbol)}>
                                                    <Td>{h.broker}</Td>
                                                    <Td className="font-medium">{h.tradingsymbol}</Td>
                                                    <Td>{h.sector || "-"}</Td>
                                                    <Td className="text-right">{h.quantity}</Td>
                                                    <Td className="text-right">₹{number(h.average_price)}</Td>
                                                    <Td className="text-right">₹{number(h.last_price)}</Td>
                                                    <Td className="text-right">₹{number(value)}</Td>
                                                    <Td className={`text-right font-semibold ${upl >= 0 ? "text-green-600" : "text-red-600"}`}>
                                                        ₹{number(upl)}
                                                    </Td>
                                                    {/* NEW cells */}
                                                    <Td className="text-right">

                                                        <HealthBadge score={h.health_score} label={h.health_label} />
                                                    </Td>
                                                    <Td>{h.suggestion || "-"}</Td>
                                                    <Td className="max-w-[320px]">{h.reason || "-"}</Td>
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
            {/* Right-side Stock Details Drawer */}
            <Drawer
                open={openDrawer}
                onClose={() => setOpenDrawer(false)}
                title={selectedSymbol ? `Details · ${selectedSymbol}` : 'Details'}
                innerRef={drawerRef}
            >
                {(() => {
                    const a = selectedSymbol ? getAnalyzer(selectedSymbol) : null;
                    if (!a) {
                        return <div className="text-sm text-slate-500">No analyzer data available.</div>;
                    }
                    const { personal, market, portfolio, scoring, insight, plan } = a;
                    return (
                        <div className="space-y-6">
                            {/* Header summary */}
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <div className="text-lg font-semibold">{selectedSymbol}</div>
                                    <div className="text-xs text-slate-500">{portfolio?.sector || 'Unknown sector'}</div>
                                </div>
                                <HealthBadge score={scoring?.health_score} label={scoring?.label} />
                            </div>

                            {/* Suggestion */}
                            <div className="rounded-xl border border-slate-200 p-3 bg-slate-50">
                                <div className="text-xs text-slate-500 mb-1">Suggestion</div>
                                <div className="text-sm font-medium mb-1">{insight?.suggestion || '-'}</div>
                                <div className="text-xs text-slate-600">{insight?.reason || ''}</div>
                            </div>

                            {/* Personal block */}
                            <div className="rounded-xl border border-slate-200">
                                <div className="px-3 py-2 border-b text-slate-700 font-semibold">Your Position</div>
                                <div className="p-3">
                                    <StatRow label="Quantity" value={personal?.quantity} />
                                    <StatRow label="Avg Price" value={fmtRs(personal?.avg_price)} />
                                    <StatRow label="Current Price" value={fmtRs(personal?.current_price)} />
                                    <StatRow label="PnL %" value={`${num(personal?.current_pnl_pct)}%`} />
                                    <div className="flex items-center justify-between py-2">
                                        <div className="text-slate-500 text-sm">Months in Profit / Loss</div>
                                        <div className="space-x-2">
                                            <Chip tone="success">Profit: {personal?.months_in_profit ?? '-'}</Chip>
                                            <Chip tone="danger">Loss: {personal?.months_in_loss ?? '-'}</Chip>
                                        </div>
                                    </div>
                                    {/* Buy transactions */}
                                    <div className="mt-2">
                                        <div className="text-xs text-slate-500 mb-1">Buy Transactions</div>
                                        <div className="max-h-32 overflow-y-auto rounded-lg border">
                                            {(personal?.buy_transactions || []).length ? (
                                                <table className="w-full text-xs">
                                                    <thead className="bg-slate-50">
                                                        <tr>
                                                            <th className="text-left px-2 py-1">Date</th>
                                                            <th className="text-right px-2 py-1">Qty</th>
                                                            <th className="text-right px-2 py-1">Price</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {personal.buy_transactions.map((t, i) => (
                                                            <tr key={i} className="border-t">
                                                                <td className="px-2 py-1">{fmtDate(t.date)}</td>
                                                                <td className="px-2 py-1 text-right">{t.qty}</td>
                                                                <td className="px-2 py-1 text-right">{fmtRs(t.price)}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            ) : (
                                                <div className="text-xs text-slate-500 p-2">No buy history found.</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Market block */}
                            <div className="rounded-xl border border-slate-200">
                                <div className="px-3 py-2 border-b text-slate-700 font-semibold">Market</div>
                                <div className="p-3">
                                    <StatRow label="Trend" value={market?.trend} />
                                    <StatRow label="RSI (14)" value={num(market?.rsi)} />
                                    <StatRow label="Volatility (σ daily)" value={market?.volatility} />
                                    <div className="mt-2 text-xs text-slate-500">
                                        <p>Rule of thumb:</p>
                                        <ul className="list-disc ml-4 mt-1">
                                            <li>Uptrend + RSI 40–60 → healthy</li>
                                            <li>RSI &gt; 70 → overbought risk; RSI &lt; 30 → oversold risk</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                            {/* Action Plan */}
                            <div className="rounded-xl border border-slate-200">
                                <div className="px-3 py-2 border-b text-slate-700 font-semibold">Action Plan</div>
                                <div className="p-3 space-y-2 text-sm">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="text-xs text-slate-500">Suggested action</div>
                                            <div className="font-medium">{plan?.type || "-"}</div>
                                        </div>
                                        <Chip tone={plan?.confidence === "High" ? "success" : plan?.confidence === "Low" ? "danger" : "warn"}>
                                            {plan?.confidence || "-"} confidence
                                        </Chip>
                                    </div>

                                    <div className="grid grid-cols-3 gap-2">
                                        <div className="rounded-lg border p-2">
                                            <div className="text-[11px] text-slate-500">Add on dip</div>
                                            <div className="font-semibold">{plan?.add_on_dip ? fmtRs(plan.add_on_dip) : "—"}</div>
                                        </div>
                                        <div className="rounded-lg border p-2">
                                            <div className="text-[11px] text-slate-500">Stop loss</div>
                                            <div className="font-semibold">{plan?.stop_loss ? fmtRs(plan.stop_loss) : "—"}</div>
                                        </div>
                                        <div className="rounded-lg border p-2">
                                            <div className="text-[11px] text-slate-500">Take profit</div>
                                            <div className="font-semibold">{plan?.take_profit ? fmtRs(plan.take_profit) : "—"}</div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div className="text-xs text-slate-500">Timeframe</div>
                                        <div className="text-sm font-medium">{plan?.timeframe || "-"}</div>
                                    </div>

                                    <div className="text-[11px] text-slate-400">
                                        * Levels are derived from 50DMA/swing levels and ATR(14). This is educational, not investment advice.
                                    </div>
                                </div>
                            </div>


                            {/* Portfolio fit */}
                            <div className="rounded-xl border border-slate-200">
                                <div className="px-3 py-2 border-b text-slate-700 font-semibold">Portfolio Fit</div>
                                <div className="p-3">
                                    <StatRow label="Allocation %" value={`${num(portfolio?.allocation_pct)}%`} hint="this stock weight" />
                                    <StatRow label="Sector Exposure %" value={`${num(portfolio?.sector_exposure_pct)}%`} hint="sector weight" />
                                </div>
                            </div>

                            {/* Replacements */}
                            <div className="rounded-xl border border-slate-200">
                                <div className="px-3 py-2 border-b text-slate-700 font-semibold">
                                    Replace with peers {replacements?.sector ? <span className="text-slate-400 font-normal">· {replacements.sector}</span> : null}
                                </div>
                                <div className="p-3 space-y-3">
                                    {replacements?.peers?.length ? (
                                        replacements.peers.map((p) => (
                                            <div key={p.symbol} className="flex items-center justify-between rounded-lg border p-3">
                                                <div>
                                                    <div className="font-medium">{p.symbol}</div>
                                                    <div className="text-xs text-slate-600">{p.reason}</div>
                                                </div>
                                                <Chip tone="success">{p.return_6m != null ? `${p.return_6m}% 6M` : "Momentum"}</Chip>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-xs text-slate-500">No stronger peers found right now.</div>
                                    )}
                                    <div className="text-[11px] text-slate-400">
                                        * Based on 6-month relative strength within sector. This is informational, not a recommendation.
                                    </div>
                                </div>
                            </div>

                        </div>
                    );
                })()}
            </Drawer>

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
            className={`px-3 py-2 text-slate-500 cursor-pointer select-none ${className} ${sortable ? "hover:text-slate-800" : ""
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

// NEW: health badge
function HealthBadge({ score, label }) {
    if (score == null) return <span className="text-slate-400">-</span>;
    const tone =
        score >= 80 ? "bg-emerald-100 text-emerald-700" :
            score >= 60 ? "bg-amber-100 text-amber-700" :
                score >= 40 ? "bg-rose-100 text-rose-700" :
                    "bg-rose-200 text-rose-800";
    return (
        <span className={`inline-flex items-center gap-2 px-2 py-1 rounded-xl text-xs font-medium ${tone}`}>
            {label ?? "—"} · {score}
        </span>
    );
}



async function exportDrawerToPdf(ref, filename = "stock-analysis.pdf") {
    if (!ref?.current) return;
    const panel = ref.current;
    const canvas = await html2canvas(panel, { scale: 2, useCORS: true });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "pt", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // Fit image to page width, maintain aspect ratio
    const imgWidth = pageWidth - 40; // 20pt margins
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let y = 20;
    if (imgHeight < pageHeight - 40) {
        pdf.addImage(imgData, "PNG", 20, y, imgWidth, imgHeight);
    } else {
        // paginate
        let remaining = imgHeight;
        let position = 20;
        const onePageHeight = pageHeight - 40;
        const ratio = imgWidth / canvas.width;
        const sliceHeight = onePageHeight / ratio;

        let sourceY = 0;
        while (remaining > 0) {
            const pageCanvas = document.createElement("canvas");
            pageCanvas.width = canvas.width;
            pageCanvas.height = Math.min(sliceHeight, canvas.height - sourceY);
            const ctx = pageCanvas.getContext("2d");
            ctx.drawImage(canvas, 0, sourceY, canvas.width, pageCanvas.height, 0, 0, canvas.width, pageCanvas.height);
            const pageImg = pageCanvas.toDataURL("image/png");
            if (position !== 20) pdf.addPage();
            pdf.addImage(pageImg, "PNG", 20, 20, imgWidth, (pageCanvas.height * imgWidth) / canvas.width);
            sourceY += pageCanvas.height;
            remaining -= onePageHeight;
        }
    }

    pdf.save(filename);
}

/* ---- Utils ---- */
function number(n) {
    if (Number.isNaN(n) || !Number.isFinite(n)) return "-";
    return n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}
function fmtRs(n) {
    if (n == null) return "-";
    return `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}
function fmtDate(d) {
    try {
        return new Date(d).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "2-digit" });
    } catch {
        return String(d ?? "-");
    }
}
function num(n) {
    if (n == null || Number.isNaN(Number(n))) return "-";
    return Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}


function Drawer({ open, onClose, children, width = 420, title, innerRef }) {
    return (
        <>
            <div
                className={`fixed inset-0 bg-black/30 transition-opacity ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            />
            <div
                ref={innerRef}
                className={`fixed top-0 right-0 h-full bg-white shadow-xl border-l border-slate-200 transition-transform`}
                style={{ width, transform: open ? 'translateX(0%)' : 'translateX(100%)' }}
                role="dialog"
                aria-modal="true"
            >
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                    <h3 className="font-semibold text-slate-800">{title}</h3>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => exportDrawerToPdf(innerRef, `${title || 'analysis'}.pdf`)}
                            className="rounded-lg px-2 py-1 text-slate-600 hover:bg-slate-100 text-sm"
                            title="Export as PDF"
                        >
                            ⬇️ Export
                        </button>
                        <button
                            onClick={onClose}
                            className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100"
                            aria-label="Close"
                        >
                            ✕
                        </button>
                    </div>
                </div>
                <div className="p-4 overflow-y-auto h-[calc(100%-56px)]">
                    {children}
                </div>
            </div>
        </>
    );
}


function StatRow({ label, value, hint }) {
    return (
        <div className="flex items-start justify-between py-2 border-b last:border-b-0">
            <div className="text-slate-500 text-sm">{label}{hint && <span className="text-slate-400"> · {hint}</span>}</div>
            <div className="text-slate-800 font-medium">{value ?? '-'}</div>
        </div>
    );
}

function Chip({ children, tone = 'neutral' }) {
    const map = {
        success: 'bg-emerald-100 text-emerald-700',
        warn: 'bg-amber-100 text-amber-700',
        danger: 'bg-rose-100 text-rose-700',
        neutral: 'bg-slate-100 text-slate-700',
    };
    return <span className={`px-2 py-1 rounded-xl text-xs font-medium ${map[tone]}`}>{children}</span>;
}


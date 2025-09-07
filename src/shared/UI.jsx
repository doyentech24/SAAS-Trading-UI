// src/shared/UI.jsx
export function Card({ title, right, children }) {
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
export function Kpi({ title, value, tone }) {
  const color = tone === "green" ? "text-green-600" : tone === "red" ? "text-red-600" : tone === "blue" ? "text-blue-700" : "text-slate-800";
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
      <div className="text-slate-500 text-sm">{title}</div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
    </div>
  );
}
export function Pill({ children, tone="gray" }) {
  const map = {
    green: "border-green-200 bg-green-50 text-green-700",
    red: "border-red-200 bg-red-50 text-red-700",
    gray: "border-slate-200 bg-slate-50 text-slate-700",
  };
  return <span className={`inline-block px-2 py-0.5 rounded-full border text-xs ${map[tone]}`}>{children}</span>;
}

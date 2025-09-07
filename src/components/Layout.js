// src/components/Layout.js
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function Layout({ children }) {
  return (
    <div className="flex min-h-screen bg-[#F7F7FB]">
      <Sidebar />
      <main className="flex-1">
        <Topbar />
        <div className="max-w-[1400px] mx-auto px-4 py-6">{children}</div>
      </main>
    </div>
  );
}

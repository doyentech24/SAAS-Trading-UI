// src/App.js
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/setting";
import Profile from "./components/Profile";
import Analyzer from "./pages/Analyzer";


function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/setting" element={<Settings />} />
        <Route path="/Profile" element={<Profile />} />
        <Route path="/Analyzer" element={<Analyzer />} />



        

      </Routes>
    </BrowserRouter>
  );
}

export default App;

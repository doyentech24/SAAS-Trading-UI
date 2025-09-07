// server.js
import express from "express";
import axios from "axios";
import cors from "cors";

const app = express();
app.use(cors());

// Fetch Nifty/Sensex using Yahoo Finance symbols
const symbols = {
  sensex: "^BSESN",
  nifty: "^NSEI",
  banknifty: "^NSEBANK",
};

app.get("/api/market", async (req, res) => {
  try {
    let results = {};
    for (let [name, symbol] of Object.entries(symbols)) {
      const resp = await axios.get(
        `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1m`
      );
      results[name] = resp.data.chart.result[0].meta.regularMarketPrice;
    }
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(5000, () => console.log("API running on http://localhost:5000"));

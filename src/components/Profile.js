import React, { useEffect, useState } from "react";
import axios from "axios";
import Layout from "../components/Layout";

export default function Profile({ userId }) {
  const [accounts, setAccounts] = useState({});

  useEffect(() => {
    axios.get("http://localhost:5000/accounts")
      .then(res => setAccounts(res.data))
      .catch(err => console.error(err));
  }, []);

  const addAccount = async () => {
    const res = await axios.post("http://localhost:5000/connect/zerodha", {
      user_id: userId,
      access_token: "MOCK_NEW_ACCESS_TOKEN"
    });
    setAccounts(res.data.accounts);
  };

  return (
    <Layout>
      <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Profile</h2>
      <div className="bg-white p-4 rounded-xl shadow-md">
        <h3 className="text-lg font-semibold mb-2">Connected Accounts</h3>
        <pre className="bg-gray-100 p-2 rounded">
          {JSON.stringify(accounts, null, 2)}
        </pre>
        <button
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl"
          onClick={addAccount}
        >
          + Add Zerodha Account
        </button>
      </div>
    </div>
    </Layout>
  );
}

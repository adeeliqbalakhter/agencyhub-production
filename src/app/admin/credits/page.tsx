"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import {
  CreditCard,
  Building2,
  Plus,
  Loader2,
  Search,
  Inbox,
  X,
  Coins,
} from "lucide-react";

interface AgencyCredit {
  id: string;
  name: string;
  logo: string | null;
  status: string;
  monthlyCredits: number;
  consumed: number;
  granted: number;
  available: number;
}

export default function AdminCreditsPage() {
  const [agencies, setAgencies] = useState<AgencyCredit[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [topUpModal, setTopUpModal] = useState<{ id: string; name: string } | null>(null);
  const [topUpAmount, setTopUpAmount] = useState("5");
  const [topUpLoading, setTopUpLoading] = useState(false);
  const [topUpMessage, setTopUpMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchAgencies();
  }, []);

  async function fetchAgencies() {
    try {
      setLoading(true);
      // Fetch all agencies
      const res = await fetch("/api/admin/agencies?limit=100");
      if (!res.ok) return;
      const json = await res.json();
      const agencyList = json.data ?? [];

      // Fetch credit info for each
      const credits: AgencyCredit[] = [];
      for (const a of agencyList) {
        let monthlyCredits = 1;
        let consumed = 0;
        let granted = 0;

        try {
          const creditRes = await fetch(`/api/admin/credits?agencyId=${a.id}`);
          if (creditRes.ok) {
            const creditJson = await creditRes.json();
            const d = creditJson.data;
            monthlyCredits = d?.monthlyCredits ?? 1;
            consumed = d?.consumed ?? 0;
            granted = d?.granted ?? 0;
          }
        } catch { /* ignore */ }

        const available = Math.max((monthlyCredits === -1 ? 999999 : monthlyCredits) + granted - consumed, 0);

        credits.push({
          id: a.id,
          name: a.name || "Unknown",
          logo: a.logo || null,
          status: a.status || "active",
          monthlyCredits,
          consumed,
          granted,
          available,
        });
      }

      setAgencies(credits);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  async function handleTopUp() {
    if (!topUpModal) return;
    setTopUpLoading(true);
    setTopUpMessage(null);
    try {
      const res = await fetch("/api/admin/credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agencyId: topUpModal.id,
          amount: Number(topUpAmount),
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setTopUpMessage(`Added ${topUpAmount} credits successfully!`);
        // Update local state
        setAgencies((prev) =>
          prev.map((a) =>
            a.id === topUpModal.id
              ? { ...a, granted: a.granted + Number(topUpAmount), available: a.available + Number(topUpAmount) }
              : a
          )
        );
        setTimeout(() => {
          setTopUpModal(null);
          setTopUpMessage(null);
        }, 1500);
      } else {
        setTopUpMessage(json.error || "Failed to add credits");
      }
    } catch {
      setTopUpMessage("Network error");
    } finally {
      setTopUpLoading(false);
    }
  }

  const filtered = agencies.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-brand animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-navy">Credit Management</h1>
        <p className="mt-1 text-gray-500">
          View and manage lead credits for all agencies.
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center mb-3">
            <Building2 className="w-5 h-5 text-brand" />
          </div>
          <p className="text-2xl font-bold text-navy">{agencies.length}</p>
          <p className="text-sm text-gray-500">Total Agencies</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="w-9 h-9 bg-green-50 rounded-lg flex items-center justify-center mb-3">
            <CreditCard className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-navy">
            {agencies.reduce((sum, a) => sum + a.available, 0)}
          </p>
          <p className="text-sm text-gray-500">Total Available Credits</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="w-9 h-9 bg-orange-50 rounded-lg flex items-center justify-center mb-3">
            <Coins className="w-5 h-5 text-orange-500" />
          </div>
          <p className="text-2xl font-bold text-navy">
            {agencies.reduce((sum, a) => sum + a.granted, 0)}
          </p>
          <p className="text-sm text-gray-500">Total Granted (Bonus)</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search agencies..."
          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none"
        />
      </div>

      {/* Agency List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-5 py-3 font-semibold text-navy">Agency</th>
                <th className="text-center px-4 py-3 font-semibold text-navy">Plan Credits</th>
                <th className="text-center px-4 py-3 font-semibold text-navy">Bonus</th>
                <th className="text-center px-4 py-3 font-semibold text-navy">Used</th>
                <th className="text-center px-4 py-3 font-semibold text-navy">Available</th>
                <th className="text-right px-5 py-3 font-semibold text-navy">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center">
                    <Inbox className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">No agencies found</p>
                  </td>
                </tr>
              ) : (
                filtered.map((a) => (
                  <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center flex-shrink-0">
                          {a.logo ? (
                            <Image src={a.logo} alt="" width={32} height={32} className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <Building2 className="w-4 h-4 text-brand" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-navy">{a.name}</p>
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                            a.status === "active" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
                          }`}>
                            {a.status}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="text-center px-4 py-3.5 text-gray-600">
                      {a.monthlyCredits === -1 ? "∞" : a.monthlyCredits}
                    </td>
                    <td className="text-center px-4 py-3.5">
                      <span className={a.granted > 0 ? "text-green-600 font-medium" : "text-gray-400"}>
                        {a.granted > 0 ? `+${a.granted}` : "0"}
                      </span>
                    </td>
                    <td className="text-center px-4 py-3.5 text-gray-600">
                      {a.consumed}
                    </td>
                    <td className="text-center px-4 py-3.5">
                      <span className={`font-bold ${
                        a.available <= 0 ? "text-red-600" : a.available <= 2 ? "text-orange-500" : "text-green-600"
                      }`}>
                        {a.monthlyCredits === -1 ? "∞" : a.available}
                      </span>
                    </td>
                    <td className="text-right px-5 py-3.5">
                      <button
                        onClick={() => {
                          setTopUpModal({ id: a.id, name: a.name });
                          setTopUpAmount("5");
                          setTopUpMessage(null);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand text-white text-xs font-medium rounded-lg hover:bg-brand-dark transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                        Add Credits
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Up Modal */}
      {topUpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setTopUpModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-navy">Add Credits</h3>
              <button onClick={() => setTopUpModal(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Add lead credits to <span className="font-semibold">{topUpModal.name}</span>
            </p>
            <div className="flex gap-2 mb-4">
              {[1, 5, 10, 25, 50].map((n) => (
                <button
                  key={n}
                  onClick={() => setTopUpAmount(String(n))}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    topUpAmount === String(n)
                      ? "bg-brand text-white border-brand"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Or enter custom amount</label>
            <input
              type="number"
              value={topUpAmount}
              onChange={(e) => setTopUpAmount(e.target.value)}
              min="1"
              max="1000"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none mb-4"
            />
            {topUpMessage && (
              <p className={`text-sm mb-4 ${topUpMessage.includes("success") ? "text-green-600" : "text-red-600"}`}>
                {topUpMessage}
              </p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setTopUpModal(null)}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleTopUp}
                disabled={topUpLoading || !topUpAmount || Number(topUpAmount) < 1}
                className="flex-1 flex items-center justify-center gap-2 bg-brand text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-brand-dark disabled:opacity-50"
              >
                {topUpLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Add {topUpAmount} Credits
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

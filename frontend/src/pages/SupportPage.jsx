import React, { useEffect, useState } from "react";
import { MdSupportAgent } from "react-icons/md";
import toast from "react-hot-toast";
import Nav from "../component/Nav";
import Footer from "../component/Footer";
import EmptyState from "../component/EmptyState";
import { api, getErrorMessage } from "../api/client";

function SupportPage() {
  const [tickets, setTickets] = useState([]);
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("order_issue");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadTickets = async () => {
    try {
      const res = await api.get("/api/user/support");
      setTickets(res.data?.tickets || []);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/api/user/support", { subject, category, message });
      setSubject("");
      setMessage("");
      toast.success("Support ticket submitted");
      loadTickets();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FB] flex flex-col">
      <Nav />
      <main className="flex-1 pt-24 max-w-5xl w-full mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-12 gap-6">
        <form
          onSubmit={handleSubmit}
          className="md:col-span-5 bg-white rounded-2xl border border-slate-200/80 p-6 space-y-4 h-fit"
        >
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <MdSupportAgent className="text-[#FF4D2D]" size={24} />
            <span>Help & Support</span>
          </h1>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-[#FF4D2D]"
            >
              <option value="order_issue">Order Issue</option>
              <option value="payment">Payment / Refund</option>
              <option value="delivery">Delivery Issue</option>
              <option value="account">Account Help</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief summary of the issue"
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-[#FF4D2D]"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Details</label>
            <textarea
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe your issue..."
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-[#FF4D2D]"
              required
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 rounded-xl bg-[#FF4D2D] hover:bg-[#E63E20] text-white text-sm font-bold cursor-pointer"
          >
            {submitting ? "Submitting..." : "Submit Request"}
          </button>
        </form>

        <div className="md:col-span-7 space-y-4">
          <h2 className="text-lg font-bold text-slate-900">Your Support Requests</h2>
          {tickets.length === 0 ? (
            <EmptyState
              icon={<MdSupportAgent />}
              title="No support tickets"
              subtitle="Need help with an order or payment? Submit a request on the left."
            />
          ) : (
            tickets.map((t) => (
              <div key={t._id} className="bg-white rounded-2xl border border-slate-200/80 p-5 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-bold text-slate-900 text-sm">{t.subject}</h3>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-orange-50 text-[#FF4D2D]">
                    {t.status.replace("_", " ")}
                  </span>
                </div>
                <p className="text-sm text-slate-600">{t.message}</p>
                {t.adminReply && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-800">
                    <span className="font-bold">Support Reply: </span>
                    {t.adminReply}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default SupportPage;

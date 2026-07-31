"use client";
import { useState, useEffect } from "react";
import Breadcrumbs from "@/components/Breadcrumbs";
import { Plus, Calendar, Clock, AlertCircle, XCircle } from "lucide-react";

export default function StaffSchedulePage() {
  const [upcoming, setUpcoming] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchSchedule = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/staff/schedule");
      const data = await res.json();
      if (data.upcoming) setUpcoming(data.upcoming);
      if (data.requests) setRequests(data.requests);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSchedule();
  }, []);

  return (
    <main className="flex-1 p-8 lg:p-12 overflow-auto">
      <Breadcrumbs items={[{ label: "Overview", href: "/staff" }, { label: "Schedule" }]} accentClass="hover:text-accent-copper" />
      <div className="flex justify-between items-end mb-10">
        <div>
          <h1 className="text-3xl font-semibold text-text-primary">Shift Schedule</h1>
          <p className="text-text-secondary mt-2 text-sm uppercase tracking-wider">Manage your upcoming shifts and requests.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="px-6 py-2.5 font-bold text-xs uppercase tracking-widest bg-accent-copper text-white hover:bg-opacity-90 transition-colors flex items-center gap-2"
        >
          <Plus size={16} /> Request a Shift
        </button>
      </div>

      <div className="mb-12">
        <h2 className="text-sm font-bold uppercase tracking-widest text-text-secondary mb-4 flex items-center gap-2">
          <Calendar size={16} /> Upcoming Approved Shifts
        </h2>
        {loading ? (
          <div className="text-text-secondary text-xs font-mono uppercase animate-pulse">Loading...</div>
        ) : upcoming.length === 0 ? (
          <div className="panel p-8 text-center text-text-secondary text-sm font-mono uppercase tracking-widest">
            No upcoming shifts scheduled.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcoming.map(shift => (
              <div key={shift.id} className="panel p-5 border-l-[3px] border-l-accent-copper">
                <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-secondary mb-1">Date</div>
                <div className="font-mono text-lg text-text-primary mb-4">{new Date(shift.requested_date).toLocaleDateString()}</div>
                <div className="flex gap-6">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-secondary mb-1">Start</div>
                    <div className="font-mono text-sm text-text-primary">{shift.start_time}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-secondary mb-1">End</div>
                    <div className="font-mono text-sm text-text-primary">{shift.end_time}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-sm font-bold uppercase tracking-widest text-text-secondary mb-4 flex items-center gap-2">
          <Clock size={16} /> Pending & Rejected Requests
        </h2>
        {loading ? (
          <div className="text-text-secondary text-xs font-mono uppercase animate-pulse">Loading...</div>
        ) : requests.length === 0 ? (
          <div className="panel p-8 text-center text-text-secondary text-sm font-mono uppercase tracking-widest">
            No pending or rejected requests.
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map(req => (
              <div key={req.id} className="panel p-5 border-l-[3px] border-l-transparent hover:bg-bg-panel-elevated transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex gap-8">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-secondary mb-1">Requested Date</div>
                    <div className="font-mono text-sm text-text-primary">{new Date(req.requested_date).toLocaleDateString()}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-secondary mb-1">Time</div>
                    <div className="font-mono text-sm text-text-primary">{req.start_time} - {req.end_time}</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-6">
                  {req.manager_note && (
                    <div className="text-xs text-text-secondary italic max-w-xs truncate">
                      "{req.manager_note}"
                    </div>
                  )}
                  {req.status === 'pending' ? (
                    <div className="px-3 py-1 bg-accent-gold/10 border border-accent-gold/20 text-accent-gold text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 rounded-full">
                      <AlertCircle size={12} /> Pending Review
                    </div>
                  ) : (
                    <div className="px-3 py-1 bg-accent-oxblood/10 border border-accent-oxblood/20 text-accent-oxblood text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 rounded-full">
                      <XCircle size={12} /> Rejected
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isModalOpen && <NewRequestModal onClose={() => setIsModalOpen(false)} onSuccess={() => { setIsModalOpen(false); fetchSchedule(); }} />}
    </main>
  );
}

function NewRequestModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
  const [formData, setFormData] = useState({ requested_date: "", start_time: "", end_time: "", staff_note: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    const shiftStart = new Date(`${formData.requested_date}T${formData.start_time}`);
    if (shiftStart.getTime() - Date.now() < 24 * 60 * 60 * 1000) {
      setError("Shift requests must be submitted at least 24 hours in advance.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/staff/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData)
    });
    if (res.ok) {
      onSuccess();
    } else {
      const data = await res.json();
      setError(data.error || "System Error");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-bg-base/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="panel border-l-[3px] border-l-accent-copper p-8 w-full max-w-md">
        <h3 className="text-xl font-semibold mb-2 text-text-primary">Request a Shift</h3>
        <p className="text-xs font-mono text-text-secondary mb-8 uppercase tracking-wider">Submit to manager for approval</p>
        
        {error && <div className="text-[#ff6b6b] bg-[#3a1616] border border-[#521d1d] text-xs uppercase tracking-widest font-bold mb-6 p-3">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-[10px] uppercase tracking-[0.15em] font-bold mb-2 text-text-secondary">Date *</label>
            <input required type="date" min={new Date(Date.now() + 24 * 3600 * 1000 - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]} value={formData.requested_date} onChange={e=>setFormData({...formData, requested_date: e.target.value})} className="w-full bg-bg-base border border-border-hairline-strong p-3 text-text-primary font-mono text-sm focus:border-accent-copper focus:outline-none transition-colors [color-scheme:dark]" />
          </div>
          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="block text-[10px] uppercase tracking-[0.15em] font-bold mb-2 text-text-secondary">Start Time *</label>
              <input required type="time" value={formData.start_time} onChange={e=>setFormData({...formData, start_time: e.target.value})} className="w-full bg-bg-base border border-border-hairline-strong p-3 text-text-primary font-mono text-sm focus:border-accent-copper focus:outline-none transition-colors [color-scheme:dark]" />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-[0.15em] font-bold mb-2 text-text-secondary">End Time *</label>
              <input required type="time" value={formData.end_time} onChange={e=>setFormData({...formData, end_time: e.target.value})} className="w-full bg-bg-base border border-border-hairline-strong p-3 text-text-primary font-mono text-sm focus:border-accent-copper focus:outline-none transition-colors [color-scheme:dark]" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-[0.15em] font-bold mb-2 text-text-secondary">Note (Optional)</label>
            <input type="text" value={formData.staff_note} onChange={e=>setFormData({...formData, staff_note: e.target.value})} className="w-full bg-bg-base border border-border-hairline-strong p-3 text-text-primary font-mono text-sm focus:border-accent-copper focus:outline-none transition-colors" placeholder="e.g. Covering for John" />
          </div>
          
          <div className="mt-8 flex justify-end gap-4 pt-4 border-t border-border-hairline">
            <button type="button" onClick={onClose} className="px-4 py-2 font-medium text-xs uppercase tracking-widest text-text-secondary hover:text-text-primary transition-colors">Cancel</button>
            <button type="submit" disabled={loading} className="px-6 py-2 font-bold text-xs uppercase tracking-widest bg-accent-copper text-white hover:bg-opacity-90 disabled:opacity-50 transition-colors">
              {loading ? "Submitting..." : "Submit Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

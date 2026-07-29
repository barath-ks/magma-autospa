"use client";
import { useState, useEffect } from "react";

export default function StaffDashboard() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/staff/jobs");
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs);
      }
    } catch(e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleStatusChange = async (id: string, newStatus: string) => {
    setActionLoadingId(id);
    try {
      const res = await fetch("/api/staff/jobs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });
      if (res.ok) {
        fetchJobs();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to update status");
      }
    } catch(e) {
      console.error(e);
    }
    setActionLoadingId(null);
  };

  return (
      <main className="flex-1 p-8 lg:p-12 overflow-auto">
        <div className="flex justify-between items-end mb-10">
          <div>
            <h1 className="text-3xl font-semibold text-text-primary">Operations Overview</h1>
            <p className="text-text-secondary mt-2 text-sm uppercase tracking-wider">Current shift status and queue.</p>
          </div>
        </div>
        
        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="panel p-6 border-l-[3px] border-l-accent-copper flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-secondary">Vehicles in Queue</span>
            <span className="font-mono text-4xl text-text-primary mt-3">12</span>
          </div>
          <div className="panel p-6 border-l-[3px] border-l-accent-copper flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-secondary">Completed Today</span>
            <span className="font-mono text-4xl text-text-primary mt-3">08</span>
          </div>
          <div className="panel p-6 border-l-[3px] border-l-accent-copper flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-secondary">Next Appointment</span>
            <span className="font-mono text-xl text-text-primary mt-3">14:30 EST</span>
          </div>
        </div>

        {/* Queue Table */}
        <div className="panel overflow-hidden border-l-[3px] border-l-border-hairline-strong">
          <div className="p-5 border-b border-border-hairline flex justify-between items-center bg-bg-panel-elevated">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-text-primary">Active Bay Queue</h2>
          </div>
          <table className="w-full text-left">
            <thead className="bg-bg-panel border-b border-border-hairline text-text-secondary uppercase text-[10px] tracking-[0.2em] font-medium">
              <tr>
                <th className="p-4">Ticket ID</th>
                <th className="p-4">Vehicle</th>
                <th className="p-4">Service Level</th>
                <th className="p-4">Timings</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-hairline bg-bg-panel">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-4 text-text-secondary text-xs font-mono uppercase animate-pulse">Loading jobs...</td>
                </tr>
              ) : jobs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-text-secondary text-sm font-mono uppercase tracking-widest">No active jobs in queue.</td>
                </tr>
              ) : jobs.map(job => (
                <tr key={job.id} className="hover:bg-bg-panel-elevated transition-colors">
                  <td className="p-4">
                    <div className="font-mono text-text-primary text-sm">#{job.id.slice(0,8).toUpperCase()}</div>
                    <div className={`text-[10px] font-bold uppercase tracking-wider mt-1 ${job.assigned_staff_name ? 'text-text-primary' : 'text-text-secondary/60'}`}>
                      {job.assigned_staff_name ? `ASSIGNED TO: ${job.assigned_staff_name}` : 'UNASSIGNED'}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="text-text-primary text-sm font-medium">{job.vehicle_model || 'Unknown Vehicle'}</div>
                    <div className="text-[10px] font-mono text-text-secondary">{job.vehicle_number || ''}</div>
                  </td>
                  <td className="p-4 text-text-secondary text-sm">{job.service_name || 'No Service Logged'}</td>
                  <td className="p-4">
                    <div className="text-[10px] font-mono text-text-secondary uppercase">
                      <div className="flex gap-2">
                        <span className="w-14">ARRIVED:</span>
                        <span className="text-text-primary">{job.created_at ? new Date(job.created_at + 'Z').toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '—'}</span>
                      </div>
                      <div className="flex gap-2 mt-1">
                        <span className="w-14">CLAIMED:</span>
                        <span className="text-text-primary">{job.claimed_at ? new Date(job.claimed_at + 'Z').toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '—'}</span>
                      </div>
                      <div className="flex gap-2 mt-1">
                        <span className="w-14">FINISHED:</span>
                        <span className="text-text-primary">{job.finished_at ? new Date(job.finished_at + 'Z').toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '—'}</span>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <select 
                      value={job.status} 
                      onChange={(e) => handleStatusChange(job.id, e.target.value)}
                      disabled={actionLoadingId === job.id}
                      className={`appearance-none bg-bg-base border border-border-hairline px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest cursor-pointer focus:outline-none focus:border-accent-copper transition-colors ${actionLoadingId === job.id ? 'opacity-50 cursor-not-allowed' : 'hover:bg-bg-panel-elevated'} ${job.status === 'in_progress' ? 'text-accent-copper border-accent-copper/30' : 'text-text-secondary'}`}
                    >
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="finished">Finished</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
  );
}

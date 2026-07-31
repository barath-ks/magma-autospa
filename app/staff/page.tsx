"use client";
import { useState, useEffect } from "react";

export default function StaffDashboard() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ services: [], staff: [] });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newJob, setNewJob] = useState({
    vehicle_make: "",
    vehicle_plate: "",
    service_id: "",
    assigned_to: "",
    customer_name: "",
    customer_phone: "",
    arrived_time: ""
  });

  const fetchJobs = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch("/api/staff/jobs");
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs);
      }
    } catch(e) {
      console.error(e);
    }
    if (!silent) setLoading(false);
  };

  const fetchFormData = async () => {
    try {
      const res = await fetch("/api/staff/jobs/form-data");
      if (res.ok) {
        const data = await res.json();
        setFormData({ services: data.services, staff: data.staff });
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchJobs();
    fetchFormData();
    
    // Auto-refresh queue every 10 seconds for shared real-time updates
    const interval = setInterval(() => fetchJobs(true), 10000);
    return () => clearInterval(interval);
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

  const handleAddNewWork = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/staff/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newJob),
      });
      if (res.ok) {
        setIsModalOpen(false);
        setNewJob({
          vehicle_make: "", vehicle_plate: "", service_id: "", assigned_to: "", customer_name: "", customer_phone: "", arrived_time: ""
        });
        fetchJobs(true);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to create job");
      }
    } catch(e) {
      console.error(e);
    }
    setIsSubmitting(false);
  };

  const activeCount = jobs.length;

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
            <span className="font-mono text-4xl text-text-primary mt-3">{activeCount.toString().padStart(2, '0')}</span>
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
        <div className="panel overflow-hidden border-l-[3px] border-l-border-hairline-strong relative">
          <div className="p-5 border-b border-border-hairline flex justify-between items-center bg-bg-panel-elevated">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-text-primary">Active Bay Queue</h2>
            <button 
              onClick={() => {
                setNewJob(prev => ({ ...prev, arrived_time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) }));
                setIsModalOpen(true);
              }}
              className="text-xs font-bold text-bg-base bg-accent-copper hover:bg-opacity-90 px-4 py-2 uppercase tracking-widest transition-colors"
            >
              + Add New Work
            </button>
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
                      className={`appearance-none bg-bg-base border border-border-hairline px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest cursor-pointer focus:outline-none focus:border-accent-copper transition-colors ${actionLoadingId === job.id ? 'opacity-50 cursor-not-allowed' : 'hover:bg-bg-panel-elevated'} ${job.status === 'in_progress' ? 'text-accent-copper border-accent-copper/30' : job.status === 'pending' ? 'text-blue-400 border-blue-400/30' : 'text-text-secondary'}`}
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

        {/* Add New Work Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg-base/80 backdrop-blur-sm">
            <div className="bg-bg-panel border border-border-hairline w-full max-w-lg shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-6 border-b border-border-hairline shrink-0">
                <h3 className="text-lg font-serif text-text-primary tracking-tight">Add New Work</h3>
                <p className="text-[10px] uppercase tracking-widest text-text-secondary mt-1">Manual queue entry</p>
              </div>
              
              <div className="p-6 overflow-y-auto">
                <form id="new-job-form" onSubmit={handleAddNewWork} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1.5">Vehicle Make & Model *</label>
                      <input type="text" required value={newJob.vehicle_make} onChange={e => setNewJob({...newJob, vehicle_make: e.target.value})} placeholder="e.g. Porsche 911" className="block w-full bg-bg-base border border-border-hairline p-2 text-text-primary text-sm focus:border-accent-copper focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1.5">Plate / ID Number</label>
                      <input type="text" value={newJob.vehicle_plate} onChange={e => setNewJob({...newJob, vehicle_plate: e.target.value})} placeholder="e.g. GT3-4092" className="block w-full bg-bg-base border border-border-hairline p-2 text-text-primary text-sm focus:border-accent-copper focus:outline-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1.5">Service Level *</label>
                    <select required value={newJob.service_id} onChange={e => setNewJob({...newJob, service_id: e.target.value})} className="block w-full bg-bg-base border border-border-hairline p-2 text-text-primary text-sm focus:border-accent-copper focus:outline-none appearance-none">
                      <option value="">-- Select Service --</option>
                      {formData.services.map((s: any) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1.5">Assigned To</label>
                      <select value={newJob.assigned_to} onChange={e => setNewJob({...newJob, assigned_to: e.target.value})} className="block w-full bg-bg-base border border-border-hairline p-2 text-text-primary text-sm focus:border-accent-copper focus:outline-none appearance-none">
                        <option value="">-- Unassigned --</option>
                        {formData.staff.map((s: any) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1.5">Arrived Time</label>
                      <input type="time" value={newJob.arrived_time} onChange={e => setNewJob({...newJob, arrived_time: e.target.value})} className="block w-full bg-bg-base border border-border-hairline p-2 text-text-primary text-sm focus:border-accent-copper focus:outline-none" />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border-hairline">
                    <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-3">Customer Details *</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] text-text-secondary uppercase tracking-widest mb-1.5">Name</label>
                        <input type="text" required value={newJob.customer_name} onChange={e => setNewJob({...newJob, customer_name: e.target.value})} placeholder="e.g. John Doe" className="block w-full bg-bg-base border border-border-hairline p-2 text-text-primary text-sm focus:border-accent-copper focus:outline-none" />
                      </div>
                      <div>
                        <label className="block text-[10px] text-text-secondary uppercase tracking-widest mb-1.5">Phone Number</label>
                        <input type="tel" required value={newJob.customer_phone} onChange={e => setNewJob({...newJob, customer_phone: e.target.value})} placeholder="e.g. 555-0198" className="block w-full bg-bg-base border border-border-hairline p-2 text-text-primary text-sm focus:border-accent-copper focus:outline-none" />
                      </div>
                    </div>
                  </div>
                </form>
              </div>

              <div className="p-6 border-t border-border-hairline bg-bg-panel-elevated flex justify-end gap-3 shrink-0">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-bold text-text-secondary hover:text-text-primary uppercase tracking-widest transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  form="new-job-form"
                  disabled={isSubmitting}
                  className="px-6 py-2 text-xs font-bold text-bg-base bg-accent-copper hover:bg-opacity-90 uppercase tracking-widest transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? "Adding..." : "Add to Queue"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
  );
}

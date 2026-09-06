"use client";
import { useState, useEffect } from "react";
import { Check, X, AlertCircle, Search, User, Phone, Car } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { CheckoutPaymentModal } from "@/components/CheckoutPaymentModal";

export default function ManagerDashboard() {
  // Manager States
  const [profileRequests, setProfileRequests] = useState<any[]>([]);
  const [requestActionLoading, setRequestActionLoading] = useState(false);
  const [rejectRequestId, setRejectRequestId] = useState<string | null>(null);
  const [rejectRequestNote, setRejectRequestNote] = useState("");

  // Staff States (Queue)
  const [jobs, setJobs] = useState<any[]>([]);
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [completingJob, setCompletingJob] = useState<any | null>(null);
  const [formData, setFormData] = useState({ services: [], staff: [] });
  const [newJob, setNewJob] = useState({
    vehicle_make: "", vehicle_plate: "", service_id: "", assigned_to: "", customer_name: "", customer_phone: "", arrived_time: ""
  });

  useEffect(() => {
    fetchProfileRequests();
    fetchJobs();
    fetchFormData();
    const interval = setInterval(() => fetchJobs(true), 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchProfileRequests = async () => {
    try {
      const res = await fetch("/api/manager/profile-requests");
      const data = await res.json();
      if (data.requests) setProfileRequests(data.requests);
    } catch (e) { console.error(e); }
  };

  const handleRequestApprove = async (id: string) => {
    setRequestActionLoading(true);
    try {
      const res = await fetch("/api/manager/profile-requests", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status: "approved" }) });
      const data = await res.json();
      if (res.ok) {
        if (data.auto_rejected) alert(data.message);
        fetchProfileRequests();
      } else { alert(data.error); }
    } catch (e) { console.error(e); }
    setRequestActionLoading(false);
  };

  const handleRequestReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectRequestId || !rejectRequestNote) return;
    setRequestActionLoading(true);
    try {
      const res = await fetch("/api/manager/profile-requests", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: rejectRequestId, status: "rejected", reviewer_note: rejectRequestNote }) });
      if (res.ok) {
        setRejectRequestId(null);
        setRejectRequestNote("");
        fetchProfileRequests();
      } else {
        const data = await res.json();
        alert(data.error);
      }
    } catch (e) { console.error(e); }
    setRequestActionLoading(false);
  };

  const fetchJobs = async (silent = false) => {
    if (!silent) setLoadingQueue(true);
    try {
      const res = await fetch("/api/manager/jobs/active");
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs);
      }
    } catch(e) { console.error(e); }
    if (!silent) setLoadingQueue(false);
  };

  const fetchFormData = async () => {
    try {
      const res = await fetch("/api/manager/jobs/form-data");
      if (res.ok) {
        const data = await res.json();
        setFormData({ services: data.services, staff: data.staff });
      }
    } catch (e) { console.error(e); }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    if (newStatus === "finished") {
      const targetJob = jobs.find((j) => j.id === id);
      if (targetJob) {
        setCompletingJob(targetJob);
        return;
      }
    }

    setActionLoadingId(id);
    try {
      const res = await fetch("/api/manager/jobs/active", {
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
    } catch(e) { console.error(e); }
    setActionLoadingId(null);
  };

  return (
    <main className="flex-1 p-8 lg:p-12 overflow-auto">
      <div className="flex justify-between items-end mb-10">
        <div>
          <h1 className="text-3xl font-semibold text-text-primary">Branch Operations</h1>
          <p className="text-text-secondary mt-2 text-sm uppercase tracking-wider">Metrics, queue, and staff oversight.</p>
        </div>
      </div>
      
      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        <div className="panel p-6 border-l-[3px] border-l-accent-gold flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-secondary">Revenue Today</span>
          <span className="font-mono text-3xl text-text-primary mt-3">{formatCurrency(4250)}</span>
        </div>
        <div className="panel p-6 border-l-[3px] border-l-accent-gold flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-secondary">Vehicles Processed</span>
          <span className="font-mono text-3xl text-text-primary mt-3">18</span>
        </div>
        <div className="panel p-6 border-l-[3px] border-l-accent-gold flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-secondary">Active Staff</span>
          <span className="font-mono text-3xl text-text-primary mt-3">4</span>
        </div>
        <div className="panel p-6 border-l-[3px] border-l-accent-gold flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-secondary">Queue</span>
          <span className="font-mono text-3xl text-text-primary mt-3">{jobs.length.toString().padStart(2, '0')}</span>
        </div>
      </div>

      {/* Queue Table */}
      <div className="mb-10 panel overflow-hidden border-l-[3px] border-l-border-hairline-strong relative">
        <div className="p-5 border-b border-border-hairline flex justify-between items-center bg-bg-panel-elevated">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-text-primary">Active Bay Queue</h2>
          <button 
            onClick={() => {
              setNewJob(prev => ({ ...prev, arrived_time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) }));
              setIsModalOpen(true);
            }}
            className="text-xs font-bold text-bg-base bg-accent-gold hover:bg-opacity-90 px-4 py-2 uppercase tracking-widest transition-colors"
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
            {loadingQueue ? (
              <tr><td colSpan={5} className="p-4 text-text-secondary text-xs font-mono uppercase animate-pulse">Loading jobs...</td></tr>
            ) : jobs.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-text-secondary text-sm font-mono uppercase tracking-widest">No active jobs in queue.</td></tr>
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
                    <div className="flex gap-2"><span className="w-14">ARRIVED:</span><span className="text-text-primary">{job.created_at ? new Date(job.created_at + 'Z').toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '—'}</span></div>
                    <div className="flex gap-2 mt-1"><span className="w-14">CLAIMED:</span><span className="text-text-primary">{job.claimed_at ? new Date(job.claimed_at + 'Z').toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '—'}</span></div>
                    <div className="flex gap-2 mt-1"><span className="w-14">FINISHED:</span><span className="text-text-primary">{job.finished_at ? new Date(job.finished_at + 'Z').toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '—'}</span></div>
                  </div>
                </td>
                <td className="p-4">
                  <select 
                    value={job.status} 
                    onChange={(e) => handleStatusChange(job.id, e.target.value)}
                    disabled={actionLoadingId === job.id}
                    className={`appearance-none bg-bg-base border border-border-hairline px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest cursor-pointer focus:outline-none focus:border-accent-gold transition-colors ${actionLoadingId === job.id ? 'opacity-50 cursor-not-allowed' : 'hover:bg-bg-panel-elevated'} ${job.status === 'in_progress' ? 'text-accent-gold border-accent-gold/30' : job.status === 'pending' ? 'text-blue-400 border-blue-400/30' : 'text-text-secondary'}`}
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

      {/* Profile Requests Queue */}
      {profileRequests.length > 0 && (
        <div className="mb-10 panel p-6 border-l-[3px] border-l-accent-gold">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-text-primary mb-4 flex items-center gap-2">
            <AlertCircle size={16} className="text-accent-gold" /> Pending Staff Profile Changes
          </h2>
          <div className="space-y-3">
            {profileRequests.map(req => (
              <div key={req.id} className="bg-bg-base border border-border-hairline p-4 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex-1 flex gap-8">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-1">Field</div>
                    <div className="font-mono text-sm text-text-primary">{req.field_type === 'login_id' ? 'LOGIN ID' : 'NAME'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-1">Current</div>
                    <div className="font-mono text-sm text-text-primary">{req.current_value}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-1">Requested</div>
                    <div className="font-mono text-sm text-accent-gold">{req.requested_value}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setRejectRequestId(req.id)} disabled={requestActionLoading} className="px-3 py-1.5 border border-border-hairline text-[10px] uppercase tracking-widest font-bold hover:bg-accent-oxblood hover:text-white transition-colors disabled:opacity-50 flex items-center gap-1"><X size={12}/> Reject</button>
                  <button onClick={() => handleRequestApprove(req.id)} disabled={requestActionLoading} className="px-3 py-1.5 bg-accent-gold text-bg-base text-[10px] uppercase tracking-widest font-bold hover:bg-opacity-90 transition-colors disabled:opacity-50 flex items-center gap-1"><Check size={12}/> Approve</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Staff Table */}
      <div className="panel overflow-hidden border-l-[3px] border-l-border-hairline-strong">
        <div className="p-5 border-b border-border-hairline flex justify-between items-center bg-bg-panel-elevated">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-text-primary">Active Staff Roster</h2>
        </div>
        <table className="w-full text-left">
          <thead className="bg-bg-panel border-b border-border-hairline text-text-secondary uppercase text-[10px] tracking-[0.2em] font-medium">
            <tr>
              <th className="p-4">Staff ID</th>
              <th className="p-4">Name</th>
              <th className="p-4">Shift</th>
              <th className="p-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-hairline bg-bg-panel">
            <tr className="hover:bg-bg-panel-elevated transition-colors">
              <td className="p-4 font-mono text-text-primary text-sm">MAG-0001</td>
              <td className="p-4 text-text-primary text-sm font-medium">Alex Chen</td>
              <td className="p-4 text-text-secondary text-sm">08:00 - 16:00</td>
              <td className="p-4"><span className="text-[10px] uppercase tracking-[0.1em] font-medium text-accent-gold flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-accent-gold animate-pulse"></span> On Duty</span></td>
            </tr>
            <tr className="hover:bg-bg-panel-elevated transition-colors">
              <td className="p-4 font-mono text-text-primary text-sm">MAG-0002</td>
              <td className="p-4 text-text-primary text-sm font-medium">Sarah Miller</td>
              <td className="p-4 text-text-secondary text-sm">10:00 - 18:00</td>
              <td className="p-4"><span className="text-[10px] uppercase tracking-[0.1em] font-medium text-accent-gold flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-accent-gold animate-pulse"></span> On Duty</span></td>
            </tr>
          </tbody>
        </table>
      </div>

      {rejectRequestId && (
        <div className="fixed inset-0 bg-bg-base/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="panel border-l-[3px] border-l-accent-oxblood p-8 w-full max-w-md">
            <h3 className="text-xl font-semibold mb-2 text-text-primary">Reject Profile Request</h3>
            <p className="text-xs font-mono text-text-secondary mb-6 uppercase tracking-wider">Please provide a reason.</p>
            <form onSubmit={handleRequestReject}>
              <div className="mb-6">
                <label className="block text-[10px] uppercase tracking-[0.15em] font-bold mb-2 text-text-secondary">Manager Note *</label>
                <input required autoFocus type="text" value={rejectRequestNote} onChange={e=>setRejectRequestNote(e.target.value)} className="w-full bg-bg-base border border-border-hairline-strong p-3 text-text-primary font-mono text-sm focus:border-accent-oxblood focus:outline-none transition-colors" />
              </div>
              <div className="flex justify-end gap-4 pt-4 border-t border-border-hairline">
                <button type="button" onClick={() => setRejectRequestId(null)} className="px-4 py-2 font-medium text-xs uppercase tracking-widest text-text-secondary hover:text-text-primary transition-colors">Cancel</button>
                <button type="submit" disabled={requestActionLoading || !rejectRequestNote} className="px-6 py-2 font-bold text-xs uppercase tracking-widest bg-accent-oxblood text-white hover:bg-opacity-90 disabled:opacity-50 transition-colors">
                  {requestActionLoading ? "Rejecting..." : "Confirm Rejection"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isModalOpen && <AddNewWorkWizard formData={formData} onClose={() => setIsModalOpen(false)} onSuccess={() => { setIsModalOpen(false); fetchJobs(true); }} />}

      {/* Checkout & Payment Modal */}
      {completingJob && (
        <CheckoutPaymentModal
          job={completingJob}
          accentColor="gold"
          onClose={() => setCompletingJob(null)}
          onSuccess={(method) => {
            setCompletingJob(null);
            fetchJobs(true);
          }}
        />
      )}
    </main>
  );
}

export function AddNewWorkWizard({ formData, onClose, onSuccess }: { formData: any, onClose: () => void, onSuccess: () => void }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [tab, setTab] = useState<"existing" | "new">("existing");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: "", phone: "", email: "", vehicle_number: "", vehicle_type: "sedan", vehicle_model: "" });
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [selectedCustomerVehicles, setSelectedCustomerVehicles] = useState<any[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [assignedTo, setAssignedTo] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    if (tab === "existing" && searchQuery.length > 0) {
      const delay = setTimeout(async () => {
        setIsSearching(true);
        try {
          const res = await fetch(`/api/manager/customers?search=${encodeURIComponent(searchQuery)}`);
          const data = await res.json();
          if (data.customers) setSearchResults(data.customers);
        } catch (e) { console.error(e); }
        setIsSearching(false);
      }, 300);
      return () => clearTimeout(delay);
    } else { setSearchResults([]); }
  }, [searchQuery, tab]);

  const handleSelectExisting = async (customer: any) => { 
    setSelectedCustomer(customer);
    // Fetch vehicles for this customer
    try {
      const res = await fetch(`/api/manager/customers/${customer.id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedCustomerVehicles(data.vehicles || []);
        if (data.vehicles && data.vehicles.length > 0) {
          setSelectedVehicleId(data.vehicles[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    }
    setStep(2); 
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(""); setIsCreating(true);
    try {
      const res = await fetch("/api/manager/customers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newCustomer) });
      const data = await res.json();
      if (res.ok) { 
        setSelectedCustomer(data); 
        // Fetch full profile to get vehicles
        const fetchRes = await fetch(`/api/manager/customers/${data.id}`);
        if (fetchRes.ok) {
          const freshData = await fetchRes.json();
          setSelectedCustomerVehicles(freshData.vehicles || []);
          if (freshData.vehicles && freshData.vehicles.length > 0) {
            setSelectedVehicleId(freshData.vehicles[0].id);
          }
        }
        setStep(2); 
      } else { 
        setCreateError(data.error || "Failed to create customer"); 
      }
    } catch(e) { setCreateError("System Error"); }
    setIsCreating(false);
  };

  const handleSubmitJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicleId) { setSubmitError("Please select a vehicle."); return; }
    if (serviceIds.length === 0) { setSubmitError("Please select at least one service."); return; }
    setSubmitError(""); setIsSubmitting(true);
    try {
      const payload: any = { customer_id: selectedCustomer.id, service_ids: serviceIds, vehicle_id: selectedVehicleId };
      if (assignedTo) payload.assigned_to = assignedTo;
      const res = await fetch("/api/manager/transactions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (res.ok) { onSuccess(); } else { const data = await res.json(); setSubmitError(data.error || "Failed to create job"); }
    } catch (e) { setSubmitError("System Error"); }
    setIsSubmitting(false);
  };

  const toggleService = (id: string) => {
    if (serviceIds.includes(id)) { setServiceIds(serviceIds.filter(s => s !== id)); } else { setServiceIds([...serviceIds, id]); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg-base/80 backdrop-blur-sm">
      <div className="bg-bg-panel border border-border-hairline w-full max-w-2xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-border-hairline shrink-0 flex justify-between items-center bg-bg-panel-elevated">
          <div>
            <h3 className="text-lg font-serif text-text-primary tracking-tight">Add New Work</h3>
            <p className="text-[10px] uppercase tracking-widest text-text-secondary mt-1">{step === 1 ? "Step 1: Select or Create Customer" : `Step 2: Job Details for ${selectedCustomer?.name}`}</p>
          </div>
          {step === 2 && (<button onClick={() => setStep(1)} className="text-[10px] font-bold uppercase tracking-widest text-accent-gold hover:text-white transition-colors">&larr; Back to Step 1</button>)}
        </div>
        <div className="p-6 overflow-y-auto flex-1">
          {step === 1 && (
            <div className="space-y-6">
              <div className="flex border-b border-border-hairline mb-6">
                <button onClick={() => setTab("existing")} className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-colors ${tab === "existing" ? "text-accent-gold border-b-2 border-accent-gold bg-bg-panel-elevated" : "text-text-secondary hover:text-text-primary"}`}>Search Existing</button>
                <button onClick={() => setTab("new")} className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-colors ${tab === "new" ? "text-accent-gold border-b-2 border-accent-gold bg-bg-panel-elevated" : "text-text-secondary hover:text-text-primary"}`}>+ Create New</button>
              </div>
              {tab === "existing" && (
                <div>
                  <div className="relative mb-4">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Search size={16} className="text-text-secondary" /></div>
                    <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="SEARCH BY NAME, PHONE, OR VEHICLE..." className="w-full bg-bg-base border border-border-hairline p-3 pl-12 text-text-primary font-mono text-sm focus:border-accent-gold focus:outline-none transition-colors placeholder:text-text-secondary/50 uppercase tracking-widest" />
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                    {isSearching ? (<div className="text-text-secondary text-[10px] font-mono uppercase tracking-widest animate-pulse p-4 text-center">Searching...</div>) : searchResults.length > 0 ? (
                      searchResults.map(c => (
                        <div key={c.id} onClick={() => handleSelectExisting(c)} className="p-4 border border-border-hairline hover:border-accent-gold bg-bg-base hover:bg-bg-panel-elevated cursor-pointer transition-colors flex justify-between items-center group">
                          <div className="flex gap-8">
                            <div><div className="text-[10px] font-bold text-text-secondary uppercase mb-1 flex items-center gap-1"><User size={10}/> Name</div><div className="text-sm font-medium text-text-primary">{c.name}</div></div>
                            <div><div className="text-[10px] font-bold text-text-secondary uppercase mb-1 flex items-center gap-1"><Phone size={10}/> Phone</div><div className="text-sm font-mono text-text-primary">{c.phone}</div></div>
                          </div>
                          <div className="text-accent-gold opacity-0 group-hover:opacity-100 transition-opacity font-mono text-xs uppercase tracking-widest">&rarr;</div>
                        </div>
                      ))
                    ) : searchQuery ? (<div className="text-text-secondary text-[10px] font-mono uppercase tracking-widest p-4 text-center border border-border-hairline border-dashed">No results found.</div>) : (<div className="text-text-secondary text-[10px] font-mono uppercase tracking-widest p-4 text-center border border-border-hairline border-dashed">Start typing to search...</div>)}
                  </div>
                </div>
              )}
              {tab === "new" && (
                <form id="new-customer-form" onSubmit={handleCreateCustomer} className="space-y-4">
                  {createError && <div className="text-[#ff6b6b] bg-[#3a1616] border border-[#521d1d] text-[10px] uppercase tracking-widest font-bold p-3">{createError}</div>}
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1.5">Full Name *</label><input required type="text" value={newCustomer.name} onChange={e=>setNewCustomer({...newCustomer, name: e.target.value})} className="w-full bg-bg-base border border-border-hairline p-3 text-text-primary font-mono text-sm focus:border-accent-gold focus:outline-none" /></div>
                    <div><label className="block text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1.5">Phone Number *</label><input required type="tel" value={newCustomer.phone} onChange={e=>setNewCustomer({...newCustomer, phone: e.target.value})} className="w-full bg-bg-base border border-border-hairline p-3 text-text-primary font-mono text-sm focus:border-accent-gold focus:outline-none" /></div>
                    <div className="col-span-2"><label className="block text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1.5">Email Address</label><input type="email" value={newCustomer.email} onChange={e=>setNewCustomer({...newCustomer, email: e.target.value})} className="w-full bg-bg-base border border-border-hairline p-3 text-text-primary font-mono text-sm focus:border-accent-gold focus:outline-none" /></div>
                    <div><label className="block text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1.5">Vehicle Number *</label><input required type="text" value={newCustomer.vehicle_number} onChange={e=>setNewCustomer({...newCustomer, vehicle_number: e.target.value})} className="w-full bg-bg-base border border-border-hairline p-3 text-text-primary font-mono text-sm focus:border-accent-gold focus:outline-none uppercase" /></div>
                    <div>
                      <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1.5">Vehicle Type *</label>
                      <select required value={newCustomer.vehicle_type} onChange={e=>setNewCustomer({...newCustomer, vehicle_type: e.target.value})} className="w-full bg-bg-base border border-border-hairline p-3 text-text-primary font-mono text-sm focus:border-accent-gold focus:outline-none">
                        <option value="sedan">Sedan</option>
                        <option value="suv">SUV</option>
                        <option value="hatchback">Hatchback</option>
                        <option value="xuv">XUV</option>
                        <option value="truck">Truck</option>
                        <option value="van">Van</option>
                        <option value="bike">Bike</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div className="col-span-2"><label className="block text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1.5">Vehicle Model</label><input type="text" value={newCustomer.vehicle_model} onChange={e=>setNewCustomer({...newCustomer, vehicle_model: e.target.value})} className="w-full bg-bg-base border border-border-hairline p-3 text-text-primary font-mono text-sm focus:border-accent-gold focus:outline-none" placeholder="e.g. Porsche 911" /></div>
                  </div>
                </form>
              )}
            </div>
          )}
          {step === 2 && (
            <form id="job-details-form" onSubmit={handleSubmitJob} className="space-y-6">
              {submitError && <div className="text-[#ff6b6b] bg-[#3a1616] border border-[#521d1d] text-[10px] uppercase tracking-widest font-bold p-3">{submitError}</div>}
              <div className="p-4 bg-bg-base border border-border-hairline mb-6 flex justify-between items-center">
                <div><div className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1">Customer</div><div className="text-sm text-text-primary font-medium">{selectedCustomer?.name} <span className="text-text-secondary font-mono ml-2">({selectedCustomer?.phone})</span></div></div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-3">Select Vehicle *</label>
                {selectedCustomerVehicles.length === 0 ? (
                  <div className="text-xs text-[#ff6b6b] bg-[#3a1616] p-3 font-bold uppercase tracking-widest border border-[#521d1d]">
                    No vehicles found for this customer. Please add one from their profile first.
                  </div>
                ) : (
                  <select 
                    value={selectedVehicleId} 
                    onChange={e => setSelectedVehicleId(e.target.value)}
                    className="w-full bg-bg-base border border-border-hairline p-3 text-text-primary text-sm font-mono focus:border-accent-gold focus:outline-none mb-6"
                  >
                    <option value="" disabled>-- Choose a vehicle --</option>
                    {selectedCustomerVehicles.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.vehicle_number} ({v.vehicle_model || v.vehicle_type})
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div>
                <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-3">Select Services *</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-2">
                  {formData.services.map((s: any) => (
                    <label key={s.id} className={`flex items-center p-3 border cursor-pointer transition-colors ${serviceIds.includes(s.id) ? 'border-accent-gold bg-accent-gold/10' : 'border-border-hairline bg-bg-base hover:border-text-secondary'}`}>
                      <input type="checkbox" checked={serviceIds.includes(s.id)} onChange={() => toggleService(s.id)} className="mr-3 accent-accent-gold w-4 h-4" />
                      <div className="flex-1"><div className="text-sm font-medium text-text-primary">{s.name}</div><div className="text-[10px] font-mono text-accent-gold">${Number(s.price).toFixed(2)}</div></div>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1.5">Assign To Staff (Optional)</label>
                <select value={assignedTo} onChange={e => setAssignedTo(e.target.value)} className="block w-full bg-bg-base border border-border-hairline p-3 text-text-primary text-sm focus:border-accent-gold focus:outline-none appearance-none cursor-pointer">
                  <option value="">-- Leave Unassigned (Queue) --</option>
                  {formData.staff.map((s: any) => (<option key={s.id} value={s.id}>{s.name}</option>))}
                </select>
              </div>
            </form>
          )}
        </div>
        <div className="p-6 border-t border-border-hairline bg-bg-panel-elevated flex justify-end gap-3 shrink-0">
          <button type="button" onClick={onClose} disabled={isCreating || isSubmitting} className="px-4 py-2 text-xs font-bold text-text-secondary hover:text-text-primary uppercase tracking-widest transition-colors">Cancel</button>
          {step === 1 && tab === "new" && (<button type="submit" form="new-customer-form" disabled={isCreating} className="px-6 py-2 text-xs font-bold text-bg-base bg-accent-gold hover:bg-opacity-90 uppercase tracking-widest transition-colors disabled:opacity-50 flex items-center gap-2">{isCreating ? "Saving..." : "Save & Continue"} &rarr;</button>)}
          {step === 2 && (<button type="submit" form="job-details-form" disabled={isSubmitting} className="px-6 py-2 text-xs font-bold text-bg-base bg-accent-gold hover:bg-opacity-90 uppercase tracking-widest transition-colors disabled:opacity-50">{isSubmitting ? "Adding..." : "Add to Queue"}</button>)}
        </div>
      </div>
    </div>
  );
}

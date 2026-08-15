"use client";
import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Car, Phone, Award, Clock, Pencil } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import { formatCurrency } from "@/lib/format";

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [customer, setCustomer] = useState<any>(null);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [offers, setOffers] = useState<any[]>([]);
  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [redeemStep, setRedeemStep] = useState<1 | 2>(1);
  const [selectedOfferId, setSelectedOfferId] = useState<string>("");
  const [otp, setOtp] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [redeemError, setRedeemError] = useState("");
  const [redeemSuccess, setRedeemSuccess] = useState("");
  const [services, setServices] = useState<any[]>([]);
  const [showLogVisitModal, setShowLogVisitModal] = useState(false);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
  const [loggingVisit, setLoggingVisit] = useState(false);
  const [logVisitError, setLogVisitError] = useState("");
  const [logVisitSuccess, setLogVisitSuccess] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [ledger, setLedger] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({ totalEarned: 0, totalRedeemed: 0 });
  const [showAddVehicleModal, setShowAddVehicleModal] = useState(false);
  const [showEditVehicleModal, setShowEditVehicleModal] = useState<any>(null);
  
  const { id } = use(params);

  useEffect(() => {
    const fetchCustomer = async () => {
      try {
        const res = await fetch(`/api/manager/customers/${id}`);
        if (res.ok) {
          const data = await res.json();
          setCustomer(data.customer);
          setVehicles(data.vehicles || []);
          setHistory(data.history);
          setLedger(data.ledger || []);
          setStats(data.stats || { totalEarned: 0, totalRedeemed: 0 });
        } else {
          router.push("/staff/customers");
        }
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    const fetchOffers = async () => {
      try {
        const res = await fetch(`/api/manager/offers`);
        if (res.ok) {
          const data = await res.json();
          setOffers(data.offers);
        }
      } catch (e) {
        console.error(e);
      }
    };
    const fetchServices = async () => {
      try {
        const res = await fetch(`/api/manager/services`);
        if (res.ok) {
          const data = await res.json();
          setServices(data.services);
        }
      } catch (e) {
        console.error(e);
      }
    };

    if (id) {
      fetchCustomer();
      fetchOffers();
      fetchServices();
    }
  }, [id, router]);

  const handleRequestOTP = async (offerId: string) => {
    setRedeemError("");
    setRedeemSuccess("");
    setRedeeming(true);
    setSelectedOfferId(offerId);

    try {
      const res = await fetch("/api/manager/redemptions/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer_id: id, offer_id: offerId })
      });
      const data = await res.json();
      
      if (res.ok) {
        setRedeemSuccess("Verification code sent to customer's email.");
        setRedeemStep(2);
      } else {
        setRedeemError(data.error || "Failed to request OTP.");
      }
    } catch (e) {
      setRedeemError("System error during request.");
    }
    setRedeeming(false);
  };

  const handleConfirmRedemption = async () => {
    if (!otp) {
      setRedeemError("Please enter the verification code.");
      return;
    }
    setRedeemError("");
    setRedeemSuccess("");
    setRedeeming(true);

    try {
      const res = await fetch("/api/manager/redemptions/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer_id: id, offer_id: selectedOfferId, otp })
      });
      const data = await res.json();
      
      if (res.ok) {
        setRedeemSuccess("Reward redeemed successfully!");
        setCustomer({ ...customer, points_balance: data.new_balance });
        // Refresh ledger and history
        const fetchRes = await fetch(`/api/manager/customers/${id}`);
        if (fetchRes.ok) {
            const freshData = await fetchRes.json();
            setHistory(freshData.history);
            setLedger(freshData.ledger || []);
            setStats(freshData.stats || { totalEarned: 0, totalRedeemed: 0 });
        }
        setTimeout(() => {
          setShowRedeemModal(false);
          setRedeemStep(1);
          setOtp("");
          setSelectedOfferId("");
        }, 1500);
      } else {
        setRedeemError(data.error || "Failed to verify code.");
      }
    } catch (e) {
      setRedeemError("System error during confirmation.");
    }
    setRedeeming(false);
  };

  const handleLogVisit = async () => {
    if (selectedServiceIds.length === 0) return;
    setLogVisitError("");
    setLogVisitSuccess("");
    setLoggingVisit(true);

    try {
      const res = await fetch("/api/manager/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer_id: id, service_ids: selectedServiceIds, vehicle_id: selectedVehicleId })
      });
      const data = await res.json();
      
      if (res.ok) {
        setLogVisitSuccess("Visit logged successfully!");
        // Refresh history and ledger
        const fetchRes = await fetch(`/api/manager/customers/${id}`);
        if (fetchRes.ok) {
            const freshData = await fetchRes.json();
            setHistory(freshData.history);
            setLedger(freshData.ledger || []);
            setStats(freshData.stats || { totalEarned: 0, totalRedeemed: 0 });
        }
        setTimeout(() => {
            setShowLogVisitModal(false);
            setSelectedServiceIds([]);
            setLogVisitSuccess("");
        }, 1500);
      } else {
        setLogVisitError(data.error || "Failed to log visit.");
      }
    } catch (e) {
      setLogVisitError("System error during request.");
    }
    setLoggingVisit(false);
  };

  const addService = (serviceId: string) => {
    setSelectedServiceIds([...selectedServiceIds, serviceId]);
  };

  const removeService = (indexToRemove: number) => {
    setSelectedServiceIds(selectedServiceIds.filter((_, i) => i !== indexToRemove));
  };

  const currentTotal = selectedServiceIds.reduce((total, id) => {
    const s = services.find(srv => srv.id === id);
    return total + (s ? s.price : 0);
  }, 0);

  const branchSummary = history.reduce((acc: any, h: any) => {
    if (h.branch_name) {
      acc[h.branch_name] = (acc[h.branch_name] || 0) + 1;
    }
    return acc;
  }, {});
  const branchSummaryText = Object.entries(branchSummary).map(([branch, count]) => `${branch} (${count} visit${(count as number) > 1 ? 's' : ''})`).join(', ');

  if (loading) {
    return <main className="flex-1 p-8 lg:p-12 overflow-auto flex items-center justify-center"><div className="text-text-secondary text-sm font-mono uppercase tracking-widest animate-pulse">Loading Profile...</div></main>;
  }

  if (!customer) return null;

  return (
    <main className="flex-1 p-8 lg:p-12 overflow-auto">
      <Breadcrumbs items={[{ label: "Overview", href: "/staff" }, { label: "Customers", href: "/staff/customers" }, { label: customer.name }]} accentClass="hover:text-accent-gold" />

      <div className="flex justify-between items-start mb-10">
        <div>
          <h1 className="text-3xl font-semibold text-text-primary">{customer.name}</h1>
          <p className="text-text-secondary mt-2 text-sm uppercase tracking-wider font-mono">ID: {customer.id.split('-')[0]}</p>
          {branchSummaryText && (
            <p className="text-text-secondary mt-1 text-xs uppercase tracking-widest font-bold">
              Visited: <span className="text-accent-gold">{branchSummaryText}</span>
            </p>
          )}
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setShowEditModal(true)}
            className="px-6 py-2.5 font-bold text-[10px] uppercase tracking-widest bg-bg-panel border border-border-hairline text-text-secondary hover:text-text-primary hover:border-accent-gold transition-colors flex items-center gap-2"
          >
            <Pencil size={12} /> Edit Profile
          </button>
          <button 
            onClick={() => setShowLogVisitModal(true)}
            className="px-6 py-2.5 font-bold text-[10px] uppercase tracking-widest bg-text-primary text-bg-base hover:bg-opacity-90 transition-colors"
          >
            Log Visit
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="panel p-6 border-l-[3px] border-l-accent-gold flex flex-col justify-between col-span-2">
          <div className="grid grid-cols-2 gap-8">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-secondary flex items-center gap-1.5 mb-2"><Phone size={12}/> Contact</div>
              <div className="font-mono text-xl text-text-primary">{customer.phone}</div>
              {customer.email && <div className="text-sm text-text-secondary mt-1">{customer.email}</div>}
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-secondary flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5"><Car size={12}/> Vehicles</div>
                <button onClick={() => setShowAddVehicleModal(true)} className="text-accent-gold hover:text-white transition-colors">+ Add</button>
              </div>
              <div className="space-y-3 max-h-32 overflow-y-auto pr-2">
                {vehicles.length === 0 ? (
                  <div className="text-xs text-text-secondary italic">No vehicles listed</div>
                ) : (
                  vehicles.map(v => (
                    <div key={v.id} className="flex justify-between items-start group">
                      <div>
                        <div className="font-mono text-sm text-text-primary uppercase">{v.vehicle_number}</div>
                        <div className="text-xs text-text-secondary mt-0.5 capitalize">{v.vehicle_type} {v.vehicle_model ? `- ${v.vehicle_model}` : ''}</div>
                      </div>
                      <button onClick={() => setShowEditVehicleModal(v)} className="text-text-secondary hover:text-accent-gold opacity-0 group-hover:opacity-100 transition-opacity">
                        <Pencil size={12} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="panel p-6 border-l-[3px] border-l-accent-gold flex flex-col justify-between bg-accent-gold/5 border border-accent-gold/20 relative">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-accent-gold flex items-center justify-end gap-1.5"><Award size={12}/> Loyalty Balance</div>
            <div className="font-mono text-5xl text-text-primary mt-3 text-right">{customer.points_balance}</div>
          </div>
          <div className="mt-4 flex justify-between text-[10px] font-bold uppercase tracking-widest text-text-secondary border-t border-accent-gold/20 pt-4">
            <div>Earned: <span className="text-text-primary">{stats.totalEarned}</span></div>
            <div>Redeemed: <span className="text-text-primary">{stats.totalRedeemed}</span></div>
          </div>
          <button 
            onClick={() => setShowRedeemModal(true)}
            className="mt-6 w-full py-2.5 font-bold text-[10px] uppercase tracking-widest bg-accent-gold text-white hover:bg-opacity-90 transition-colors"
          >
            Redeem Reward
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="panel overflow-hidden border-l-[3px] border-l-border-hairline-strong">
            <div className="p-5 border-b border-border-hairline flex justify-between items-center bg-bg-panel-elevated">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-text-primary flex items-center gap-2"><Clock size={16} /> Service Timeline</h2>
            </div>
            <div className="p-6">
              {history.length === 0 ? (
                <div className="text-center text-text-secondary uppercase tracking-widest text-sm py-8">No transaction history found.</div>
              ) : (
                <div className="relative border-l border-border-hairline ml-4 space-y-8 pb-4">
                  {history.map(h => (
                    <div key={h.id} className="relative pl-8 group">
                      <div className="absolute w-3 h-3 bg-accent-gold rounded-full -left-[6.5px] top-1.5 ring-4 ring-bg-panel"></div>
                      <div className="mb-1 flex items-center justify-between">
                        <div className="text-xs font-mono font-bold text-text-secondary">
                          {new Date(h.created_at).toLocaleDateString()} &middot; {new Date(h.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </div>
                        <div className={`text-[10px] uppercase font-bold tracking-widest px-2 py-1 rounded-sm ${
                          h.status === 'finished' ? 'bg-[#4ade80]/10 text-[#4ade80]' :
                          h.status === 'in_progress' ? 'bg-accent-gold/10 text-accent-gold' :
                          'bg-text-secondary/10 text-text-secondary'
                        }`}>
                          {h.status}
                        </div>
                      </div>
                      <div className="text-lg font-semibold text-text-primary mb-2 flex items-center gap-2">
                        {h.services.map((s:any) => s.name).join(", ")}
                      </div>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mt-4 p-4 bg-bg-panel-elevated border border-border-hairline rounded-sm">
                        <div>
                          <div className="text-[9px] uppercase tracking-widest text-text-secondary mb-1">Ticket ID</div>
                          <div className="font-mono text-xs text-text-primary">#{h.id.split('-')[0].toUpperCase()}</div>
                        </div>
                        <div>
                          <div className="text-[9px] uppercase tracking-widest text-text-secondary mb-1">Branch</div>
                          <div className="font-mono text-xs text-text-primary">{h.branch_name || 'Unknown'}</div>
                        </div>
                        <div>
                          <div className="text-[9px] uppercase tracking-widest text-text-secondary mb-1">Vehicle</div>
                          <div className="font-mono text-xs text-text-primary uppercase">{h.vehicle_number || 'N/A'}</div>
                        </div>
                        <div>
                          <div className="text-[9px] uppercase tracking-widest text-text-secondary mb-1">Staff</div>
                          <div className="font-mono text-xs text-text-primary">{h.staff_name || 'Unassigned'}</div>
                        </div>
                        <div>
                          <div className="text-[9px] uppercase tracking-widest text-text-secondary mb-1">Total</div>
                          <div className="font-mono text-xs text-text-primary">{formatCurrency(h.total_amount)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="panel overflow-hidden border-l-[3px] border-l-border-hairline-strong h-full flex flex-col">
            <div className="p-5 border-b border-border-hairline flex justify-between items-center bg-bg-panel-elevated shrink-0">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-text-primary flex items-center gap-2"><Award size={16} /> Points Ledger</h2>
            </div>
            <div className="p-5 flex-1 overflow-y-auto space-y-4 max-h-[600px]">
              {ledger.length === 0 ? (
                <div className="text-center text-text-secondary uppercase tracking-widest text-xs py-8">No ledger events.</div>
              ) : (
                ledger.map(l => (
                  <div key={l.id} className="flex items-start justify-between border-b border-border-hairline/50 pb-4 last:border-0 last:pb-0">
                    <div>
                      <div className={`text-xs font-bold uppercase tracking-widest mb-1 ${l.type === 'earned' ? 'text-[#4ade80]' : 'text-[#ff6b6b]'}`}>
                        {l.type === 'earned' ? 'Earned' : 'Redeemed'}
                      </div>
                      <div className="text-[10px] font-mono text-text-secondary">
                        {new Date(l.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-mono text-sm font-bold ${l.type === 'earned' ? 'text-[#4ade80]' : 'text-[#ff6b6b]'}`}>
                        {l.type === 'earned' ? '+' : '-'}{l.points}
                      </div>
                      {l.related_transaction_id && (
                        <div className="text-[9px] uppercase tracking-widest text-text-secondary mt-1">
                          TKT #{l.related_transaction_id.split('-')[0].toUpperCase()}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {showRedeemModal && (
        <div className="fixed inset-0 bg-bg-base/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="panel border-l-[3px] border-l-accent-gold p-8 w-full max-w-lg">
            <h3 className="text-xl font-semibold mb-2 text-text-primary">Redeem Reward</h3>
            <p className="text-xs font-mono text-text-secondary mb-6 uppercase tracking-wider">
              {customer.name} — Balance: <span className="text-accent-gold font-bold">{customer.points_balance} pts</span>
            </p>

            {redeemError && <div className="text-[#ff6b6b] bg-[#3a1616] border border-[#521d1d] text-xs uppercase tracking-widest font-bold mb-4 p-3">{redeemError}</div>}
            {redeemSuccess && <div className="text-[#4ade80] bg-[#163a24] border border-[#1d5230] text-xs uppercase tracking-widest font-bold mb-4 p-3">{redeemSuccess}</div>}

            {redeemStep === 1 ? (
              <div className="space-y-3 mb-6 max-h-64 overflow-y-auto pr-2">
                {offers.length === 0 ? (
                  <div className="p-4 text-center text-text-secondary text-xs uppercase tracking-widest border border-border-hairline border-dashed">
                    No offers configured for this branch.
                  </div>
                ) : (
                  offers.map(offer => {
                    const canAfford = customer.points_balance >= offer.points_required;
                    return (
                      <div 
                        key={offer.id} 
                        className={`p-4 border flex justify-between items-center transition-colors ${
                          canAfford 
                            ? "border-border-hairline hover:border-accent-gold bg-bg-panel hover:bg-bg-panel-elevated cursor-pointer" 
                            : "border-border-hairline/30 bg-bg-base opacity-50 cursor-not-allowed"
                        }`}
                        onClick={() => { if (canAfford && !redeeming) handleRequestOTP(offer.id); }}
                      >
                        <div className="text-sm font-medium text-text-primary">{offer.name}</div>
                        <div className="flex items-center gap-4">
                          <div className={`font-mono text-xs font-bold ${canAfford ? 'text-accent-gold' : 'text-text-secondary'}`}>
                            {offer.points_required} pts
                          </div>
                          {canAfford && (
                            <div className="text-[10px] uppercase font-bold tracking-widest text-text-secondary opacity-0 group-hover:opacity-100">
                              Send Code &rarr;
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1.5">Verification Code *</label>
                  <input 
                    type="text" 
                    value={otp} 
                    onChange={e => setOtp(e.target.value)} 
                    placeholder="Enter 6-digit code" 
                    className="block w-full bg-bg-base border border-border-hairline p-3 text-text-primary text-sm font-mono tracking-widest focus:border-accent-gold focus:outline-none"
                    maxLength={6}
                  />
                  <p className="text-[10px] text-text-secondary mt-2">Ask the customer for the code sent to their email.</p>
                </div>
                <button 
                  onClick={handleConfirmRedemption}
                  disabled={redeeming || otp.length < 6}
                  className="w-full py-3 font-bold text-xs uppercase tracking-widest bg-accent-gold text-white hover:bg-opacity-90 transition-colors disabled:opacity-50"
                >
                  {redeeming ? "Verifying..." : "Confirm Redemption"}
                </button>
              </div>
            )}

            <div className="flex justify-between items-center pt-4 border-t border-border-hairline">
              {redeemStep === 2 ? (
                <button 
                  onClick={() => { setRedeemStep(1); setRedeemError(""); setRedeemSuccess(""); }}
                  disabled={redeeming}
                  className="px-4 py-2 font-medium text-xs uppercase tracking-widest text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
                >
                  &larr; Back
                </button>
              ) : <div></div>}
              <button 
                onClick={() => { setShowRedeemModal(false); setRedeemStep(1); setOtp(""); }}
                disabled={redeeming}
                className="px-6 py-2 font-medium text-xs uppercase tracking-widest text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showLogVisitModal && (
        <div className="fixed inset-0 bg-bg-base/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="panel border-l-[3px] border-l-accent-gold p-8 w-full max-w-3xl flex gap-8">
            <div className="flex-1">
              <h3 className="text-xl font-semibold mb-2 text-text-primary">Log New Visit</h3>
              <p className="text-xs font-mono text-text-secondary mb-6 uppercase tracking-wider">
                Select services for <span className="text-text-primary font-bold">{customer.name}</span>
              </p>
              
              <div className="mb-6">
                <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1.5">Select Vehicle *</label>
                {vehicles.length === 0 ? (
                  <div className="text-xs text-[#ff6b6b] bg-[#3a1616] p-2 font-bold uppercase tracking-widest">
                    No vehicles found. Add a vehicle first.
                  </div>
                ) : (
                  <select 
                    value={selectedVehicleId} 
                    onChange={e => setSelectedVehicleId(e.target.value)}
                    className="w-full bg-bg-base border border-border-hairline p-3 text-text-primary text-sm font-mono focus:border-accent-gold focus:outline-none"
                  >
                    <option value="" disabled>-- Choose a vehicle --</option>
                    {vehicles.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.vehicle_number} ({v.vehicle_model || v.vehicle_type})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="space-y-2 mb-6 max-h-72 overflow-y-auto pr-2">
                {services.length === 0 ? (
                  <div className="p-4 text-center text-text-secondary text-xs uppercase tracking-widest border border-border-hairline border-dashed">
                    No services available in catalog.
                  </div>
                ) : (
                  services.map(service => (
                    <div 
                      key={service.id} 
                      className="p-3 border border-border-hairline hover:border-accent-gold bg-bg-panel hover:bg-bg-panel-elevated cursor-pointer flex justify-between items-center transition-colors"
                      onClick={() => addService(service.id)}
                    >
                      <div>
                        <div className="text-sm font-medium text-text-primary">{service.name}</div>
                        {service.description && <div className="text-xs text-text-secondary mt-1">{service.description}</div>}
                      </div>
                      <div className="font-mono text-sm font-bold text-accent-gold">
                        {formatCurrency(service.price)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            
            <div className="w-72 flex flex-col bg-bg-panel-elevated p-6 border border-border-hairline">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-4">Cart Summary</h4>
              
              <div className="flex-1 overflow-y-auto space-y-3 mb-6">
                {selectedServiceIds.length === 0 ? (
                  <div className="text-xs text-text-secondary italic">No services selected</div>
                ) : (
                  selectedServiceIds.map((id, index) => {
                    const s = services.find(srv => srv.id === id);
                    if (!s) return null;
                    return (
                      <div key={index} className="flex justify-between items-start group">
                        <div className="text-xs text-text-primary pr-2">{s.name}</div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-text-secondary">{formatCurrency(s.price)}</span>
                          <button onClick={() => removeService(index)} className="text-text-secondary hover:text-[#ff6b6b] opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {logVisitError && <div className="text-[#ff6b6b] text-[10px] uppercase tracking-widest font-bold mb-4">{logVisitError}</div>}
              {logVisitSuccess && <div className="text-[#4ade80] text-[10px] uppercase tracking-widest font-bold mb-4">{logVisitSuccess}</div>}

              <div className="border-t border-border-hairline pt-4 mt-auto">
                <div className="flex justify-between items-center mb-6">
                  <div className="text-xs font-bold uppercase tracking-widest text-text-secondary">Total</div>
                  <div className="font-mono text-xl text-text-primary">{formatCurrency(currentTotal)}</div>
                </div>
                <div className="flex flex-col gap-2">
                  <button 
                    onClick={handleLogVisit}
                    disabled={loggingVisit || selectedServiceIds.length === 0 || !selectedVehicleId}
                    className="w-full py-2.5 font-bold text-[10px] uppercase tracking-widest bg-accent-gold text-white hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loggingVisit ? "Saving..." : "Confirm & Log"}
                  </button>
                  <button 
                    onClick={() => setShowLogVisitModal(false)}
                    disabled={loggingVisit}
                    className="w-full py-2.5 font-bold text-[10px] uppercase tracking-widest text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {showEditModal && (
        <EditCustomerModal 
          customer={customer}
          onClose={() => setShowEditModal(false)} 
          onSuccess={(updatedCustomer) => { 
            setShowEditModal(false); 
            setCustomer({ ...customer, ...updatedCustomer }); 
          }} 
        />
      )}
      {showAddVehicleModal && (
        <AddVehicleModal 
          customerId={customer.id}
          onClose={() => setShowAddVehicleModal(false)}
          onSuccess={(newVehicle) => {
            setShowAddVehicleModal(false);
            setVehicles([...vehicles, newVehicle]);
          }}
        />
      )}
      {showEditVehicleModal && (
        <EditVehicleModal 
          vehicle={showEditVehicleModal}
          onClose={() => setShowEditVehicleModal(null)}
          onSuccess={(updatedVehicle) => {
            setShowEditVehicleModal(null);
            setVehicles(vehicles.map(v => v.id === updatedVehicle.id ? { ...v, ...updatedVehicle } : v));
          }}
        />
      )}
    </main>
  );
}

function EditCustomerModal({ customer, onClose, onSuccess }: { customer: any, onClose: () => void, onSuccess: (c: any) => void }) {
  const [formData, setFormData] = useState({ 
    name: customer.name || "", 
    phone: customer.phone || "", 
    email: customer.email || "", 
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/manager/customers/${customer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (res.ok) {
        onSuccess(formData);
      } else {
        setError(data.error || "System Error");
      }
    } catch (err) {
      setError("System error during request.");
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-bg-base/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="panel border-l-[3px] border-l-accent-gold p-8 w-full max-w-lg">
        <h3 className="text-xl font-semibold mb-2 text-text-primary">Edit Profile</h3>
        <p className="text-xs font-mono text-text-secondary mb-8 uppercase tracking-wider">Update customer details</p>
        
        {error && <div className="text-[#ff6b6b] bg-[#3a1616] border border-[#521d1d] text-xs uppercase tracking-widest font-bold mb-6 p-3">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="block text-[10px] uppercase tracking-[0.15em] font-bold mb-2 text-text-secondary">Full Name *</label>
              <input required type="text" value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} className="w-full bg-bg-base border border-border-hairline-strong p-3 text-text-primary font-mono text-sm focus:border-accent-gold focus:outline-none transition-colors" />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-[0.15em] font-bold mb-2 text-text-secondary">Phone Number *</label>
              <input required type="tel" value={formData.phone} onChange={e=>setFormData({...formData, phone: e.target.value})} className="w-full bg-bg-base border border-border-hairline-strong p-3 text-text-primary font-mono text-sm focus:border-accent-gold focus:outline-none transition-colors" />
            </div>
            <div className="col-span-2">
              <label className="block text-[10px] uppercase tracking-[0.15em] font-bold mb-2 text-text-secondary">Email Address</label>
              <input type="email" value={formData.email} onChange={e=>setFormData({...formData, email: e.target.value})} className="w-full bg-bg-base border border-border-hairline-strong p-3 text-text-primary font-mono text-sm focus:border-accent-gold focus:outline-none transition-colors" />
            </div>
          </div>
          
          <div className="mt-8 flex justify-end gap-4 pt-4 border-t border-border-hairline">
            <button type="button" onClick={onClose} className="px-4 py-2 font-medium text-xs uppercase tracking-widest text-text-secondary hover:text-text-primary transition-colors">Cancel</button>
            <button type="submit" disabled={loading} className="px-6 py-2 font-bold text-xs uppercase tracking-widest bg-accent-gold text-white hover:bg-opacity-90 disabled:opacity-50 transition-colors">
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddVehicleModal({ customerId, onClose, onSuccess }: { customerId: string, onClose: () => void, onSuccess: (v: any) => void }) {
  const [formData, setFormData] = useState({ 
    vehicle_number: "", 
    vehicle_type: "sedan", 
    vehicle_model: "" 
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/manager/customers/${customerId}/vehicles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (res.ok) {
        onSuccess(data);
      } else {
        setError(data.error || "System Error");
      }
    } catch (err) {
      setError("System error during request.");
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-bg-base/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="panel border-l-[3px] border-l-accent-gold p-8 w-full max-w-lg">
        <h3 className="text-xl font-semibold mb-2 text-text-primary">Add New Vehicle</h3>
        <p className="text-xs font-mono text-text-secondary mb-8 uppercase tracking-wider">Register another vehicle</p>
        
        {error && <div className="text-[#ff6b6b] bg-[#3a1616] border border-[#521d1d] text-xs uppercase tracking-widest font-bold mb-6 p-3">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-5">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-[10px] uppercase tracking-[0.15em] font-bold mb-2 text-text-secondary">Vehicle Number *</label>
              <input required type="text" value={formData.vehicle_number} onChange={e=>setFormData({...formData, vehicle_number: e.target.value})} className="w-full bg-bg-base border border-border-hairline-strong p-3 text-text-primary font-mono text-sm focus:border-accent-gold focus:outline-none transition-colors uppercase" placeholder="e.g. KL 48 W 0055"/>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-[10px] uppercase tracking-[0.15em] font-bold mb-2 text-text-secondary">Vehicle Type *</label>
              <select required value={formData.vehicle_type} onChange={e=>setFormData({...formData, vehicle_type: e.target.value})} className="w-full bg-bg-base border border-border-hairline-strong p-3 text-text-primary font-mono text-sm focus:border-accent-gold focus:outline-none transition-colors">
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
            <div className="col-span-2">
              <label className="block text-[10px] uppercase tracking-[0.15em] font-bold mb-2 text-text-secondary">Vehicle Model</label>
              <input type="text" value={formData.vehicle_model} onChange={e=>setFormData({...formData, vehicle_model: e.target.value})} className="w-full bg-bg-base border border-border-hairline-strong p-3 text-text-primary font-mono text-sm focus:border-accent-gold focus:outline-none transition-colors" placeholder="e.g. Porsche 911 GT3" />
            </div>
          </div>
          
          <div className="mt-8 flex justify-end gap-4 pt-4 border-t border-border-hairline">
            <button type="button" onClick={onClose} className="px-4 py-2 font-medium text-xs uppercase tracking-widest text-text-secondary hover:text-text-primary transition-colors">Cancel</button>
            <button type="submit" disabled={loading} className="px-6 py-2 font-bold text-xs uppercase tracking-widest bg-accent-gold text-white hover:bg-opacity-90 disabled:opacity-50 transition-colors">
              {loading ? "Saving..." : "Add Vehicle"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditVehicleModal({ vehicle, onClose, onSuccess }: { vehicle: any, onClose: () => void, onSuccess: (v: any) => void }) {
  const [formData, setFormData] = useState({ 
    vehicle_number: vehicle.vehicle_number || "", 
    vehicle_type: vehicle.vehicle_type || "sedan", 
    vehicle_model: vehicle.vehicle_model || "" 
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/manager/vehicles/${vehicle.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (res.ok) {
        onSuccess({ id: vehicle.id, ...formData });
      } else {
        setError(data.error || "System Error");
      }
    } catch (err) {
      setError("System error during request.");
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-bg-base/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="panel border-l-[3px] border-l-accent-gold p-8 w-full max-w-lg">
        <h3 className="text-xl font-semibold mb-2 text-text-primary">Edit Vehicle</h3>
        <p className="text-xs font-mono text-text-secondary mb-8 uppercase tracking-wider">Update vehicle details</p>
        
        {error && <div className="text-[#ff6b6b] bg-[#3a1616] border border-[#521d1d] text-xs uppercase tracking-widest font-bold mb-6 p-3">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-5">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-[10px] uppercase tracking-[0.15em] font-bold mb-2 text-text-secondary">Vehicle Number *</label>
              <input required type="text" value={formData.vehicle_number} onChange={e=>setFormData({...formData, vehicle_number: e.target.value})} className="w-full bg-bg-base border border-border-hairline-strong p-3 text-text-primary font-mono text-sm focus:border-accent-gold focus:outline-none transition-colors uppercase" />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-[10px] uppercase tracking-[0.15em] font-bold mb-2 text-text-secondary">Vehicle Type *</label>
              <select required value={formData.vehicle_type} onChange={e=>setFormData({...formData, vehicle_type: e.target.value})} className="w-full bg-bg-base border border-border-hairline-strong p-3 text-text-primary font-mono text-sm focus:border-accent-gold focus:outline-none transition-colors">
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
            <div className="col-span-2">
              <label className="block text-[10px] uppercase tracking-[0.15em] font-bold mb-2 text-text-secondary">Vehicle Model</label>
              <input type="text" value={formData.vehicle_model} onChange={e=>setFormData({...formData, vehicle_model: e.target.value})} className="w-full bg-bg-base border border-border-hairline-strong p-3 text-text-primary font-mono text-sm focus:border-accent-gold focus:outline-none transition-colors" placeholder="e.g. Porsche 911 GT3" />
            </div>
          </div>
          
          <div className="mt-8 flex justify-end gap-4 pt-4 border-t border-border-hairline">
            <button type="button" onClick={onClose} className="px-4 py-2 font-medium text-xs uppercase tracking-widest text-text-secondary hover:text-text-primary transition-colors">Cancel</button>
            <button type="submit" disabled={loading} className="px-6 py-2 font-bold text-xs uppercase tracking-widest bg-accent-gold text-white hover:bg-opacity-90 disabled:opacity-50 transition-colors">
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

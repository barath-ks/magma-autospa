"use client";
import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Car, Phone, Award, Clock } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import { formatCurrency } from "@/lib/format";

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [customer, setCustomer] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [offers, setOffers] = useState<any[]>([]);
  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const [redeemError, setRedeemError] = useState("");
  const [redeemSuccess, setRedeemSuccess] = useState("");
  const [services, setServices] = useState<any[]>([]);
  const [showLogVisitModal, setShowLogVisitModal] = useState(false);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [loggingVisit, setLoggingVisit] = useState(false);
  const [logVisitError, setLogVisitError] = useState("");
  const [logVisitSuccess, setLogVisitSuccess] = useState("");
  const [ledger, setLedger] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({ totalEarned: 0, totalRedeemed: 0 });
  
  const { id } = use(params);

  useEffect(() => {
    const fetchCustomer = async () => {
      try {
        const res = await fetch(`/api/manager/customers/${id}`);
        if (res.ok) {
          const data = await res.json();
          setCustomer(data.customer);
          setHistory(data.history);
          setLedger(data.ledger || []);
          setStats(data.stats || { totalEarned: 0, totalRedeemed: 0 });
        } else {
          router.push("/manager/customers");
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

  const handleRedeem = async (offerId: string) => {
    setRedeemError("");
    setRedeemSuccess("");
    setRedeeming(true);

    try {
      const res = await fetch("/api/manager/redemptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer_id: id, offer_id: offerId })
      });
      const data = await res.json();
      
      if (res.ok) {
        setRedeemSuccess("Reward redeemed successfully!");
        setCustomer({ ...customer, points_balance: data.new_balance });
        setTimeout(() => setShowRedeemModal(false), 1500);
      } else {
        setRedeemError(data.error || "Failed to redeem reward.");
      }
    } catch (e) {
      setRedeemError("System error during redemption.");
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
        body: JSON.stringify({ customer_id: id, service_ids: selectedServiceIds })
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
      <Breadcrumbs items={[{ label: "Overview", href: "/manager" }, { label: "Customers", href: "/manager/customers" }, { label: customer.name }]} accentClass="hover:text-accent-copper" />

      <div className="flex justify-between items-start mb-10">
        <div>
          <h1 className="text-3xl font-semibold text-text-primary">{customer.name}</h1>
          <p className="text-text-secondary mt-2 text-sm uppercase tracking-wider font-mono">ID: {customer.id.split('-')[0]}</p>
          {branchSummaryText && (
            <p className="text-text-secondary mt-1 text-xs uppercase tracking-widest font-bold">
              Visited: <span className="text-accent-copper">{branchSummaryText}</span>
            </p>
          )}
        </div>
        <button 
          onClick={() => setShowLogVisitModal(true)}
          className="px-6 py-2.5 font-bold text-[10px] uppercase tracking-widest bg-text-primary text-bg-base hover:bg-opacity-90 transition-colors"
        >
          Log Visit
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="panel p-6 border-l-[3px] border-l-accent-copper flex flex-col justify-between col-span-2">
          <div className="grid grid-cols-2 gap-8">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-secondary flex items-center gap-1.5 mb-2"><Phone size={12}/> Contact</div>
              <div className="font-mono text-xl text-text-primary">{customer.phone}</div>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-secondary flex items-center gap-1.5 mb-2"><Car size={12}/> Vehicle</div>
              <div className="font-mono text-xl text-text-primary uppercase">{customer.vehicle_number || "NO PLATE"}</div>
              <div className="text-sm text-text-secondary mt-1">{customer.vehicle_model || "No model specified"}</div>
            </div>
          </div>
        </div>
        <div className="panel p-6 border-l-[3px] border-l-accent-copper flex flex-col justify-between bg-accent-copper/5 border border-accent-copper/20 relative">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-accent-copper flex items-center justify-end gap-1.5"><Award size={12}/> Loyalty Balance</div>
            <div className="font-mono text-5xl text-text-primary mt-3 text-right">{customer.points_balance}</div>
          </div>
          <div className="mt-4 flex justify-between text-[10px] font-bold uppercase tracking-widest text-text-secondary border-t border-accent-copper/20 pt-4">
            <div>Earned: <span className="text-text-primary">{stats.totalEarned}</span></div>
            <div>Redeemed: <span className="text-text-primary">{stats.totalRedeemed}</span></div>
          </div>
          <button 
            onClick={() => setShowRedeemModal(true)}
            className="mt-6 w-full py-2.5 font-bold text-[10px] uppercase tracking-widest bg-accent-copper text-white hover:bg-opacity-90 transition-colors"
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
                      <div className="absolute w-3 h-3 bg-accent-copper rounded-full -left-[6.5px] top-1.5 ring-4 ring-bg-panel"></div>
                      <div className="mb-1 flex items-center justify-between">
                        <div className="text-xs font-mono font-bold text-text-secondary">
                          {new Date(h.created_at).toLocaleDateString()} &middot; {new Date(h.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </div>
                        <div className={`text-[10px] uppercase font-bold tracking-widest px-2 py-1 rounded-sm ${
                          h.status === 'finished' ? 'bg-[#4ade80]/10 text-[#4ade80]' :
                          h.status === 'in_progress' ? 'bg-accent-copper/10 text-accent-copper' :
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
          <div className="panel border-l-[3px] border-l-accent-copper p-8 w-full max-w-lg">
            <h3 className="text-xl font-semibold mb-2 text-text-primary">Redeem Reward</h3>
            <p className="text-xs font-mono text-text-secondary mb-6 uppercase tracking-wider">
              {customer.name} — Balance: <span className="text-accent-copper font-bold">{customer.points_balance} pts</span>
            </p>

            {redeemError && <div className="text-[#ff6b6b] bg-[#3a1616] border border-[#521d1d] text-xs uppercase tracking-widest font-bold mb-4 p-3">{redeemError}</div>}
            {redeemSuccess && <div className="text-[#4ade80] bg-[#163a24] border border-[#1d5230] text-xs uppercase tracking-widest font-bold mb-4 p-3">{redeemSuccess}</div>}

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
                          ? "border-border-hairline hover:border-accent-copper bg-bg-panel hover:bg-bg-panel-elevated cursor-pointer" 
                          : "border-border-hairline/30 bg-bg-base opacity-50 cursor-not-allowed"
                      }`}
                      onClick={() => { if (canAfford && !redeeming) handleRedeem(offer.id); }}
                    >
                      <div className="text-sm font-medium text-text-primary">{offer.name}</div>
                      <div className={`font-mono text-xs font-bold ${canAfford ? 'text-accent-copper' : 'text-text-secondary'}`}>
                        {offer.points_required} pts
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-border-hairline">
              <button 
                onClick={() => setShowRedeemModal(false)}
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
          <div className="panel border-l-[3px] border-l-accent-copper p-8 w-full max-w-3xl flex gap-8">
            <div className="flex-1">
              <h3 className="text-xl font-semibold mb-2 text-text-primary">Log New Visit</h3>
              <p className="text-xs font-mono text-text-secondary mb-6 uppercase tracking-wider">
                Select services for <span className="text-text-primary font-bold">{customer.name}</span>
              </p>

              <div className="space-y-2 mb-6 max-h-96 overflow-y-auto pr-2">
                {services.length === 0 ? (
                  <div className="p-4 text-center text-text-secondary text-xs uppercase tracking-widest border border-border-hairline border-dashed">
                    No services available in catalog.
                  </div>
                ) : (
                  services.map(service => (
                    <div 
                      key={service.id} 
                      className="p-3 border border-border-hairline hover:border-accent-copper bg-bg-panel hover:bg-bg-panel-elevated cursor-pointer flex justify-between items-center transition-colors"
                      onClick={() => addService(service.id)}
                    >
                      <div>
                        <div className="text-sm font-medium text-text-primary">{service.name}</div>
                        {service.description && <div className="text-xs text-text-secondary mt-1">{service.description}</div>}
                      </div>
                      <div className="font-mono text-sm font-bold text-accent-copper">
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
                    disabled={loggingVisit || selectedServiceIds.length === 0}
                    className="w-full py-2.5 font-bold text-[10px] uppercase tracking-widest bg-accent-copper text-white hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
    </main>
  );
}

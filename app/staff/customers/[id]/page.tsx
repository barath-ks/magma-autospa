"use client";
import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Car, Phone, Award, Clock } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [customer, setCustomer] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { id } = use(params);

  useEffect(() => {
    const fetchCustomer = async () => {
      try {
        const res = await fetch(`/api/staff/customers/${id}`);
        if (res.ok) {
          const data = await res.json();
          setCustomer(data.customer);
          setHistory(data.history);
        } else {
          router.push("/staff/customers");
        }
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    if (id) fetchCustomer();
  }, [id, router]);

  if (loading) {
    return <main className="flex-1 p-8 lg:p-12 overflow-auto flex items-center justify-center"><div className="text-text-secondary text-sm font-mono uppercase tracking-widest animate-pulse">Loading Profile...</div></main>;
  }

  if (!customer) return null;

  return (
    <main className="flex-1 p-8 lg:p-12 overflow-auto">
      <Breadcrumbs items={[{ label: "Overview", href: "/staff" }, { label: "Customers", href: "/staff/customers" }, { label: customer.name }]} accentClass="hover:text-accent-copper" />

      <div className="flex justify-between items-start mb-10">
        <div>
          <h1 className="text-3xl font-semibold text-text-primary">{customer.name}</h1>
          <p className="text-text-secondary mt-2 text-sm uppercase tracking-wider font-mono">ID: {customer.id.split('-')[0]}</p>
        </div>
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
        <div className="panel p-6 border-l-[3px] border-l-accent-copper flex flex-col justify-between bg-accent-copper/5 border border-accent-copper/20">
          <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-accent-copper flex items-center gap-1.5"><Award size={12}/> Loyalty Balance</div>
          <div className="font-mono text-5xl text-text-primary mt-3 text-right">{customer.points_balance}</div>
        </div>
      </div>

      <div className="panel overflow-hidden border-l-[3px] border-l-border-hairline-strong">
        <div className="p-5 border-b border-border-hairline flex justify-between items-center bg-bg-panel-elevated">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-text-primary flex items-center gap-2"><Clock size={16} /> Service History</h2>
        </div>
        <table className="w-full text-left">
          <thead className="bg-bg-panel border-b border-border-hairline text-text-secondary uppercase text-[10px] tracking-[0.2em] font-medium">
            <tr>
              <th className="p-4">Date</th>
              <th className="p-4">Services Rendered</th>
              <th className="p-4">Amount</th>
              <th className="p-4 text-right">Points Earned</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-hairline bg-bg-panel">
            {history.map(h => (
              <tr key={h.id} className="hover:bg-bg-panel-elevated transition-colors">
                <td className="p-4 font-mono text-text-primary text-sm">{new Date(h.created_at).toLocaleDateString()}</td>
                <td className="p-4 text-text-primary text-sm font-medium">
                  {h.services.map((s:any) => s.name).join(", ")}
                </td>
                <td className="p-4 text-text-secondary text-sm font-mono">${h.total_amount.toFixed(2)}</td>
                <td className="p-4 text-right">
                  <span className="text-[10px] uppercase tracking-[0.1em] font-medium text-accent-copper flex items-center justify-end gap-1.5">
                    +{h.points_awarded} pts
                  </span>
                </td>
              </tr>
            ))}
            {history.length === 0 && (
              <tr><td colSpan={4} className="p-8 text-center text-text-secondary uppercase tracking-widest text-sm">No transaction history found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}

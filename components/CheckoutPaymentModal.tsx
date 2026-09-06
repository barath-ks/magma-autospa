"use client";

import React, { useState } from "react";
import { 
  X, 
  CheckCircle2, 
  Banknote, 
  Smartphone, 
  CreditCard, 
  AlertCircle,
  Car,
  User,
  Sparkles
} from "lucide-react";
import { formatCurrency } from "@/lib/format";

export type PaymentMethod = "cash" | "upi" | "card";

interface CheckoutPaymentModalProps {
  job: {
    id: string;
    customer_name: string;
    vehicle_model?: string | null;
    vehicle_number?: string | null;
    service_name?: string | null;
    total_amount?: number | null;
  };
  onClose: () => void;
  onSuccess: (paymentMethod: PaymentMethod) => void;
  accentColor?: "copper" | "gold";
}

export function CheckoutPaymentModal({
  job,
  onClose,
  onSuccess,
  accentColor = "copper"
}: CheckoutPaymentModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>("cash");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCopper = accentColor === "copper";
  const btnAccent = isCopper ? "bg-accent-copper text-white" : "bg-accent-gold text-bg-base";
  const borderAccent = isCopper ? "border-accent-copper" : "border-accent-gold";
  const textAccent = isCopper ? "text-accent-copper" : "text-accent-gold";

  const paymentOptions: {
    id: PaymentMethod;
    label: string;
    subtitle: string;
    icon: React.ElementType;
    activeBorder: string;
    activeBg: string;
    activeIconColor: string;
  }[] = [
    {
      id: "cash",
      label: "Cash",
      subtitle: "Physical notes & currency",
      icon: Banknote,
      activeBorder: "border-emerald-500",
      activeBg: "bg-emerald-500/10",
      activeIconColor: "text-emerald-400",
    },
    {
      id: "upi",
      label: "UPI",
      subtitle: "GPay, PhonePe, Paytm QR",
      icon: Smartphone,
      activeBorder: "border-purple-500",
      activeBg: "bg-purple-500/10",
      activeIconColor: "text-purple-400",
    },
    {
      id: "card",
      label: "Card",
      subtitle: "Debit, Credit & POS Tap",
      icon: CreditCard,
      activeBorder: "border-amber-500",
      activeBg: "bg-amber-500/10",
      activeIconColor: "text-amber-400",
    },
  ];

  const handleConfirmCheckout = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/manager/jobs/active", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: job.id,
          status: "finished",
          payment_method: selectedMethod,
        }),
      });

      if (res.ok) {
        onSuccess(selectedMethod);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to finalize checkout");
      }
    } catch (e) {
      console.error("Checkout failed:", e);
      setError("Network communication failure during checkout.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg-base/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="panel w-full max-w-lg border-l-[3px] border-l-accent-copper bg-bg-panel shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-6 border-b border-border-hairline flex justify-between items-start bg-bg-panel-elevated">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <h2 className="text-lg font-semibold text-text-primary tracking-wide">
                Final Checkout &amp; Job Completion
              </h2>
            </div>
            <p className="text-xs font-mono text-text-secondary mt-1 uppercase tracking-wider">
              Ticket #{job.id.slice(0, 8).toUpperCase()} &middot; Confirm floor payment
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1 text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
          {error && (
            <div className="p-3 bg-accent-oxblood/10 border border-accent-oxblood text-accent-oxblood text-xs flex items-center gap-2 uppercase tracking-wide font-medium">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Job Summary Banner */}
          <div className="p-4 bg-bg-base border border-border-hairline rounded-sm space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-text-secondary font-bold flex items-center gap-1.5">
                  <User size={12} /> Customer &amp; Vehicle
                </div>
                <div className="text-sm font-semibold text-text-primary mt-0.5">
                  {job.customer_name}
                </div>
                <div className="text-xs font-mono text-text-secondary flex items-center gap-2 mt-0.5">
                  <span className="inline-block px-1.5 py-0.2 bg-bg-panel border border-border-hairline text-amber-200 font-bold">
                    {job.vehicle_number || "NO PLATE"}
                  </span>
                  <span>{job.vehicle_model || "Standard Vehicle"}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-widest text-text-secondary font-bold">
                  Amount Due
                </div>
                <div className="text-xl font-mono font-bold text-text-primary mt-0.5">
                  {job.total_amount ? formatCurrency(job.total_amount) : "—"}
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-border-hairline/60 flex items-center justify-between text-xs">
              <span className="text-text-secondary">Service Package:</span>
              <span className="font-medium text-text-primary">
                {job.service_name || "Detailing Package"}
              </span>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="block text-[11px] uppercase tracking-[0.15em] font-bold text-text-secondary mb-3">
              Select Payment Method <span className="text-accent-copper">*</span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              {paymentOptions.map((opt) => {
                const Icon = opt.icon;
                const isSelected = selectedMethod === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSelectedMethod(opt.id)}
                    className={`relative p-4 border text-left transition-all flex flex-col justify-between rounded-sm ${
                      isSelected
                        ? `${opt.activeBorder} ${opt.activeBg} ring-1 ring-inset ${opt.activeBorder}`
                        : "border-border-hairline bg-bg-base hover:border-text-secondary/60 hover:bg-bg-panel-elevated"
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-2 right-2">
                        <CheckCircle2 size={16} className={opt.activeIconColor} />
                      </div>
                    )}
                    <div className={`p-2 rounded-sm w-fit mb-3 ${isSelected ? "bg-bg-base/80" : "bg-bg-panel"}`}>
                      <Icon
                        size={22}
                        className={isSelected ? opt.activeIconColor : "text-text-secondary"}
                      />
                    </div>
                    <div>
                      <div
                        className={`text-sm font-bold uppercase tracking-wider ${
                          isSelected ? "text-text-primary" : "text-text-secondary"
                        }`}
                      >
                        {opt.label}
                      </div>
                      <div className="text-[10px] font-mono text-text-secondary/70 mt-0.5 leading-tight">
                        {opt.subtitle}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Loyalty notice */}
          <div className="flex items-center gap-2.5 p-3 bg-bg-panel-elevated border border-border-hairline text-xs text-text-secondary">
            <Sparkles size={16} className="text-accent-copper shrink-0" />
            <span>Customer loyalty points will be automatically credited to customer upon completion.</span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border-hairline bg-bg-panel-elevated flex justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-xs font-bold text-text-secondary hover:text-text-primary uppercase tracking-widest transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmCheckout}
            disabled={loading}
            className={`px-6 py-2.5 text-xs font-bold ${btnAccent} hover:brightness-110 uppercase tracking-widest transition-all disabled:opacity-50 flex items-center gap-2`}
          >
            {loading ? (
              "Processing..."
            ) : (
              <>
                <CheckCircle2 size={16} /> Confirm Payment &amp; Finish Job
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

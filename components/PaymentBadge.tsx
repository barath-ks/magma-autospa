import React from "react";
import { Banknote, Smartphone, CreditCard, CircleDollarSign } from "lucide-react";

export interface PaymentBadgeProps {
  method?: string | null;
  className?: string;
  size?: "sm" | "md";
}

export function PaymentBadge({ method, className = "", size = "sm" }: PaymentBadgeProps) {
  const norm = (method || "cash").toLowerCase();

  const isSmall = size === "sm";
  const padding = isSmall ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs";
  const iconSize = isSmall ? 11 : 13;

  if (norm === "cash") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 font-mono uppercase font-bold tracking-wider rounded-sm bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 ${padding} ${className}`}
        title="Paid via Cash"
      >
        <Banknote size={iconSize} className="shrink-0" />
        <span>Cash</span>
      </span>
    );
  }

  if (norm === "upi") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 font-mono uppercase font-bold tracking-wider rounded-sm bg-purple-500/10 text-purple-400 border border-purple-500/30 ${padding} ${className}`}
        title="Paid via UPI"
      >
        <Smartphone size={iconSize} className="shrink-0" />
        <span>UPI</span>
      </span>
    );
  }

  if (norm === "card") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 font-mono uppercase font-bold tracking-wider rounded-sm bg-amber-500/10 text-amber-400 border border-amber-500/30 ${padding} ${className}`}
        title="Paid via Card"
      >
        <CreditCard size={iconSize} className="shrink-0" />
        <span>Card</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono uppercase font-bold tracking-wider rounded-sm bg-text-secondary/10 text-text-secondary border border-border-hairline ${padding} ${className}`}
    >
      <CircleDollarSign size={iconSize} className="shrink-0" />
      <span>{norm}</span>
    </span>
  );
}

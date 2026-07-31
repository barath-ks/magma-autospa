import { CheckCircle2, Circle } from "lucide-react";

interface PasswordStrengthIndicatorProps {
  password?: string;
}

export default function PasswordStrengthIndicator({ password = "" }: PasswordStrengthIndicatorProps) {
  const hasLength = password.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);

  const reqs = [
    { met: hasLength, label: "At least 8 characters" },
    { met: hasLetter, label: "Contains a letter" },
    { met: hasNumber, label: "Contains a number" },
    { met: hasSpecial, label: "Contains a special character" }
  ];

  if (!password) {
    // When empty, just show a summary hint without turning everything red.
    return (
      <div className="mt-2 text-[10px] uppercase tracking-widest text-text-secondary font-medium space-y-1">
        Password must be at least 8 characters and include a letter, a number, and a special character.
      </div>
    );
  }

  return (
    <div className="mt-2 space-y-1.5 p-3 bg-bg-panel border border-border-hairline">
      <div className="text-[10px] uppercase tracking-[0.15em] font-bold text-text-secondary mb-2">Password Requirements:</div>
      {reqs.map((r, i) => (
        <div key={i} className={`flex items-center gap-2 text-xs font-mono tracking-wider ${r.met ? "text-[#4ade80]" : "text-text-secondary"}`}>
          {r.met ? <CheckCircle2 size={12} /> : <Circle size={12} />}
          {r.label}
        </div>
      ))}
    </div>
  );
}

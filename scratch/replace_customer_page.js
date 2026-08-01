const fs = require('fs');
const file = 'app/staff/customers/[id]/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add state for redeemStep, selectedOfferId, otp
const stateRegex = /const \[showRedeemModal, setShowRedeemModal\] = useState\(false\);/;
const newState = `const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [redeemStep, setRedeemStep] = useState<1 | 2>(1);
  const [selectedOfferId, setSelectedOfferId] = useState<string>("");
  const [otp, setOtp] = useState("");`;
content = content.replace(stateRegex, newState);

// 2. Replace handleRedeem with handleRequestOTP and handleConfirmRedemption
const handleRedeemRegex = /const handleRedeem = async \([\s\S]*?setRedeeming\(false\);\n  };/;
const newHandlers = `const handleRequestOTP = async (offerId: string) => {
    setRedeemError("");
    setRedeemSuccess("");
    setRedeeming(true);
    setSelectedOfferId(offerId);

    try {
      const res = await fetch("/api/staff/redemptions/request-otp", {
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
      const res = await fetch("/api/staff/redemptions/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer_id: id, offer_id: selectedOfferId, otp })
      });
      const data = await res.json();
      
      if (res.ok) {
        setRedeemSuccess("Reward redeemed successfully!");
        setCustomer({ ...customer, points_balance: data.new_balance });
        // Refresh ledger and history
        const fetchRes = await fetch(\`/api/staff/customers/\${id}\`);
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
  };`;
content = content.replace(handleRedeemRegex, newHandlers);

// 3. Update the modal UI
const modalRegex = /\{showRedeemModal && \([\s\S]*?\{showLogVisitModal && \(/;
const newModal = `{showRedeemModal && (
        <div className="fixed inset-0 bg-bg-base/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="panel border-l-[3px] border-l-accent-copper p-8 w-full max-w-lg">
            <h3 className="text-xl font-semibold mb-2 text-text-primary">Redeem Reward</h3>
            <p className="text-xs font-mono text-text-secondary mb-6 uppercase tracking-wider">
              {customer.name} — Balance: <span className="text-accent-copper font-bold">{customer.points_balance} pts</span>
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
                        className={\`p-4 border flex justify-between items-center transition-colors \${
                          canAfford 
                            ? "border-border-hairline hover:border-accent-copper bg-bg-panel hover:bg-bg-panel-elevated cursor-pointer" 
                            : "border-border-hairline/30 bg-bg-base opacity-50 cursor-not-allowed"
                        }\`}
                        onClick={() => { if (canAfford && !redeeming) handleRequestOTP(offer.id); }}
                      >
                        <div className="text-sm font-medium text-text-primary">{offer.name}</div>
                        <div className="flex items-center gap-4">
                          <div className={\`font-mono text-xs font-bold \${canAfford ? 'text-accent-copper' : 'text-text-secondary'}\`}>
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
                    className="block w-full bg-bg-base border border-border-hairline p-3 text-text-primary text-sm font-mono tracking-widest focus:border-accent-copper focus:outline-none"
                    maxLength={6}
                  />
                  <p className="text-[10px] text-text-secondary mt-2">Ask the customer for the code sent to their email.</p>
                </div>
                <button 
                  onClick={handleConfirmRedemption}
                  disabled={redeeming || otp.length < 6}
                  className="w-full py-3 font-bold text-xs uppercase tracking-widest bg-accent-copper text-white hover:bg-opacity-90 transition-colors disabled:opacity-50"
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

      {showLogVisitModal && (`;
content = content.replace(modalRegex, newModal);

fs.writeFileSync(file, content);
console.log("Successfully updated frontend");

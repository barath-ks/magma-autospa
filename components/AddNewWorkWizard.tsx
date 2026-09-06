"use client";

import React, { useState, useEffect } from "react";
import { Search, User, Phone, Check } from "lucide-react";
import { formatCurrency } from "@/lib/format";

interface AddNewWorkWizardProps {
  formData: {
    services: any[];
    staff: any[];
  };
  onClose: () => void;
  onSuccess: () => void;
  accentColor?: "copper" | "gold";
}

export function AddNewWorkWizard({
  formData,
  onClose,
  onSuccess,
  accentColor = "gold"
}: AddNewWorkWizardProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [tab, setTab] = useState<"existing" | "new">("existing");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    phone: "",
    email: "",
    vehicle_number: "",
    vehicle_type: "sedan",
    vehicle_model: "",
  });
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [selectedCustomerVehicles, setSelectedCustomerVehicles] = useState<any[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [assignedTo, setAssignedTo] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const isCopper = accentColor === "copper";
  const accentClass = isCopper ? "accent-copper" : "accent-gold";
  const btnAccent = isCopper ? "bg-accent-copper text-white" : "bg-accent-gold text-bg-base";
  const textAccent = isCopper ? "text-accent-copper" : "text-accent-gold";
  const borderAccent = isCopper ? "border-accent-copper" : "border-accent-gold";
  const activeTabClass = `${textAccent} border-b-2 ${borderAccent} bg-bg-panel-elevated`;

  useEffect(() => {
    if (tab === "existing" && searchQuery.length > 0) {
      const delay = setTimeout(async () => {
        setIsSearching(true);
        try {
          const res = await fetch(`/api/manager/customers?search=${encodeURIComponent(searchQuery)}`);
          const data = await res.json();
          if (data.customers) setSearchResults(data.customers);
        } catch (e) {
          console.error(e);
        }
        setIsSearching(false);
      }, 300);
      return () => clearTimeout(delay);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, tab]);

  const handleSelectExisting = async (customer: any) => {
    setSelectedCustomer(customer);
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
    setCreateError("");
    setIsCreating(true);
    try {
      const res = await fetch("/api/manager/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCustomer),
      });
      const data = await res.json();
      if (res.ok) {
        setSelectedCustomer(data);
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
    } catch (e) {
      setCreateError("System Error");
    }
    setIsCreating(false);
  };

  const handleSubmitJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicleId) {
      setSubmitError("Please select a vehicle.");
      return;
    }
    if (serviceIds.length === 0) {
      setSubmitError("Please select at least one service.");
      return;
    }
    setSubmitError("");
    setIsSubmitting(true);
    try {
      const payload: any = {
        customer_id: selectedCustomer.id,
        service_ids: serviceIds,
        vehicle_id: selectedVehicleId,
      };
      if (assignedTo) payload.assigned_to = assignedTo;

      const res = await fetch("/api/manager/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        onSuccess();
      } else {
        const data = await res.json();
        setSubmitError(data.error || "Failed to create job");
      }
    } catch (e) {
      setSubmitError("System Error");
    }
    setIsSubmitting(false);
  };

  const toggleService = (id: string) => {
    if (serviceIds.includes(id)) {
      setServiceIds(serviceIds.filter((s) => s !== id));
    } else {
      setServiceIds([...serviceIds, id]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg-base/80 backdrop-blur-sm">
      <div className="bg-bg-panel border border-border-hairline w-full max-w-2xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-border-hairline shrink-0 flex justify-between items-center bg-bg-panel-elevated">
          <div>
            <h3 className="text-lg font-serif text-text-primary tracking-tight">Add New Work</h3>
            <p className="text-[10px] uppercase tracking-widest text-text-secondary mt-1">
              {step === 1 ? "Step 1: Select or Create Customer" : `Step 2: Job Details for ${selectedCustomer?.name}`}
            </p>
          </div>
          {step === 2 && (
            <button
              onClick={() => setStep(1)}
              className={`text-[10px] font-bold uppercase tracking-widest ${textAccent} hover:text-text-primary transition-colors`}
            >
              &larr; Back to Step 1
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {step === 1 && (
            <div className="space-y-6">
              <div className="flex border-b border-border-hairline mb-6">
                <button
                  onClick={() => setTab("existing")}
                  className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-colors ${
                    tab === "existing" ? activeTabClass : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  Search Existing
                </button>
                <button
                  onClick={() => setTab("new")}
                  className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-colors ${
                    tab === "new" ? activeTabClass : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  + Create New
                </button>
              </div>

              {tab === "existing" && (
                <div>
                  <div className="relative mb-4">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Search size={16} className="text-text-secondary" />
                    </div>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="SEARCH BY NAME, PHONE, OR VEHICLE..."
                      className={`w-full bg-bg-base border border-border-hairline p-3 pl-12 text-text-primary font-mono text-sm focus:${borderAccent} focus:outline-none transition-colors placeholder:text-text-secondary/50 uppercase tracking-widest`}
                    />
                  </div>

                  <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                    {isSearching ? (
                      <div className="text-text-secondary text-[10px] font-mono uppercase tracking-widest animate-pulse p-4 text-center">
                        Searching...
                      </div>
                    ) : searchResults.length > 0 ? (
                      searchResults.map((c) => (
                        <div
                          key={c.id}
                          onClick={() => handleSelectExisting(c)}
                          className={`p-4 border border-border-hairline hover:${borderAccent} bg-bg-base hover:bg-bg-panel-elevated cursor-pointer transition-colors flex justify-between items-center group`}
                        >
                          <div className="flex gap-8">
                            <div>
                              <div className="text-[10px] font-bold text-text-secondary uppercase mb-1 flex items-center gap-1">
                                <User size={10} /> Name
                              </div>
                              <div className="text-sm font-medium text-text-primary">{c.name}</div>
                            </div>
                            <div>
                              <div className="text-[10px] font-bold text-text-secondary uppercase mb-1 flex items-center gap-1">
                                <Phone size={10} /> Phone
                              </div>
                              <div className="text-sm font-mono text-text-primary">{c.phone}</div>
                            </div>
                          </div>
                          <div className={`${textAccent} opacity-0 group-hover:opacity-100 transition-opacity font-mono text-xs uppercase tracking-widest`}>
                            &rarr;
                          </div>
                        </div>
                      ))
                    ) : searchQuery ? (
                      <div className="text-text-secondary text-[10px] font-mono uppercase tracking-widest p-4 text-center border border-border-hairline border-dashed">
                        No results found.
                      </div>
                    ) : (
                      <div className="text-text-secondary text-[10px] font-mono uppercase tracking-widest p-4 text-center border border-border-hairline border-dashed">
                        Start typing to search...
                      </div>
                    )}
                  </div>
                </div>
              )}

              {tab === "new" && (
                <form id="new-customer-form" onSubmit={handleCreateCustomer} className="space-y-4">
                  {createError && (
                    <div className="text-[#ff6b6b] bg-[#3a1616] border border-[#521d1d] text-[10px] uppercase tracking-widest font-bold p-3">
                      {createError}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1.5">
                        Full Name *
                      </label>
                      <input
                        required
                        type="text"
                        value={newCustomer.name}
                        onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                        className={`w-full bg-bg-base border border-border-hairline p-3 text-text-primary font-mono text-sm focus:${borderAccent} focus:outline-none`}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1.5">
                        Phone Number *
                      </label>
                      <input
                        required
                        type="tel"
                        value={newCustomer.phone}
                        onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                        className={`w-full bg-bg-base border border-border-hairline p-3 text-text-primary font-mono text-sm focus:${borderAccent} focus:outline-none`}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1.5">
                        Email Address (Required for Loyalty OTPs)
                      </label>
                      <input
                        type="email"
                        value={newCustomer.email}
                        onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                        className={`w-full bg-bg-base border border-border-hairline p-3 text-text-primary font-mono text-sm focus:${borderAccent} focus:outline-none`}
                        placeholder="customer@example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1.5">
                        Vehicle Number *
                      </label>
                      <input
                        required
                        type="text"
                        value={newCustomer.vehicle_number}
                        onChange={(e) => setNewCustomer({ ...newCustomer, vehicle_number: e.target.value })}
                        className={`w-full bg-bg-base border border-border-hairline p-3 text-text-primary font-mono text-sm focus:${borderAccent} focus:outline-none uppercase`}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1.5">
                        Vehicle Type *
                      </label>
                      <select
                        required
                        value={newCustomer.vehicle_type}
                        onChange={(e) => setNewCustomer({ ...newCustomer, vehicle_type: e.target.value })}
                        className={`w-full bg-bg-base border border-border-hairline p-3 text-text-primary font-mono text-sm focus:${borderAccent} focus:outline-none`}
                      >
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
                      <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1.5">
                        Vehicle Model
                      </label>
                      <input
                        type="text"
                        value={newCustomer.vehicle_model}
                        onChange={(e) => setNewCustomer({ ...newCustomer, vehicle_model: e.target.value })}
                        className={`w-full bg-bg-base border border-border-hairline p-3 text-text-primary font-mono text-sm focus:${borderAccent} focus:outline-none`}
                        placeholder="e.g. Porsche 911"
                      />
                    </div>
                  </div>
                </form>
              )}
            </div>
          )}

          {step === 2 && (
            <form id="job-details-form" onSubmit={handleSubmitJob} className="space-y-6">
              {submitError && (
                <div className="text-[#ff6b6b] bg-[#3a1616] border border-[#521d1d] text-[10px] uppercase tracking-widest font-bold p-3">
                  {submitError}
                </div>
              )}

              <div className="p-4 bg-bg-base border border-border-hairline mb-6 flex justify-between items-center">
                <div>
                  <div className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1">
                    Customer
                  </div>
                  <div className="text-sm text-text-primary font-medium">
                    {selectedCustomer?.name}{" "}
                    <span className="text-text-secondary font-mono ml-2">({selectedCustomer?.phone})</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-3">
                  Select Vehicle *
                </label>
                {selectedCustomerVehicles.length === 0 ? (
                  <div className="text-xs text-[#ff6b6b] bg-[#3a1616] p-3 font-bold uppercase tracking-widest border border-[#521d1d]">
                    No vehicles found for this customer. Please add one from their profile first.
                  </div>
                ) : (
                  <select
                    value={selectedVehicleId}
                    onChange={(e) => setSelectedVehicleId(e.target.value)}
                    className={`w-full bg-bg-base border border-border-hairline p-3 text-text-primary text-sm font-mono focus:${borderAccent} focus:outline-none mb-6 cursor-pointer`}
                  >
                    <option value="" disabled>
                      -- Choose a vehicle --
                    </option>
                    {selectedCustomerVehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.vehicle_number} ({v.vehicle_model || v.vehicle_type})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-3">
                  Select Services *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-2">
                  {formData.services.map((s: any) => {
                    const isSelected = serviceIds.includes(s.id);
                    return (
                      <label
                        key={s.id}
                        className={`flex items-center p-3 border cursor-pointer transition-colors ${
                          isSelected
                            ? `${borderAccent} ${isCopper ? "bg-accent-copper/10" : "bg-accent-gold/10"}`
                            : "border-border-hairline bg-bg-base hover:border-text-secondary"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleService(s.id)}
                          className={`mr-3 w-4 h-4 cursor-pointer ${isCopper ? "accent-accent-copper" : "accent-accent-gold"}`}
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-text-primary">{s.name}</div>
                          <div className={`text-[10px] font-mono ${textAccent}`}>
                            {formatCurrency(Number(s.price))}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1.5">
                  Assign To Staff (Optional)
                </label>
                <select
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  className={`block w-full bg-bg-base border border-border-hairline p-3 text-text-primary text-sm focus:${borderAccent} focus:outline-none appearance-none cursor-pointer`}
                >
                  <option value="">-- Leave Unassigned (Queue) --</option>
                  {formData.staff.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </form>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-6 border-t border-border-hairline bg-bg-panel-elevated flex justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isCreating || isSubmitting}
            className="px-4 py-2 text-xs font-bold text-text-secondary hover:text-text-primary uppercase tracking-widest transition-colors"
          >
            Cancel
          </button>
          {step === 1 && tab === "new" && (
            <button
              type="submit"
              form="new-customer-form"
              disabled={isCreating}
              className={`px-6 py-2 text-xs font-bold ${btnAccent} hover:opacity-90 uppercase tracking-widest transition-opacity disabled:opacity-50 flex items-center gap-2`}
            >
              {isCreating ? "Saving..." : "Save & Continue"} &rarr;
            </button>
          )}
          {step === 2 && (
            <button
              type="submit"
              form="job-details-form"
              disabled={isSubmitting}
              className={`px-6 py-2 text-xs font-bold ${btnAccent} hover:opacity-90 uppercase tracking-widest transition-opacity disabled:opacity-50`}
            >
              {isSubmitting ? "Adding..." : "Add to Queue"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

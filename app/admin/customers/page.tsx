"use client";
import { useState, useEffect, useCallback } from "react";
import { Contact, Search, ChevronLeft, ChevronRight, X, Clock, MapPin, DollarSign, Wrench, User } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import { formatCurrency } from "@/lib/format";

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Pagination & Search
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Sorting
  const [sortBy, setSortBy] = useState("last_visit");
  const [sortOrder, setSortOrder] = useState<"asc"|"desc">("desc");

  // Drawer
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [customerDetails, setCustomerDetails] = useState<any>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to page 1 on new search
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    fetchCustomers();
  }, [debouncedSearch, page, sortBy, sortOrder]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/customers?search=${encodeURIComponent(debouncedSearch)}&page=${page}&sortBy=${sortBy}&sortOrder=${sortOrder}`);
      if (res.ok) {
        const data = await res.json();
        setCustomers(data.customers || []);
        if (data.pagination) setTotalPages(data.pagination.pages);
      }
    } catch (error) {
      console.error("Failed to fetch customers:", error);
    }
    setLoading(false);
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc"); // Default to desc for new sorts (good for dates/amounts)
    }
    setPage(1);
  };

  const openDrawer = async (customer: any) => {
    setSelectedCustomer(customer);
    setDrawerLoading(true);
    try {
      const res = await fetch(`/api/staff/customers/${customer.id}`);
      if (res.ok) {
        const data = await res.json();
        setCustomerDetails(data);
      }
    } catch (e) {
      console.error("Failed to fetch details", e);
    }
    setDrawerLoading(false);
  };

  const closeDrawer = () => {
    setSelectedCustomer(null);
    setCustomerDetails(null);
  };

  return (
    <div className="flex flex-col h-full relative">
      <div className="w-full self-start mb-6 px-8 pt-8 lg:px-12 lg:pt-12">
        <Breadcrumbs items={[{ label: "System", href: "/admin" }, { label: "Global Customers" }]} accentClass="hover:text-accent-oxblood" />
        <h1 className="text-3xl font-semibold text-text-primary mt-2 flex items-center gap-3">
          <Contact size={28} className="text-accent-oxblood" /> Customer Directory
        </h1>
        <p className="text-text-secondary mt-1 text-sm uppercase tracking-wider">Search and view customer history across all branches.</p>
      </div>

      <div className="px-8 pb-8 lg:px-12 flex-1 flex flex-col max-w-7xl mx-auto w-full">
        {/* Controls Bar */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
            <input 
              type="text" 
              placeholder="Search by Name, Phone, or Email..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-bg-panel border border-border-hairline-strong text-text-primary font-mono text-sm focus:border-accent-oxblood focus:outline-none transition-colors"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 bg-bg-panel border border-border-hairline text-text-secondary disabled:opacity-50 hover:text-accent-oxblood transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-mono text-text-secondary w-20 text-center">Page {page} / {totalPages || 1}</span>
            <button 
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || totalPages === 0}
              className="p-2 bg-bg-panel border border-border-hairline text-text-secondary disabled:opacity-50 hover:text-accent-oxblood transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="panel flex-1 overflow-hidden flex flex-col border-t-[3px] border-t-accent-oxblood">
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left whitespace-nowrap">
              <thead className="bg-bg-panel-elevated border-b border-border-hairline text-text-secondary uppercase text-[10px] tracking-[0.2em] font-medium sticky top-0">
                <tr>
                  <th className="p-4 pl-6 cursor-pointer hover:text-accent-oxblood transition-colors" onClick={() => handleSort('name')}>
                    Name {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="p-4">Phone / Email</th>
                  <th className="p-4">Branches Visited</th>
                  <th className="p-4 text-center">Visits</th>
                  <th className="p-4 cursor-pointer hover:text-accent-oxblood transition-colors" onClick={() => handleSort('last_visit')}>
                    Last Visit {sortBy === 'last_visit' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="p-4 pr-6 text-right cursor-pointer hover:text-accent-oxblood transition-colors" onClick={() => handleSort('total_spent')}>
                    Total Spent {sortBy === 'total_spent' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-hairline bg-bg-panel">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-text-secondary text-sm uppercase tracking-widest font-mono animate-pulse">
                      Loading...
                    </td>
                  </tr>
                ) : customers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-text-secondary text-sm uppercase tracking-widest">
                      No customers found.
                    </td>
                  </tr>
                ) : (
                  customers.map(c => (
                    <tr 
                      key={c.id} 
                      onClick={() => openDrawer(c)}
                      className="hover:bg-bg-panel-elevated transition-colors cursor-pointer group"
                    >
                      <td className="p-4 pl-6 text-text-primary text-sm font-medium group-hover:text-accent-oxblood transition-colors">
                        {c.name}
                      </td>
                      <td className="p-4">
                        <div className="text-sm font-mono text-text-primary">{c.phone}</div>
                        <div className="text-[10px] text-text-secondary">{c.email || 'No email'}</div>
                      </td>
                      <td className="p-4 text-xs text-text-secondary max-w-[200px] truncate">
                        {c.branches_visited || '-'}
                      </td>
                      <td className="p-4 text-center font-mono text-sm text-text-primary">{c.total_visits}</td>
                      <td className="p-4 text-sm font-mono text-text-secondary">
                        {c.last_visit ? new Date(c.last_visit).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="p-4 pr-6 text-right font-mono font-bold text-accent-oxblood text-sm">
                        {formatCurrency(c.total_spent)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Customer Detail Drawer Overlay */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-bg-base/80 backdrop-blur-sm">
          <div className="w-full max-w-md h-full bg-bg-panel border-l border-border-hairline shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="p-6 border-b border-border-hairline flex justify-between items-start bg-bg-panel-elevated">
              <div>
                <h2 className="text-xl font-bold text-text-primary mb-1">{selectedCustomer.name}</h2>
                <div className="flex flex-col gap-1 text-sm font-mono text-text-secondary">
                  <span>{selectedCustomer.phone}</span>
                  <span>{selectedCustomer.email || 'No email provided'}</span>
                </div>
              </div>
              <button onClick={closeDrawer} className="p-2 text-text-secondary hover:text-text-primary transition-colors">
                <X size={20} />
              </button>
            </div>
            
            {/* Drawer Body (History) */}
            <div className="flex-1 overflow-y-auto p-6">
              <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-text-secondary mb-6 border-b border-border-hairline pb-2">Service Timeline</h3>
              
              {drawerLoading ? (
                <div className="text-center text-text-secondary text-sm uppercase tracking-widest font-mono animate-pulse mt-10">Loading history...</div>
              ) : !customerDetails?.history || customerDetails.history.length === 0 ? (
                <div className="text-center text-text-secondary text-sm mt-10">No service history found.</div>
              ) : (
                <div className="space-y-6 relative before:absolute before:inset-0 before:ml-[11px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-border-hairline">
                  {customerDetails.history.map((tx: any) => (
                    <div key={tx.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full border border-accent-oxblood bg-bg-panel-elevated shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 text-accent-oxblood">
                        <Wrench size={12} />
                      </div>
                      <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-1.5rem)] p-4 rounded border border-border-hairline bg-bg-base hover:border-accent-oxblood transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] uppercase font-bold text-text-secondary flex items-center gap-1"><Clock size={10} /> {new Date(tx.created_at).toLocaleDateString()}</span>
                          <span className={`text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded ${tx.status === 'finished' ? 'bg-[#163a24] text-[#4ade80]' : 'bg-accent-oxblood/20 text-accent-oxblood'}`}>
                            {tx.status}
                          </span>
                        </div>
                        <div className="mb-2">
                          <div className="text-sm font-medium text-text-primary mb-1 flex items-center gap-1"><MapPin size={12} className="text-text-secondary" /> {tx.branch_name}</div>
                          {tx.services.map((s: any, i: number) => (
                            <div key={i} className="text-xs text-text-secondary flex justify-between ml-4">
                              <span>• {s.name}</span>
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-between items-end mt-4 pt-3 border-t border-border-hairline border-dashed">
                          <div className="text-[10px] text-text-secondary flex items-center gap-1"><User size={10} /> {tx.staff_name || 'Unknown'}</div>
                          <div className="text-sm font-mono font-bold text-accent-oxblood flex items-center gap-1">{formatCurrency(tx.total_amount)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

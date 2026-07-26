"use client";

export default function StaffDashboard() {
  return (
      <main className="flex-1 p-8 lg:p-12 overflow-auto">
        <div className="flex justify-between items-end mb-10">
          <div>
            <h1 className="text-3xl font-semibold text-text-primary">Operations Overview</h1>
            <p className="text-text-secondary mt-2 text-sm uppercase tracking-wider">Current shift status and queue.</p>
          </div>
        </div>
        
        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="panel p-6 border-l-[3px] border-l-accent-copper flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-secondary">Vehicles in Queue</span>
            <span className="font-mono text-4xl text-text-primary mt-3">12</span>
          </div>
          <div className="panel p-6 border-l-[3px] border-l-accent-copper flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-secondary">Completed Today</span>
            <span className="font-mono text-4xl text-text-primary mt-3">08</span>
          </div>
          <div className="panel p-6 border-l-[3px] border-l-accent-copper flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-secondary">Next Appointment</span>
            <span className="font-mono text-xl text-text-primary mt-3">14:30 EST</span>
          </div>
        </div>

        {/* Queue Table */}
        <div className="panel overflow-hidden border-l-[3px] border-l-border-hairline-strong">
          <div className="p-5 border-b border-border-hairline flex justify-between items-center bg-bg-panel-elevated">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-text-primary">Active Bay Queue</h2>
          </div>
          <table className="w-full text-left">
            <thead className="bg-bg-panel border-b border-border-hairline text-text-secondary uppercase text-[10px] tracking-[0.2em] font-medium">
              <tr>
                <th className="p-4">Ticket ID</th>
                <th className="p-4">Vehicle</th>
                <th className="p-4">Service Level</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-hairline bg-bg-panel">
              <tr className="hover:bg-bg-panel-elevated transition-colors">
                <td className="p-4 font-mono text-text-primary text-sm">#TK-4092</td>
                <td className="p-4 text-text-primary text-sm font-medium">Porsche 911 GT3</td>
                <td className="p-4 text-text-secondary text-sm">Ceramic Coating</td>
                <td className="p-4">
                  <span className="text-[10px] uppercase tracking-[0.1em] font-medium text-accent-copper flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-accent-copper animate-pulse"></span> In Progress
                  </span>
                </td>
              </tr>
              <tr className="hover:bg-bg-panel-elevated transition-colors">
                <td className="p-4 font-mono text-text-primary text-sm">#TK-4093</td>
                <td className="p-4 text-text-primary text-sm font-medium">BMW M4 Comp</td>
                <td className="p-4 text-text-secondary text-sm">Full Detail</td>
                <td className="p-4">
                  <span className="text-[10px] uppercase tracking-[0.1em] font-medium text-text-secondary flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-text-secondary border border-text-secondary/50"></span> Waiting
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </main>
  );
}

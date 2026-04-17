import { useState, useEffect } from 'react';
import { api } from './api';
import { 
  History, 
  Filter, 
  Download, 
  User, 
  MapPin, 
  RotateCcw,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';
import { cn } from './lib/utils';
import { format } from 'date-fns';

export function AuditLogPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [filter, setFilter] = useState<'all' | 'critical' | 'routine'>('all');

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.getBookings();
        setLogs(data);
      } catch {}
    };
    load();
  }, []);

  const handleExportPDF = () => {
    window.print();
  };

  const filteredLogs = filter === 'all' ? logs 
    : filter === 'critical' ? logs.filter(l => l.status === 'Rejected')
    : logs.filter(l => l.status === 'FinalApproved' || l.status === 'AdminApproved');

  return (
    <div className="space-y-10 max-w-6xl mx-auto print-area">
      <div className="flex items-center justify-between print:hidden">
        <div>
          <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-2">Analytics Hub &gt; System Audit</p>
          <h1 className="text-4xl font-extrabold text-primary tracking-tight">Technical Audit Log</h1>
          <p className="text-text-muted mt-2 font-medium">Complete chronological record of system interventions and administrative overrides.</p>
        </div>
        <button 
          onClick={handleExportPDF}
          className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-100 text-text-main rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-bg-light transition-all shadow-sm active:scale-95"
        >
          <Download className="w-4 h-4" /> Print
        </button>
      </div>

      {/* Print-only header */}
      <div className="hidden print:block mb-8">
        <h1 className="text-2xl font-bold text-black">AASTMT Room Management — Audit Report</h1>
        <p className="text-sm text-gray-600">Generated: {format(new Date(), 'MMMM d, yyyy, h:mm a')}</p>
        <hr className="mt-4 border-gray-300" />
      </div>

      <div className="flex bg-white p-5 rounded-[2.5rem] border border-gray-50 shadow-sm items-center gap-6 print:hidden">
        <div className="relative flex-1 group">
           <Filter className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted group-focus-within:text-primary transition-colors" />
           <select 
             value={filter}
             onChange={(e) => setFilter(e.target.value as any)}
             className="w-full pl-12 pr-6 py-3 bg-bg-light border-none rounded-2xl text-[11px] font-black uppercase tracking-widest text-text-main focus:ring-4 focus:ring-primary/5 outline-none appearance-none cursor-pointer"
           >
             <option value="all">All Interventions</option>
             <option value="critical">Critical Overrides</option>
             <option value="routine">Routine Actions</option>
           </select>
        </div>
        <div className="flex p-1.5 bg-bg-light rounded-2xl border border-gray-100/50">
           <button className="px-5 py-2 bg-white shadow-sm text-primary rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Today</button>
           <button className="px-5 py-2 text-text-muted rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white transition-all">Weekly</button>
           <button className="px-5 py-2 text-text-muted rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white transition-all">Monthly</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 print:block">
        <div className="lg:col-span-2 space-y-6">
            {filteredLogs.length === 0 ? (
                <div className="bg-white p-12 rounded-[2.5rem] border border-gray-50 text-center space-y-4">
                  <div className="w-16 h-16 bg-bg-light rounded-full flex items-center justify-center mx-auto">
                    <History className="w-8 h-8 text-text-muted opacity-20" />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-text-muted">No operational logs recorded</p>
                </div>
            ) : filteredLogs.map((log) => (
                <div key={log.id} className="bg-white p-8 rounded-[2.5rem] border border-gray-50 shadow-sm relative group overflow-hidden flex gap-8 hover:shadow-md transition-all print:rounded-none print:border-b print:border-gray-200 print:shadow-none print:p-4">
                    <div className={cn(
                        "absolute top-0 left-0 w-2 h-full print:hidden",
                        log.status === 'Rejected' ? "bg-red-500" : log.status === 'FinalApproved' ? "bg-emerald-500" : "bg-orange-500"
                    )} />
                    
                    <div className={cn(
                        "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm print:hidden",
                        log.status === 'Rejected' ? "bg-red-50 text-red-600" : log.status === 'FinalApproved' ? "bg-emerald-50 text-emerald-600" : "bg-orange-50 text-orange-600"
                    )}>
                        {log.status === 'Rejected' ? <ShieldAlert className="w-7 h-7" /> : log.status === 'FinalApproved' ? <CheckCircle2 className="w-7 h-7" /> : <RotateCcw className="w-7 h-7" />}
                    </div>

                    <div className="flex-1 space-y-4 print:space-y-1">
                        <div className="flex items-start justify-between">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-text-muted opacity-60">
                                        {log.status === 'Rejected' ? 'OVERRIDE REJECTION' : log.status === 'FinalApproved' ? 'STANDARD PROTOCOL' : 'PENDING SYNC'}
                                    </p>
                                    <span className="text-[10px] font-bold text-gray-200">•</span>
                                    <p className="text-[10px] font-black text-text-muted uppercase tracking-widest opacity-60">{log.createdAt ? format(new Date(log.createdAt), 'p, MMM d') : '—'}</p>
                                </div>
                                <h3 className="text-xl font-extrabold text-primary tracking-tight print:text-base">{log.eventTitle}</h3>
                            </div>
                            <button className="text-[10px] font-black uppercase tracking-widest text-primary hover:text-accent transition-colors flex items-center gap-1 group print:hidden">
                                View Detail <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                        
                        <p className="text-sm text-text-muted leading-relaxed font-medium print:text-xs">
                            {log.status === 'Rejected' 
                                ? `Administrative override for ${log.roomID || 'room'}. Reason: ${log.rejectionSuggestion || 'Schedule conflict'}.`
                                : `Approval validated for user ${log.userName}. Resource: ${log.roomID || 'pending assign'}.`
                            }
                        </p>

                        <div className="flex gap-4 pt-2 print:pt-0">
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-bg-light rounded-xl border border-gray-100/50 print:bg-transparent print:border-none print:px-0">
                                <User className="w-3.5 h-3.5 text-text-muted" />
                                <span className="text-[9px] font-black text-text-main uppercase tracking-widest">{log.userName}</span>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-bg-light rounded-xl border border-gray-100/50 print:bg-transparent print:border-none print:px-0">
                                <MapPin className="w-3.5 h-3.5 text-text-muted" />
                                <span className="text-[9px] font-black text-text-main uppercase tracking-widest">Room: {log.roomID || 'N/A'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>

        <div className="space-y-8 print:hidden">
            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-50 shadow-sm space-y-8">
                <h3 className="text-lg font-bold text-primary tracking-tight">Telemetry Summary</h3>
                <div className="space-y-8">
                    {[
                        { label: 'Critical Overrides', value: logs.filter(l => l.status === 'Rejected').length, color: 'red' },
                        { label: 'Pending Items', value: logs.filter(l => l.status === 'Pending' || l.status === 'AdminApproved').length, color: 'orange' },
                        { label: 'Standard Protocols', value: logs.filter(l => l.status === 'FinalApproved').length, color: 'primary' },
                    ].map(stat => (
                        <div key={stat.label} className="space-y-3">
                            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                                <span className="text-text-muted">{stat.label}</span>
                                <span className="text-primary">{stat.value}</span>
                            </div>
                            <div className="h-2 w-full bg-bg-light rounded-full overflow-hidden border border-gray-50">
                                <div 
                                    className={cn(
                                        "h-full rounded-full transition-all duration-1000",
                                        stat.color === 'red' ? "bg-red-500" : stat.color === 'orange' ? "bg-orange-500" : "bg-primary"
                                    )} 
                                    style={{ width: `${Math.min((stat.value / Math.max(logs.length, 1)) * 100, 100)}%` }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      </div>

      {/* Print-only summary table */}
      <div className="hidden print:block mt-8">
        <h2 className="text-lg font-bold text-black mb-4">Summary</h2>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-gray-400">
              <th className="text-left py-2 font-bold">Event</th>
              <th className="text-left py-2 font-bold">User</th>
              <th className="text-left py-2 font-bold">Room</th>
              <th className="text-left py-2 font-bold">Status</th>
              <th className="text-left py-2 font-bold">Date</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.map(log => (
              <tr key={log.id} className="border-b border-gray-200">
                <td className="py-2">{log.eventTitle}</td>
                <td className="py-2">{log.userName}</td>
                <td className="py-2">{log.roomID || 'N/A'}</td>
                <td className="py-2">{log.status}</td>
                <td className="py-2">{log.createdAt ? format(new Date(log.createdAt), 'MMM d, yyyy') : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ShieldAlert(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
      <line x1="12" x2="12" y1="8" y2="12" />
      <line x1="12" x2="12.01" y1="16" y2="16" />
    </svg>
  );
}

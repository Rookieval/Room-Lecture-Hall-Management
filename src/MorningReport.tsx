import { useState, useEffect } from 'react';
import { api } from './api';
import { format } from 'date-fns';
import { 
  Users, 
  AlertTriangle, 
  Monitor, 
  Truck,
  ArrowUpRight,
  Clock,
  ShieldAlert,
  MapPin,
  Printer,
  Download
} from 'lucide-react';
import { cn } from './lib/utils';

export function MorningReportPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.getBookings({ date: today, status: 'FinalApproved' });
        setBookings(data);
      } catch {}
    };
    load();
  }, [today]);

  const stats = [
    { label: 'Expected Attendance', value: bookings.reduce((acc, b) => acc + (b.expectedAttendance || 0), 0).toLocaleString(), icon: Users, color: 'blue' },
    { label: 'Urgent Tech Needs', value: bookings.filter(b => b.type === 'Multi-Purpose').length, icon: AlertTriangle, color: 'red' },
    { label: 'Room Utilization', value: '87%', icon: Monitor, color: 'slate' },
  ];

  return (
    <div className="space-y-10 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold text-accent uppercase tracking-widest mb-1">Daily Operational Briefing</p>
          <h1 className="text-3xl font-extrabold text-primary tracking-tight">Morning Logistics Report</h1>
          <p className="text-text-muted mt-2 font-medium">Logistics, staffing, and urgent facilities overview for {format(new Date(), 'MMMM d, yyyy')}.</p>
        </div>
        <div className="flex gap-4">
          <button className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-100 text-text-main rounded-xl font-bold text-xs hover:bg-bg-light transition-colors shadow-sm">
            <Download className="w-4 h-4" /> Export Requisition
          </button>
          <button onClick={() => window.print()} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl font-bold text-xs hover:bg-primary/95 transition-shadow shadow-lg shadow-primary/10 active:scale-95">
            <Printer className="w-4 h-4" /> Print Logistics
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group">
            <div className={cn(
              "absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 opacity-[0.03] rounded-full transition-transform group-hover:scale-125",
              stat.color === 'blue' ? "bg-primary" : stat.color === 'red' ? "bg-red-500" : "bg-text-muted"
            )} />
            <div className="flex items-center gap-4 mb-4">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center",
                stat.color === 'blue' ? "bg-primary/5 text-primary" : stat.color === 'red' ? "bg-red-50 text-red-600" : "bg-bg-light text-text-muted"
              )}>
                <stat.icon className="w-5 h-5" />
              </div>
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest leading-none">{stat.label}</p>
            </div>
            <h3 className="text-3xl font-black text-primary tracking-tighter">{stat.value}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-8 border-b border-gray-100 bg-bg-light/30 flex items-center justify-between">
            <h3 className="text-lg font-bold text-primary flex items-center gap-2 tracking-tight">
              <ShieldAlert className="w-6 h-6 text-accent" />
              Urgent Facilities Requirements
            </h3>
            <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-[10px] font-black uppercase tracking-widest">High Priority</span>
          </div>
          <div className="p-0 divide-y divide-gray-50 flex-1">
            {bookings.length > 0 ? bookings.map(b => (
              <div key={b.id} className="p-6 hover:bg-bg-light transition-colors flex items-start justify-between group">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-text-main">{b.eventTitle}</p>
                    <ArrowUpRight className="w-4 h-4 text-text-muted group-hover:text-primary transition-colors" />
                  </div>
                  <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-text-muted">
                    <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {b.slot?.split(' ')[0]}</span>
                    <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {b.roomID || 'TBD'}</span>
                  </div>
                </div>
                <button className="text-[10px] font-black uppercase tracking-widest text-primary hover:text-accent px-4 py-2 bg-primary/5 rounded-xl border border-primary/10 transition-colors">Dispatch Team</button>
              </div>
            )) : (
              <div className="p-16 text-center text-text-muted font-bold tracking-tight opacity-50">No urgent operational signals for today.</div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 space-y-8">
          <h3 className="text-lg font-bold text-primary flex items-center gap-2 tracking-tight">
            <Truck className="w-6 h-6 text-accent" />
            Logistics Flow Schedule
          </h3>
          <div className="space-y-8">
            {[
              { time: '09:00 AM', event: 'Lab Equipment Delivery', location: 'College of Pharmacy', icon: Truck },
              { time: '11:30 AM', event: 'VIP Delegation Visit', location: 'Main Administration Building', icon: Users },
              { time: '02:00 PM', event: 'Campus Bus Fleet Change', location: 'Main Gate', icon: Clock },
            ].map(item => (
              <div key={item.time} className="flex gap-6 relative group">
                <div className="absolute left-6 top-14 bottom-[-32px] w-px bg-gray-100 group-last:hidden" />
                <div className="w-12 h-12 bg-bg-light rounded-2xl flex items-center justify-center shrink-0 border border-gray-100 transition-all group-hover:scale-110 group-hover:bg-primary/5 group-hover:ring-2 group-hover:ring-primary/10">
                  <item.icon className="w-6 h-6 text-text-muted group-hover:text-primary transition-colors" />
                </div>
                <div className="space-y-1 pt-0.5">
                  <p className="text-[10px] font-black text-accent tracking-widest uppercase">{item.time}</p>
                  <p className="font-bold text-text-main text-lg leading-none">{item.event}</p>
                  <p className="text-sm text-text-muted font-medium italic opacity-80">{item.location}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <p className="text-center text-[10px] text-text-muted font-bold uppercase tracking-widest pt-10 border-t border-gray-50 opacity-40">
        Internal Report | System Optimized | Generated at 07:00 AM
      </p>
    </div>
  );
}

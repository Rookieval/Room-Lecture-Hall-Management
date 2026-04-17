import * as React from 'react';
import { useState, useEffect } from 'react';
import { api } from './api';
import { useAuth, UserRole } from './App';
import { format, addDays, parseISO, isBefore, differenceInHours } from 'date-fns';
import { 
  ClipboardList, 
  Plus, 
  Calendar as CalendarIcon, 
  Users, 
  Clock, 
  CheckCircle2, 
  MapPin, 
  ArrowRight,
  Info,
  Mic,
  Monitor
} from 'lucide-react';
import { cn } from './lib/utils';
import { motion, AnimatePresence } from 'motion/react';

// --- Main Reservations Page ---
export function ReservationsPage() {
  const { profile } = useAuth();
  const [view, setView] = useState<'list' | 'new'>('list');
  const [bookings, setBookings] = useState<any[]>([]);

  const loadBookings = async () => {
    if (!profile) return;
    const activeRole = profile.effectiveRole || profile.role;
    let data;
    if (activeRole === 'Admin' || activeRole === 'BranchManager') {
      data = await api.getBookings();
    } else {
      data = await api.getBookings({ userID: profile.employeeID });
    }
    setBookings(data);
  };

  useEffect(() => { loadBookings(); }, [profile, view]);

  const handleCreated = () => { setView('list'); loadBookings(); };

  const statusMap: Record<string, { label: string, color: string }> = {
    'Pending': { label: 'Under Review', color: 'orange' },
    'AdminApproved': { label: 'Escalated to BM', color: 'blue' },
    'FinalApproved': { label: 'Confirmed', color: 'emerald' },
    'Rejected': { label: 'Declined', color: 'red' },
  };

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-primary tracking-tight">Space Reservations</h1>
          <p className="text-text-muted mt-2 font-medium italic">Manage and track requesting space allocations.</p>
        </div>
        <div className="flex gap-4">
          <button onClick={() => setView('list')}
            className={cn("px-6 py-3 rounded-2xl text-sm font-bold transition-all", view === 'list' ? "bg-white border border-gray-100 shadow-sm text-primary" : "text-text-muted hover:bg-white/60")}
          >Recent Requests</button>
          <button onClick={() => setView('new')}
            className={cn("px-6 py-3 rounded-2xl text-sm font-bold transition-all flex items-center gap-2", view === 'new' ? "bg-primary text-white shadow-lg shadow-primary/20" : "bg-primary/10 text-primary hover:bg-primary/15")}
          ><Plus className="w-4 h-4" /> New Requisition</button>
        </div>
      </div>

      {view === 'list' ? (
        <div className="space-y-6">
          {bookings.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
              <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-text-muted font-medium">No reservation requests yet. Submit your first one!</p>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-bg-light border-b border-gray-100">
                  <tr>
                    <th className="px-8 py-4 text-[10px] font-bold text-text-muted uppercase tracking-widest">Event</th>
                    <th className="px-8 py-4 text-[10px] font-bold text-text-muted uppercase tracking-widest">Type</th>
                    <th className="px-8 py-4 text-[10px] font-bold text-text-muted uppercase tracking-widest">Date</th>
                    <th className="px-8 py-4 text-[10px] font-bold text-text-muted uppercase tracking-widest">Slot</th>
                    <th className="px-8 py-4 text-[10px] font-bold text-text-muted uppercase tracking-widest">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {bookings.map(b => {
                    const status = statusMap[b.status] || { label: b.status, color: 'gray' };
                    return (
                      <tr key={b.id} className="hover:bg-bg-light/50 transition-colors">
                        <td className="px-8 py-5">
                          <p className="text-sm font-bold text-text-main">{b.eventTitle}</p>
                          <p className="text-xs text-text-muted">by {b.userName}</p>
                        </td>
                        <td className="px-8 py-5">
                          <span className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                            b.type === 'Lecture Room' ? "bg-fixed-blue/10 text-fixed-blue border-fixed-blue/20" : "bg-multi-green/10 text-multi-green border-multi-green/20"
                          )}>{b.type}</span>
                        </td>
                        <td className="px-8 py-5 text-sm font-mono text-text-muted">{b.date}</td>
                        <td className="px-8 py-5 text-sm text-text-muted">{b.slot}</td>
                        <td className="px-8 py-5">
                          <span className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                            `bg-${status.color}-50 text-${status.color}-700`
                          )}>{status.label}</span>
                          {b.rejectionSuggestion && b.status === 'Rejected' && (
                            <p className="text-xs text-red-500 mt-1">{b.rejectionSuggestion}</p>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <NewReservationForm onSuccess={handleCreated} />
      )}
    </div>
  );
}

// --- New Reservation Form ---
function NewReservationForm({ onSuccess }: { onSuccess: () => void }) {
  const { profile } = useAuth();
  const defaultType = profile?.role === 'Secretary' ? 'Multi-Purpose' : 'Lecture Room';
  const [formData, setFormData] = useState({
    eventTitle: '',
    expectedAttendance: 40,
    type: defaultType as 'Lecture Room' | 'Multi-Purpose',
    date: format(addDays(new Date(), 2), 'yyyy-MM-dd'),
    slot: 'Slot 1 (08:30 - 10:30)',
    justification: '',
    needs: { microphones: 0, laptops: false, videoConf: false }
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Time-gate logic
  useEffect(() => {
    const minDays = profile?.role === 'Secretary' ? 2 : 1;
    const minDate = format(addDays(new Date(), minDays), 'yyyy-MM-dd');
    if (isBefore(parseISO(formData.date), parseISO(minDate))) {
      setFormData(prev => ({ ...prev, date: minDate }));
    }
  }, [profile, formData.type]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!profile) return;

    const eventTime = parseISO(formData.date);
    const now = new Date();
    const diffHours = differenceInHours(eventTime, now);
    const requiredHours = profile.role === 'Secretary' ? 48 : 24;

    if (diffHours < requiredHours) {
      setError(`Your role (${profile.role}) requires booking at least ${requiredHours} hours in advance.`);
      return;
    }

    setLoading(true);
    try {
      await api.createBooking({
        ...formData,
        userID: profile.employeeID,
        userName: profile.name,
        status: 'Pending',
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
      <div className="lg:col-span-2 space-y-8">
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="bg-primary p-10 text-white relative h-64 flex flex-col justify-end">
            <div className="absolute top-10 right-10 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest">
              <Info className="w-4 h-4" /> Blind Booking Mode
            </div>
            <h2 className="text-4xl font-extrabold tracking-tight">Request a Space</h2>
            <p className="text-white/70 mt-2 font-medium">Submit your requirements and we will allocate the best environment.</p>
          </div>

          <div className="p-10 space-y-8">
            {error && (
              <div className="p-4 bg-red-50 text-red-700 rounded-xl flex items-center gap-3 text-xs font-bold border border-red-100">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest flex items-center gap-2">
                  <ClipboardList className="w-3 h-3 text-accent" /> Event Title
                </label>
                <input required type="text" placeholder="e.g. Q3 Departmental Review"
                  value={formData.eventTitle} onChange={(e) => setFormData({ ...formData, eventTitle: e.target.value })}
                  className="w-full px-4 py-3 bg-bg-light border border-gray-100 rounded-xl focus:ring-2 focus:ring-primary/10 outline-none transition-all text-sm font-medium"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest flex items-center gap-2">
                  <Users className="w-3 h-3 text-accent" /> Expected Attendance
                </label>
                <input required type="number" placeholder="Enter capacity"
                  value={formData.expectedAttendance} onChange={(e) => setFormData({ ...formData, expectedAttendance: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 bg-bg-light border border-gray-100 rounded-xl focus:ring-2 focus:ring-primary/10 outline-none transition-all text-sm font-medium"
                />
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Environment Profile</label>
              {profile?.role === 'Secretary' ? (
                <div className="p-6 rounded-2xl border border-primary bg-primary/5 ring-1 ring-primary text-left relative overflow-hidden">
                  <Plus className="w-6 h-6 mb-4 text-primary" />
                  <p className="text-sm font-bold text-text-main">Multi-Purpose Space</p>
                  <p className="text-[10px] text-text-muted mt-1 font-medium">Secretaries are restricted to Multi-Purpose room bookings only.</p>
                  <div className="absolute top-4 right-4 text-primary"><CheckCircle2 className="w-4 h-4" /></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { id: 'Lecture Room', label: 'Lecture Environment', desc: 'Tiered seating, primary focus on instruction.', icon: CalendarIcon },
                    { id: 'Multi-Purpose', label: 'Multi-Purpose Space', desc: 'Flexible configuration, for workshops.', icon: Plus },
                  ].map((env) => (
                    <button key={env.id} type="button"
                      onClick={() => setFormData({ ...formData, type: env.id as any })}
                      className={cn("p-6 rounded-2xl border text-left transition-all relative overflow-hidden group",
                        formData.type === env.id ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-gray-100 hover:border-primary/10"
                      )}
                    >
                      <env.icon className={cn("w-6 h-6 mb-4", formData.type === env.id ? "text-primary" : "text-text-muted")} />
                      <p className="text-sm font-bold text-text-main">{env.label}</p>
                      <p className="text-[10px] text-text-muted mt-1 font-medium">{env.desc}</p>
                      {formData.type === env.id && (<div className="absolute top-4 right-4 text-primary"><CheckCircle2 className="w-4 h-4" /></div>)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {formData.type === 'Multi-Purpose' && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                className="bg-bg-light p-8 rounded-2xl border border-gray-100 space-y-6"
              >
                <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Multi-Purpose Requirements</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100">
                    <Mic className="w-5 h-5 text-accent" />
                    <div className="flex-1">
                      <p className="text-xs font-bold text-text-main">Microphones</p>
                      <input type="number" min={0} value={formData.needs.microphones}
                        onChange={(e) => setFormData({ ...formData, needs: { ...formData.needs, microphones: parseInt(e.target.value) || 0 } })}
                        className="w-full bg-transparent text-sm outline-none text-primary font-bold"
                      />
                    </div>
                  </div>
                  <label className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100 cursor-pointer">
                    <input type="checkbox" checked={formData.needs.laptops}
                      onChange={(e) => setFormData({ ...formData, needs: { ...formData.needs, laptops: e.target.checked } })}
                      className="w-4 h-4 text-primary rounded"
                    />
                    <Monitor className="w-5 h-5 text-accent" />
                    <span className="text-xs font-bold text-text-main">Portable Displays</span>
                  </label>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Justification</label>
                  <textarea rows={3} placeholder="Reason for multi-purpose room..."
                    value={formData.justification} onChange={(e) => setFormData({ ...formData, justification: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-primary/10 outline-none resize-none"
                  />
                </div>
              </motion.div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest flex items-center gap-2">
                  <CalendarIcon className="w-3 h-3 text-accent" /> Preferred Date
                </label>
                <input required type="date" value={formData.date}
                  min={format(addDays(new Date(), profile?.role === 'Secretary' ? 2 : 1), 'yyyy-MM-dd')}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-4 py-3 bg-bg-light border border-gray-100 rounded-xl focus:ring-2 focus:ring-primary/10 outline-none text-sm font-medium"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest flex items-center gap-2">
                  <Clock className="w-3 h-3 text-accent" /> Time Slot
                </label>
                <select value={formData.slot} onChange={(e) => setFormData({ ...formData, slot: e.target.value })}
                  className="w-full px-4 py-3 bg-bg-light border border-gray-100 rounded-xl focus:ring-2 focus:ring-primary/10 outline-none text-sm font-medium"
                >
                  <option>Slot 1 (08:30 - 10:30)</option>
                  <option>Slot 2 (10:45 - 12:45)</option>
                  <option>Slot 3 (13:45 - 15:45)</option>
                  <option>Slot 4 (16:00 - 18:00)</option>
                </select>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full bg-primary text-white py-4 rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-primary/95 transition-all active:scale-[0.98] shadow-xl shadow-primary/20 disabled:opacity-50"
            >
              {loading ? 'Submitting...' : 'Submit Requisition'}
            </button>
          </div>
        </form>
      </div>

      <div className="space-y-6">
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm sticky top-8 space-y-8">
          <h3 className="text-lg font-bold text-primary tracking-tight">Booking Guidelines</h3>
          <div className="space-y-6">
            {[
              { icon: Clock, label: 'Time gate enforced', desc: profile?.role === 'Secretary' ? '48h minimum advance' : '24h minimum advance' },
              { icon: MapPin, label: 'Blind allocation', desc: 'Room assigned by Admin post-approval' },
              { icon: CheckCircle2, label: 'Approval workflow', desc: 'Lecture: Admin → Done. Multi-Purpose: Admin → BM.' },
            ].map(g => (
              <div key={g.label} className="flex gap-4 group">
                <div className="w-10 h-10 bg-primary/5 rounded-xl flex items-center justify-center shrink-0 border border-primary/10 group-hover:bg-primary/10 transition-colors">
                  <g.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-bold text-text-main leading-tight">{g.label}</p>
                  <p className="text-xs text-text-muted mt-0.5">{g.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

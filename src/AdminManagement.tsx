import * as React from 'react';
import { useState, useEffect } from 'react';
import { api } from './api';
import { useAuth } from './App';
import { 
  Users, CheckCircle2, XCircle, ShieldCheck, Calendar, Clock, MapPin, 
  ClipboardCheck, ArrowRight, BarChart3, AlertCircle, Building
} from 'lucide-react';
import { cn } from './lib/utils';
import { motion, AnimatePresence } from 'motion/react';

// --- Users Management ---
export function UsersManagement() {
  const [users, setUsers] = useState<any[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending'>('all');

  const loadUsers = async () => {
    const data = await api.getUsers();
    setUsers(filter === 'pending' ? data.filter((u: any) => !u.isApproved) : data);
  };

  useEffect(() => { loadUsers(); }, [filter]);

  const toggleApproval = async (id: string, status: boolean) => {
    await api.approveUser(id, status);
    loadUsers();
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary tracking-tight">User Directory</h1>
          <p className="text-text-muted mt-1 font-medium">Manage faculty access and approval status.</p>
        </div>
        <div className="flex bg-white p-1 rounded-2xl border border-gray-100 shadow-sm">
          <button onClick={() => setFilter('all')}
            className={cn("px-4 py-2 rounded-xl text-sm font-bold transition-all", filter === 'all' ? "bg-bg-light text-primary" : "text-text-muted hover:bg-gray-50")}
          >All Users</button>
          <button onClick={() => setFilter('pending')}
            className={cn("px-4 py-2 rounded-xl text-sm font-bold transition-all", filter === 'pending' ? "bg-accent text-white shadow-lg" : "text-text-muted hover:bg-gray-50")}
          >Pending Approval</button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-bg-light border-b border-gray-100">
            <tr>
              <th className="px-8 py-4 text-[10px] font-bold text-text-muted uppercase tracking-widest">User Profile</th>
              <th className="px-8 py-4 text-[10px] font-bold text-text-muted uppercase tracking-widest">Employee ID</th>
              <th className="px-8 py-4 text-[10px] font-bold text-text-muted uppercase tracking-widest">Role</th>
              <th className="px-8 py-4 text-[10px] font-bold text-text-muted uppercase tracking-widest">Access Status</th>
              <th className="px-8 py-4 text-[10px] font-bold text-text-muted uppercase tracking-widest text-right">Operations</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-bg-light/50 transition-colors">
                <td className="px-8 py-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/5 rounded-full flex items-center justify-center text-primary font-bold border border-primary/10">
                      {user.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-text-main">{user.name}</p>
                      <p className="text-xs text-text-muted">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-5 text-sm font-mono text-text-muted">{user.employeeID}</td>
                <td className="px-8 py-5">
                  <span className="px-3 py-1 bg-bg-light text-text-main rounded-lg text-[10px] font-black uppercase tracking-widest border border-gray-100">
                    {user.role}
                  </span>
                </td>
                <td className="px-8 py-5">
                  <div className={cn(
                    "inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                    user.isApproved ? "bg-emerald-50 text-emerald-700" : "bg-orange-50 text-orange-700"
                  )}>
                    <div className={cn("w-1.5 h-1.5 rounded-full", user.isApproved ? "bg-emerald-500" : "bg-orange-500 animate-pulse")} />
                    {user.isApproved ? 'Authorized' : 'Restricted'}
                  </div>
                </td>
                <td className="px-8 py-5 text-right">
                  {!user.isApproved ? (
                    <button onClick={() => toggleApproval(user.id, true)}
                      className="px-4 py-2 bg-primary text-white rounded-lg text-xs font-bold hover:bg-primary/90 transition-shadow shadow-sm active:scale-95"
                    >Authorize</button>
                  ) : (
                    <button onClick={() => toggleApproval(user.id, false)}
                      className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg text-xs font-bold transition-colors"
                    >Suspend</button>
                  )}
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan={5} className="px-8 py-12 text-center text-text-muted font-medium">No users found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --- Approvals Queue ---
export function ApprovalsQueue() {
  const { profile } = useAuth();
  const [bookings, setBookings] = useState<any[]>([]);
  const [rejectionNote, setRejectionNote] = useState('');
  const [alternativeRoom, setAlternativeRoom] = useState('');
  const [alternativeSlot, setAlternativeSlot] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<string | null>(null);
  const [roomAssignModal, setRoomAssignModal] = useState<any | null>(null);
  const [availableRooms, setAvailableRooms] = useState<any[]>([]);
  const [selectedRoom, setSelectedRoom] = useState('');
  const [error, setError] = useState('');
  const [allRooms, setAllRooms] = useState<any[]>([]);
  const [slots, setSlots] = useState<any[]>([]);

  const loadBookings = async () => {
    if (!profile) return;
    const activeRole = profile.effectiveRole || profile.role;
    let data;
    if (activeRole === 'Admin') {
      data = await api.getBookings({ status: 'Pending' });
    } else if (activeRole === 'BranchManager') {
      data = await api.getBookings({ status: 'AdminApproved' });
    } else {
      data = [];
    }
    setBookings(data);
    
    const rooms = await api.getRooms();
    setAllRooms(rooms);
    
    try {
      const settings = await api.getSettings();
      setSlots(settings.slots || []);
    } catch {}
  };

  useEffect(() => { loadBookings(); }, [profile]);

  // Admin escalates to BM
  const handleEscalate = async (booking: any) => {
    if (!profile) return;
    setError('');
    try {
      await api.updateBooking(booking.id, { status: 'AdminApproved', lastModifiedBy: profile.employeeID });
      loadBookings();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // BM approves with room assignment - opens modal
  const handleApproveClick = async (booking: any) => {
    if (!profile) return;
    const activeRole = profile.effectiveRole || profile.role;
    
    if (activeRole === 'BranchManager') {
      // Load available rooms for this booking's date+slot
      try {
        const rooms = await api.getAvailableRooms(booking.date, booking.slot, booking.type);
        setAvailableRooms(rooms);
        setRoomAssignModal(booking);
        setSelectedRoom('');
        setError('');
      } catch (err: any) {
        setError(err.message);
      }
    }
  };

  // BM confirms approval with room assignment
  const handleConfirmApproval = async () => {
    if (!roomAssignModal || !selectedRoom || !profile) return;
    setError('');
    try {
      await api.updateBooking(roomAssignModal.id, { 
        status: 'FinalApproved', 
        assignedRoom: selectedRoom,
        lastModifiedBy: profile.employeeID 
      });
      setRoomAssignModal(null);
      setSelectedRoom('');
      loadBookings();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Reject with reason + alternative suggestion
  const handleReject = async (booking: any) => {
    if (!profile) return;
    setError('');
    try {
      await api.updateBooking(booking.id, { 
        status: 'Rejected', 
        rejectionSuggestion: rejectionNote,
        suggestedAlternativeRoom: alternativeRoom || undefined,
        suggestedAlternativeSlot: alternativeSlot || undefined,
        lastModifiedBy: profile.employeeID 
      });
      setSelectedBooking(null);
      setRejectionNote('');
      setAlternativeRoom('');
      setAlternativeSlot('');
      loadBookings();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const activeRole = profile?.effectiveRole || profile?.role;

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-primary tracking-tight">Approval Command Center</h1>
          <p className="text-text-muted mt-1 font-medium italic">
            {activeRole === 'Admin' 
              ? 'Review requests and escalate to Branch Manager for final decision.'
              : 'Review escalated requests, assign rooms, and make final decisions.'}
          </p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center gap-6 shadow-sm">
          <div className="text-center px-4">
            <p className="text-[10px] font-black text-text-muted uppercase tracking-widest leading-none mb-1">
              {activeRole === 'Admin' ? 'Pending' : 'Awaiting Decision'}
            </p>
            <p className="text-xl font-black text-accent">{bookings.length}</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-xl flex items-center gap-3 text-sm font-bold border border-red-100">
          <AlertCircle className="w-5 h-5 shrink-0" /> {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-6">
          {bookings.map((booking) => (
            <div key={booking.id} className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm relative group overflow-hidden">
              <div className={cn("absolute top-0 left-0 w-1.5 h-full", 
                booking.status === 'Pending' ? "bg-accent" : "bg-primary"
              )} />
              
              <div className="space-y-4 flex-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                    booking.status === 'Pending' 
                      ? "bg-accent/10 text-accent border-accent/20"
                      : "bg-primary/5 text-primary border-primary/10"
                  )}>
                    {booking.status === 'Pending' ? 'Awaiting Admin Escalation' : 'Awaiting BM Decision'}
                  </span>
                  <span className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                    booking.type === 'Lecture Room' 
                      ? "bg-fixed-blue/10 text-fixed-blue border-fixed-blue/20" 
                      : "bg-multi-green/10 text-multi-green border-multi-green/20"
                  )}>
                    {booking.type}
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-primary tracking-tight">{booking.eventTitle}</h2>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Applicant</p>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-[10px] font-bold uppercase">
                        {booking.userName?.charAt(0) || '?'}
                      </div>
                      <p className="text-sm font-bold text-text-main">{booking.userName}</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Schedule</p>
                    <div className="flex items-center gap-2 text-sm text-text-main font-bold">
                      <Calendar className="w-4 h-4 text-accent" /> {booking.date}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Attendance</p>
                    <p className="text-sm font-bold text-text-main">{booking.expectedAttendance} ppl</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Time Slot</p>
                    <p className="text-sm font-bold text-text-main truncate">{booking.slot}</p>
                  </div>
                </div>

                {booking.justification && (
                  <div className="p-4 bg-bg-light rounded-xl border border-gray-100 mt-2">
                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">Justification</p>
                    <p className="text-sm text-text-main">{booking.justification}</p>
                  </div>
                )}
              </div>

              <div className="mt-8 pt-8 border-t border-gray-50 flex items-center justify-between">
                <button onClick={() => { setSelectedBooking(booking.id); setRejectionNote(''); setAlternativeRoom(''); setAlternativeSlot(''); }}
                  className="px-4 py-2.5 border border-red-100 text-red-600 rounded-xl text-xs font-bold hover:bg-red-50 transition-colors"
                >Reject</button>
                
                {activeRole === 'Admin' ? (
                  <button onClick={() => handleEscalate(booking)}
                    className="px-8 py-2.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/95 transition-all shadow-lg shadow-primary/10 active:scale-95 flex items-center gap-2"
                  >
                    <ClipboardCheck className="w-4 h-4" /> Escalate to Branch Manager
                  </button>
                ) : (
                  <button onClick={() => handleApproveClick(booking)}
                    className="px-8 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/10 active:scale-95 flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Approve & Assign Room
                  </button>
                )}
              </div>

              {/* Smart Rejection Panel */}
              <AnimatePresence>
                {selectedBooking === booking.id && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="mt-6 p-6 bg-red-50 rounded-2xl border border-red-100 space-y-4 overflow-hidden"
                  >
                    <p className="text-sm font-bold text-red-800">Rejection with Smart Alternative Suggestion</p>
                    <textarea value={rejectionNote} onChange={(e) => setRejectionNote(e.target.value)}
                      placeholder="Reason for rejection..."
                      className="w-full p-4 bg-white border border-red-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 outline-none resize-none shadow-inner"
                      rows={2}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-red-700 uppercase tracking-widest">Suggest Alternative Room</label>
                        <select value={alternativeRoom} onChange={(e) => setAlternativeRoom(e.target.value)}
                          className="w-full p-3 bg-white border border-red-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 outline-none"
                        >
                          <option value="">— No suggestion —</option>
                          {allRooms.map(r => <option key={r.roomID} value={r.roomID}>{r.name} ({r.roomID})</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-red-700 uppercase tracking-widest">Suggest Alternative Slot</label>
                        <select value={alternativeSlot} onChange={(e) => setAlternativeSlot(e.target.value)}
                          className="w-full p-3 bg-white border border-red-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 outline-none"
                        >
                          <option value="">— No suggestion —</option>
                          {slots.map(s => <option key={s.id} value={`${s.label} (${s.start} - ${s.end})`}>{s.label} ({s.start} - {s.end})</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="flex justify-end gap-3">
                      <button onClick={() => setSelectedBooking(null)} className="px-4 py-2 text-gray-500 font-bold text-xs uppercase tracking-widest">Cancel</button>
                      <button onClick={() => handleReject(booking)} className="px-6 py-2 bg-red-600 text-white rounded-lg font-bold text-xs uppercase tracking-widest shadow-md">Confirm Rejection</button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}

          {bookings.length === 0 && (
            <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
              <CheckCircle2 className="w-12 h-12 text-emerald-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium tracking-tight">Queue is clear. No requests pending.</p>
            </div>
          )}
        </div>

        <div className="space-y-8">
          <div className="bg-primary/95 border border-primary/10 p-8 rounded-3xl text-white space-y-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold tracking-tight">Snapshot</h3>
              <BarChart3 className="w-6 h-6 text-accent" />
            </div>
            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest">In Queue</p>
                <p className="text-3xl font-black">{bookings.length}</p>
              </div>
            </div>
            <div className="pt-6 border-t border-white/10 space-y-3">
              <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Workflow</p>
              <div className="space-y-2 text-sm text-white/70">
                <p>1. Employee/Secretary submits request</p>
                <p>2. Admin reviews → escalates to BM</p>
                <p>3. BM assigns room & approves/rejects</p>
                <p>4. Requester is notified</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Room Assignment Modal (BM only) */}
      <AnimatePresence>
        {roomAssignModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="bg-emerald-600 p-8 text-white">
                <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mb-4 border border-white/20">
                  <Building className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight">Assign Room & Approve</h2>
                <p className="text-white/70 text-sm mt-1">
                  Select a room for "{roomAssignModal.eventTitle}" on {roomAssignModal.date}
                </p>
              </div>
              <div className="p-8 space-y-6">
                {error && (
                  <div className="p-4 bg-red-50 text-red-700 rounded-xl flex items-center gap-3 text-xs font-bold border border-red-100">
                    <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                  </div>
                )}
                
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Available Rooms (No Conflicts)</label>
                  {availableRooms.length === 0 ? (
                    <p className="text-sm text-red-600 font-bold p-4 bg-red-50 rounded-xl border border-red-100">
                      ⚠️ No rooms available for this date and time slot! All rooms are booked.
                    </p>
                  ) : (
                    <div className="space-y-2 mt-2">
                      {availableRooms.map(room => (
                        <button key={room.roomID} type="button"
                          onClick={() => setSelectedRoom(room.roomID)}
                          className={cn("w-full p-4 rounded-xl border text-left transition-all flex items-center justify-between",
                            selectedRoom === room.roomID 
                              ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500" 
                              : "border-gray-100 hover:border-emerald-200"
                          )}
                        >
                          <div>
                            <p className="text-sm font-bold text-text-main">{room.name}</p>
                            <p className="text-xs text-text-muted">{room.roomID} · {room.location} · Cap: {room.capacity}</p>
                          </div>
                          {selectedRoom === room.roomID && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-4 flex gap-4">
                  <button onClick={handleConfirmApproval} disabled={!selectedRoom}
                    className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >Confirm Approval</button>
                  <button onClick={() => { setRoomAssignModal(null); setError(''); }}
                    className="px-6 py-3 bg-bg-light text-text-muted rounded-xl font-bold border border-gray-100"
                  >Cancel</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

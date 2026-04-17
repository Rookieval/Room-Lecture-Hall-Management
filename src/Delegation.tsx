import * as React from 'react';
import { useState, useEffect } from 'react';
import { api } from './api';
import { useAuth } from './App';
import { 
  UserCog, 
  ShieldCheck, 
  Plus,
  X,
  Calendar,
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import { cn } from './lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';

interface Delegation {
  id: string;
  delegateEmployeeID: string;
  delegateName: string;
  startDate: string;
  endDate: string;
  grantedBy: string;
  active: boolean;
}

interface UserOption {
  id: string;
  employeeID: string;
  name: string;
  role: string;
}

export function DelegationPage() {
  const { profile } = useAuth();
  const [delegations, setDelegations] = useState<Delegation[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<UserOption[]>([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    const [dels, users] = await Promise.all([api.getDelegations(), api.getUsers()]);
    setDelegations(dels);
    setAvailableUsers(users.filter((u: any) => u.isApproved && u.role === 'Employee'));
  };

  useEffect(() => { loadData(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!selectedUser || !endDate) { setError('Please select a user and set an end date.'); return; }
    if (endDate < startDate) { setError('End date must be after start date.'); return; }

    setLoading(true);
    try {
      const user = availableUsers.find(u => u.id === selectedUser);
      if (!user) throw new Error('User not found');

      await api.createDelegation({
        delegateUID: user.id,
        delegateEmployeeID: user.employeeID,
        delegateName: user.name,
        startDate,
        endDate,
        grantedBy: profile?.employeeID || 'Admin',
      });

      setShowModal(false);
      setSelectedUser('');
      setEndDate('');
      loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (delegationId: string) => {
    await api.revokeDelegation(delegationId);
    loadData();
  };

  const today = format(new Date(), 'yyyy-MM-dd');

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-primary tracking-tight">Delegation Management</h1>
          <p className="text-text-muted mt-2 font-medium">Assign temporary admin access to approved employees during leave periods.</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-6 py-3.5 bg-primary text-white rounded-2xl font-bold transition-all hover:bg-primary/95 hover:shadow-xl shadow-primary/10 active:scale-95 text-sm"
        ><Plus className="w-5 h-5" /><span>New Delegation</span></button>
      </div>

      {/* Active Delegations */}
      <div className="space-y-6">
        <h2 className="text-lg font-bold text-primary tracking-tight">Active Delegations</h2>
        {delegations.filter(d => d.active).length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-gray-200">
            <UserCog className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-text-muted font-medium">No active delegations. Assign one to grant temporary admin access.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {delegations.filter(d => d.active).map((d) => {
              const isExpired = d.endDate < today;
              const isActive = d.startDate <= today && d.endDate >= today && !isExpired;
              return (
                <motion.div layout key={d.id}
                  className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group"
                >
                  <div className={cn("absolute top-0 left-0 w-1.5 h-full",
                    isActive ? "bg-emerald-500" : isExpired ? "bg-orange-400" : "bg-primary"
                  )} />
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                        isActive ? "bg-emerald-50 text-emerald-700 border-emerald-100" : 
                        isExpired ? "bg-orange-50 text-orange-700 border-orange-100" : 
                        "bg-primary/5 text-primary border-primary/10"
                      )}>
                        {isActive ? 'Active Now' : isExpired ? 'Expired' : 'Scheduled'}
                      </span>
                      <ShieldCheck className="w-5 h-5 text-text-muted" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-primary tracking-tight">{d.delegateName}</h3>
                      <p className="text-[10px] font-black text-accent mt-1 uppercase tracking-widest">ID: {d.delegateEmployeeID}</p>
                    </div>
                    <div className="flex items-center gap-4 text-text-muted">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span className="text-xs font-bold">{d.startDate}</span>
                      </div>
                      <ArrowRight className="w-3 h-3" />
                      <span className="text-xs font-bold">{d.endDate}</span>
                    </div>
                    <div className="text-[10px] font-black text-text-muted uppercase tracking-widest">Granted by: {d.grantedBy}</div>
                  </div>
                  <div className="mt-6 pt-6 border-t border-gray-50 flex items-center justify-between">
                    <span className="text-[9px] font-black text-text-muted uppercase tracking-widest opacity-50">Temporary Admin Access</span>
                    <button onClick={() => handleRevoke(d.id)}
                      className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg text-xs font-bold transition-colors"
                    >Revoke</button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* History */}
      {delegations.filter(d => !d.active).length > 0 && (
        <div className="space-y-6">
          <h2 className="text-lg font-bold text-text-muted tracking-tight">Delegation History</h2>
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-bg-light border-b border-gray-100">
                <tr>
                  <th className="px-8 py-4 text-[10px] font-bold text-text-muted uppercase tracking-widest">Delegate</th>
                  <th className="px-8 py-4 text-[10px] font-bold text-text-muted uppercase tracking-widest">Period</th>
                  <th className="px-8 py-4 text-[10px] font-bold text-text-muted uppercase tracking-widest">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {delegations.filter(d => !d.active).map((d) => (
                  <tr key={d.id} className="hover:bg-bg-light/50 transition-colors">
                    <td className="px-8 py-4">
                      <p className="text-sm font-bold text-text-main">{d.delegateName}</p>
                      <p className="text-xs text-text-muted">ID: {d.delegateEmployeeID}</p>
                    </td>
                    <td className="px-8 py-4 text-sm font-mono text-text-muted">{d.startDate} → {d.endDate}</td>
                    <td className="px-8 py-4">
                      <span className="px-3 py-1 bg-gray-50 text-gray-500 rounded-full text-[10px] font-black uppercase tracking-widest">Revoked</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="bg-primary p-8 text-white relative">
                <button onClick={() => setShowModal(false)} className="absolute top-8 right-8 text-white/60 hover:text-white transition-colors">
                  <X className="w-6 h-6" />
                </button>
                <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mb-4 backdrop-blur-md border border-white/20">
                  <UserCog className="w-6 h-6 text-accent" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight">New Delegation</h2>
                <p className="text-white/60 text-sm mt-1">Appoint a substitute with temporary admin access.</p>
              </div>
              <form onSubmit={handleCreate} className="p-8 space-y-6">
                {error && (
                  <div className="p-4 bg-red-50 text-red-700 rounded-xl flex items-center gap-3 text-xs font-bold border border-red-100">
                    <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                  </div>
                )}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Select Employee</label>
                  <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)} required
                    className="w-full p-3 bg-bg-light border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/5 outline-none"
                  >
                    <option value="">— Choose an approved employee —</option>
                    {availableUsers.map(u => (
                      <option key={u.id} value={u.id}>{u.name} (ID: {u.employeeID})</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Start Date</label>
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required
                      className="w-full p-3 bg-bg-light border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/5 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">End Date</label>
                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required
                      className="w-full p-3 bg-bg-light border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/5 outline-none"
                    />
                  </div>
                </div>
                <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
                  <p className="text-[11px] text-text-muted font-medium leading-relaxed">
                    <strong className="text-primary">Note:</strong> The delegate will inherit full Admin permissions during the specified period. 
                    Access is automatically revoked after the end date, or you can revoke it manually at any time.
                  </p>
                </div>
                <div className="pt-4 flex gap-4">
                  <button type="submit" disabled={loading}
                    className="flex-1 py-3 bg-primary text-white rounded-xl font-bold tracking-wide hover:bg-primary/95 transition-all shadow-lg shadow-primary/10 active:scale-95 disabled:opacity-50"
                  >{loading ? 'Creating...' : 'Establish Delegation'}</button>
                  <button type="button" onClick={() => setShowModal(false)}
                    className="px-6 py-3 bg-bg-light text-text-muted rounded-xl font-bold transition-colors border border-gray-100"
                  >Discard</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

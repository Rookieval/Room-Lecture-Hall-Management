/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from 'react';
import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { api } from './api';
import { ReservationsPage } from './Reservations';
import { UsersManagement, ApprovalsQueue } from './AdminManagement';
import { MorningReportPage } from './MorningReport';
import { AuditLogPage } from './AuditLog';
import { RoomsPage } from './RoomsInventory';
import { DelegationPage } from './Delegation';
import { SettingsPage } from './Settings';
import { RoomSearchPage } from './RoomSearch';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  Users, 
  LogOut, 
  ClipboardList,
  BarChart3,
  Plus,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  FileText,
  ArrowRight,
  UserCog,
  Bell,
  Settings as SettingsIcon,
  Search
} from 'lucide-react';
import { cn } from './lib/utils';

// --- Types ---
export type UserRole = 'Admin' | 'BranchManager' | 'Employee' | 'Secretary';

export interface UserProfile {
  id: string;
  employeeID: string;
  name: string;
  role: UserRole;
  isApproved: boolean;
  email: string;
  effectiveRole?: UserRole;
}

interface AuthContextType {
  user: UserProfile | null;
  profile: UserProfile | null;
  loading: boolean;
  login: (employeeID: string, password: string) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

// --- Context ---
const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

// --- Auth Provider ---
function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount, restore session from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('aastmt_user');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setUser(parsed);
      } catch {
        localStorage.removeItem('aastmt_user');
      }
    }
    setLoading(false);
  }, []);

  // Check delegation status
  useEffect(() => {
    if (!user) return;
    const checkDelegation = async () => {
      try {
        const delegations = await api.getDelegations();
        const today = new Date().toISOString().split('T')[0];
        const activeDelegation = delegations.find((d: any) => 
          d.delegateEmployeeID === user.employeeID && d.active && d.startDate <= today && d.endDate >= today
        );
        if (activeDelegation) {
          setUser(prev => prev ? { ...prev, effectiveRole: 'Admin' } : prev);
        } else {
          setUser(prev => prev ? { ...prev, effectiveRole: prev.role } : prev);
        }
      } catch {}
    };
    checkDelegation();
  }, [user?.id]);

  const login = async (employeeID: string, password: string) => {
    const profile = await api.login(employeeID, password);
    const userData = { ...profile, effectiveRole: profile.role };
    setUser(userData);
    localStorage.setItem('aastmt_user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('aastmt_user');
  };

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    try {
      const fresh = await api.getUser(user.id);
      const updated = { ...fresh, effectiveRole: user.effectiveRole || fresh.role };
      setUser(updated);
      localStorage.setItem('aastmt_user', JSON.stringify(updated));
    } catch {}
  }, [user]);

  const profile = user;

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

// --- Protected Route ---
function ProtectedRoute({ children, requiredRole }: { children: React.ReactNode, requiredRole?: UserRole[] }) {
  const { user, loading } = useAuth();

  if (loading) return (
    <div className="h-screen w-screen flex items-center justify-center bg-bg-light">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-text-muted font-black uppercase tracking-widest text-[10px]">Verifying identity...</p>
      </div>
    </div>
  );

  if (!user) return <Navigate to="/login" />;

  if (!user.isApproved && (user.effectiveRole || user.role) !== 'Admin') {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-bg-light p-6 text-center">
        <div className="max-w-md bg-white p-10 rounded-[2.5rem] shadow-2xl border border-gray-100 flex flex-col items-center">
          <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center mb-6 border border-primary/10">
            <Clock className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-3xl font-black text-primary tracking-tight">Authorization Pending</h2>
          <p className="text-text-muted mt-4 leading-relaxed font-medium">
            Your identity <span className="text-primary font-bold">({user.employeeID})</span> has been cataloged. 
            An Admin must authorize your credentials before portal access is granted.
          </p>
          <div className="mt-10 w-full pt-8 border-t border-gray-50">
            <button 
              onClick={() => { localStorage.removeItem('aastmt_user'); window.location.href = '/login'; }}
              className="w-full py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-primary/95 transition-all shadow-xl shadow-primary/20"
            >
              Sign Out & Reconnect
            </button>
          </div>
        </div>
      </div>
    );
  }

  const activeRole = user.effectiveRole || user.role;
  if (requiredRole && !requiredRole.includes(activeRole)) {
    return <Navigate to="/dashboard" />;
  }

  return <>{children}</>;
}

// --- Login Page ---
function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [employeeID, setEmployeeID] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('Employee');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (user) navigate('/dashboard');
  }, [user]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await login(employeeID, password);
        navigate('/dashboard');
      } else {
        // Signup
        if (role !== 'Employee' && role !== 'Secretary') {
          throw new Error('You can only sign up as an Employee or Secretary.');
        }
        const emailToUse = email || `${employeeID}@aastmt.edu`;
        await api.signup({ employeeID, name, email: emailToUse, password, role });
        setIsLogin(true);
        setError('Signup successful! Please wait for admin approval before logging in.');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-light flex items-center justify-center p-6 relative overflow-hidden font-sans">
      <div className="absolute top-0 left-0 w-full h-[60%] bg-primary -skew-y-6 -translate-y-1/2" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl relative z-10 p-10 border border-white/20"
      >
        <div className="text-center mb-10">
          <div className="inline-block px-4 py-1.5 bg-primary/5 rounded-full text-[10px] font-black uppercase tracking-widest text-primary mb-4 border border-primary/10">
            Internal Operations
          </div>
          <h1 className="text-3xl font-extrabold text-primary tracking-tight">AASTMT Portal</h1>
          <p className="text-text-muted mt-2 text-sm">{isLogin ? 'Authenticating your credentials...' : 'Initialize a new profile requisition'}</p>
        </div>

        {error && (
          <div className={cn(
            "p-4 rounded-xl mb-6 flex items-center gap-3 text-[11px] font-bold uppercase tracking-wide",
            error.includes('successful') ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-red-50 text-red-700 border border-red-100"
          )}>
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Identity ID</label>
            <input 
              required type="text" placeholder="e.g. 7777"
              value={employeeID} onChange={(e) => setEmployeeID(e.target.value)}
              className="w-full px-5 py-3.5 bg-bg-light border border-gray-100 rounded-xl focus:ring-4 focus:ring-primary/5 focus:border-primary/20 outline-none transition-all text-sm font-bold text-text-main"
            />
          </div>

          {!isLogin && (
            <>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Full Designation</label>
                <input required type="text" placeholder="Official Name"
                  value={name} onChange={(e) => setName(e.target.value)}
                  className="w-full px-5 py-3.5 bg-bg-light border border-gray-100 rounded-xl focus:ring-4 focus:ring-primary/5 focus:border-primary/20 outline-none transition-all text-sm font-bold text-text-main"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Verified Email</label>
                <input required type="email" placeholder="faculty@aastmt.edu"
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-5 py-3.5 bg-bg-light border border-gray-100 rounded-xl focus:ring-4 focus:ring-primary/5 focus:border-primary/20 outline-none transition-all text-sm font-bold text-text-main"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Staff Role</label>
                <select value={role} onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full px-5 py-3.5 bg-bg-light border border-gray-100 rounded-xl focus:ring-4 focus:ring-primary/5 focus:border-primary/20 outline-none transition-all text-sm font-bold text-text-main"
                >
                  <option value="Employee">Faculty Member</option>
                  <option value="Secretary">Unit Secretary</option>
                </select>
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Security Key</label>
            <input required type="password" placeholder="••••••••"
              value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full px-5 py-3.5 bg-bg-light border border-gray-100 rounded-xl focus:ring-4 focus:ring-primary/5 focus:border-primary/20 outline-none transition-all text-sm font-bold text-text-main"
            />
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-4 bg-primary text-white rounded-xl font-bold uppercase tracking-widest text-[11px] transition-all hover:bg-primary/95 shadow-xl shadow-primary/20 active:scale-[0.98] disabled:opacity-50 mt-4"
          >
            {loading ? 'Processing...' : (isLogin ? 'Authenticate' : 'Initiate Signup')}
          </button>
        </form>

        <div className="text-center mt-8 pt-8 border-t border-gray-50">
          <button onClick={() => setIsLogin(!isLogin)}
            className="text-[10px] font-black uppercase tracking-widest text-text-muted hover:text-primary transition-colors"
          >
            {isLogin ? "No account? Sign up here" : "Already registered? Login here"}
          </button>
        </div>

        {isLogin && (
          <div className="mt-8 pt-8 border-t border-gray-100 flex flex-col gap-2">
            <p className="text-xs text-gray-400 text-center font-medium uppercase tracking-widest">Fixed Credentials (Demo)</p>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <button onClick={() => { setEmployeeID('7777'); setPassword('123456'); }}
                className="px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors" type="button"
              >Admin (7777)</button>
              <button onClick={() => { setEmployeeID('8888'); setPassword('123456'); }}
                className="px-3 py-2 bg-slate-50 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-100 transition-colors" type="button"
              >Manager (8888)</button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// --- Layout ---
function Layout({ children }: { children: React.ReactNode }) {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const activeRole = profile?.effectiveRole || profile?.role;

  const navItems = [
    { label: 'Master Calendar', icon: LayoutDashboard, path: '/dashboard', roles: ['Admin', 'BranchManager', 'Employee', 'Secretary'] },
    { label: 'Reservations', icon: ClipboardList, path: '/reservations', roles: ['Admin', 'BranchManager', 'Employee', 'Secretary'] },
    { label: 'Morning Reports', icon: FileText, path: '/morning-report', roles: ['Admin', 'BranchManager'] },
    { label: 'Room Catalog', icon: MapPin, path: '/rooms', roles: ['Admin'] },
    { label: 'Room Availability', icon: Search, path: '/room-search', roles: ['Admin', 'BranchManager', 'Employee', 'Secretary'] },
    { label: 'User Management', icon: Users, path: '/users', roles: ['Admin'] },
    { label: 'Approvals', icon: CheckCircle2, path: '/approvals', roles: ['Admin', 'BranchManager'] },
    { label: 'Delegation', icon: UserCog, path: '/delegation', roles: ['Admin'] },
    { label: 'Analytics', icon: BarChart3, path: '/analytics', roles: ['Admin', 'BranchManager'] },
    { label: 'Settings', icon: SettingsIcon, path: '/settings', roles: ['Admin'] },
  ];

  const headerTitle = activeRole === 'Admin' ? 'Admin Control Center' 
    : activeRole === 'BranchManager' ? 'Branch Manager Console'
    : activeRole === 'Employee' ? 'Employee Portal' : 'Secretary Portal';

  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    if (profile) {
      api.getNotifications(profile.employeeID).then(setNotifications).catch(() => {});
    }
  }, [profile]);

  const markAllRead = async () => {
    if (!profile) return;
    await api.markAllNotificationsRead(profile.employeeID);
    setNotifications(notifications.map(n => ({...n, read: true})));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const headerSubtitle = activeRole === 'Admin' ? 'Manage schedules, room types, and user approvals'
    : activeRole === 'BranchManager' ? 'Approve multi-purpose bookings and monitor operations'
    : 'Submit and track your room reservation requests';

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="flex h-screen bg-bg-light font-sans overflow-hidden">
      <aside className="w-[240px] bg-primary text-white flex flex-col z-30 shadow-2xl">
        <div className="px-6 py-8 border-b border-white/10">
          <h2 className="text-xl font-display font-black tracking-widest leading-tight">AASTMT ROOMS</h2>
        </div>
        <nav className="flex-1 py-6">
          <ul className="space-y-0 text-white/80">
            {navItems.filter(item => activeRole && item.roles.includes(activeRole)).map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <li key={item.label} onClick={() => navigate(item.path)}
                  className={cn(
                    "flex items-center gap-3 px-6 py-3 cursor-pointer transition-all hover:bg-white/5 hover:text-white text-[0.9rem]",
                    isActive && "bg-white/10 border-l-4 border-accent text-white opacity-100 font-medium"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="p-6 mt-auto opacity-60 text-[0.7rem] leading-relaxed">
          Semester: Spring 2024<br />System v2.4.1
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-20 bg-bg-light flex items-center justify-between px-8 z-20">
          <div>
            <h1 className="text-2xl font-bold text-primary tracking-tight">{headerTitle}</h1>
            <p className="text-sm text-text-muted">{headerSubtitle}</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="relative">
              <button onClick={() => setShowNotifications(!showNotifications)}
                className="p-2.5 text-text-muted hover:text-primary hover:bg-primary/5 rounded-xl transition-all relative"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse" />}
              </button>
              <AnimatePresence>
                {showNotifications && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl shadow-primary/10 border border-gray-100 overflow-hidden z-50 flex flex-col max-h-[400px]"
                  >
                    <div className="p-4 border-b border-gray-50 flex items-center justify-between bg-bg-light/50">
                      <h3 className="font-bold text-primary tracking-tight">Notifications</h3>
                      {unreadCount > 0 && (
                        <button onClick={markAllRead} className="text-[10px] font-black uppercase tracking-widest text-accent hover:text-accent/80 transition-colors">Mark all read</button>
                      )}
                    </div>
                    <div className="overflow-y-auto flex-1">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center text-sm text-text-muted font-medium">No notifications yet.</div>
                      ) : (
                        <div className="divide-y divide-gray-50">
                          {notifications.map(notif => (
                            <div key={notif.id} className={cn("p-4 transition-colors", !notif.read ? "bg-primary/5" : "hover:bg-bg-light/50")}>
                              <p className={cn("text-xs font-bold mb-1", !notif.read ? "text-primary" : "text-text-main")}>{notif.title}</p>
                              <p className="text-[11px] text-text-muted leading-relaxed">{notif.message}</p>
                              <p className="text-[9px] text-text-muted/60 uppercase tracking-widest mt-2">{new Date(notif.createdAt).toLocaleString()}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="bg-white px-4 py-2 rounded-full shadow-sm flex items-center gap-3 border border-gray-100">
              <span className="text-[0.85rem] font-semibold text-text-main">ID: {profile?.employeeID || ''}</span>
              <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-sm text-text-main uppercase">
                {profile?.name?.charAt(0) || 'A'}
              </div>
            </div>
            <button onClick={handleLogout} title="Sign Out"
              className="p-2.5 text-text-muted hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
            ><LogOut className="w-5 h-5" /></button>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-8 scroll-smooth">{children}</div>
      </main>
    </div>
  );
}

// --- Dashboard ---
function Dashboard() {
  return (
    <div className="flex flex-col gap-8">
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Pending Requisitions', value: '12', color: 'accent' },
          { label: 'Occupied Environments', value: '42 / 56', color: 'primary' },
          { label: 'Critical Facilities', value: '3', color: 'red' },
          { label: 'Awaiting Authorization', value: '4', color: 'primary', hasAction: true },
        ].map((stat) => (
          <div key={stat.label} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between min-h-[120px] transition-all hover:shadow-md group">
            <div className="text-[10px] font-black text-text-muted uppercase tracking-widest">{stat.label}</div>
            <div className="flex justify-between items-end mt-4">
              <div className={cn("text-3xl font-black tracking-tight",
                stat.color === 'accent' ? "text-accent" : stat.color === 'red' ? "text-red-600" : "text-primary"
              )}>{stat.value}</div>
              {stat.hasAction && (
                <button className="bg-primary text-white text-[10px] px-4 py-2 rounded-xl font-black uppercase tracking-widest hover:bg-primary/95 transition-all shadow-lg shadow-primary/10 active:scale-95">Review</button>
              )}
            </div>
          </div>
        ))}
      </section>

      <section className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col h-[550px]">
        <div className="p-6 px-8 border-b border-gray-50 flex justify-between items-center bg-white sticky top-0 z-10">
          <div>
            <h3 className="text-lg font-bold text-primary tracking-tight">Integrated Master Calendar</h3>
            <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mt-0.5">Real-time instructional landscape</p>
          </div>
          <div className="flex gap-6 text-[10px] font-black uppercase tracking-widest text-text-muted">
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-md bg-fixed-blue shadow-sm" /> Fixed</div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-md bg-multi-green shadow-sm" /> Multi-Purpose</div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-md bg-exc-yellow shadow-sm" /> Exceptional</div>
          </div>
        </div>
        <div className="flex-1 overflow-auto bg-bg-light/30">
          <div className="grid grid-cols-[100px_repeat(6,1fr)] min-w-[900px] h-full">
            <div className="bg-bg-light/50 border-r border-b border-gray-100 p-4 text-[10px] font-black text-text-muted flex items-center justify-center uppercase tracking-widest sticky top-0 bg-white">Slot</div>
            {['Lec Room 101', 'Lec Room 102', 'Lab 204', 'MP Hall A', 'MP Hall B', 'Lec Room 301'].map(room => (
              <div key={room} className="bg-bg-light/50 border-r border-b border-gray-100 p-4 text-[10px] font-black text-text-muted flex items-center justify-center uppercase tracking-widest truncate sticky top-0 bg-white">{room}</div>
            ))}
            {[
              { time: '08:00 AM', items: [{ col: 1, type: 'fixed', label: 'Calculus III' }, { col: 2, type: 'fixed', label: 'Physics II' }, { col: 5, type: 'multi', label: 'Faculty Meeting' }] },
              { time: '10:00 AM', items: [{ col: 1, type: 'exceptional', label: 'Staff Workshop' }, { col: 2, type: 'fixed', label: 'Database Sys' }, { col: 3, type: 'fixed', label: 'Chem Lab 01' }, { col: 6, type: 'fixed', label: 'Economics 101' }] },
              { time: '12:00 PM', items: [{ col: 3, type: 'fixed', label: 'AI Lab Seminar' }, { col: 4, type: 'multi', label: 'Intl Conference' }] },
              { time: '02:00 PM', items: [{ col: 1, type: 'fixed', label: 'Circuit Theory' }, { col: 4, type: 'multi', label: 'Intl Conference' }, { col: 5, type: 'exceptional', label: 'Make-up Class' }, { col: 6, type: 'fixed', label: 'Algorithm Design' }] },
            ].map((row, idx) => (
              <React.Fragment key={idx}>
                <div className="bg-bg-light/20 border-r border-b border-gray-50 p-4 text-[10px] font-black text-text-muted flex items-center justify-center uppercase">{row.time}</div>
                {[1, 2, 3, 4, 5, 6].map(col => {
                  const booking = row.items.find(i => i.col === col);
                  return (
                    <div key={col} className="border-r border-b border-gray-50 p-2 min-h-[100px] hover:bg-white transition-colors">
                      {booking && (
                        <motion.div whileHover={{ scale: 1.02 }}
                          className={cn("h-full rounded-xl p-3 shadow-sm border text-[11px] font-bold flex flex-col justify-between transition-all",
                            booking.type === 'fixed' && "bg-fixed-blue/10 border-fixed-blue/20 text-fixed-blue",
                            booking.type === 'multi' && "bg-multi-green/10 border-multi-green/20 text-multi-green",
                            booking.type === 'exceptional' && "bg-exc-yellow/10 border-exc-yellow/20 text-exc-yellow"
                          )}
                        >
                          <div className="opacity-50 text-[9px] uppercase tracking-tighter">{booking.type}</div>
                          <div className="leading-tight">{booking.label}</div>
                          <div className="mt-auto pt-2 flex justify-end"><ArrowRight className="w-3.5 h-3.5" /></div>
                        </motion.div>
                      )}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

// --- Main App ---
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<Navigate to="/dashboard" />} />
          <Route path="/dashboard" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
          <Route path="/reservations" element={<ProtectedRoute><Layout><ReservationsPage /></Layout></ProtectedRoute>} />
          <Route path="/users" element={<ProtectedRoute requiredRole={['Admin']}><Layout><UsersManagement /></Layout></ProtectedRoute>} />
          <Route path="/approvals" element={<ProtectedRoute requiredRole={['Admin', 'BranchManager']}><Layout><ApprovalsQueue /></Layout></ProtectedRoute>} />
          <Route path="/morning-report" element={<ProtectedRoute requiredRole={['Admin', 'BranchManager']}><Layout><MorningReportPage /></Layout></ProtectedRoute>} />
          <Route path="/rooms" element={<ProtectedRoute requiredRole={['Admin']}><Layout><RoomsPage /></Layout></ProtectedRoute>} />
          <Route path="/delegation" element={<ProtectedRoute requiredRole={['Admin']}><Layout><DelegationPage /></Layout></ProtectedRoute>} />
          <Route path="/analytics" element={<ProtectedRoute requiredRole={['Admin', 'BranchManager']}><Layout><AuditLogPage /></Layout></ProtectedRoute>} />
          <Route path="/room-search" element={<ProtectedRoute><Layout><RoomSearchPage /></Layout></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute requiredRole={['Admin']}><Layout><SettingsPage /></Layout></ProtectedRoute>} />
          <Route path="/maintenance" element={<Navigate to="/approvals" />} />
          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

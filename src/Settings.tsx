import * as React from 'react';
import { useState, useEffect } from 'react';
import { api } from './api';
import { 
  Settings, Clock, Plus, Trash2, Save, AlertCircle, CheckCircle2, X
} from 'lucide-react';
import { cn } from './lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface Slot {
  id: string;
  label: string;
  start: string;
  end: string;
}

export function SettingsPage() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newSlot, setNewSlot] = useState({ label: '', start: '', end: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadSettings = async () => {
    const settings = await api.getSettings();
    setSlots(settings.slots || []);
  };

  useEffect(() => { loadSettings(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!newSlot.label || !newSlot.start || !newSlot.end) { setError('All fields are required'); return; }
    if (newSlot.start >= newSlot.end) { setError('End time must be after start time'); return; }
    
    // Check for overlapping slots
    const overlap = slots.find(s => 
      (newSlot.start >= s.start && newSlot.start < s.end) ||
      (newSlot.end > s.start && newSlot.end <= s.end) ||
      (newSlot.start <= s.start && newSlot.end >= s.end)
    );
    if (overlap) { setError(`This slot overlaps with "${overlap.label}" (${overlap.start} - ${overlap.end})`); return; }
    
    try {
      await api.addSlot(newSlot);
      setShowAdd(false);
      setNewSlot({ label: '', start: '', end: '' });
      setSuccess('Slot created successfully.');
      loadSettings();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    setError('');
    try {
      await api.deleteSlot(id);
      setSuccess('Slot removed.');
      loadSettings();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-10 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-primary tracking-tight">System Settings</h1>
          <p className="text-text-muted mt-2 font-medium">Configure booking periods, time slots, and system parameters.</p>
        </div>
        <div className="w-14 h-14 bg-primary/5 rounded-2xl flex items-center justify-center border border-primary/10">
          <Settings className="w-7 h-7 text-primary" />
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-xl flex items-center gap-3 text-sm font-bold border border-red-100">
          <AlertCircle className="w-5 h-5 shrink-0" /> {error}
        </div>
      )}
      {success && (
        <div className="p-4 bg-emerald-50 text-emerald-700 rounded-xl flex items-center gap-3 text-sm font-bold border border-emerald-100">
          <CheckCircle2 className="w-5 h-5 shrink-0" /> {success}
        </div>
      )}

      {/* Booking Slots */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-primary tracking-tight flex items-center gap-3">
              <Clock className="w-6 h-6 text-accent" />
              Booking Time Slots
            </h2>
            <p className="text-text-muted mt-1 text-sm">Define the available booking periods. These slots appear in reservation forms.</p>
          </div>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl font-bold text-xs hover:bg-primary/95 transition-all shadow-lg shadow-primary/10 active:scale-95"
          ><Plus className="w-4 h-4" /> Add Slot</button>
        </div>

        <div className="p-4">
          {slots.length === 0 ? (
            <div className="text-center py-12 text-text-muted font-medium">No slots configured. Add your first time slot.</div>
          ) : (
            <div className="space-y-3">
              {slots.sort((a, b) => a.start.localeCompare(b.start)).map((slot, idx) => (
                <motion.div layout key={slot.id}
                  className="flex items-center justify-between p-5 bg-bg-light rounded-2xl border border-gray-100 group hover:bg-white hover:shadow-sm transition-all"
                >
                  <div className="flex items-center gap-6">
                    <div className="w-10 h-10 bg-primary/5 rounded-xl flex items-center justify-center text-primary font-black text-sm border border-primary/10">
                      {idx + 1}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-text-main">{slot.label}</p>
                      <p className="text-xs text-text-muted">{slot.start} — {slot.end}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-text-muted uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                      {(() => {
                        const [sh, sm] = slot.start.split(':').map(Number);
                        const [eh, em] = slot.end.split(':').map(Number);
                        return `${(eh * 60 + em) - (sh * 60 + sm)} min`;
                      })()}
                    </span>
                    <button onClick={() => handleDelete(slot.id)}
                      className="p-2 text-text-muted hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                    ><Trash2 className="w-4 h-4" /></button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Time Constraints Info */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 space-y-6">
        <h2 className="text-xl font-bold text-primary tracking-tight">Booking Constraints</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 bg-fixed-blue/5 rounded-2xl border border-fixed-blue/10 space-y-2">
            <p className="text-[10px] font-black text-fixed-blue uppercase tracking-widest">Employee Time Gate</p>
            <p className="text-2xl font-black text-primary">24 Hours</p>
            <p className="text-xs text-text-muted">Employees must book at least 24 hours in advance.</p>
          </div>
          <div className="p-6 bg-accent/5 rounded-2xl border border-accent/10 space-y-2">
            <p className="text-[10px] font-black text-accent uppercase tracking-widest">Secretary Time Gate</p>
            <p className="text-2xl font-black text-primary">48 Hours</p>
            <p className="text-xs text-text-muted">Secretaries must book at least 48 hours in advance.</p>
          </div>
        </div>
      </div>

      {/* Add Slot Modal */}
      <AnimatePresence>
        {showAdd && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="bg-primary p-8 text-white relative">
                <button onClick={() => setShowAdd(false)} className="absolute top-8 right-8 text-white/60 hover:text-white transition-colors"><X className="w-6 h-6" /></button>
                <Clock className="w-8 h-8 text-accent mb-4" />
                <h2 className="text-2xl font-bold tracking-tight">New Time Slot</h2>
                <p className="text-white/60 text-sm mt-1">Define a new booking period.</p>
              </div>
              <form onSubmit={handleAdd} className="p-8 space-y-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Slot Name</label>
                  <input required placeholder="e.g. Slot 5" value={newSlot.label} onChange={e => setNewSlot({...newSlot, label: e.target.value})}
                    className="w-full p-3 bg-bg-light border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/5 outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Start Time</label>
                    <input required type="time" value={newSlot.start} onChange={e => setNewSlot({...newSlot, start: e.target.value})}
                      className="w-full p-3 bg-bg-light border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/5 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">End Time</label>
                    <input required type="time" value={newSlot.end} onChange={e => setNewSlot({...newSlot, end: e.target.value})}
                      className="w-full p-3 bg-bg-light border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/5 outline-none"
                    />
                  </div>
                </div>
                <div className="pt-4 flex gap-4">
                  <button type="submit" className="flex-1 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/95 transition-all shadow-lg shadow-primary/10 active:scale-95">Create Slot</button>
                  <button type="button" onClick={() => setShowAdd(false)} className="px-6 py-3 bg-bg-light text-text-muted rounded-xl font-bold border border-gray-100">Cancel</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

import * as React from 'react';
import { useState, useEffect } from 'react';
import { api } from './api';
import { 
  MapPin, 
  Plus, 
  Search, 
  MoreVertical, 
  Users, 
  Monitor, 
  X,
  Building,
  ArrowRight
} from 'lucide-react';
import { cn } from './lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface Room {
  id: string;
  roomID: string;
  name: string;
  type: 'Lecture Room' | 'Multi-Purpose';
  capacity: number;
  location: string;
}

export function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRoom, setNewRoom] = useState<Room>({
    id: '', roomID: '', name: '', type: 'Lecture Room', capacity: 30, location: ''
  });

  const loadRooms = async () => {
    const data = await api.getRooms();
    setRooms(data);
  };

  useEffect(() => { loadRooms(); }, []);

  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.addRoom(newRoom);
    setShowAddModal(false);
    setNewRoom({ id: '', roomID: '', name: '', type: 'Lecture Room', capacity: 30, location: '' });
    loadRooms();
  };

  const filteredRooms = rooms.filter(r => 
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    r.roomID.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-primary tracking-tight">Facilities Inventory</h1>
          <p className="text-text-muted mt-2 font-medium italic">Comprehensive database of all instructional and collaborative environments.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-6 py-3.5 bg-primary text-white rounded-2xl font-bold transition-all hover:bg-primary/95 hover:shadow-xl shadow-primary/10 active:scale-95 text-sm"
        >
          <Plus className="w-5 h-5" />
          <span>Expand Facilities</span>
        </button>
      </div>

      <div className="flex bg-white p-4 rounded-3xl border border-gray-100 shadow-sm items-center gap-6">
        <div className="relative flex-1 group">
           <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted group-focus-within:text-accent transition-colors" />
           <input 
             value={searchQuery}
             onChange={(e) => setSearchQuery(e.target.value)}
             placeholder="Filter environments by name, ID, or quadrant..."
             className="w-full pl-12 pr-4 py-3 bg-bg-light border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-primary/5 transition-all outline-none text-sm font-medium"
           />
        </div>
        <div className="flex items-center gap-4">
           <div className="text-right hidden sm:block">
              <p className="text-[10px] font-black text-text-muted uppercase tracking-widest leading-none">Global Capacity</p>
              <p className="text-2xl font-black text-primary tracking-tighter">{rooms.reduce((acc, r) => acc + r.capacity, 0).toLocaleString()}</p>
           </div>
           <div className="h-10 w-px bg-gray-100" />
           <div className="w-12 h-12 bg-primary/5 text-primary rounded-2xl flex items-center justify-center font-black border border-primary/10">
              {rooms.length}
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredRooms.map((room) => (
          <motion.div 
            layout
            key={room.id}
            className="group bg-white p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-xl hover:border-primary/10 transition-all cursor-pointer relative overflow-hidden"
          >
            <div className="space-y-4 relative z-10">
                <div className="flex items-center justify-between">
                    <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                        room.type === 'Lecture Room' ? "bg-primary/5 text-primary border-primary/10" : "bg-accent/10 text-accent border-accent/20"
                    )}>
                        {room.type}
                    </span>
                    <button className="text-text-muted hover:text-primary transition-colors"><MoreVertical className="w-5 h-5" /></button>
                </div>
                <div>
                    <h3 className="text-2xl font-black text-primary tracking-tight leading-tight">{room.name}</h3>
                    <p className="text-[10px] font-black text-accent mt-1 uppercase tracking-widest">{room.roomID}</p>
                </div>
                <div className="flex items-center gap-4 pt-2">
                    <div className="flex items-center gap-2 text-text-muted">
                        <Users className="w-4 h-4" />
                        <span className="text-xs font-bold">{room.capacity} Capacity</span>
                    </div>
                    <div className="flex items-center gap-2 text-text-muted">
                        <MapPin className="w-4 h-4" />
                        <span className="text-xs font-bold truncate max-w-[100px]">{room.location}</span>
                    </div>
                </div>
            </div>
            <div className="mt-8 pt-8 border-t border-gray-50 flex items-center justify-between">
                <div className="flex -space-x-2">
                    {[1,2,3].map(i => (
                        <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-bg-light overflow-hidden">
                             <div className="w-full h-full bg-primary/10 flex items-center justify-center text-[8px] font-bold text-primary">{i}</div>
                        </div>
                    ))}
                    <div className="w-8 h-8 rounded-full border-2 border-white bg-primary flex items-center justify-center text-[10px] font-black text-white">
                        +12
                    </div>
                </div>
                <button className="flex items-center gap-2 text-[10px] font-black text-text-muted uppercase tracking-widest group-hover:text-primary transition-colors">
                    AVAILABILITY <ArrowRight className="w-4 h-4" />
                </button>
            </div>
            <div className="absolute top-0 right-0 w-32 h-32 -mr-12 -mt-12 bg-bg-light/50 rounded-full group-hover:bg-primary/5 transition-colors" />
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="bg-primary p-8 text-white relative">
                <button onClick={() => setShowAddModal(false)} className="absolute top-8 right-8 text-white/60 hover:text-white transition-colors">
                  <X className="w-6 h-6" />
                </button>
                <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mb-4 backdrop-blur-md border border-white/20">
                    <Building className="w-6 h-6 text-accent" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight">Expand Facilities</h2>
                <p className="text-white/60 text-sm mt-1">Register a new instructional environment.</p>
              </div>
              <form onSubmit={handleAddRoom} className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Environment ID</label>
                        <input required placeholder="e.g. 502" value={newRoom.roomID} onChange={e => setNewRoom({...newRoom, roomID: e.target.value})} className="w-full p-3 bg-bg-light border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/5 outline-none" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Official Name</label>
                        <input required placeholder="e.g. Seminar Hall" value={newRoom.name} onChange={e => setNewRoom({...newRoom, name: e.target.value})} className="w-full p-3 bg-bg-light border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/5 outline-none" />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Topology</label>
                        <select value={newRoom.type} onChange={e => setNewRoom({...newRoom, type: e.target.value as any})} className="w-full p-3 bg-bg-light border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/5 outline-none">
                            <option>Lecture Room</option>
                            <option>Multi-Purpose</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Occupancy</label>
                        <input required type="number" value={newRoom.capacity} onChange={e => setNewRoom({...newRoom, capacity: parseInt(e.target.value)})} className="w-full p-3 bg-bg-light border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/5 outline-none" />
                    </div>
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Quadrant/Floor</label>
                    <input required placeholder="e.g. Building E, 5th Floor" value={newRoom.location} onChange={e => setNewRoom({...newRoom, location: e.target.value})} className="w-full p-3 bg-bg-light border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/5 outline-none" />
                </div>
                <div className="pt-4 flex gap-4">
                    <button type="submit" className="flex-1 py-3 bg-primary text-white rounded-xl font-bold tracking-wide hover:bg-primary/95 transition-all shadow-lg shadow-primary/10 active:scale-95">Establish Environment</button>
                    <button type="button" onClick={() => setShowAddModal(false)} className="px-6 py-3 bg-bg-light text-text-muted rounded-xl font-bold transition-colors border border-gray-100">Discard</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

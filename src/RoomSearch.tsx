import * as React from 'react';
import { useState, useEffect } from 'react';
import { api } from './api';
import { format, addDays, startOfWeek, addWeeks, subWeeks } from 'date-fns';
import { 
  Search, ChevronLeft, ChevronRight, MapPin, Users, Calendar, Clock, CheckCircle2, XCircle, Filter
} from 'lucide-react';
import { cn } from './lib/utils';

interface Room { id: string; roomID: string; name: string; type: string; capacity: number; location: string; }
interface Slot { id: string; label: string; start: string; end: string; }

export function RoomSearchPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 6 })); // Saturday
  const [filterType, setFilterType] = useState<'all' | 'Lecture Room' | 'Multi-Purpose'>('all');
  const [filterCapacity, setFilterCapacity] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCell, setSelectedCell] = useState<{roomID: string, date: string, slot: string} | null>(null);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const loadData = async () => {
    const [roomList, settings, allBookings] = await Promise.all([
      api.getRooms(),
      api.getSettings(),
      api.getBookings()
    ]);
    setRooms(roomList);
    setSlots(settings.slots || []);
    setBookings(allBookings.filter((b: any) => b.status === 'FinalApproved'));
  };

  useEffect(() => { loadData(); }, []);

  const isBooked = (roomID: string, date: string, slotLabel: string) => {
    return bookings.find(b => 
      b.assignedRoom === roomID && 
      b.date === date && 
      b.slot?.includes(slotLabel)
    );
  };

  const filteredRooms = rooms
    .filter(r => filterType === 'all' || r.type === filterType)
    .filter(r => r.capacity >= filterCapacity)
    .filter(r => !searchQuery || r.name.toLowerCase().includes(searchQuery.toLowerCase()) || r.roomID.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-primary tracking-tight">Room Availability Grid</h1>
          <p className="text-text-muted mt-2 font-medium">Weekly overview of room occupancy. Search for empty rooms by filters.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 bg-white p-5 rounded-3xl border border-gray-100 shadow-sm items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search rooms by name or ID..."
            className="w-full pl-11 pr-4 py-3 bg-bg-light rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-primary/5"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-text-muted" />
          <select value={filterType} onChange={e => setFilterType(e.target.value as any)}
            className="px-4 py-3 bg-bg-light rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-primary/5 border-none"
          >
            <option value="all">All Types</option>
            <option value="Lecture Room">Lecture Rooms</option>
            <option value="Multi-Purpose">Multi-Purpose</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-text-muted" />
          <input type="number" value={filterCapacity || ''} onChange={e => setFilterCapacity(parseInt(e.target.value) || 0)}
            placeholder="Min capacity"
            className="w-28 px-4 py-3 bg-bg-light rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-primary/5"
          />
        </div>

        {/* Week Navigation */}
        <div className="flex items-center gap-3 ml-auto">
          <button onClick={() => setWeekStart(subWeeks(weekStart, 1))}
            className="w-10 h-10 bg-bg-light rounded-xl flex items-center justify-center hover:bg-primary/5 transition-colors border border-gray-100"
          ><ChevronLeft className="w-5 h-5 text-primary" /></button>
          <span className="text-sm font-bold text-primary min-w-[180px] text-center">
            {format(weekStart, 'MMM d')} — {format(addDays(weekStart, 6), 'MMM d, yyyy')}
          </span>
          <button onClick={() => setWeekStart(addWeeks(weekStart, 1))}
            className="w-10 h-10 bg-bg-light rounded-xl flex items-center justify-center hover:bg-primary/5 transition-colors border border-gray-100"
          ><ChevronRight className="w-5 h-5 text-primary" /></button>
        </div>
      </div>

      {/* Weekly Grid */}
      {filteredRooms.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-gray-200">
          <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-text-muted font-medium">No rooms match your filters.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredRooms.map(room => (
            <div key={room.roomID} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Room Header */}
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-bg-light/50">
                <div className="flex items-center gap-4">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm",
                    room.type === 'Lecture Room' ? "bg-fixed-blue" : "bg-multi-green"
                  )}>{room.roomID}</div>
                  <div>
                    <p className="text-sm font-bold text-text-main">{room.name}</p>
                    <p className="text-xs text-text-muted">{room.location} · Cap: {room.capacity}</p>
                  </div>
                </div>
                <span className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                  room.type === 'Lecture Room' ? "bg-fixed-blue/10 text-fixed-blue border-fixed-blue/20" : "bg-multi-green/10 text-multi-green border-multi-green/20"
                )}>{room.type}</span>
              </div>

              {/* Grid */}
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[700px]">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="px-4 py-3 text-[10px] font-black text-text-muted uppercase tracking-widest w-32">Slot</th>
                      {weekDays.map(day => (
                        <th key={day.toISOString()} className="px-2 py-3 text-[10px] font-black text-text-muted uppercase tracking-widest text-center">
                          <div>{format(day, 'EEE')}</div>
                          <div className="text-primary">{format(day, 'MMM d')}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {slots.map(slot => (
                      <tr key={slot.id} className="border-b border-gray-50 last:border-0">
                        <td className="px-4 py-2">
                          <p className="text-xs font-bold text-text-main">{slot.label}</p>
                          <p className="text-[10px] text-text-muted">{slot.start} - {slot.end}</p>
                        </td>
                        {weekDays.map(day => {
                          const dateStr = format(day, 'yyyy-MM-dd');
                          const booking = isBooked(room.roomID, dateStr, slot.label);
                          return (
                            <td key={dateStr} className="px-2 py-2 text-center">
                              {booking ? (
                                <div className="px-2 py-2 bg-red-50 rounded-lg border border-red-100 cursor-default group relative">
                                  <XCircle className="w-4 h-4 text-red-400 mx-auto" />
                                  <p className="text-[9px] font-bold text-red-500 mt-0.5 truncate">{booking.eventTitle}</p>
                                </div>
                              ) : (
                                <div className="px-2 py-2 bg-emerald-50 rounded-lg border border-emerald-100 cursor-pointer hover:bg-emerald-100 transition-colors">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" />
                                  <p className="text-[9px] font-bold text-emerald-500 mt-0.5">Available</p>
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                    {slots.length === 0 && (
                      <tr><td colSpan={8} className="text-center py-6 text-text-muted text-sm">No slots configured. Go to Settings to add time slots.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-6 justify-center text-[10px] font-black uppercase tracking-widest text-text-muted">
        <div className="flex items-center gap-2"><div className="w-4 h-4 bg-emerald-50 rounded border border-emerald-100"><CheckCircle2 className="w-4 h-4 text-emerald-400" /></div> Available</div>
        <div className="flex items-center gap-2"><div className="w-4 h-4 bg-red-50 rounded border border-red-100"><XCircle className="w-4 h-4 text-red-400" /></div> Booked</div>
      </div>
    </div>
  );
}

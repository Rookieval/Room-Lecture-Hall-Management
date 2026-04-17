import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, 'data', 'db.json');

const app = express();
app.use(express.json());

// --- CORS ---
app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (_req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// --- DB Helpers ---
function readDB() {
  const raw = fs.readFileSync(DB_PATH, 'utf-8');
  return JSON.parse(raw);
}

function writeDB(data: any) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ==================== AUTH ====================

app.post('/api/auth/login', (req, res) => {
  const { employeeID, password } = req.body;
  if (!employeeID || !password) return res.status(400).json({ error: 'Employee ID and password are required' });
  const db = readDB();
  const user = db.users.find((u: any) => u.employeeID === employeeID && u.password === password);
  if (!user) return res.status(401).json({ error: 'Invalid credentials. Check your Employee ID and password.' });
  const { password: _, ...safeUser } = user;
  res.json(safeUser);
});

app.post('/api/auth/signup', (req, res) => {
  const { employeeID, name, email, password, role } = req.body;
  if (!employeeID || !name || !email || !password) {
    return res.status(400).json({ error: 'All fields are required: Employee ID, Name, Email, Password' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }
  const db = readDB();
  if (db.users.find((u: any) => u.employeeID === employeeID)) {
    return res.status(400).json({ error: 'Employee ID already exists' });
  }
  if (db.users.find((u: any) => u.email === email)) {
    return res.status(400).json({ error: 'Email already registered' });
  }
  if (role && !['Employee', 'Secretary'].includes(role)) {
    return res.status(400).json({ error: 'You can only sign up as Employee or Secretary' });
  }

  const newUser = {
    id: generateId(),
    employeeID, name, email, password,
    role: role || 'Employee',
    isApproved: false
  };
  db.users.push(newUser);
  writeDB(db);
  const { password: _, ...safeUser } = newUser;
  res.status(201).json(safeUser);
});

// ==================== USERS ====================

app.get('/api/users', (_req, res) => {
  const db = readDB();
  const users = db.users.map(({ password, ...u }: any) => u);
  res.json(users);
});

app.get('/api/users/:id', (req, res) => {
  const db = readDB();
  const user = db.users.find((u: any) => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { password, ...safeUser } = user;
  res.json(safeUser);
});

app.put('/api/users/:id/approve', (req, res) => {
  const db = readDB();
  const idx = db.users.findIndex((u: any) => u.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'User not found' });
  db.users[idx].isApproved = req.body.isApproved;
  writeDB(db);
  const { password, ...safeUser } = db.users[idx];
  res.json(safeUser);
});

// ==================== ROOMS ====================

app.get('/api/rooms', (_req, res) => {
  const db = readDB();
  res.json(db.rooms);
});

app.post('/api/rooms', (req, res) => {
  const { roomID, name, type, capacity, location } = req.body;
  if (!roomID || !name || !type || !capacity) {
    return res.status(400).json({ error: 'Room ID, Name, Type, and Capacity are required' });
  }
  const db = readDB();
  if (db.rooms.find((r: any) => r.roomID === roomID)) {
    return res.status(400).json({ error: 'A room with this ID already exists' });
  }
  const room = { id: roomID, roomID, name, type, capacity, location: location || '' };
  db.rooms.push(room);
  writeDB(db);
  res.status(201).json(room);
});

app.delete('/api/rooms/:id', (req, res) => {
  const db = readDB();
  db.rooms = db.rooms.filter((r: any) => r.id !== req.params.id);
  writeDB(db);
  res.json({ success: true });
});

// ==================== CONFLICT CHECK ====================

// Get rooms available for a specific date + slot (no conflict)
app.get('/api/rooms/available', (req, res) => {
  const { date, slot, type } = req.query;
  if (!date || !slot) return res.status(400).json({ error: 'Date and slot are required' });
  
  const db = readDB();
  
  // Find all bookings that are approved/confirmed for this date+slot and have a room assigned
  const conflicting = db.bookings.filter((b: any) => 
    b.date === date && b.slot === slot && 
    (b.status === 'FinalApproved' || b.status === 'AdminApproved') && 
    b.assignedRoom
  );
  const bookedRoomIDs = conflicting.map((b: any) => b.assignedRoom);
  
  let availableRooms = db.rooms.filter((r: any) => !bookedRoomIDs.includes(r.roomID));
  
  // Filter by type if specified
  if (type) {
    availableRooms = availableRooms.filter((r: any) => r.type === type);
  }
  
  res.json(availableRooms);
});

// ==================== BOOKINGS ====================

app.get('/api/bookings', (req, res) => {
  const db = readDB();
  let bookings = db.bookings;
  if (req.query.userID) bookings = bookings.filter((b: any) => b.userID === req.query.userID);
  if (req.query.status) {
    const statuses = (req.query.status as string).split(',');
    bookings = bookings.filter((b: any) => statuses.includes(b.status));
  }
  if (req.query.type) bookings = bookings.filter((b: any) => b.type === req.query.type);
  if (req.query.date) bookings = bookings.filter((b: any) => b.date === req.query.date);
  if (req.query.roomID) bookings = bookings.filter((b: any) => b.assignedRoom === req.query.roomID);
  
  // Sort by createdAt descending
  bookings.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json(bookings);
});

app.post('/api/bookings', (req, res) => {
  const { eventTitle, expectedAttendance, type, date, slot, userID, userName } = req.body;
  if (!eventTitle || !type || !date || !slot || !userID) {
    return res.status(400).json({ error: 'Event title, type, date, slot, and user ID are required' });
  }
  if (!expectedAttendance || expectedAttendance < 1) {
    return res.status(400).json({ error: 'Expected attendance must be at least 1' });
  }

  const db = readDB();
  const booking = {
    id: generateId(),
    ...req.body,
    createdAt: new Date().toISOString()
  };
  db.bookings.push(booking);
  writeDB(db);
  res.status(201).json(booking);
});

app.put('/api/bookings/:id', (req, res) => {
  const db = readDB();
  const idx = db.bookings.findIndex((b: any) => b.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Booking not found' });
  
  // CONFLICT CHECK: If assigning a room (FinalApproved with assignedRoom), verify no conflict
  if (req.body.assignedRoom && req.body.status === 'FinalApproved') {
    const booking = db.bookings[idx];
    const conflict = db.bookings.find((b: any) => 
      b.id !== booking.id &&
      b.assignedRoom === req.body.assignedRoom &&
      b.date === booking.date &&
      b.slot === booking.slot &&
      b.status === 'FinalApproved'
    );
    if (conflict) {
      return res.status(409).json({ 
        error: `CONFLICT: Room ${req.body.assignedRoom} is already booked for ${booking.date} at ${booking.slot} (Event: "${conflict.eventTitle}")` 
      });
    }
  }
  
  db.bookings[idx] = { ...db.bookings[idx], ...req.body };
  
  // Create notification for the requester
  if (req.body.status === 'FinalApproved' || req.body.status === 'Rejected') {
    const booking = db.bookings[idx];
    if (!db.notifications) db.notifications = [];
    db.notifications.push({
      id: generateId(),
      targetUserID: booking.userID,
      type: req.body.status === 'FinalApproved' ? 'approved' : 'rejected',
      title: req.body.status === 'FinalApproved' 
        ? `Booking Approved: ${booking.eventTitle}`
        : `Booking Rejected: ${booking.eventTitle}`,
      message: req.body.status === 'FinalApproved'
        ? `Your request for "${booking.eventTitle}" on ${booking.date} has been approved. Room: ${req.body.assignedRoom || 'TBD'}`
        : `Your request for "${booking.eventTitle}" on ${booking.date} was rejected. Reason: ${req.body.rejectionSuggestion || 'No reason provided'}`,
      read: false,
      createdAt: new Date().toISOString()
    });
  }
  
  // VIP notification for Admin when a booking is escalated
  if (req.body.status === 'AdminApproved') {
    const booking = db.bookings[idx];
    if (!db.notifications) db.notifications = [];
    db.notifications.push({
      id: generateId(),
      targetUserID: '8888', // Branch Manager
      type: 'escalated',
      title: `New Escalation: ${booking.eventTitle}`,
      message: `Admin has escalated "${booking.eventTitle}" for ${booking.date}. Please review and make a decision.`,
      read: false,
      createdAt: new Date().toISOString()
    });
  }
  
  writeDB(db);
  res.json(db.bookings[idx]);
});

// ==================== DELEGATIONS ====================

app.get('/api/delegations', (_req, res) => {
  const db = readDB();
  res.json(db.delegations || []);
});

app.post('/api/delegations', (req, res) => {
  const db = readDB();
  if (!db.delegations) db.delegations = [];
  const delegation = {
    id: generateId(),
    ...req.body,
    active: true,
    createdAt: new Date().toISOString()
  };
  db.delegations.push(delegation);
  writeDB(db);
  res.status(201).json(delegation);
});

app.put('/api/delegations/:id/revoke', (req, res) => {
  const db = readDB();
  if (!db.delegations) return res.status(404).json({ error: 'Delegation not found' });
  const idx = db.delegations.findIndex((d: any) => d.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Delegation not found' });
  db.delegations[idx].active = false;
  writeDB(db);
  res.json(db.delegations[idx]);
});

// ==================== NOTIFICATIONS ====================

app.get('/api/notifications', (req, res) => {
  const db = readDB();
  let notifs = db.notifications || [];
  if (req.query.userID) {
    notifs = notifs.filter((n: any) => n.targetUserID === req.query.userID);
  }
  notifs.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json(notifs);
});

app.put('/api/notifications/:id/read', (req, res) => {
  const db = readDB();
  if (!db.notifications) return res.status(404).json({ error: 'Notification not found' });
  const idx = db.notifications.findIndex((n: any) => n.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Notification not found' });
  db.notifications[idx].read = true;
  writeDB(db);
  res.json(db.notifications[idx]);
});

app.put('/api/notifications/read-all', (req, res) => {
  const db = readDB();
  if (!db.notifications) return res.json({ success: true });
  const userID = req.body.userID;
  db.notifications.forEach((n: any) => {
    if (n.targetUserID === userID) n.read = true;
  });
  writeDB(db);
  res.json({ success: true });
});

// ==================== SETTINGS ====================

app.get('/api/settings', (_req, res) => {
  const db = readDB();
  res.json(db.settings || { slots: [] });
});

app.put('/api/settings', (req, res) => {
  const db = readDB();
  db.settings = { ...db.settings, ...req.body };
  writeDB(db);
  res.json(db.settings);
});

app.post('/api/settings/slots', (req, res) => {
  const { label, start, end } = req.body;
  if (!label || !start || !end) return res.status(400).json({ error: 'Label, start time, and end time are required' });
  const db = readDB();
  if (!db.settings) db.settings = { slots: [] };
  if (!db.settings.slots) db.settings.slots = [];
  const slot = { id: generateId(), label, start, end };
  db.settings.slots.push(slot);
  writeDB(db);
  res.status(201).json(slot);
});

app.delete('/api/settings/slots/:id', (req, res) => {
  const db = readDB();
  if (!db.settings?.slots) return res.status(404).json({ error: 'Slot not found' });
  db.settings.slots = db.settings.slots.filter((s: any) => s.id !== req.params.id);
  writeDB(db);
  res.json({ success: true });
});

// ==================== START ====================
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`✅ JSON Database API server running on http://localhost:${PORT}`);
  console.log(`📂 Database file: ${DB_PATH}`);
});

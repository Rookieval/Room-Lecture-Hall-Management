const API_BASE = 'http://localhost:3001/api';

async function request(path: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

export const api = {
  // Auth
  login: (employeeID: string, password: string) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ employeeID, password }) }),
  signup: (data: { employeeID: string; name: string; email: string; password: string; role: string }) =>
    request('/auth/signup', { method: 'POST', body: JSON.stringify(data) }),

  // Users
  getUsers: () => request('/users'),
  getUser: (id: string) => request(`/users/${id}`),
  approveUser: (id: string, isApproved: boolean) =>
    request(`/users/${id}/approve`, { method: 'PUT', body: JSON.stringify({ isApproved }) }),

  // Rooms
  getRooms: () => request('/rooms'),
  getAvailableRooms: (date: string, slot: string, type?: string) => {
    const params = new URLSearchParams({ date, slot });
    if (type) params.set('type', type);
    return request(`/rooms/available?${params}`);
  },
  addRoom: (room: any) => request('/rooms', { method: 'POST', body: JSON.stringify(room) }),
  deleteRoom: (id: string) => request(`/rooms/${id}`, { method: 'DELETE' }),

  // Bookings
  getBookings: (filters?: Record<string, string>) => {
    const params = filters ? '?' + new URLSearchParams(filters).toString() : '';
    return request(`/bookings${params}`);
  },
  createBooking: (booking: any) => request('/bookings', { method: 'POST', body: JSON.stringify(booking) }),
  updateBooking: (id: string, updates: any) =>
    request(`/bookings/${id}`, { method: 'PUT', body: JSON.stringify(updates) }),

  // Delegations
  getDelegations: () => request('/delegations'),
  createDelegation: (delegation: any) => request('/delegations', { method: 'POST', body: JSON.stringify(delegation) }),
  revokeDelegation: (id: string) => request(`/delegations/${id}/revoke`, { method: 'PUT' }),

  // Notifications
  getNotifications: (userID: string) => request(`/notifications?userID=${userID}`),
  markNotificationRead: (id: string) => request(`/notifications/${id}/read`, { method: 'PUT' }),
  markAllNotificationsRead: (userID: string) =>
    request('/notifications/read-all', { method: 'PUT', body: JSON.stringify({ userID }) }),

  // Settings
  getSettings: () => request('/settings'),
  updateSettings: (settings: any) => request('/settings', { method: 'PUT', body: JSON.stringify(settings) }),
  addSlot: (slot: { label: string; start: string; end: string }) =>
    request('/settings/slots', { method: 'POST', body: JSON.stringify(slot) }),
  deleteSlot: (id: string) => request(`/settings/slots/${id}`, { method: 'DELETE' }),
};

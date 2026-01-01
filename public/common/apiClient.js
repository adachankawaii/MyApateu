// apiClient.js - API Client for frontend

const API_BASE = '/api';

/**
 * Helper function for API calls
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    credentials: 'include',
    ...options
  };

  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  }

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `HTTP error ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error);
    throw error;
  }
}

/**
 * API Client object
 */
const api = {
  // Auth
  login: (username, password) => request('/login', {
    method: 'POST',
    body: { username, password }
  }),

  logout: () => request('/logout', { method: 'POST' }),

  me: () => request('/me'),

  getBuilding: () => request('/building'),

  // Rooms
  getRooms: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/rooms${query ? '?' + query : ''}`);
  },

  getRoom: (id) => request(`/rooms/${id}`),

  createRoom: (data) => request('/rooms', {
    method: 'POST',
    body: data
  }),

  updateRoom: (id, data) => request(`/rooms/${id}`, {
    method: 'PUT',
    body: data
  }),

  deleteRoom: (id) => request(`/rooms/${id}`, { method: 'DELETE' }),

  // Persons
  getPersons: (roomId = null) => {
    const query = roomId ? `?room_id=${roomId}` : '';
    return request(`/persons${query}`);
  },

  getPersonsByRoom: (roomId) => request(`/rooms/${roomId}/persons`),

  createPerson: (data) => request('/persons', {
    method: 'POST',
    body: data
  }),

  updatePerson: (id, data) => request(`/persons/${id}`, {
    method: 'PUT',
    body: data
  }),

  bulkDeletePersons: (ids) => request('/persons/bulk_delete', {
    method: 'POST',
    body: { ids }
  }),

  // Vehicles
  getVehicles: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/vehicles${query ? '?' + query : ''}`);
  },

  getVehicle: (id) => request(`/vehicles/${id}`),

  createVehicle: (data) => request('/vehicles', {
    method: 'POST',
    body: data
  }),

  updateVehicle: (id, data) => request(`/vehicles/${id}`, {
    method: 'PUT',
    body: data
  }),

  deleteVehicle: (id) => request(`/vehicles/${id}`, { method: 'DELETE' }),

  checkinVehicle: (id, parkingSlot) => request(`/vehicles/${id}/checkin`, {
    method: 'POST',
    body: { parking_slot: parkingSlot }
  }),

  checkoutVehicle: (id, data) => request(`/vehicles/${id}/checkout`, {
    method: 'POST',
    body: data
  }),

  // Parking
  getParkingStatistics: (from, to) => request(`/parking/statistics?from=${from}&to=${to}`),

  getVehiclesInLot: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/parking/vehicles-in-lot${query ? '?' + query : ''}`);
  },

  // Fees
  getFees: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/fees${query ? '?' + query : ''}`);
  },

  getFee: (id) => request(`/fees/${id}`),

  createFee: (data) => request('/fees', {
    method: 'POST',
    body: data
  }),

  updateFee: (id, data) => request(`/fees/${id}`, {
    method: 'PUT',
    body: data
  }),

  deleteFee: (id) => request(`/fees/${id}`, { method: 'DELETE' }),

  // Payments
  getPaymentsByFee: (feeId) => request(`/fees/${feeId}/payments`),

  createPayment: (data) => request('/payments', {
    method: 'POST',
    body: data
  }),

  // Health
  health: () => request('/health'),

  dbCheck: () => request('/dbcheck')
};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = api;
}

// Make available globally
window.api = api;

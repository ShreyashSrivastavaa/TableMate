/**
 * Shared API client for TableMate multi-tenant backend
 */

async function fetchJson(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: options.credentials || 'include',
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errorMsg = data.error?.message || `Request failed with status ${res.status}`;
    const error = new Error(errorMsg);
    error.code = data.error?.code || 'HTTP_ERROR';
    error.status = res.status;
    error.details = data.error;
    throw error;
  }
  return data;
}

export const api = {
  // Public routes
  async getPublicRestaurant(slug) {
    return fetchJson(`/api/r/${slug}/public`);
  },

  async getSlots(slug, date, guests) {
    return fetchJson(`/api/r/${slug}/slots?date=${encodeURIComponent(date)}&guests=${encodeURIComponent(guests)}`);
  },

  async createBooking(slug, bookingData) {
    return fetchJson(`/api/r/${slug}/bookings`, {
      method: 'POST',
      body: JSON.stringify(bookingData),
    });
  },

  async login(slug, password) {
    return fetchJson(`/api/r/${slug}/login`, {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
  },

  // Owner routes (requires httpOnly cookie session)
  async getMe(slug) {
    return fetchJson(`/api/r/${slug}/me`);
  },

  async logout(slug) {
    return fetchJson(`/api/r/${slug}/logout`, {
      method: 'POST',
    });
  },

  async getReservations(slug, queryParams = {}) {
    const params = new URLSearchParams();
    if (queryParams.status && queryParams.status !== 'ALL') params.set('status', queryParams.status);
    if (queryParams.date) params.set('date', queryParams.date);
    if (queryParams.search) params.set('search', queryParams.search);

    const queryString = params.toString() ? `?${params.toString()}` : '';
    return fetchJson(`/api/r/${slug}/reservations${queryString}`);
  },

  async updateReservationStatus(slug, id, status, reason = '') {
    return fetchJson(`/api/r/${slug}/reservations/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, reason }),
    });
  },

  async getSettings(slug) {
    return fetchJson(`/api/r/${slug}/settings`);
  },

  async updateSettings(slug, settings) {
    return fetchJson(`/api/r/${slug}/settings`, {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  },

  async getTables(slug, date, time) {
    const query = date && time ? `?date=${encodeURIComponent(date)}&time=${encodeURIComponent(time)}` : '';
    return fetchJson(`/api/r/${slug}/tables${query}`);
  },
};

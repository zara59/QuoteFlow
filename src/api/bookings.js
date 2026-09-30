/* ============================================================
   QuoteFlow — bookings API
   ============================================================ */

import { queryString, request } from './client'

export const listBookings = ({ search, status, date, signal } = {}) =>
  request(`/bookings${queryString({ search, status, date })}`, { signal })

export const createBooking = (values) => request('/bookings', { method: 'POST', body: values })

export const updateBooking = (id, values) =>
  request(`/bookings/${id}`, { method: 'PATCH', body: values })

export const deleteBooking = (id) => request(`/bookings/${id}`, { method: 'DELETE' })

/* ============================================================
   QuoteFlow — customers API
   ============================================================ */

import { queryString, request } from './client'

export const listCustomers = ({ search, signal } = {}) =>
  request(`/customers${queryString({ search })}`, { signal })

export const createCustomer = (values) =>
  request('/customers', { method: 'POST', body: values })

export const updateCustomer = (id, values) =>
  request(`/customers/${id}`, { method: 'PATCH', body: values })

export const deleteCustomer = (id) => request(`/customers/${id}`, { method: 'DELETE' })

/* ============================================================
   QuoteFlow — quotes API
   ============================================================ */

import { queryString, request } from './client'

export const listQuotes = ({ search, status, signal } = {}) =>
  request(`/quotes${queryString({ search, status })}`, { signal })

export const createQuote = (values) => request('/quotes', { method: 'POST', body: values })

export const updateQuote = (id, values) => request(`/quotes/${id}`, { method: 'PATCH', body: values })

export const deleteQuote = (id) => request(`/quotes/${id}`, { method: 'DELETE' })

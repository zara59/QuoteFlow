/* ============================================================
   QuoteFlow API — auth payload validation
   Same shape as the resource validators: each function throws an
   ApiError on bad input, returns the cleaned values otherwise.
   ============================================================ */

import { ApiError } from '../utils/ApiError.js'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const EMAIL_MAX = 254
const NAME_MAX = 120
const PASSWORD_MIN = 8
const PASSWORD_MAX = 72 // bcrypt's hard input limit: bytes past 72 are ignored

/* bcrypt silently truncates at 72 bytes, so a longer password would
   give a false sense of strength. Reject instead. */
const byteLength = (value) => Buffer.byteLength(value, 'utf8')

export const normalizeEmail = (raw) => String(raw).trim().toLowerCase()

const presentString = (body, field) => {
  const value = body[field]
  if (typeof value !== 'string' || value.trim() === '') {
    throw new ApiError(400, `Validation failed: "${field}" is required.`, {
      fields: { [field]: 'This field is required.' },
    })
  }
  return value.trim()
}

export const validateRegister = (body) => {
  const name = presentString(body, 'name')
  if (name.length < 2 || name.length > NAME_MAX) {
    throw new ApiError(400, `Validation failed: "name" must be 2-${NAME_MAX} characters.`, {
      fields: { name: `Must be between 2 and ${NAME_MAX} characters.` },
    })
  }

  const email = normalizeEmail(presentString(body, 'email'))
  if (email.length > EMAIL_MAX || !EMAIL_PATTERN.test(email)) {
    throw new ApiError(400, 'Validation failed: "email" must be a valid email address.', {
      fields: { email: 'Enter a valid email address.' },
    })
  }

  const password = body.password
  if (typeof password !== 'string' || password === '') {
    throw new ApiError(400, 'Validation failed: "password" is required.', {
      fields: { password: 'This field is required.' },
    })
  }
  if (password.length < PASSWORD_MIN) {
    throw new ApiError(400, `Validation failed: "password" must be at least ${PASSWORD_MIN} characters.`, {
      fields: { password: `Must be at least ${PASSWORD_MIN} characters.` },
    })
  }
  if (byteLength(password) > PASSWORD_MAX) {
    throw new ApiError(400, `Validation failed: "password" must be at most ${PASSWORD_MAX} bytes.`, {
      fields: { password: `Must be at most ${PASSWORD_MAX} bytes.` },
    })
  }

  /* Reject anything else in the payload. Without this, a client could
     post { name, email, password, user_id: 1 } and it would simply be
     ignored — but silently ignoring privileged-looking fields is how
     ownership bugs get in later. */
  for (const key of Object.keys(body)) {
    if (!['name', 'email', 'password'].includes(key)) {
      throw new ApiError(400, `Validation failed: unexpected field "${key}".`, {
        fields: { [key]: 'This field is not accepted here.' },
      })
    }
  }

  return { name, email, password }
}

export const validateLogin = (body) => {
  const email = normalizeEmail(presentString(body, 'email'))
  const password = body.password
  if (typeof password !== 'string' || password === '') {
    throw new ApiError(400, 'Validation failed: "password" is required.', {
      fields: { password: 'This field is required.' },
    })
  }
  for (const key of Object.keys(body)) {
    if (!['email', 'password'].includes(key)) {
      throw new ApiError(400, `Validation failed: unexpected field "${key}".`, {
        fields: { [key]: 'This field is not accepted here.' },
      })
    }
  }
  return { email, password }
}

/* ============================================================
   QuoteFlow API — auth controller
   /api/auth/register, /api/auth/login, /api/auth/me
   ============================================================ */

import bcrypt from 'bcryptjs'
import { ApiError } from '../utils/ApiError.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { signToken } from '../utils/jwt.js'
import { validateLogin, validateRegister } from '../validators/authValidators.js'
import { findUserByEmail, insertUser, toPublicUser } from '../db/queries/userQueries.js'

/* 12 rounds is the current sensible default: ~250ms on commodity
   hardware, which is slow enough to hurt an offline cracking
   attempt and fast enough for an interactive login. */
const SALT_ROUNDS = 12

/* A real, correctly-shaped hash of a value nobody knows. Used to keep
   login constant-time when the email is unknown, so response timing
   does not reveal which addresses are registered. */
const TIMING_EQUALISER_HASH =
  '$2b$12$KQ6eb6Vt5m83U9sOkl0oqu0j8rzzi3d6/He2c4emYqpskaWv1hQ8y'

const hashPassword = (password) => bcrypt.hash(password, SALT_ROUNDS)

/* Registering an existing email must not confirm which addresses are
   in use, so this is the same shape as a failed login. */
const credentialsRejected = () => new ApiError(401, 'Email or password is incorrect.')

const issueSession = (user) => ({
  user: toPublicUser(user),
  token: signToken(user),
})

export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = validateRegister(req.body)

  if (await findUserByEmail(email)) throw credentialsRejected()

  const passwordHash = await hashPassword(password)
  const user = await insertUser({ name, email, passwordHash })

  res.status(201).json({
    success: true,
    message: 'Account created successfully.',
    data: issueSession(user),
  })
})

export const login = asyncHandler(async (req, res) => {
  const { email, password } = validateLogin(req.body)

  const record = await findUserByEmail(email)
  /* Compare a hash even when the email is unknown, so the response
     time does not reveal which addresses are registered. */
  const passwordHash = record?.password_hash ?? TIMING_EQUALISER_HASH
  const passwordMatches = await bcrypt.compare(password, passwordHash)

  if (!record || !passwordMatches) throw credentialsRejected()

  res.json({
    success: true,
    message: 'Signed in successfully.',
    data: issueSession(record),
  })
})

/* Only the middleware-re-read user is ever serialised here, and
   toPublicUser has no password field to leak in the first place. */
export const me = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    message: 'Authenticated user.',
    data: { user: req.user },
  })
})

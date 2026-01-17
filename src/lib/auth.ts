// Deprecated compatibility layer - re-export from `authentication.ts`.
// New code should import from `lib/authentication` and use the clearer names.
export {
  hashPassword,
  comparePassword,
  requireAuthHeader as authenticate,
  requireAuthCookie as authenticateWithCookie,
} from "./authentication";

/**
 * Header Better Auth reads as the client address for its rate limiter.
 *
 * The backend sets this to the single address Express resolved (`req.ip`
 * under `TRUST_PROXY`) and drops any inbound value first. One name, shared
 * with the auth config's `advanced.ipAddress.ipAddressHeaders`, so the
 * limiter and the API throttler key on the same address.
 */
export const AUTH_CLIENT_ADDRESS_HEADER = "x-auth-client-address"

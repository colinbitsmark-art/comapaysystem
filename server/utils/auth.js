/**
 * Get authenticated user ID set by auth middleware.
 * @param {Object} req - Express request object
 * @returns {number|null}
 */
export function getUserIdFromHeader(req) {
  if (req.userId) {
    return req.userId;
  }
  return null;
}

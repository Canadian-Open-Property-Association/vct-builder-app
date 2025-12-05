/**
 * Load admin users from environment variable
 * @returns {string[]} Array of lowercase admin usernames
 */
export const getAdminUsers = () => {
  const adminUsersEnv = process.env.ADMIN_USERS || '';
  return adminUsersEnv
    .split(',')
    .map(u => u.trim().toLowerCase())
    .filter(Boolean);
};

/**
 * Check if a user is an admin
 * @param {Object} req - Express request object with session
 * @returns {boolean}
 */
export const isAdmin = (req) => {
  if (!req.session?.user) return false;
  const adminUsers = getAdminUsers();
  const username = req.session.user.login?.toLowerCase();
  return adminUsers.includes(username);
};

/**
 * Middleware to require admin access
 * Returns 401 if not authenticated, 403 if not admin
 */
export const requireAdmin = (req, res, next) => {
  if (!req.session?.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!isAdmin(req)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  next();
};

import Database from 'better-sqlite3';
import path from 'path';

let db = null;

/**
 * Initialize the access logger database
 * @param {string} assetsDir - Directory for storing the database file
 * @returns {Database} The database instance
 */
export const initAccessLogger = (assetsDir) => {
  const dbPath = path.join(assetsDir, 'access-logs.db');
  db = new Database(dbPath);

  // Create table and indexes if they don't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS access_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type TEXT NOT NULL,
      user_id INTEGER NOT NULL,
      username TEXT NOT NULL,
      display_name TEXT,
      avatar_url TEXT,
      app_id TEXT,
      app_name TEXT,
      ip_address TEXT,
      user_agent TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_access_logs_event_type ON access_logs(event_type);
    CREATE INDEX IF NOT EXISTS idx_access_logs_user_id ON access_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_access_logs_username ON access_logs(username);
    CREATE INDEX IF NOT EXISTS idx_access_logs_app_id ON access_logs(app_id);
    CREATE INDEX IF NOT EXISTS idx_access_logs_timestamp ON access_logs(timestamp);
  `);

  console.log('Access logger initialized at:', dbPath);
  return db;
};

/**
 * Log an access event
 * @param {Object} params - Event parameters
 * @param {string} params.eventType - 'login' or 'app_access'
 * @param {Object} params.user - User object with id, login, name, avatar_url
 * @param {string|null} params.appId - Application ID (null for login events)
 * @param {string|null} params.appName - Application name (null for login events)
 * @param {Object} params.req - Express request object
 */
export const logAccess = ({ eventType, user, appId, appName, req }) => {
  if (!db) {
    console.error('Access logger not initialized');
    return;
  }

  try {
    const stmt = db.prepare(`
      INSERT INTO access_logs (event_type, user_id, username, display_name, avatar_url, app_id, app_name, ip_address, user_agent, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      eventType,
      user.id,
      user.login,
      user.name || null,
      user.avatar_url || null,
      appId || null,
      appName || null,
      req.ip || req.connection?.remoteAddress || null,
      req.get?.('User-Agent') || null,
      new Date().toISOString()
    );
  } catch (error) {
    console.error('Failed to log access event:', error);
  }
};

/**
 * Query access logs with filtering and pagination
 * @param {Object} filters - Query filters
 * @param {string} [filters.event_type] - Filter by event type
 * @param {string} [filters.username] - Filter by username (partial match)
 * @param {string} [filters.app_id] - Filter by app ID
 * @param {string} [filters.start_date] - Filter by start date (ISO string)
 * @param {string} [filters.end_date] - Filter by end date (ISO string)
 * @param {number} [filters.page=1] - Page number
 * @param {number} [filters.limit=50] - Items per page
 * @param {string} [filters.sort_by='timestamp'] - Sort field
 * @param {string} [filters.sort_order='desc'] - Sort direction
 * @returns {Object} { logs, pagination }
 */
export const queryLogs = (filters = {}) => {
  if (!db) {
    throw new Error('Access logger not initialized');
  }

  const {
    event_type,
    username,
    app_id,
    start_date,
    end_date,
    page = 1,
    limit = 50,
    sort_by = 'timestamp',
    sort_order = 'desc'
  } = filters;

  // Build WHERE clause
  const conditions = [];
  const params = [];

  if (event_type) {
    conditions.push('event_type = ?');
    params.push(event_type);
  }

  if (username) {
    conditions.push('username LIKE ?');
    params.push(`%${username}%`);
  }

  if (app_id) {
    conditions.push('app_id = ?');
    params.push(app_id);
  }

  if (start_date) {
    conditions.push('timestamp >= ?');
    params.push(start_date);
  }

  if (end_date) {
    conditions.push('timestamp <= ?');
    params.push(end_date);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Validate sort parameters
  const validSortFields = ['timestamp', 'username', 'event_type', 'app_id'];
  const safeSortBy = validSortFields.includes(sort_by) ? sort_by : 'timestamp';
  const safeSortOrder = sort_order === 'asc' ? 'ASC' : 'DESC';

  // Get total count
  const countStmt = db.prepare(`SELECT COUNT(*) as total FROM access_logs ${whereClause}`);
  const { total } = countStmt.get(...params);

  // Calculate pagination
  const safeLimit = Math.min(Math.max(1, limit), 200);
  const offset = (Math.max(1, page) - 1) * safeLimit;
  const totalPages = Math.ceil(total / safeLimit);

  // Get logs
  const logsStmt = db.prepare(`
    SELECT * FROM access_logs
    ${whereClause}
    ORDER BY ${safeSortBy} ${safeSortOrder}
    LIMIT ? OFFSET ?
  `);

  const logs = logsStmt.all(...params, safeLimit, offset);

  return {
    logs,
    pagination: {
      page: Math.max(1, page),
      limit: safeLimit,
      total,
      total_pages: totalPages
    }
  };
};

/**
 * Query analytics data with aggregations
 * @param {Object} params - Query parameters
 * @param {string} params.start_date - Start date (ISO string)
 * @param {string} params.end_date - End date (ISO string)
 * @param {string} [params.granularity='day'] - Time series granularity
 * @returns {Object} Analytics data
 */
export const queryAnalytics = ({ start_date, end_date, granularity = 'day' }) => {
  if (!db) {
    throw new Error('Access logger not initialized');
  }

  // Summary stats
  const summaryStmt = db.prepare(`
    SELECT
      COUNT(*) as totalEvents,
      SUM(CASE WHEN event_type = 'login' THEN 1 ELSE 0 END) as totalLogins,
      SUM(CASE WHEN event_type = 'app_access' THEN 1 ELSE 0 END) as totalAppAccess,
      COUNT(DISTINCT user_id) as uniqueUsers,
      COUNT(DISTINCT CASE WHEN app_id IS NOT NULL THEN app_id END) as uniqueApps
    FROM access_logs
    WHERE timestamp BETWEEN ? AND ?
  `);
  const summary = summaryStmt.get(start_date, end_date);

  // Time series data - group by date
  const timeSeriesStmt = db.prepare(`
    SELECT
      DATE(timestamp) as date,
      SUM(CASE WHEN event_type = 'login' THEN 1 ELSE 0 END) as logins,
      SUM(CASE WHEN event_type = 'app_access' THEN 1 ELSE 0 END) as appAccess
    FROM access_logs
    WHERE timestamp BETWEEN ? AND ?
    GROUP BY DATE(timestamp)
    ORDER BY date ASC
  `);
  const timeSeriesData = timeSeriesStmt.all(start_date, end_date);

  // User stats - top 20 users by activity
  const userStatsStmt = db.prepare(`
    SELECT
      user_id as userId,
      username,
      display_name as displayName,
      SUM(CASE WHEN event_type = 'login' THEN 1 ELSE 0 END) as loginCount,
      SUM(CASE WHEN event_type = 'app_access' THEN 1 ELSE 0 END) as appAccessCount,
      MAX(timestamp) as lastSeen
    FROM access_logs
    WHERE timestamp BETWEEN ? AND ?
    GROUP BY user_id, username, display_name
    ORDER BY (loginCount + appAccessCount) DESC
    LIMIT 20
  `);
  const userStats = userStatsStmt.all(start_date, end_date);

  // App stats - app access counts
  const appStatsStmt = db.prepare(`
    SELECT
      app_id as appId,
      app_name as appName,
      COUNT(*) as accessCount,
      COUNT(DISTINCT user_id) as uniqueUsers
    FROM access_logs
    WHERE timestamp BETWEEN ? AND ? AND event_type = 'app_access' AND app_id IS NOT NULL
    GROUP BY app_id, app_name
    ORDER BY accessCount DESC
  `);
  const appStats = appStatsStmt.all(start_date, end_date);

  return {
    summary,
    timeSeriesData,
    userStats,
    appStats
  };
};

/**
 * Get the database instance (for testing or direct access)
 * @returns {Database|null}
 */
export const getDb = () => db;

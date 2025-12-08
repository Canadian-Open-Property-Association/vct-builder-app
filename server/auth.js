import express from 'express';
import { Octokit } from 'octokit';
import { logAccess } from './accessLogger.js';

const router = express.Router();

// GitHub OAuth configuration
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const GITHUB_REPO_OWNER = process.env.GITHUB_REPO_OWNER || 'Canadian-Open-Property-Association';
const GITHUB_REPO_NAME = process.env.GITHUB_REPO_NAME || 'governance';

// Redirect to GitHub OAuth
router.get('/login', (req, res) => {
  // Check if this is a popup login request
  const isPopup = req.query.popup === 'true';
  const callbackPath = isPopup ? '/api/auth/callback-popup' : '/api/auth/callback';
  const redirectUri = `${req.protocol}://${req.get('host')}${callbackPath}`;
  const scope = 'repo user:email';

  // Force GitHub to show the authorization screen every time (prompt=consent)
  // This ensures users must enter their credentials on each login
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&prompt=consent`;

  res.redirect(githubAuthUrl);
});

// GitHub OAuth callback
router.get('/callback', async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.redirect('/login?error=no_code');
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error('OAuth error:', tokenData);
      return res.redirect('/login?error=oauth_failed');
    }

    const accessToken = tokenData.access_token;

    // Get user info
    const octokit = new Octokit({ auth: accessToken });
    const { data: user } = await octokit.rest.users.getAuthenticated();

    // Check if user has access to the governance repo
    try {
      await octokit.rest.repos.get({
        owner: GITHUB_REPO_OWNER,
        repo: GITHUB_REPO_NAME,
      });
    } catch (error) {
      if (error.status === 404) {
        return res.redirect('/login?error=no_repo_access');
      }
      throw error;
    }

    // Store in session
    req.session.githubToken = accessToken;
    req.session.user = {
      id: user.id,
      login: user.login,
      name: user.name,
      avatar_url: user.avatar_url,
      email: user.email,
    };

    // Log the login event
    logAccess({
      eventType: 'login',
      user: req.session.user,
      appId: null,
      appName: null,
      req
    });

    res.redirect('/apps');
  } catch (error) {
    console.error('Auth callback error:', error);
    res.redirect('/login?error=auth_failed');
  }
});

// GitHub OAuth callback for popup authentication (iframe mode)
router.get('/callback-popup', async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.redirect('/auth-callback?success=false&error=no_code');
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error('OAuth error:', tokenData);
      return res.redirect('/auth-callback?success=false&error=oauth_failed');
    }

    const accessToken = tokenData.access_token;

    // Get user info
    const octokit = new Octokit({ auth: accessToken });
    const { data: user } = await octokit.rest.users.getAuthenticated();

    // Check if user has access to the governance repo
    try {
      await octokit.rest.repos.get({
        owner: GITHUB_REPO_OWNER,
        repo: GITHUB_REPO_NAME,
      });
    } catch (error) {
      if (error.status === 404) {
        return res.redirect('/auth-callback?success=false&error=no_repo_access');
      }
      throw error;
    }

    // Store in session
    req.session.githubToken = accessToken;
    req.session.user = {
      id: user.id,
      login: user.login,
      name: user.name,
      avatar_url: user.avatar_url,
      email: user.email,
    };

    // Log the login event
    logAccess({
      eventType: 'login',
      user: req.session.user,
      appId: null,
      appName: null,
      req
    });

    // Redirect to the callback page which will close the popup
    res.redirect('/auth-callback?success=true');
  } catch (error) {
    console.error('Auth callback error:', error);
    res.redirect('/auth-callback?success=false&error=auth_failed');
  }
});

// Get current user
router.get('/user', (req, res) => {
  if (req.session.user) {
    res.json({
      authenticated: true,
      user: req.session.user,
    });
  } else {
    res.json({
      authenticated: false,
      user: null,
    });
  }
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to logout' });
    }
    res.json({ success: true });
  });
});

// Middleware to check authentication
export const requireAuth = (req, res, next) => {
  if (!req.session.githubToken) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

// Helper to get Octokit instance for current user
export const getOctokit = (req) => {
  if (!req.session.githubToken) {
    throw new Error('Not authenticated');
  }
  return new Octokit({ auth: req.session.githubToken });
};

export default router;

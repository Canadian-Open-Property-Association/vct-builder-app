import express from 'express';
import { requireAuth, getOctokit } from './auth.js';

const router = express.Router();

// GitHub repo configuration
const GITHUB_REPO_OWNER = process.env.GITHUB_REPO_OWNER || 'Canadian-Open-Property-Association';
const GITHUB_REPO_NAME = process.env.GITHUB_REPO_NAME || 'governance';
const VCT_FOLDER_PATH = process.env.VCT_FOLDER_PATH || 'credentials/branding';
const SCHEMA_FOLDER_PATH = process.env.SCHEMA_FOLDER_PATH || 'credentials/schemas';
const BASE_URL = process.env.BASE_URL || 'https://openpropertyassociation.ca';
// Base branch for PRs - if set, use this instead of repo's default branch
const GITHUB_BASE_BRANCH = process.env.GITHUB_BASE_BRANCH || null;

// Get configuration (base URLs for VCT and Schema)
router.get('/config', requireAuth, (req, res) => {
  res.json({
    vctBaseUrl: `${BASE_URL}/credentials/branding/`,
    schemaBaseUrl: `${BASE_URL}/credentials/schemas/`,
  });
});

// List schema files from the repository
router.get('/schema-library', requireAuth, async (req, res) => {
  try {
    const octokit = getOctokit(req);

    // Get contents of the schemas folder (from configured branch if set)
    const { data: contents } = await octokit.rest.repos.getContent({
      owner: GITHUB_REPO_OWNER,
      repo: GITHUB_REPO_NAME,
      path: SCHEMA_FOLDER_PATH,
      ...(GITHUB_BASE_BRANCH && { ref: GITHUB_BASE_BRANCH }),
    });

    // Filter for JSON files only
    const schemaFiles = contents
      .filter((file) => file.type === 'file' && file.name.endsWith('.json'))
      .map((file) => ({
        name: file.name,
        path: file.path,
        sha: file.sha,
        download_url: file.download_url,
        uri: `${BASE_URL}/${file.path}`,
      }));

    res.json(schemaFiles);
  } catch (error) {
    if (error.status === 404) {
      // Folder doesn't exist or is empty
      return res.json([]);
    }
    console.error('Error fetching schema library:', error);
    res.status(500).json({ error: 'Failed to fetch schema library' });
  }
});

// Check if VCT filename is available
router.get('/vct-available/:filename', requireAuth, async (req, res) => {
  try {
    const { filename } = req.params;
    const octokit = getOctokit(req);

    // Ensure filename ends with .json
    const finalFilename = filename.endsWith('.json') ? filename : `${filename}.json`;

    try {
      await octokit.rest.repos.getContent({
        owner: GITHUB_REPO_OWNER,
        repo: GITHUB_REPO_NAME,
        path: `${VCT_FOLDER_PATH}/${finalFilename}`,
        ...(GITHUB_BASE_BRANCH && { ref: GITHUB_BASE_BRANCH }),
      });
      // File exists, so it's not available
      res.json({ available: false, filename: finalFilename });
    } catch (error) {
      if (error.status === 404) {
        // File doesn't exist, so it's available
        res.json({ available: true, filename: finalFilename });
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('Error checking VCT availability:', error);
    res.status(500).json({ error: 'Failed to check VCT availability' });
  }
});

// List VCT files from the repository
router.get('/vct-library', requireAuth, async (req, res) => {
  try {
    const octokit = getOctokit(req);

    // Get contents of the VCT folder (from configured branch if set)
    const { data: contents } = await octokit.rest.repos.getContent({
      owner: GITHUB_REPO_OWNER,
      repo: GITHUB_REPO_NAME,
      path: VCT_FOLDER_PATH,
      ...(GITHUB_BASE_BRANCH && { ref: GITHUB_BASE_BRANCH }),
    });

    // Filter for JSON files only
    const vctFiles = contents
      .filter((file) => file.type === 'file' && file.name.endsWith('.json'))
      .map((file) => ({
        name: file.name,
        path: file.path,
        sha: file.sha,
        download_url: file.download_url,
      }));

    res.json(vctFiles);
  } catch (error) {
    if (error.status === 404) {
      // Folder doesn't exist or is empty
      return res.json([]);
    }
    console.error('Error fetching VCT library:', error);
    res.status(500).json({ error: 'Failed to fetch VCT library' });
  }
});

// Get a specific VCT file content
router.get('/vct/:filename', requireAuth, async (req, res) => {
  try {
    const { filename } = req.params;
    const octokit = getOctokit(req);

    const { data } = await octokit.rest.repos.getContent({
      owner: GITHUB_REPO_OWNER,
      repo: GITHUB_REPO_NAME,
      path: `${VCT_FOLDER_PATH}/${filename}`,
      ...(GITHUB_BASE_BRANCH && { ref: GITHUB_BASE_BRANCH }),
    });

    // Decode base64 content
    const content = Buffer.from(data.content, 'base64').toString('utf-8');
    const vct = JSON.parse(content);

    res.json({
      filename: data.name,
      sha: data.sha,
      content: vct,
    });
  } catch (error) {
    if (error.status === 404) {
      return res.status(404).json({ error: 'VCT file not found' });
    }
    console.error('Error fetching VCT file:', error);
    res.status(500).json({ error: 'Failed to fetch VCT file' });
  }
});

// Create a new VCT file (creates branch + PR)
router.post('/vct', requireAuth, async (req, res) => {
  try {
    const { filename, content, title, description } = req.body;

    if (!filename || !content) {
      return res.status(400).json({ error: 'Filename and content are required' });
    }

    // Ensure filename ends with .json
    const finalFilename = filename.endsWith('.json') ? filename : `${filename}.json`;

    const octokit = getOctokit(req);
    const user = req.session.user;

    // Determine the base branch for the PR
    let baseBranch = GITHUB_BASE_BRANCH;
    if (!baseBranch) {
      // Fall back to repo's default branch if not configured
      const { data: repo } = await octokit.rest.repos.get({
        owner: GITHUB_REPO_OWNER,
        repo: GITHUB_REPO_NAME,
      });
      baseBranch = repo.default_branch;
    }

    // Get the latest commit SHA of the base branch
    const { data: ref } = await octokit.rest.git.getRef({
      owner: GITHUB_REPO_OWNER,
      repo: GITHUB_REPO_NAME,
      ref: `heads/${baseBranch}`,
    });
    const baseSha = ref.object.sha;

    // Create a new branch
    const timestamp = Date.now();
    const branchName = `vct/add-${finalFilename.replace('.json', '')}-${timestamp}`;

    await octokit.rest.git.createRef({
      owner: GITHUB_REPO_OWNER,
      repo: GITHUB_REPO_NAME,
      ref: `refs/heads/${branchName}`,
      sha: baseSha,
    });

    // Create or update the file in the new branch
    const filePath = `${VCT_FOLDER_PATH}/${finalFilename}`;
    const fileContent = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
    const encodedContent = Buffer.from(fileContent).toString('base64');

    await octokit.rest.repos.createOrUpdateFileContents({
      owner: GITHUB_REPO_OWNER,
      repo: GITHUB_REPO_NAME,
      path: filePath,
      message: `Add VCT branding file: ${finalFilename}`,
      content: encodedContent,
      branch: branchName,
    });

    // Create a pull request
    const prTitle = title || `Add VCT branding file: ${finalFilename}`;
    const prBody = description || `This PR adds a new VCT branding file: \`${finalFilename}\`

Created by @${user.login} using the [VCT Builder](https://vct-builder-app.onrender.com).`;

    const { data: pr } = await octokit.rest.pulls.create({
      owner: GITHUB_REPO_OWNER,
      repo: GITHUB_REPO_NAME,
      title: prTitle,
      body: prBody,
      head: branchName,
      base: baseBranch,
    });

    res.json({
      success: true,
      pr: {
        number: pr.number,
        url: pr.html_url,
        title: pr.title,
      },
      branch: branchName,
      file: filePath,
    });
  } catch (error) {
    console.error('Error creating VCT PR:', error);
    res.status(500).json({ error: error.message || 'Failed to create VCT pull request' });
  }
});

export default router;

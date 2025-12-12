import express from 'express';
import { requireAuth, getOctokit } from './auth.js';

const router = express.Router();

// GitHub repo configuration
const GITHUB_REPO_OWNER = process.env.GITHUB_REPO_OWNER || 'Canadian-Open-Property-Association';
const GITHUB_REPO_NAME = process.env.GITHUB_REPO_NAME || 'governance';
const VCT_FOLDER_PATH = process.env.VCT_FOLDER_PATH || 'credentials/vct';
const SCHEMA_FOLDER_PATH = process.env.SCHEMA_FOLDER_PATH || 'credentials/schemas';
const CONTEXT_FOLDER_PATH = process.env.CONTEXT_FOLDER_PATH || 'credentials/contexts';
const ENTITY_FOLDER_PATH = process.env.ENTITY_FOLDER_PATH || 'credentials/entities';
const VOCAB_FOLDER_PATH = process.env.VOCAB_FOLDER_PATH || 'credentials/contexts';
const HARMONIZATION_FOLDER_PATH = process.env.HARMONIZATION_FOLDER_PATH || 'credentials/harmonization';
const BASE_URL = process.env.BASE_URL || 'https://openpropertyassociation.ca';
// Base branch for PRs - if set, use this instead of repo's default branch
const GITHUB_BASE_BRANCH = process.env.GITHUB_BASE_BRANCH || null;

// Get configuration (base URLs for VCT, Schema, Context, Entities, Vocab, and Harmonization)
router.get('/config', requireAuth, (req, res) => {
  res.json({
    vctBaseUrl: `${BASE_URL}/${VCT_FOLDER_PATH}/`,
    schemaBaseUrl: `${BASE_URL}/${SCHEMA_FOLDER_PATH}/`,
    contextBaseUrl: `${BASE_URL}/${CONTEXT_FOLDER_PATH}/`,
    entityBaseUrl: `${BASE_URL}/${ENTITY_FOLDER_PATH}/`,
    vocabBaseUrl: `${BASE_URL}/${VOCAB_FOLDER_PATH}/`,
    harmonizationBaseUrl: `${BASE_URL}/${HARMONIZATION_FOLDER_PATH}/`,
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

// Create a new Schema file (creates branch + PR)
// Supports both JSON Schema (.json) and JSON-LD Context (.jsonld) modes
router.post('/schema', requireAuth, async (req, res) => {
  try {
    const { filename, content, title, description, mode } = req.body;

    if (!filename || !content) {
      return res.status(400).json({ error: 'Filename and content are required' });
    }

    // Determine folder and file extension based on mode
    const isJsonLdMode = mode === 'jsonld-context';
    const extension = isJsonLdMode ? '.jsonld' : '.json';
    const folderPath = isJsonLdMode ? CONTEXT_FOLDER_PATH : SCHEMA_FOLDER_PATH;
    const typeLabel = isJsonLdMode ? 'JSON-LD Context' : 'JSON Schema';
    const branchPrefix = isJsonLdMode ? 'context' : 'schema';

    // Ensure filename ends with correct extension
    let finalFilename = filename;
    if (isJsonLdMode && !filename.endsWith('.jsonld')) {
      finalFilename = filename.replace(/\.json$/, '') + '.jsonld';
    } else if (!isJsonLdMode && !filename.endsWith('.json')) {
      finalFilename = filename + '.json';
    }

    const octokit = getOctokit(req);
    const user = req.session.user;

    // Determine the base branch for the PR
    let baseBranch = GITHUB_BASE_BRANCH;
    if (!baseBranch) {
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
    const branchName = `${branchPrefix}/add-${finalFilename.replace(/\.(json|jsonld)$/, '')}-${timestamp}`;

    await octokit.rest.git.createRef({
      owner: GITHUB_REPO_OWNER,
      repo: GITHUB_REPO_NAME,
      ref: `refs/heads/${branchName}`,
      sha: baseSha,
    });

    // Create or update the file in the new branch
    const filePath = `${folderPath}/${finalFilename}`;
    const fileContent = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
    const encodedContent = Buffer.from(fileContent).toString('base64');

    await octokit.rest.repos.createOrUpdateFileContents({
      owner: GITHUB_REPO_OWNER,
      repo: GITHUB_REPO_NAME,
      path: filePath,
      message: `Add ${typeLabel}: ${finalFilename}`,
      content: encodedContent,
      branch: branchName,
    });

    // Create a pull request
    const prTitle = title || `Add ${typeLabel}: ${finalFilename}`;
    const prBody = description || `This PR adds a new ${typeLabel} file: \`${finalFilename}\`

Created by @${user.login} using the [COPA Apps](https://apps.openpropertyassociation.ca).`;

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
      uri: `${BASE_URL}/${filePath}`,
    });
  } catch (error) {
    console.error('Error creating Schema PR:', error);
    res.status(500).json({ error: error.message || 'Failed to create Schema pull request' });
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

Created by @${user.login} using the [COPA Apps](https://apps.openpropertyassociation.ca).`;

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

// ============================================
// Entity Management Endpoints
// ============================================

// List entities from the repository
router.get('/entity-library', requireAuth, async (req, res) => {
  try {
    const octokit = getOctokit(req);

    // Get entities.json from the entities folder
    const { data } = await octokit.rest.repos.getContent({
      owner: GITHUB_REPO_OWNER,
      repo: GITHUB_REPO_NAME,
      path: `${ENTITY_FOLDER_PATH}/entities.json`,
      ...(GITHUB_BASE_BRANCH && { ref: GITHUB_BASE_BRANCH }),
    });

    // Decode base64 content
    const content = Buffer.from(data.content, 'base64').toString('utf-8');
    const entityData = JSON.parse(content);

    res.json(entityData.entities || []);
  } catch (error) {
    if (error.status === 404) {
      // File doesn't exist yet
      return res.json([]);
    }
    console.error('Error fetching entity library:', error);
    res.status(500).json({ error: 'Failed to fetch entity library' });
  }
});

// Get entity file metadata (for checking if it exists)
router.get('/entity-available', requireAuth, async (req, res) => {
  try {
    const octokit = getOctokit(req);

    try {
      await octokit.rest.repos.getContent({
        owner: GITHUB_REPO_OWNER,
        repo: GITHUB_REPO_NAME,
        path: `${ENTITY_FOLDER_PATH}/entities.json`,
        ...(GITHUB_BASE_BRANCH && { ref: GITHUB_BASE_BRANCH }),
      });
      res.json({ exists: true });
    } catch (error) {
      if (error.status === 404) {
        res.json({ exists: false });
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('Error checking entity availability:', error);
    res.status(500).json({ error: 'Failed to check entity availability' });
  }
});

// Save entities to repository (creates branch + PR)
router.post('/entity', requireAuth, async (req, res) => {
  try {
    const { content, title, description } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const octokit = getOctokit(req);
    const user = req.session.user;

    // Determine the base branch for the PR
    let baseBranch = GITHUB_BASE_BRANCH;
    if (!baseBranch) {
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
    const branchName = `entity/update-entities-${timestamp}`;

    await octokit.rest.git.createRef({
      owner: GITHUB_REPO_OWNER,
      repo: GITHUB_REPO_NAME,
      ref: `refs/heads/${branchName}`,
      sha: baseSha,
    });

    // Check if file exists to get its SHA for update
    let existingSha = null;
    try {
      const { data: existingFile } = await octokit.rest.repos.getContent({
        owner: GITHUB_REPO_OWNER,
        repo: GITHUB_REPO_NAME,
        path: `${ENTITY_FOLDER_PATH}/entities.json`,
        ref: baseBranch,
      });
      existingSha = existingFile.sha;
    } catch (error) {
      if (error.status !== 404) {
        throw error;
      }
      // File doesn't exist, that's fine - we'll create it
    }

    // Create or update the file in the new branch
    const filePath = `${ENTITY_FOLDER_PATH}/entities.json`;
    const fileContent = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
    const encodedContent = Buffer.from(fileContent).toString('base64');

    await octokit.rest.repos.createOrUpdateFileContents({
      owner: GITHUB_REPO_OWNER,
      repo: GITHUB_REPO_NAME,
      path: filePath,
      message: title || 'Update entity registry',
      content: encodedContent,
      branch: branchName,
      ...(existingSha && { sha: existingSha }),
    });

    // Create a pull request
    const prTitle = title || 'Update entity registry';
    const prBody = description || `This PR updates the entity registry.

Created by @${user.login} using the [COPA Apps](https://apps.openpropertyassociation.ca).`;

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
      uri: `${BASE_URL}/${filePath}`,
    });
  } catch (error) {
    console.error('Error creating Entity PR:', error);
    res.status(500).json({ error: error.message || 'Failed to create Entity pull request' });
  }
});

// Upload entity logo to repository (creates branch + PR)
router.post('/entity-logo', requireAuth, async (req, res) => {
  try {
    const { entityId, filename, content, title, description } = req.body;

    if (!entityId || !filename || !content) {
      return res.status(400).json({ error: 'entityId, filename, and content are required' });
    }

    const octokit = getOctokit(req);
    const user = req.session.user;

    // Determine the base branch for the PR
    let baseBranch = GITHUB_BASE_BRANCH;
    if (!baseBranch) {
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
    const branchName = `entity/add-logo-${entityId}-${timestamp}`;

    await octokit.rest.git.createRef({
      owner: GITHUB_REPO_OWNER,
      repo: GITHUB_REPO_NAME,
      ref: `refs/heads/${branchName}`,
      sha: baseSha,
    });

    // Create the logo file in the new branch
    const filePath = `${ENTITY_FOLDER_PATH}/logos/${filename}`;
    // Content should already be base64 encoded from the client
    const encodedContent = content.replace(/^data:image\/\w+;base64,/, '');

    await octokit.rest.repos.createOrUpdateFileContents({
      owner: GITHUB_REPO_OWNER,
      repo: GITHUB_REPO_NAME,
      path: filePath,
      message: `Add logo for entity: ${entityId}`,
      content: encodedContent,
      branch: branchName,
    });

    // Create a pull request
    const prTitle = title || `Add logo for entity: ${entityId}`;
    const prBody = description || `This PR adds a logo for the entity \`${entityId}\`.

Created by @${user.login} using the [COPA Apps](https://apps.openpropertyassociation.ca).`;

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
      logoUri: `${ENTITY_FOLDER_PATH}/logos/${filename}`,
    });
  } catch (error) {
    console.error('Error uploading entity logo:', error);
    res.status(500).json({ error: error.message || 'Failed to upload entity logo' });
  }
});

// ============================================
// Vocabulary Management Endpoints
// ============================================

// Save vocabulary types to repository (creates branch + PR with multiple files)
router.post('/vocab', requireAuth, async (req, res) => {
  try {
    const { vocabTypes, title, description } = req.body;

    if (!vocabTypes || !Array.isArray(vocabTypes) || vocabTypes.length === 0) {
      return res.status(400).json({ error: 'vocabTypes array is required' });
    }

    const octokit = getOctokit(req);
    const user = req.session.user;

    // Determine the base branch for the PR
    let baseBranch = GITHUB_BASE_BRANCH;
    if (!baseBranch) {
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

    // Get the tree of the base commit
    const { data: baseCommit } = await octokit.rest.git.getCommit({
      owner: GITHUB_REPO_OWNER,
      repo: GITHUB_REPO_NAME,
      commit_sha: baseSha,
    });

    // Create blobs for each vocab type file
    const treeItems = [];
    for (const vocabType of vocabTypes) {
      const fileContent = JSON.stringify(vocabType, null, 2);
      const { data: blob } = await octokit.rest.git.createBlob({
        owner: GITHUB_REPO_OWNER,
        repo: GITHUB_REPO_NAME,
        content: fileContent,
        encoding: 'utf-8',
      });

      treeItems.push({
        path: `${VOCAB_FOLDER_PATH}/${vocabType.id}.json`,
        mode: '100644',
        type: 'blob',
        sha: blob.sha,
      });
    }

    // Create a new tree with the new files
    const { data: newTree } = await octokit.rest.git.createTree({
      owner: GITHUB_REPO_OWNER,
      repo: GITHUB_REPO_NAME,
      base_tree: baseCommit.tree.sha,
      tree: treeItems,
    });

    // Create the commit
    const typeCount = vocabTypes.length;
    const typeList = vocabTypes.map((vt) => vt.name).join(', ');
    const commitMessage =
      typeCount === 1
        ? `Add vocabulary type: ${vocabTypes[0].name}`
        : `Add ${typeCount} vocabulary types`;

    const { data: newCommit } = await octokit.rest.git.createCommit({
      owner: GITHUB_REPO_OWNER,
      repo: GITHUB_REPO_NAME,
      message: commitMessage,
      tree: newTree.sha,
      parents: [baseSha],
    });

    // Create a new branch pointing to the new commit
    const timestamp = Date.now();
    const branchName = `vocab/add-${typeCount}-types-${timestamp}`;

    await octokit.rest.git.createRef({
      owner: GITHUB_REPO_OWNER,
      repo: GITHUB_REPO_NAME,
      ref: `refs/heads/${branchName}`,
      sha: newCommit.sha,
    });

    // Create a pull request
    const prTitle = title || (typeCount === 1 ? `Add vocabulary type: ${vocabTypes[0].name}` : `Add ${typeCount} vocabulary types`);
    const prBody =
      description ||
      `This PR adds ${typeCount === 1 ? 'a vocabulary type' : `${typeCount} vocabulary types`} to the governance repository.

**Vocabulary types:**
${vocabTypes.map((vt) => `- \`${vt.id}\`: ${vt.name}`).join('\n')}

Created by @${user.login} using the [COPA Apps](https://apps.openpropertyassociation.ca).`;

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
      files: vocabTypes.map((vt) => `${VOCAB_FOLDER_PATH}/${vt.id}.json`),
    });
  } catch (error) {
    console.error('Error creating Vocab PR:', error);
    res.status(500).json({ error: error.message || 'Failed to create vocabulary pull request' });
  }
});

// ============================================
// Harmonization Mappings Endpoints
// ============================================

// Save harmonization mappings to repository (creates branch + PR)
router.post('/harmonization', requireAuth, async (req, res) => {
  try {
    const { content, title, description } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const octokit = getOctokit(req);
    const user = req.session.user;

    // Determine the base branch for the PR
    let baseBranch = GITHUB_BASE_BRANCH;
    if (!baseBranch) {
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
    const branchName = `harmonization/update-mappings-${timestamp}`;

    await octokit.rest.git.createRef({
      owner: GITHUB_REPO_OWNER,
      repo: GITHUB_REPO_NAME,
      ref: `refs/heads/${branchName}`,
      sha: baseSha,
    });

    // Check if file exists to get its SHA for update
    let existingSha = null;
    try {
      const { data: existingFile } = await octokit.rest.repos.getContent({
        owner: GITHUB_REPO_OWNER,
        repo: GITHUB_REPO_NAME,
        path: `${HARMONIZATION_FOLDER_PATH}/mappings.json`,
        ref: baseBranch,
      });
      existingSha = existingFile.sha;
    } catch (error) {
      if (error.status !== 404) {
        throw error;
      }
      // File doesn't exist, that's fine - we'll create it
    }

    // Create or update the file in the new branch
    const filePath = `${HARMONIZATION_FOLDER_PATH}/mappings.json`;
    const fileContent = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
    const encodedContent = Buffer.from(fileContent).toString('base64');

    await octokit.rest.repos.createOrUpdateFileContents({
      owner: GITHUB_REPO_OWNER,
      repo: GITHUB_REPO_NAME,
      path: filePath,
      message: title || 'Update data harmonization mappings',
      content: encodedContent,
      branch: branchName,
      ...(existingSha && { sha: existingSha }),
    });

    // Create a pull request
    const prTitle = title || 'Update data harmonization mappings';
    const prBody = description || `This PR updates the data harmonization mappings.

Created by @${user.login} using the [COPA Apps](https://apps.openpropertyassociation.ca).`;

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
      uri: `${BASE_URL}/${filePath}`,
    });
  } catch (error) {
    console.error('Error creating Harmonization PR:', error);
    res.status(500).json({ error: error.message || 'Failed to create harmonization pull request' });
  }
});

export default router;

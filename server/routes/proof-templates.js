/**
 * Proof Templates API Routes
 *
 * CRUD operations for proof templates in the Proof Templates Builder app.
 * Uses PostgreSQL via Drizzle ORM.
 */

import express from 'express';
import crypto from 'crypto';
import { getDb, schema } from '../db/index.js';
import { eq, desc } from 'drizzle-orm';
import { requireAuth, getOctokit } from '../auth.js';

const router = express.Router();

// GitHub repo configuration (same as github.js)
const GITHUB_REPO_OWNER = process.env.GITHUB_REPO_OWNER || 'Canadian-Open-Property-Association';
const GITHUB_REPO_NAME = process.env.GITHUB_REPO_NAME || 'governance';
const PROOF_TEMPLATE_FOLDER_PATH = process.env.PROOF_TEMPLATE_FOLDER_PATH || 'credentials/proof-templates';
const BASE_URL = process.env.BASE_URL || 'https://openpropertyassociation.ca';
const GITHUB_BASE_BRANCH = process.env.GITHUB_BASE_BRANCH || null;

/**
 * Middleware to check database availability
 */
const requireDatabase = (req, res, next) => {
  const db = getDb();
  if (!db) {
    return res.status(503).json({
      error: 'Database unavailable',
      message: 'Proof Templates Builder requires PostgreSQL. Please check DATABASE_URL configuration.',
    });
  }
  req.db = db;
  next();
};

/**
 * Get current user from session (COPA GitHub OAuth)
 */
const getCurrentUser = (req) => {
  if (req.session && req.session.user) {
    return {
      githubUserId: String(req.session.user.id),
      githubUsername: req.session.user.login,
      authorName: req.session.user.name || req.session.user.login,
      authorEmail: req.session.user.email,
    };
  }
  return null;
};

/**
 * Convert database row to ProofTemplate response
 */
const toProofTemplateResponse = (row) => ({
  id: row.id,
  name: row.name,
  description: row.description,
  purpose: row.purpose,
  claims: row.claims || [],
  format: row.format,
  metadata: {
    category: row.category,
    version: row.version,
    author: row.githubUsername || row.authorName,
    tags: row.tags || [],
  },
  status: row.status,
  vdrUri: row.vdrUri,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
  publishedAt: row.publishedAt,
});

/**
 * Convert database row to list item response
 */
const toListItemResponse = (row) => ({
  id: row.id,
  name: row.name,
  description: row.description,
  category: row.category,
  status: row.status,
  claimCount: (row.claims || []).length,
  vdrUri: row.vdrUri,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
  publishedAt: row.publishedAt,
});

/**
 * GET /api/proof-templates
 * List all proof templates for the current user
 */
router.get('/', requireDatabase, async (req, res) => {
  try {
    const user = getCurrentUser(req);

    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const templates = await req.db
      .select()
      .from(schema.proofTemplates)
      .where(eq(schema.proofTemplates.githubUserId, user.githubUserId))
      .orderBy(desc(schema.proofTemplates.updatedAt));

    res.json(templates.map(toListItemResponse));
  } catch (error) {
    console.error('Error fetching proof templates:', error);
    res.status(500).json({ error: 'Failed to fetch proof templates' });
  }
});

/**
 * GET /api/proof-templates/:id
 * Get a single proof template by ID
 */
router.get('/:id', requireDatabase, async (req, res) => {
  try {
    const { id } = req.params;
    const user = getCurrentUser(req);

    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const [template] = await req.db
      .select()
      .from(schema.proofTemplates)
      .where(eq(schema.proofTemplates.id, id));

    if (!template) {
      return res.status(404).json({ error: 'Proof template not found' });
    }

    // Check ownership (published templates can be viewed by anyone)
    if (template.githubUserId !== user.githubUserId && template.status !== 'published') {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(toProofTemplateResponse(template));
  } catch (error) {
    console.error('Error fetching proof template:', error);
    res.status(500).json({ error: 'Failed to fetch proof template' });
  }
});

/**
 * POST /api/proof-templates
 * Create a new proof template
 */
router.post('/', requireDatabase, async (req, res) => {
  try {
    const user = getCurrentUser(req);

    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { name, description, purpose, category } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const [template] = await req.db
      .insert(schema.proofTemplates)
      .values({
        name,
        description: description || '',
        purpose: purpose || '',
        claims: [],
        format: 'presentation-exchange',
        category: category || 'general',
        version: '1.0.0',
        tags: [],
        status: 'draft',
        githubUserId: user.githubUserId,
        githubUsername: user.githubUsername,
        authorName: user.authorName,
        authorEmail: user.authorEmail,
      })
      .returning();

    res.status(201).json(toProofTemplateResponse(template));
  } catch (error) {
    console.error('Error creating proof template:', error);
    res.status(500).json({ error: 'Failed to create proof template' });
  }
});

/**
 * PUT /api/proof-templates/:id
 * Update a proof template (only drafts can be updated)
 */
router.put('/:id', requireDatabase, async (req, res) => {
  try {
    const { id } = req.params;
    const user = getCurrentUser(req);

    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check ownership and status
    const [existingTemplate] = await req.db
      .select()
      .from(schema.proofTemplates)
      .where(eq(schema.proofTemplates.id, id));

    if (!existingTemplate) {
      return res.status(404).json({ error: 'Proof template not found' });
    }

    if (existingTemplate.githubUserId !== user.githubUserId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Allow updates to published templates (they can be re-published)
    // if (existingTemplate.status === 'published') {
    //   return res.status(400).json({
    //     error: 'Cannot edit published template',
    //     message: 'Clone this template to create a new draft for editing.',
    //   });
    // }

    const { name, description, purpose, claims, metadata } = req.body;

    const updateData = {
      updatedAt: new Date(),
    };

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (purpose !== undefined) updateData.purpose = purpose;
    if (claims !== undefined) updateData.claims = claims;
    if (metadata) {
      if (metadata.category !== undefined) updateData.category = metadata.category;
      if (metadata.version !== undefined) updateData.version = metadata.version;
      if (metadata.tags !== undefined) updateData.tags = metadata.tags;
    }

    const [updatedTemplate] = await req.db
      .update(schema.proofTemplates)
      .set(updateData)
      .where(eq(schema.proofTemplates.id, id))
      .returning();

    res.json(toProofTemplateResponse(updatedTemplate));
  } catch (error) {
    console.error('Error updating proof template:', error);
    res.status(500).json({ error: 'Failed to update proof template' });
  }
});

/**
 * DELETE /api/proof-templates/:id
 * Delete a proof template
 */
router.delete('/:id', requireDatabase, async (req, res) => {
  try {
    const { id } = req.params;
    const user = getCurrentUser(req);

    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check ownership
    const [existingTemplate] = await req.db
      .select()
      .from(schema.proofTemplates)
      .where(eq(schema.proofTemplates.id, id));

    if (!existingTemplate) {
      return res.status(404).json({ error: 'Proof template not found' });
    }

    if (existingTemplate.githubUserId !== user.githubUserId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await req.db
      .delete(schema.proofTemplates)
      .where(eq(schema.proofTemplates.id, id));

    res.json({ success: true, message: 'Proof template deleted' });
  } catch (error) {
    console.error('Error deleting proof template:', error);
    res.status(500).json({ error: 'Failed to delete proof template' });
  }
});

/**
 * POST /api/proof-templates/:id/publish
 * Publish a proof template to the VDR (creates GitHub PR)
 */
router.post('/:id/publish', requireDatabase, requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { commitMessage } = req.body;
    const user = getCurrentUser(req);

    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get the template
    const [template] = await req.db
      .select()
      .from(schema.proofTemplates)
      .where(eq(schema.proofTemplates.id, id));

    if (!template) {
      return res.status(404).json({ error: 'Proof template not found' });
    }

    if (template.githubUserId !== user.githubUserId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Validate template has claims
    if (!template.claims || template.claims.length === 0) {
      return res.status(400).json({
        error: 'Cannot publish template without claims',
        message: 'Add at least one claim to the template before publishing.',
      });
    }

    // Generate Presentation Exchange definition
    const presentationDefinition = toPresentationDefinition(template);

    // Create filename from category and name
    const safeName = template.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const filename = `${template.category}-${safeName}.json`;
    const filePath = `${PROOF_TEMPLATE_FOLDER_PATH}/${filename}`;

    const octokit = getOctokit(req);

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
    const branchName = `proof-template/add-${safeName}-${timestamp}`;

    await octokit.rest.git.createRef({
      owner: GITHUB_REPO_OWNER,
      repo: GITHUB_REPO_NAME,
      ref: `refs/heads/${branchName}`,
      sha: baseSha,
    });

    // Check if file already exists
    let existingSha = null;
    try {
      const { data: existingFile } = await octokit.rest.repos.getContent({
        owner: GITHUB_REPO_OWNER,
        repo: GITHUB_REPO_NAME,
        path: filePath,
        ref: baseBranch,
      });
      existingSha = existingFile.sha;
    } catch (error) {
      if (error.status !== 404) {
        throw error;
      }
    }

    // Create or update the file
    const fileContent = JSON.stringify(presentationDefinition, null, 2);
    const encodedContent = Buffer.from(fileContent).toString('base64');
    const isUpdate = existingSha !== null;

    await octokit.rest.repos.createOrUpdateFileContents({
      owner: GITHUB_REPO_OWNER,
      repo: GITHUB_REPO_NAME,
      path: filePath,
      message: commitMessage || (isUpdate ? `Update proof template: ${template.name}` : `Add proof template: ${template.name}`),
      content: encodedContent,
      branch: branchName,
      ...(existingSha && { sha: existingSha }),
    });

    // Create a pull request
    const prTitle = isUpdate ? `Update proof template: ${template.name}` : `Add proof template: ${template.name}`;
    const prBody = `This PR ${isUpdate ? 'updates' : 'adds'} the proof template **${template.name}**.

**Purpose:** ${template.purpose || 'Not specified'}
**Category:** ${template.category}
**Claims:** ${template.claims.length}

${template.claims.map((c) => `- ${c.label || c.name}: ${c.purpose || 'No description'}`).join('\n')}

Created by @${req.session.user.login} using the [Cornerstone Network Apps](https://apps.openpropertyassociation.ca).`;

    const { data: pr } = await octokit.rest.pulls.create({
      owner: GITHUB_REPO_OWNER,
      repo: GITHUB_REPO_NAME,
      title: prTitle,
      body: prBody,
      head: branchName,
      base: baseBranch,
    });

    // Update template status and VDR URI
    const vdrUri = `${BASE_URL}/${filePath}`;
    await req.db
      .update(schema.proofTemplates)
      .set({
        status: 'published',
        vdrUri,
        publishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(schema.proofTemplates.id, id));

    res.json({
      success: true,
      prUrl: pr.html_url,
      vdrUri,
      isUpdate,
    });
  } catch (error) {
    console.error('Error publishing proof template:', error);
    res.status(500).json({ error: error.message || 'Failed to publish proof template' });
  }
});

/**
 * POST /api/proof-templates/:id/clone
 * Clone a proof template (creates a new draft copy)
 */
router.post('/:id/clone', requireDatabase, async (req, res) => {
  try {
    const { id } = req.params;
    const user = getCurrentUser(req);

    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const [existingTemplate] = await req.db
      .select()
      .from(schema.proofTemplates)
      .where(eq(schema.proofTemplates.id, id));

    if (!existingTemplate) {
      return res.status(404).json({ error: 'Proof template not found' });
    }

    // Anyone can clone a published template, but only owner can clone drafts
    if (existingTemplate.status !== 'published' && existingTemplate.githubUserId !== user.githubUserId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const [clonedTemplate] = await req.db
      .insert(schema.proofTemplates)
      .values({
        name: `${existingTemplate.name} (Copy)`,
        description: existingTemplate.description,
        purpose: existingTemplate.purpose,
        claims: existingTemplate.claims,
        format: existingTemplate.format,
        category: existingTemplate.category,
        version: '1.0.0', // Reset version for clone
        tags: existingTemplate.tags,
        status: 'draft',
        githubUserId: user.githubUserId,
        githubUsername: user.githubUsername,
        authorName: user.authorName,
        authorEmail: user.authorEmail,
        clonedFrom: id,
      })
      .returning();

    res.status(201).json(toProofTemplateResponse(clonedTemplate));
  } catch (error) {
    console.error('Error cloning proof template:', error);
    res.status(500).json({ error: 'Failed to clone proof template' });
  }
});

/**
 * Convert a ProofTemplate to DIF Presentation Exchange format
 */
function toPresentationDefinition(template) {
  return {
    id: template.id,
    name: template.name,
    purpose: template.purpose,
    format: {
      jwt_vc: { alg: ['ES256', 'ES384'] },
      jwt_vp: { alg: ['ES256', 'ES384'] },
    },
    input_descriptors: template.claims.map((claim) => claimToInputDescriptor(claim)),
  };
}

function claimToInputDescriptor(claim) {
  const fields = [
    {
      id: claim.id,
      path: [`$.credentialSubject.${claim.fieldPath}`, `$.vc.credentialSubject.${claim.fieldPath}`],
      purpose: claim.purpose,
      ...buildFieldConstraints(claim),
    },
  ];

  // Add credential type filter if specified
  if (claim.credentialType) {
    fields.push({
      path: ['$.type', '$.vc.type'],
      filter: {
        type: 'array',
        contains: { const: claim.credentialType },
      },
    });
  }

  const constraints = {
    fields,
  };

  // Check for limit_disclosure constraints
  const limitDisclosure = (claim.constraints || []).find((c) => c.type === 'limit_disclosure');
  if (limitDisclosure) {
    constraints.limit_disclosure = 'required';
  }

  return {
    id: claim.id,
    name: claim.label || claim.name,
    purpose: claim.purpose,
    constraints,
  };
}

function buildFieldConstraints(claim) {
  const result = {};

  for (const constraint of claim.constraints || []) {
    if (constraint.type === 'predicate') {
      result.predicate = 'required';
      result.filter = buildPredicateFilter(constraint.config);
    } else if (constraint.type === 'field_match') {
      const config = constraint.config;
      if (config.expectedValues?.length === 1) {
        result.filter = { const: config.expectedValues[0] };
      } else if (config.expectedValues?.length > 1) {
        result.filter = { enum: config.expectedValues };
      }
    }
  }

  return result;
}

function buildPredicateFilter(config) {
  const filter = {};

  switch (config.operator) {
    case 'equals':
      filter.const = config.value;
      break;
    case 'not_equals':
      filter.not = { const: config.value };
      break;
    case 'greater_than':
      filter.exclusiveMinimum = Number(config.value);
      break;
    case 'less_than':
      filter.exclusiveMaximum = Number(config.value);
      break;
    case 'greater_or_equal':
      filter.minimum = Number(config.value);
      break;
    case 'less_or_equal':
      filter.maximum = Number(config.value);
      break;
  }

  if (config.predicateType === 'date') {
    filter.format = 'date';
  } else if (config.predicateType === 'integer') {
    filter.type = 'integer';
  }

  return filter;
}

export default router;

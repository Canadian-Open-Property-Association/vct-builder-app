/**
 * Submissions API Routes
 *
 * Handle form submissions for the Forms Builder app.
 * Public endpoint for submissions, authenticated for viewing.
 */

import express from 'express';
import crypto from 'crypto';
import { getDb, schema } from '../db/index.js';
import { eq, desc, and, inArray } from 'drizzle-orm';

const router = express.Router();

/**
 * Middleware to check database availability
 */
const requireDatabase = (req, res, next) => {
  const db = getDb();
  if (!db) {
    return res.status(503).json({
      error: 'Database unavailable',
      message: 'Forms Builder requires PostgreSQL. Please check DATABASE_URL configuration.',
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
    };
  }
  return null;
};

/**
 * POST /api/forms/:formId/submissions
 * Submit a form (public endpoint - no auth required)
 */
router.post('/forms/:formId/submissions', requireDatabase, async (req, res) => {
  try {
    const { formId } = req.params;
    const { fieldValues, sessionId, proofPresentations, isTest } = req.body;

    // Verify form exists and is published
    const [form] = await req.db
      .select()
      .from(schema.forms)
      .where(eq(schema.forms.id, formId));

    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    if (form.status !== 'published' && !isTest) {
      return res.status(400).json({ error: 'Form is not accepting submissions' });
    }

    if (!fieldValues || typeof fieldValues !== 'object') {
      return res.status(400).json({ error: 'Field values are required' });
    }

    const [submission] = await req.db
      .insert(schema.submissions)
      .values({
        formId,
        sessionId: sessionId || crypto.randomUUID(),
        isTest: isTest || false,
        fieldValues,
        proofPresentations: proofPresentations || null,
      })
      .returning();

    res.status(201).json({
      id: submission.id,
      message: 'Form submitted successfully',
      submittedAt: submission.submittedAt,
    });
  } catch (error) {
    console.error('Error submitting form:', error);
    res.status(500).json({ error: 'Failed to submit form' });
  }
});

/**
 * GET /api/submissions
 * List all submissions for current user's forms
 */
router.get('/', requireDatabase, async (req, res) => {
  try {
    const user = getCurrentUser(req);

    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get all forms owned by user
    const userForms = await req.db
      .select({ id: schema.forms.id, title: schema.forms.title })
      .from(schema.forms)
      .where(eq(schema.forms.githubUserId, user.githubUserId));

    if (userForms.length === 0) {
      return res.json([]);
    }

    const formIds = userForms.map((f) => f.id);
    const formTitleMap = Object.fromEntries(userForms.map((f) => [f.id, f.title]));

    // Get submissions for those forms
    const submissions = await req.db
      .select()
      .from(schema.submissions)
      .where(inArray(schema.submissions.formId, formIds))
      .orderBy(desc(schema.submissions.submittedAt));

    // Add form title to each submission
    const enrichedSubmissions = submissions.map((s) => ({
      ...s,
      formTitle: formTitleMap[s.formId] || 'Unknown Form',
    }));

    res.json(enrichedSubmissions);
  } catch (error) {
    console.error('Error fetching submissions:', error);
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
});

/**
 * GET /api/submissions/form/:formId
 * List submissions for a specific form
 */
router.get('/form/:formId', requireDatabase, async (req, res) => {
  try {
    const { formId } = req.params;
    const user = getCurrentUser(req);

    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Verify form ownership
    const [form] = await req.db
      .select()
      .from(schema.forms)
      .where(eq(schema.forms.id, formId));

    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    if (form.githubUserId !== user.githubUserId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const submissions = await req.db
      .select()
      .from(schema.submissions)
      .where(eq(schema.submissions.formId, formId))
      .orderBy(desc(schema.submissions.submittedAt));

    res.json(submissions);
  } catch (error) {
    console.error('Error fetching submissions:', error);
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
});

/**
 * GET /api/submissions/:id
 * Get a single submission by ID
 */
router.get('/:id', requireDatabase, async (req, res) => {
  try {
    const { id } = req.params;
    const user = getCurrentUser(req);

    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const [submission] = await req.db
      .select()
      .from(schema.submissions)
      .where(eq(schema.submissions.id, id));

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    // Verify form ownership
    const [form] = await req.db
      .select()
      .from(schema.forms)
      .where(eq(schema.forms.id, submission.formId));

    if (!form || form.githubUserId !== user.githubUserId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({
      ...submission,
      formTitle: form.title,
      formSchema: form.schema,
    });
  } catch (error) {
    console.error('Error fetching submission:', error);
    res.status(500).json({ error: 'Failed to fetch submission' });
  }
});

/**
 * DELETE /api/submissions/:id
 * Delete a submission
 */
router.delete('/:id', requireDatabase, async (req, res) => {
  try {
    const { id } = req.params;
    const user = getCurrentUser(req);

    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const [submission] = await req.db
      .select()
      .from(schema.submissions)
      .where(eq(schema.submissions.id, id));

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    // Verify form ownership
    const [form] = await req.db
      .select()
      .from(schema.forms)
      .where(eq(schema.forms.id, submission.formId));

    if (!form || form.githubUserId !== user.githubUserId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await req.db
      .delete(schema.submissions)
      .where(eq(schema.submissions.id, id));

    res.json({ success: true, message: 'Submission deleted' });
  } catch (error) {
    console.error('Error deleting submission:', error);
    res.status(500).json({ error: 'Failed to delete submission' });
  }
});

/**
 * DELETE /api/submissions/bulk
 * Delete multiple submissions
 */
router.delete('/bulk', requireDatabase, async (req, res) => {
  try {
    const { ids } = req.body;
    const user = getCurrentUser(req);

    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'IDs array is required' });
    }

    // Get all submissions and their forms
    const submissions = await req.db
      .select()
      .from(schema.submissions)
      .where(inArray(schema.submissions.id, ids));

    if (submissions.length === 0) {
      return res.status(404).json({ error: 'No submissions found' });
    }

    // Get unique form IDs
    const formIds = [...new Set(submissions.map((s) => s.formId))];

    // Verify ownership of all forms
    const forms = await req.db
      .select()
      .from(schema.forms)
      .where(inArray(schema.forms.id, formIds));

    const unauthorizedForms = forms.filter((f) => f.githubUserId !== user.githubUserId);

    if (unauthorizedForms.length > 0) {
      return res.status(403).json({ error: 'Access denied to some submissions' });
    }

    await req.db
      .delete(schema.submissions)
      .where(inArray(schema.submissions.id, ids));

    res.json({ success: true, message: `${ids.length} submissions deleted` });
  } catch (error) {
    console.error('Error deleting submissions:', error);
    res.status(500).json({ error: 'Failed to delete submissions' });
  }
});

/**
 * GET /api/submissions/export/:formId
 * Export all submissions for a form as JSON
 */
router.get('/export/:formId', requireDatabase, async (req, res) => {
  try {
    const { formId } = req.params;
    const user = getCurrentUser(req);

    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Verify form ownership
    const [form] = await req.db
      .select()
      .from(schema.forms)
      .where(eq(schema.forms.id, formId));

    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    if (form.githubUserId !== user.githubUserId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const submissions = await req.db
      .select()
      .from(schema.submissions)
      .where(eq(schema.submissions.formId, formId))
      .orderBy(desc(schema.submissions.submittedAt));

    // Format for export
    const exportData = {
      formId: form.id,
      formTitle: form.title,
      exportedAt: new Date().toISOString(),
      totalSubmissions: submissions.length,
      submissions: submissions.map((s) => ({
        id: s.id,
        submittedAt: s.submittedAt,
        isTest: s.isTest,
        fieldValues: s.fieldValues,
        proofPresentations: s.proofPresentations,
      })),
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${form.title.replace(/[^a-z0-9]/gi, '_')}_submissions.json"`
    );
    res.json(exportData);
  } catch (error) {
    console.error('Error exporting submissions:', error);
    res.status(500).json({ error: 'Failed to export submissions' });
  }
});

/**
 * GET /api/submissions/stats/:formId
 * Get submission statistics for a form
 */
router.get('/stats/:formId', requireDatabase, async (req, res) => {
  try {
    const { formId } = req.params;
    const user = getCurrentUser(req);

    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Verify form ownership
    const [form] = await req.db
      .select()
      .from(schema.forms)
      .where(eq(schema.forms.id, formId));

    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    if (form.githubUserId !== user.githubUserId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const submissions = await req.db
      .select()
      .from(schema.submissions)
      .where(eq(schema.submissions.formId, formId));

    const total = submissions.length;
    const testSubmissions = submissions.filter((s) => s.isTest).length;
    const liveSubmissions = total - testSubmissions;

    res.json({
      formId,
      total,
      liveSubmissions,
      testSubmissions,
    });
  } catch (error) {
    console.error('Error fetching submission stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

export default router;

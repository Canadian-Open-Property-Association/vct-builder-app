/**
 * Forms API Routes
 *
 * CRUD operations for forms in the Forms Builder app.
 * Uses PostgreSQL via Drizzle ORM.
 */

import express from 'express';
import crypto from 'crypto';
import { getDb, schema } from '../db/index.js';
import { eq, desc } from 'drizzle-orm';

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
      authorName: req.session.user.name || req.session.user.login,
      authorEmail: req.session.user.email,
    };
  }
  return null;
};

/**
 * GET /api/forms
 * List all forms for the current user
 */
router.get('/', requireDatabase, async (req, res) => {
  try {
    const user = getCurrentUser(req);

    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const forms = await req.db
      .select()
      .from(schema.forms)
      .where(eq(schema.forms.githubUserId, user.githubUserId))
      .orderBy(desc(schema.forms.updatedAt));

    res.json(forms);
  } catch (error) {
    console.error('Error fetching forms:', error);
    res.status(500).json({ error: 'Failed to fetch forms' });
  }
});

/**
 * POST /api/forms/migrate/field-types
 * Migrate verified-credential field types to verifiable-credential
 * This is a one-time migration endpoint
 * NOTE: Must be defined before /:id routes to avoid path conflict
 */
router.post('/migrate/field-types', requireDatabase, async (req, res) => {
  try {
    const user = getCurrentUser(req);

    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get all forms
    const forms = await req.db.select().from(schema.forms);

    let migratedCount = 0;

    for (const form of forms) {
      let updated = false;
      const updatedSchema = { ...form.schema };

      // Update field types in all sections
      if (updatedSchema.sections) {
        for (const section of updatedSchema.sections) {
          if (section.fields) {
            for (const field of section.fields) {
              if (field.type === 'verified-credential') {
                field.type = 'verifiable-credential';
                updated = true;
              }
            }
          }
        }
      }

      if (updated) {
        await req.db
          .update(schema.forms)
          .set({
            schema: updatedSchema,
            updatedAt: new Date(),
          })
          .where(eq(schema.forms.id, form.id));
        migratedCount++;
      }
    }

    res.json({
      success: true,
      message: `Migrated ${migratedCount} form(s) from verified-credential to verifiable-credential`,
      migratedCount,
    });
  } catch (error) {
    console.error('Error migrating field types:', error);
    res.status(500).json({ error: 'Failed to migrate field types' });
  }
});

/**
 * GET /api/forms/:id
 * Get a single form by ID
 */
router.get('/:id', requireDatabase, async (req, res) => {
  try {
    const { id } = req.params;
    const user = getCurrentUser(req);

    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const [form] = await req.db
      .select()
      .from(schema.forms)
      .where(eq(schema.forms.id, id));

    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    // Check ownership (unless form is published - published forms can be viewed by anyone)
    if (form.githubUserId !== user.githubUserId && form.status !== 'published') {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(form);
  } catch (error) {
    console.error('Error fetching form:', error);
    res.status(500).json({ error: 'Failed to fetch form' });
  }
});

/**
 * GET /api/forms/slug/:slug
 * Get a published form by slug (public endpoint)
 */
router.get('/slug/:slug', requireDatabase, async (req, res) => {
  try {
    const { slug } = req.params;

    const [form] = await req.db
      .select()
      .from(schema.forms)
      .where(eq(schema.forms.slug, slug));

    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    if (form.status !== 'published') {
      return res.status(404).json({ error: 'Form not published' });
    }

    res.json(form);
  } catch (error) {
    console.error('Error fetching form by slug:', error);
    res.status(500).json({ error: 'Failed to fetch form' });
  }
});

/**
 * POST /api/forms
 * Create a new form
 */
router.post('/', requireDatabase, async (req, res) => {
  try {
    const user = getCurrentUser(req);

    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { title, description, schema: formSchema, mode } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    // Default form schema if not provided
    const defaultSchema = {
      sections: [
        {
          id: crypto.randomUUID(),
          title: 'Section 1',
          fields: [],
        },
      ],
      infoScreen: null,
      successScreen: {
        title: 'Thank you!',
        content: 'Your form has been submitted successfully.',
      },
    };

    const [form] = await req.db
      .insert(schema.forms)
      .values({
        title,
        description: description || '',
        schema: formSchema || defaultSchema,
        mode: mode || 'simple',
        status: 'draft',
        githubUserId: user.githubUserId,
        githubUsername: user.githubUsername,
        authorName: user.authorName,
        authorEmail: user.authorEmail,
      })
      .returning();

    res.status(201).json(form);
  } catch (error) {
    console.error('Error creating form:', error);
    res.status(500).json({ error: 'Failed to create form' });
  }
});

/**
 * PUT /api/forms/:id
 * Update a form (only drafts can be updated)
 */
router.put('/:id', requireDatabase, async (req, res) => {
  try {
    const { id } = req.params;
    const user = getCurrentUser(req);

    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check ownership and status
    const [existingForm] = await req.db
      .select()
      .from(schema.forms)
      .where(eq(schema.forms.id, id));

    if (!existingForm) {
      return res.status(404).json({ error: 'Form not found' });
    }

    if (existingForm.githubUserId !== user.githubUserId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (existingForm.status === 'published') {
      return res.status(400).json({
        error: 'Cannot edit published form',
        message: 'Clone this form to create a new draft for editing.',
      });
    }

    const { title, description, schema: formSchema, mode } = req.body;

    const [updatedForm] = await req.db
      .update(schema.forms)
      .set({
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(formSchema !== undefined && { schema: formSchema }),
        ...(mode !== undefined && { mode }),
        updatedAt: new Date(),
      })
      .where(eq(schema.forms.id, id))
      .returning();

    res.json(updatedForm);
  } catch (error) {
    console.error('Error updating form:', error);
    res.status(500).json({ error: 'Failed to update form' });
  }
});

/**
 * DELETE /api/forms/:id
 * Delete a form
 */
router.delete('/:id', requireDatabase, async (req, res) => {
  try {
    const { id } = req.params;
    const user = getCurrentUser(req);

    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check ownership
    const [existingForm] = await req.db
      .select()
      .from(schema.forms)
      .where(eq(schema.forms.id, id));

    if (!existingForm) {
      return res.status(404).json({ error: 'Form not found' });
    }

    if (existingForm.githubUserId !== user.githubUserId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await req.db
      .delete(schema.forms)
      .where(eq(schema.forms.id, id));

    res.json({ success: true, message: 'Form deleted' });
  } catch (error) {
    console.error('Error deleting form:', error);
    res.status(500).json({ error: 'Failed to delete form' });
  }
});

/**
 * PUT /api/forms/:id/publish
 * Publish a form (generates slug for public access)
 */
router.put('/:id/publish', requireDatabase, async (req, res) => {
  try {
    const { id } = req.params;
    const user = getCurrentUser(req);

    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check ownership
    const [existingForm] = await req.db
      .select()
      .from(schema.forms)
      .where(eq(schema.forms.id, id));

    if (!existingForm) {
      return res.status(404).json({ error: 'Form not found' });
    }

    if (existingForm.githubUserId !== user.githubUserId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (existingForm.status === 'published') {
      return res.status(400).json({ error: 'Form is already published' });
    }

    // Generate unique slug
    const slug = crypto.randomUUID();

    const [publishedForm] = await req.db
      .update(schema.forms)
      .set({
        status: 'published',
        slug,
        publishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(schema.forms.id, id))
      .returning();

    res.json({
      ...publishedForm,
      publicUrl: `/f/${slug}`,
    });
  } catch (error) {
    console.error('Error publishing form:', error);
    res.status(500).json({ error: 'Failed to publish form' });
  }
});

/**
 * PUT /api/forms/:id/unpublish
 * Unpublish a form (keeps slug for potential re-publish)
 */
router.put('/:id/unpublish', requireDatabase, async (req, res) => {
  try {
    const { id } = req.params;
    const user = getCurrentUser(req);

    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const [existingForm] = await req.db
      .select()
      .from(schema.forms)
      .where(eq(schema.forms.id, id));

    if (!existingForm) {
      return res.status(404).json({ error: 'Form not found' });
    }

    if (existingForm.githubUserId !== user.githubUserId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (existingForm.status !== 'published') {
      return res.status(400).json({ error: 'Form is not published' });
    }

    const [unpublishedForm] = await req.db
      .update(schema.forms)
      .set({
        status: 'draft',
        updatedAt: new Date(),
      })
      .where(eq(schema.forms.id, id))
      .returning();

    res.json(unpublishedForm);
  } catch (error) {
    console.error('Error unpublishing form:', error);
    res.status(500).json({ error: 'Failed to unpublish form' });
  }
});

/**
 * POST /api/forms/:id/clone
 * Clone a form (creates a new draft copy)
 */
router.post('/:id/clone', requireDatabase, async (req, res) => {
  try {
    const { id } = req.params;
    const user = getCurrentUser(req);

    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const [existingForm] = await req.db
      .select()
      .from(schema.forms)
      .where(eq(schema.forms.id, id));

    if (!existingForm) {
      return res.status(404).json({ error: 'Form not found' });
    }

    // Anyone can clone a published form, but only owner can clone drafts
    if (existingForm.status !== 'published' && existingForm.githubUserId !== user.githubUserId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const [clonedForm] = await req.db
      .insert(schema.forms)
      .values({
        title: `${existingForm.title} (Copy)`,
        description: existingForm.description,
        schema: existingForm.schema,
        mode: existingForm.mode,
        status: 'draft',
        githubUserId: user.githubUserId,
        githubUsername: user.githubUsername,
        authorName: user.authorName,
        authorEmail: user.authorEmail,
        clonedFrom: id,
      })
      .returning();

    res.status(201).json(clonedForm);
  } catch (error) {
    console.error('Error cloning form:', error);
    res.status(500).json({ error: 'Failed to clone form' });
  }
});

export default router;

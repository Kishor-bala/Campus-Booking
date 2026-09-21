import { Router } from 'express';
import {
  listResources,
  getResourceById,
  getResourceSlots,
  adminListResources,
  adminCreateResource,
  adminUpdateResource,
  adminGenerateSlots,
  adminUpdateSlot,
} from '../controllers/resource.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';

const router = Router();

// Student Routes
router.get('/resources', requireAuth, listResources);
router.get('/resources/:id', requireAuth, getResourceById);
router.get('/resources/:id/slots', requireAuth, getResourceSlots);

// Admin Routes
router.get('/admin/resources', requireAuth, requireRole('ADMIN'), adminListResources);
router.post('/admin/resources', requireAuth, requireRole('ADMIN'), adminCreateResource);
router.patch('/admin/resources/:id', requireAuth, requireRole('ADMIN'), adminUpdateResource);
router.post('/admin/resources/:id/slots/generate', requireAuth, requireRole('ADMIN'), adminGenerateSlots);
router.patch('/admin/slots/:id', requireAuth, requireRole('ADMIN'), adminUpdateSlot);

export default router;

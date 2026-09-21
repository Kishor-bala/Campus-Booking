import { Router } from 'express';
import { getLiveness, getReadiness } from '../controllers/health.controller.js';

const router = Router();

router.get('/live', getLiveness);
router.get('/ready', getReadiness);

export default router;

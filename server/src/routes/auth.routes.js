import { Router } from 'express';
import { register, login, verifyOtp, resendOtp, me, logout, getCsrfTokenController } from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/csrf', getCsrfTokenController);
router.post('/register', register);
router.post('/login', login);
router.post('/verify-otp', verifyOtp);
router.post('/resend-otp', resendOtp);
router.get('/me', requireAuth, me);
router.post('/logout', requireAuth, logout);

export default router;

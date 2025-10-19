import { Router } from 'express';
import { query, body } from 'express-validator';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { getPool } from '../utils/db.js';
import { requireAuth } from '../middleware/auth.js';
import { handleValidation } from '../middleware/validate.js';

const router = Router();

/**
 * POST /auth/login
 * Expects: { email, password }
 * Returns: { token, user }
 */
router.post(
  '/login',
  body('email').isEmail().normalizeEmail(),
  body('password').isString().isLength({ min: 6 }),
  handleValidation,
  async (req, res, next) => {
    try {

      if (!process.env.JWT_SECRET) {
        return res.status(500).json({ message: 'Server misconfigured: JWT_SECRET not set' });
      }

      const { email, password } = req.body;
      const pool = getPool();

      const result = await pool
        .request()
        .input('email', email)
        .query(`
          SELECT TOP 1 
            u.id, u.email, u.password_hash, u.full_name, u.is_active,
            (
              SELECT TOP 1 r.name
              FROM UserRoles ur
              JOIN Roles r ON r.id = ur.role_id
              WHERE ur.user_id = u.id
              ORDER BY r.name
            ) AS role
          FROM Users u
          WHERE u.email = @email
        `);

      const user = result.recordset[0];

      // hard fail if no user / inactive
      if (!user || !user.is_active) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // compare password (async)
      const ok = await bcrypt.compare(password, user.password_hash);
      if (!ok) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // normalize role + payload (aligns with middleware)
      const role = user.role || 'Staff';
      const payload = {
        userId: user.id,      // <-- used by requireAuth downstream
        sub: user.id,         // keep sub for compatibility
        email: user.email,
        role,
        name: user.full_name,
      };

      const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '2d',
      });

      return res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.full_name,
          role,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /auth/me
 * Quick token check & user echo for Postman
 */
router.get('/me', requireAuth, async (req, res) => {
  // req.user is attached by requireAuth
  res.json({ user: req.user });
});

export default router;

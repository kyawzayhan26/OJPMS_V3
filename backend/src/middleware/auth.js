// src/middleware/auth.js
import jwt from 'jsonwebtoken';

/**
 * Roles we support
 */
export const Roles = {
  Admin: 'Admin',
  Staff: 'Staff',
};

/**
 * Central permissions map.
 * Left side: "resource:action"; Right side: roles that are allowed.
 * Adjust these to fit your policy.
 */
export const PERMISSIONS = {
  // Employers
  'employers:read':   [Roles.Admin],
  'employers:write':  [Roles.Admin],   // create/update
  'employers:activate':[Roles.Admin],               // activate/deactivate

  // Jobs
  'jobs:read':        [Roles.Admin, Roles.Staff],
  'jobs:write':       [Roles.Admin, Roles.Staff],

  // Prospects
  'prospects:read':   [Roles.Admin, Roles.Staff],
  'prospects:write':  [Roles.Admin, Roles.Staff],

  // Applications
  'applications:read':[Roles.Admin, Roles.Staff],
  'applications:write':[Roles.Admin, Roles.Staff],

  // Interviews
  'interviews:read':  [Roles.Admin, Roles.Staff],
  'interviews:write': [Roles.Admin, Roles.Staff],

  // Clients (separate status transitions from record management)
  'clients:read':       [Roles.Admin, Roles.Staff],
  'clients:write':      [Roles.Admin, Roles.Staff],                // create/update/delete
  'clients:transition': [Roles.Admin, Roles.Staff],   // kanban movements

  // Documents (file ops can stay broad)
  'documents:read':   [Roles.Admin, Roles.Staff],
  'documents:write':  [Roles.Admin, Roles.Staff],

  // Payments (usually restricted)
  'payments:read':    [Roles.Admin, Roles.Staff],
  'payments:write':   [Roles.Admin],                // only Admin can create/update payments

  // Prospect job matches
  'prospectJobMatches:read':  [Roles.Admin, Roles.Staff],
  'prospectJobMatches:write': [Roles.Admin, Roles.Staff],

  // Visa applications
  'visaApplications:read':    [Roles.Admin, Roles.Staff],
  'visaApplications:write':   [Roles.Admin, Roles.Staff],

  // SmartCard applications
  'smartCardApplications:read':  [Roles.Admin, Roles.Staff],
  'smartCardApplications:write': [Roles.Admin, Roles.Staff],

  // Flight bookings
  'flightBookings:read':  [Roles.Admin, Roles.Staff],
  'flightBookings:write': [Roles.Admin, Roles.Staff],
};

/**
 * Middleware: ensure the request has a valid Bearer token.
 * Attaches req.user = { userId, email, role, name } from the token payload.
 */
export function requireAuth(req, res, next) {
  try {
    const hdr = req.headers.authorization || '';
    const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'Missing token' });

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      // Fail fast if misconfigured
      return res.status(500).json({ message: 'Server misconfigured: JWT_SECRET not set' });
    }

    const payload = jwt.verify(token, secret);
    // payload should contain at least: { sub/userId, role }
    req.user = {
      userId: payload.sub || payload.userId || payload.id,
      email:  payload.email,
      role:   payload.role || Roles.Staff,
      name:   payload.name,
    };
    return next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

/**
 * Returns a middleware that enforces a single permission.
 * Example: router.post('/', requireAuth, can('employers:write'), handler)
 */
export function can(permission) {
  return (req, res, next) => {
    const role = req.user?.role;
    const allowed = PERMISSIONS[permission];
    if (!allowed) {
      // Unknown permission => deny by default
      return res.status(403).json({ message: `Permission not recognized: ${permission}` });
    }
    if (!role || !allowed.includes(role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    next();
  };
}

/**
 * Returns a middleware that passes if the user has ANY of the given permissions.
 * Example: router.patch('/:id', requireAuth, canAny(['applications:write','applications:review']), handler)
 */
export function canAny(permissions) {
  return (req, res, next) => {
    const role = req.user?.role;
    if (!role) return res.status(403).json({ message: 'Forbidden' });

    const allowed = permissions.some((p) => {
      const roles = PERMISSIONS[p];
      return Array.isArray(roles) && roles.includes(role);
    });

    if (!allowed) return res.status(403).json({ message: 'Forbidden' });
    next();
  };
}

// src/middleware/upload.js
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { customAlphabet } from 'nanoid';
import { extension as extFromMime } from 'mime-types';

const envDir = process.env.UPLOAD_DIR || './uploads';
// ✅ ensure absolute
const UPLOAD_DIR = path.isAbsolute(envDir) ? envDir : path.resolve(process.cwd(), envDir);

const MAX_UPLOAD_MB = Number(process.env.MAX_UPLOAD_MB || 20);
const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 16);

function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const now = new Date();
    const rel = path.posix.join('documents', String(now.getFullYear()), String(now.getMonth()+1).padStart(2,'0'));
    const dest = path.join(UPLOAD_DIR, ...rel.split('/')); // OS-safe join
    try { ensureDir(dest); req._uploadRelDir = rel; cb(null, dest); } catch (e) { cb(e); }
  },
  filename: (_req, file, cb) => {
    const safeExt = extFromMime(file.mimetype) || 'bin';
    cb(null, `${Date.now()}_${nanoid()}.${safeExt}`);
  }
});

export const uploadSingleDocument = multer({
  storage,
  limits: { fileSize: MAX_UPLOAD_MB * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    const ok = new Set([
      'application/pdf', 'image/jpeg', 'image/png', 'image/webp',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]);
    if (ok.has(file.mimetype)) return cb(null, true);
    cb(Object.assign(new Error('Unsupported file type'), { status: 415, code: 'unsupported_media_type' }));
  }
}).single('file');

// ✅ Robust resolver: URL-ish relative path -> absolute filesystem path under UPLOAD_DIR
export function resolvePublicPath(relPath) {
  const urlRel = String(relPath || '').replace(/\\/g, '/').replace(/^\/+/, '');
  const abs = path.resolve(UPLOAD_DIR, ...urlRel.split('/'));
  const root = path.resolve(UPLOAD_DIR);
  if (!abs.startsWith(root + path.sep) && abs !== root) {
    const err = new Error('Invalid path'); err.status = 400; throw err;
  }
  return abs; // absolute!
}

// (Optional) helper to make URL-friendly path from FS path
export function toUrlPath(relPath) {
  return String(relPath).replace(/\\/g, '/');
}


export { UPLOAD_DIR }; // if you want to inspect or log it elsewhere

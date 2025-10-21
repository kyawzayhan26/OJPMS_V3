import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';

//middlewares
import { connectPool } from './utils/db.js';
import { requestDebug } from './middleware/requestDebug.js';
import { requestId } from './middleware/requestId.js';
import { rateLimit } from './middleware/rateLimit.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';


//routes
import authRouter from './routes/auth.js';
import prospectsRouter from './routes/prospects.js';
import employersRouter from './routes/employers.js';
import jobsRouter from './routes/jobs.js';
import applicationsRouter from './routes/applications.js';
import interviewsRouter from './routes/interviews.js';
import clientsRouter from './routes/clients.js';
import documentsRouter from './routes/documents.js';
import paymentsRouter from './routes/payments.js';
import prospectJobMatchesRouter from './routes/prospectJobMatches.js';
import visaApplicationsRouter from './routes/visaApplications.js';
import smartCardApplicationsRouter from './routes/smartCardApplications.js';

const app = express();
const port = process.env.PORT || 4000;

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));
app.use(requestId);
app.use(requestDebug({ maxBodyLen: 2000 }));
app.use(rateLimit);

//health check
app.get('/health', (_req, res) => res.json({ ok: true }));

app.use('/auth', authRouter);
app.use('/prospects', prospectsRouter);
app.use('/employers', employersRouter);
app.use('/jobs', jobsRouter);
app.use('/applications', applicationsRouter);
app.use('/interviews', interviewsRouter);
app.use('/clients', clientsRouter);
app.use('/documents', documentsRouter);
app.use('/payments', paymentsRouter);
app.use('/prospect-job-matches', prospectJobMatchesRouter);
app.use('/visa-applications', visaApplicationsRouter);
app.use('/smartcard-applications', smartCardApplicationsRouter);


// tighten CORS after routes if you need different policy for static /api/
app.use(cors({ origin: ['http://localhost:5173','http://localhost:3000'], credentials: false }));

// 404 then custom error handler
app.use(notFoundHandler);
app.use(errorHandler);

(async () => {
  await connectPool();
  app.listen(port, () => console.log(`🚀 OJPMS API v2 running http://localhost:${port}`));
})();

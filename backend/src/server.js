import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

import { attachUser } from './middleware/auth.js';
import authRoutes from './routes/auth.js';

import hackathonRoutes from './routes/hackathon.js';
import tracksRoutes from './routes/tracks.js';
import prizesRoutes from './routes/prizes.js';
import announcementsRoutes from './routes/announcements.js';
import teamsRoutes from './routes/teams.js';
import projectsRoutes from './routes/projects.js';
import submissionsRoutes from './routes/submissions.js';
import roundsRoutes from './routes/rounds.js';
import judgingRoutes from './routes/judging.js';
import resultsRoutes from './routes/results.js';

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 3000);
const frontendOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';

app.use(cors({
  origin: frontendOrigin,
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.use(attachUser);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/auth', authRoutes);
app.use('/hackathon', hackathonRoutes);
app.use('/tracks', tracksRoutes);
app.use('/prizes', prizesRoutes);
app.use('/announcements', announcementsRoutes);
app.use('/teams', teamsRoutes);
app.use('/projects', projectsRoutes);
app.use('/submissions', submissionsRoutes);
app.use('/rounds', roundsRoutes);
app.use('/judging', judgingRoutes);
app.use('/results', resultsRoutes);

app.use((err, _req, res, next) => {
  console.error(err);
  if (res.headersSent) {
    return next(err);
  }
  return res.status(500).json({ error: 'Internal server error' });
});

app.listen(port, () => {
  console.log(`Hackathon backend listening on port ${port}`);
});

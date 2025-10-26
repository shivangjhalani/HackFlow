const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const defaultHeaders = {
  'Content-Type': 'application/json'
};

async function request(path, options = {}) {
  const config = {
    credentials: 'include',
    headers: { ...defaultHeaders, ...(options.headers || {}) },
    ...options
  };

  if (config.body && typeof config.body !== 'string') {
    config.body = JSON.stringify(config.body);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, config);
  if (!response.ok) {
    const text = await response.text();
    let message = text;
    try {
      const payload = JSON.parse(text);
      message = payload.error || payload.message || text;
    } catch {
      // ignore JSON parse errors; fall back to raw text
    }
    const error = new Error(message || 'Request failed');
    error.status = response.status;
    throw error;
  }

  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }
  return response.text();
}

export const api = {
  getSession: () => request('/auth/me'),
  claimUsername: (username) => request('/auth/claim', { method: 'POST', body: { username } }),
  logout: () => request('/auth/logout', { method: 'POST' }),

  getUsers: () => request('/auth/users'),
  updateUserRoles: (userId, roles) => request(`/auth/users/${userId}/roles`, { method: 'PUT', body: { roles } }),

  getHackathon: () => request('/hackathon'),
  saveHackathon: (payload) => request('/hackathon', { method: 'PUT', body: payload }),

  getTracks: () => request('/tracks'),
  createTrack: (payload) => request('/tracks', { method: 'POST', body: payload }),

  getPrizes: () => request('/prizes'),
  createPrize: (payload) => request('/prizes', { method: 'POST', body: payload }),
  awardPrize: (prizeId, body) => request(`/prizes/${prizeId}/award`, { method: 'POST', body }),

  getAnnouncements: () => request('/announcements'),
  createAnnouncement: (payload) => request('/announcements', { method: 'POST', body: payload }),

  getTeam: () => request('/teams/me'),
  getTeams: () => request('/teams'),
  createTeam: (body) => request('/teams', { method: 'POST', body }),
  inviteUser: (teamId, body) => request(`/teams/${teamId}/invites`, { method: 'POST', body }),
  getPendingInvites: () => request('/teams/invites/pending'),
  acceptInvite: (body) => request('/teams/invites/accept', { method: 'POST', body }),

  getProject: () => request('/projects/me'),
  submitProject: (body) => request('/projects/me', { method: 'PUT', body }),

  getSubmissions: () => request('/submissions'),
  createSubmission: (body) => request('/submissions', { method: 'POST', body }),

  getRounds: () => request('/rounds'),
  createRound: (payload) => request('/rounds', { method: 'POST', body: payload }),

  getJudgeQueue: () => request('/judging/queue'),
  recordJudgeScore: (body) => request('/judging/score', { method: 'POST', body }),
  getJudgeAssignments: () => request('/judging/assignments'),
  assignJudge: (body) => request('/judging/assignments', { method: 'POST', body }),
  removeJudgeAssignment: (body) => request('/judging/assignments', { method: 'DELETE', body }),

  getResultsOverall: () => request('/results/overall'),
  getResultsForRound: (roundId) => request(`/results/round/${roundId}`),
  getTeamParticipation: () => request('/results/participation/teams'),
  getJudgeParticipation: () => request('/results/participation/judges')
};

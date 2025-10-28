import { useEffect, useMemo, useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Separator } from '../ui/separator';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Skeleton } from '../ui/skeleton';
import { api } from '../../lib/api';
import { useSessionContext } from '../../hooks/useSessionContext.js';

export function TeamManagement() {
  const { user } = useSessionContext();
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [inviteError, setInviteError] = useState(null);
  const [creatingTeam, setCreatingTeam] = useState(false);
  const [createTeamName, setCreateTeamName] = useState('');
  const [inviteUsername, setInviteUsername] = useState('');
  const [project, setProject] = useState({ title: '', abstract: '', repo_url: '', demo_url: '' });
  const [savingProject, setSavingProject] = useState(false);
  const [invitePending, setInvitePending] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [pendingInvitesForUser, setPendingInvitesForUser] = useState([]);
  const [rounds, setRounds] = useState([]);
  const [newSubmission, setNewSubmission] = useState({ round_id: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submissions, setSubmissions] = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(true);
  const [projectExists, setProjectExists] = useState(false);

  const loadTeam = async () => {
    try {
      setLoading(true);
      const data = await api.getTeam();
      setTeam(data);
      if (data?.project) {
        setProject({
          title: data.project.title || '',
          abstract: data.project.abstract || '',
          repo_url: data.project.repo_url || '',
          demo_url: data.project.demo_url || ''
        });
        setProjectExists(true);
      } else {
        setProjectExists(false);
      }
    } catch (err) {
      setTeam(null);
      setError(err);
      setProjectExists(false);
    } finally {
      setLoading(false);
    }
  };

  const loadPendingInvites = async () => {
    try {
      const invites = await api.getPendingInvites();
      setPendingInvitesForUser(invites || []);
    } catch (err) {
      setInviteError(err);
    }
  };

  const loadRounds = async () => {
    try {
      const roundsData = await api.getRounds();
      setRounds(roundsData || []);
    } catch (err) {
      console.error('Failed to load rounds', err);
    }
  };

  const loadSubmissions = async () => {
    try {
      setLoadingSubmissions(true);
      const submissionsData = await api.getSubmissions();
      setSubmissions(submissionsData || []);
    } catch (err) {
      console.error('Failed to load submissions', err);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  useEffect(() => {
    loadTeam();
    loadPendingInvites();
    loadRounds();
    loadSubmissions();
  }, []);

  const canManageTeam = useMemo(() => Boolean(team?.team?.team_id && team?.team?.owner_user_id === user?.userId), [team, user]);

  const handleCreateTeam = async () => {
    if (!createTeamName.trim()) return;
    try {
      setCreatingTeam(true);
      await api.createTeam({ team_name: createTeamName.trim() });
      setCreateTeamName('');
      setSuccessMessage('Team created successfully.');
      await loadTeam();
    } catch (err) {
      setError(err);
    } finally {
      setCreatingTeam(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteUsername.trim() || !team?.team?.team_id) return;
    try {
      setInvitePending(true);
      await api.inviteUser(team.team.team_id, { username: inviteUsername.trim() });
      setInviteUsername('');
      setSuccessMessage('Invite sent successfully.');
      await loadTeam();
      await loadPendingInvites();
    } catch (err) {
      setError(err);
    } finally {
      setInvitePending(false);
    }
  };

  const handleProjectSubmit = async () => {
    try {
      setSavingProject(true);
      await api.submitProject(project);
      setSuccessMessage('Project saved successfully. You can now submit to rounds.');
      setProjectExists(true);
      await loadTeam();
    } catch (err) {
      setError(err);
    } finally {
      setSavingProject(false);
    }
  };

  const handleAcceptInvite = async (token) => {
    try {
      await api.acceptInvite({ token });
      setSuccessMessage('Invite accepted.');
      await Promise.all([loadTeam(), loadPendingInvites()]);
    } catch (err) {
      setInviteError(err);
    }
  };

  const handleCreateSubmission = async () => {
    if (!newSubmission.round_id || !team?.team) return;
    try {
      setSubmitting(true);
      await api.createSubmission({
        round_id: Number(newSubmission.round_id),
        notes: newSubmission.notes
      });
      setSuccessMessage('Submission created successfully.');
      setNewSubmission({ round_id: '', notes: '' });
      await loadSubmissions();
    } catch (err) {
      setError(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team & Project</CardTitle>
        <CardDescription>
          {team?.team ? `${team.team.team_name} · ${team.members?.length || 0} member${team.members?.length !== 1 ? 's' : ''}` : 'Create or join a team to get started'}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        )}
        {inviteError && (
          <Alert variant="destructive">
            <AlertDescription>{inviteError.message}</AlertDescription>
          </Alert>
        )}
        {successMessage && (
          <Alert>
            <AlertDescription>{successMessage}</AlertDescription>
          </Alert>
        )}
        <section className="space-y-2">
          <span className="text-sm font-medium">Roster</span>
          {loading ? (
            <Skeleton className="h-16 w-full" />
          ) : team?.members?.length ? (
            <div className="flex flex-wrap gap-2">
              {team.members.map((member) => (
                <Badge key={member.user_id} variant="secondary">
                  @{member.username}
                  {member.user_id === team.team.owner_user_id && ' *'}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No team</p>
          )}
        </section>
        {!loading && !team?.team && (
          <>
            <Separator />
            <section className="space-y-2">
              <span className="text-sm font-medium">Create Team</span>
              <div className="flex gap-2">
                <Input
                  placeholder="name"
                  value={createTeamName}
                  onChange={(e) => setCreateTeamName(e.target.value)}
                  disabled={creatingTeam}
                />
                <Button onClick={handleCreateTeam} disabled={creatingTeam || !createTeamName.trim()}>
                  {creatingTeam ? 'Creating…' : 'Create'}
                </Button>
              </div>
            </section>
          </>
        )}
        {!!pendingInvitesForUser.length && (
          <>
            <Separator />
            <section className="space-y-2">
              <span className="text-sm font-medium">Pending Invites</span>
              <div className="grid gap-2">
                {pendingInvitesForUser.map((invite) => (
                  <div key={invite.invite_id} className="flex items-center justify-between rounded-lg border p-2">
                    <span className="text-sm">{invite.team_name}</span>
                    <Button size="sm" onClick={() => handleAcceptInvite(invite.token)}>Accept</Button>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
        <Separator />
        <section className="space-y-2">
          <span className="text-sm font-medium">Invite</span>
          <div className="flex gap-2">
            <Input
              placeholder="username"
              value={inviteUsername}
              onChange={(e) => setInviteUsername(e.target.value)}
              disabled={invitePending || !canManageTeam}
            />
            <Button onClick={handleInvite} disabled={invitePending || !canManageTeam}>
              {invitePending ? 'Sending…' : 'Send'}
            </Button>
          </div>
        </section>
        <Separator />
        <section className="space-y-2">
          <span className="text-sm font-medium">Project</span>
          <Input
            placeholder="title"
            value={project.title}
            onChange={(e) => setProject((prev) => ({ ...prev, title: e.target.value }))}
            disabled={!team?.team}
          />
          <Textarea
            rows={3}
            placeholder="summary"
            value={project.abstract}
            onChange={(e) => setProject((prev) => ({ ...prev, abstract: e.target.value }))}
            disabled={!team?.team}
          />
          <div className="grid gap-2 md:grid-cols-2">
            <Input
              placeholder="repo url"
              value={project.repo_url}
              onChange={(e) => setProject((prev) => ({ ...prev, repo_url: e.target.value }))}
              disabled={!team?.team}
            />
            <Input
              placeholder="demo url"
              value={project.demo_url}
              onChange={(e) => setProject((prev) => ({ ...prev, demo_url: e.target.value }))}
              disabled={!team?.team}
            />
          </div>
        </section>
        <Separator />
        <section className="space-y-2">
          <span className="text-sm font-medium">Submit</span>
          {!projectExists && team?.team && (
            <Alert>
              <AlertDescription className="text-xs">
                Save your project first (with at least a title) before submitting to a round.
              </AlertDescription>
            </Alert>
          )}
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={newSubmission.round_id}
            onChange={(e) => setNewSubmission((prev) => ({ ...prev, round_id: e.target.value }))}
            disabled={!team?.team || !projectExists}
          >
            <option value="">round</option>
            {rounds.map((round) => (
              <option key={round.round_id} value={round.round_id}>{round.name}</option>
            ))}
          </select>
          <Textarea
            rows={2}
            placeholder="notes"
            value={newSubmission.notes}
            onChange={(e) => setNewSubmission((prev) => ({ ...prev, notes: e.target.value }))}
            disabled={!team?.team || !projectExists}
          />
          <Button onClick={handleCreateSubmission} disabled={submitting || !newSubmission.round_id || !team?.team || !projectExists} className="w-full">
            {submitting ? 'Submitting…' : 'Submit'}
          </Button>
        </section>
        <Separator />
        <section className="space-y-2">
          <span className="text-sm font-medium">Submissions History</span>
          {loadingSubmissions ? (
            <Skeleton className="h-24 w-full" />
          ) : submissions.length > 0 ? (
            <div className="grid gap-2 max-h-64 overflow-y-auto">
              {submissions.map((submission) => (
                <div key={submission.submission_id} className="rounded-lg border bg-muted/40 p-3 text-sm">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{submission.round_name}</span>
                      <Badge variant="outline" className="text-xs">v{submission.sub_version}</Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(submission.submitted_at).toLocaleString()}
                    </span>
                  </div>
                  {submission.notes && (
                    <p className="text-xs text-muted-foreground mt-1">{submission.notes}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border bg-muted/20 p-4 text-center">
              <p className="text-sm text-muted-foreground">No submissions yet</p>
              <p className="text-xs text-muted-foreground mt-1">Submit for a round above to see your submission history</p>
            </div>
          )}
        </section>
      </CardContent>
      <CardFooter>
        <Button onClick={handleProjectSubmit} disabled={savingProject || !team?.team || !project.title?.trim()} className="w-full">
          {savingProject ? 'Saving…' : 'Save Project'}
        </Button>
      </CardFooter>
    </Card>
  );
}

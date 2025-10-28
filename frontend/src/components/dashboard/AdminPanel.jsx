import { useEffect, useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Skeleton } from '../ui/skeleton';
import { api } from '../../lib/api';
import { useSessionContext } from '../../hooks/useSessionContext.js';
import { cn } from '../../lib/utils';

const emptyHackathon = {
  name: '',
  description: '',
  min_team_size: 1,
  max_team_size: 4,
  rounds: [],
  published: false
};

export function AdminPanel({ defaultTab = 'settings' }) {
  const { user } = useSessionContext();
  const [hackathon, setHackathon] = useState(emptyHackathon);
  const [tracks, setTracks] = useState([]);
  const [prizes, setPrizes] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState(null);
  const [userError, setUserError] = useState(null);
  const [formError, setFormError] = useState('');
  const [newTrack, setNewTrack] = useState({ name: '', description: '' });
  const [newPrize, setNewPrize] = useState({ name: '', description: '', quantity: 1 });
  const [newAnnouncement, setNewAnnouncement] = useState({ title: '', content: '' });
  const [rounds, setRounds] = useState([]);
  const [newRound, setNewRound] = useState({ name: '', seq_no: 1 });
  const [judgeAssignments, setJudgeAssignments] = useState([]);
  const [newAssignment, setNewAssignment] = useState({ team_id: '', judge_user_id: '' });
  const [teams, setTeams] = useState([]);

  const isAdmin = user?.roles?.some((role) => role === 'admin' || role === 'organizer');

  const canManageUsers = user?.roles?.includes('admin');

  const load = async () => {
    if (!isAdmin) return;
    try {
      setLoading(true);
      const [hackathonData, trackData, prizeData, announcementData, roundsData, assignmentsData] = await Promise.all([
        api.getHackathon(),
        api.getTracks(),
        api.getPrizes(),
        api.getAnnouncements(),
        api.getRounds(),
        api.getJudgeAssignments().catch(() => [])
      ]);
      setHackathon({ ...emptyHackathon, ...(hackathonData || {}) });
      setTracks(trackData || []);
      setPrizes(prizeData?.prizes || []);
      setAnnouncements(announcementData || []);
      setRounds(roundsData || []);
      setJudgeAssignments(assignmentsData || []);
    } catch (err) {
      setErrors(err);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    if (!canManageUsers) return;
    try {
      setLoadingUsers(true);
      setUserError(null);
      const data = await api.getUsers();
      setUsers(data || []);
    } catch (err) {
      setUserError(err);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    load();
    if (canManageUsers) {
      loadUsers();
    }
    // load depends on stable identity of API functions; suppress exhaustive deps warning.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, canManageUsers]);

  const handleSaveHackathon = async () => {
    const name = hackathon.name?.trim();
    if (!name) {
      setFormError('Enter a hackathon name before publishing.');
      return;
    }

    const minTeam = Number(hackathon.min_team_size);
    const maxTeam = Number(hackathon.max_team_size);

    if (!Number.isFinite(minTeam) || minTeam < 1) {
      setFormError('Minimum team size must be at least 1.');
      return;
    }

    if (!Number.isFinite(maxTeam) || maxTeam < minTeam) {
      setFormError('Maximum team size must be greater than or equal to the minimum team size.');
      return;
    }

    const payload = {
      name,
      description: hackathon.description?.trim() || null,
      min_team_size: minTeam,
      max_team_size: maxTeam,
      published: Boolean(hackathon.published)
    };

    try {
      setFormError('');
      setSaving(true);
      await api.saveHackathon(payload);
      setErrors(null);
    } catch (err) {
      setErrors(err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddTrack = async () => {
    if (!newTrack.name) return;
    await api.createTrack(newTrack);
    setNewTrack({ name: '', description: '' });
    load();
  };

  const handleAddPrize = async () => {
    if (!newPrize.name) return;
    await api.createPrize(newPrize);
    setNewPrize({ name: '', description: '', quantity: 1 });
    load();
  };

  const handlePublishAnnouncement = async () => {
    if (!newAnnouncement.title || !newAnnouncement.content) return;
    await api.createAnnouncement(newAnnouncement);
    setNewAnnouncement({ title: '', content: '' });
    load();
  };

  const handleAddRound = async () => {
    if (!newRound.name || !newRound.seq_no) return;
    try {
      await api.createRound({
        name: newRound.name,
        seq_no: Number(newRound.seq_no)
      });
      setNewRound({ name: '', seq_no: rounds.length + 1 });
      load();
    } catch (err) {
      setErrors(err);
    }
  };

  const handleAssignJudge = async () => {
    if (!newAssignment.team_id || !newAssignment.judge_user_id) return;
    try {
      await api.assignJudge({
        team_id: Number(newAssignment.team_id),
        judge_user_id: Number(newAssignment.judge_user_id)
      });
      setNewAssignment({ team_id: '', judge_user_id: '' });
      load();
    } catch (err) {
      setErrors(err);
    }
  };

  const handleRemoveAssignment = async (teamId, judgeUserId) => {
    try {
      await api.removeJudgeAssignment({ team_id: teamId, judge_user_id: judgeUserId });
      load();
    } catch (err) {
      setErrors(err);
    }
  };

  const loadTeams = async () => {
    if (!isAdmin) return;
    try {
      const teamsData = await api.getTeams();
      setTeams(teamsData || []);
    } catch (err) {
      console.error('Could not load teams', err);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadTeams();
    }
  }, [isAdmin]);

  const availableRoles = ['admin', 'organizer', 'participant', 'judge'];

  const handleToggleRole = async (userId, role) => {
    if (!canManageUsers) return;
    const target = users.find((u) => u.user_id === userId);
    if (!target) return;
    const hasRole = target.roles.includes(role);
    const nextRoles = hasRole ? target.roles.filter((r) => r !== role) : [...target.roles, role];

    try {
      const response = await api.updateUserRoles(userId, nextRoles);
      setUsers((prev) =>
        prev.map((user) =>
          user.user_id === userId
            ? {
                ...user,
                roles: response.roles
              }
            : user
        )
      );
    } catch (err) {
      setUserError(err);
    }
  };

  if (!isAdmin) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Restricted access</AlertTitle>
        <AlertDescription>You need admin or organizer privileges to view this area.</AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Admin control room</CardTitle>
        <CardDescription>Configure event settings, manage tracks, and broadcast announcements.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {errors && (
          <Alert variant="destructive">
            <AlertTitle>Could not load admin data</AlertTitle>
            <AlertDescription>{errors.message}</AlertDescription>
          </Alert>
        )}
        {formError && (
          <Alert variant="destructive">
            <AlertTitle>Unable to publish</AlertTitle>
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}
        <Tabs defaultValue={defaultTab}>
          <div className="overflow-hidden">
            <div className="overflow-x-auto">
              <TabsList className="flex w-full gap-2">
                <TabsTrigger value="settings" className="min-w-[160px]">
                  Hackathon
                </TabsTrigger>
                <TabsTrigger value="tracks" className="min-w-[160px]">
                  Tracks & prizes
                </TabsTrigger>
                <TabsTrigger value="announcements" className="min-w-[160px]">
                  Announcements
                </TabsTrigger>
                <TabsTrigger value="rounds" className="min-w-[160px]">
                  Judging Rounds
                </TabsTrigger>
                <TabsTrigger value="judging" className="min-w-[160px]">
                  Judge Assignments
                </TabsTrigger>
                {canManageUsers && (
                  <TabsTrigger value="users" className="min-w-[160px]">
                    Users
                  </TabsTrigger>
                )}
              </TabsList>
            </div>
          </div>
          <TabsContent value="settings" className="space-y-4">
            {loading ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <>
                <div className="grid gap-2">
                  <label className="text-xs font-medium uppercase tracking-wide">Name</label>
                  <Input
                    value={hackathon.name}
                    onChange={(e) => setHackathon((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Winter Build 2025"
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-xs font-medium uppercase tracking-wide">Description</label>
                  <Textarea
                    rows={3}
                    value={hackathon.description}
                    onChange={(e) => setHackathon((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Share the theme, schedule, and judging style."
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <label className="text-xs font-medium uppercase tracking-wide">Min team size</label>
                    <Input
                      value={hackathon.min_team_size}
                      onChange={(e) => setHackathon((prev) => ({ ...prev, min_team_size: Number(e.target.value) }))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-xs font-medium uppercase tracking-wide">Max team size</label>
                    <Input
                      value={hackathon.max_team_size}
                      onChange={(e) => setHackathon((prev) => ({ ...prev, max_team_size: Number(e.target.value) }))}
                    />
                  </div>
                </div>
              </>
            )}
          </TabsContent>
          <TabsContent value="tracks" className="space-y-4">
            {loading ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <>
                <section className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground">Tracks</h3>
                  <div className="grid gap-2">
                    {tracks.map((track) => (
                      <div key={track.track_id} className="flex items-center justify-between rounded-lg border bg-muted/40 p-3 text-sm">
                        <div>
                          <p className="font-medium">{track.name}</p>
                          <p className="text-xs text-muted-foreground">{track.description}</p>
                        </div>
                        <Badge variant="outline">Track</Badge>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-col gap-2 md:flex-row">
                    <Input
                      placeholder="Track name"
                      value={newTrack.name}
                      onChange={(e) => setNewTrack((prev) => ({ ...prev, name: e.target.value }))}
                    />
                    <Input
                      placeholder="Short description"
                      value={newTrack.description}
                      onChange={(e) => setNewTrack((prev) => ({ ...prev, description: e.target.value }))}
                    />
                    <Button onClick={handleAddTrack}>Add track</Button>
                  </div>
                </section>
                <Separator />
                <section className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground">Prizes</h3>
                  <div className="grid gap-2">
                    {prizes.map((prize) => (
                      <div key={prize.prize_id} className="flex items-center justify-between rounded-lg border bg-muted/40 p-3 text-sm">
                        <div>
                          <p className="font-medium">{prize.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {prize.description || 'No description'} · {prize.quantity} awards
                          </p>
                        </div>
                        <Badge variant="outline">Prize</Badge>
                      </div>
                    ))}
                  </div>
                  <div className="grid gap-2 md:grid-cols-3">
                    <Input
                      placeholder="Prize name"
                      value={newPrize.name}
                      onChange={(e) => setNewPrize((prev) => ({ ...prev, name: e.target.value }))}
                    />
                    <Input
                      placeholder="Description"
                      value={newPrize.description}
                      onChange={(e) => setNewPrize((prev) => ({ ...prev, description: e.target.value }))}
                    />
                    <Input
                      placeholder="Quantity"
                      type="number"
                      value={newPrize.quantity}
                      onChange={(e) => setNewPrize((prev) => ({ ...prev, quantity: Number(e.target.value) }))}
                    />
                  </div>
                  <Button variant="outline" onClick={handleAddPrize}>
                    Add prize
                  </Button>
                </section>
              </>
            )}
          </TabsContent>
          <TabsContent value="announcements" className="space-y-4">
            <div className="grid gap-3">
              <div className="grid gap-2">
                <label className="text-xs font-medium uppercase tracking-wide">Title</label>
                <Input
                  value={newAnnouncement.title}
                  onChange={(e) => setNewAnnouncement((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Office hours now open"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-xs font-medium uppercase tracking-wide">Message</label>
                <Textarea
                  rows={4}
                  value={newAnnouncement.content}
                  onChange={(e) => setNewAnnouncement((prev) => ({ ...prev, content: e.target.value }))}
                  placeholder="Drop your questions in the #help channel."
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setNewAnnouncement({ title: '', content: '' })}>
                  Clear
                </Button>
                <Button onClick={handlePublishAnnouncement}>Publish</Button>
              </div>
            </div>
            <Separator />
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-muted-foreground">Recent announcements</h4>
              <div className="grid gap-2 text-sm">
                {announcements.map((announcement) => (
                  <div key={announcement.announcement_id} className="rounded-lg border bg-muted/40 p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{announcement.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(announcement.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{announcement.content}</p>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
          <TabsContent value="rounds" className="space-y-4">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground">Judging Rounds</h3>
              {loading ? (
                <Skeleton className="h-40 w-full" />
              ) : (
                <>
                  <div className="grid gap-2">
                    {rounds.map((round) => (
                      <div key={round.round_id} className="rounded-lg border bg-muted/40 p-3 text-sm">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{round.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Sequence: {round.seq_no}
                            </p>
                          </div>
                          <Badge variant="outline">Round {round.seq_no}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Separator />
                  <div className="grid gap-3">
                    <h4 className="text-sm font-semibold text-muted-foreground">Add new round</h4>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="grid gap-2">
                        <label className="text-xs font-medium uppercase tracking-wide">Name</label>
                        <Input
                          placeholder="Round 1"
                          value={newRound.name}
                          onChange={(e) => setNewRound((prev) => ({ ...prev, name: e.target.value }))}
                        />
                      </div>
                      <div className="grid gap-2">
                        <label className="text-xs font-medium uppercase tracking-wide">Sequence</label>
                        <Input
                          type="number"
                          value={newRound.seq_no}
                          onChange={(e) => setNewRound((prev) => ({ ...prev, seq_no: Number(e.target.value) }))}
                        />
                      </div>
                    </div>
                    <Button onClick={handleAddRound} disabled={!newRound.name || !newRound.seq_no}>
                      Create round
                    </Button>
                  </div>
                </>
              )}
            </div>
          </TabsContent>
          <TabsContent value="judging" className="space-y-4">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground">Judge Assignments</h3>
              {loading ? (
                <Skeleton className="h-40 w-full" />
              ) : (
                <>
                  <div className="grid gap-2">
                    {judgeAssignments.map((assignment) => (
                      <div key={assignment.assignment_id} className="rounded-lg border bg-muted/40 p-3 text-sm">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">@{assignment.judge_username} → {assignment.team_name}</p>
                            <p className="text-xs text-muted-foreground">
                              Assigned {new Date(assignment.assigned_at).toLocaleString()}
                            </p>
                          </div>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleRemoveAssignment(assignment.team_id, assignment.judge_user_id)}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Separator />
                  <div className="grid gap-3">
                    <h4 className="text-sm font-semibold text-muted-foreground">Assign judge to team</h4>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="grid gap-2">
                        <label className="text-xs font-medium uppercase tracking-wide">Judge</label>
                        <select
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          value={newAssignment.judge_user_id}
                          onChange={(e) => setNewAssignment((prev) => ({ ...prev, judge_user_id: e.target.value }))}
                        >
                          <option value="">Select judge</option>
                          {users.filter((u) => u.roles.includes('judge')).map((u) => (
                            <option key={u.user_id} value={u.user_id}>
                              @{u.username}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="grid gap-2">
                        <label className="text-xs font-medium uppercase tracking-wide">Team</label>
                        <select
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          value={newAssignment.team_id}
                          onChange={(e) => setNewAssignment((prev) => ({ ...prev, team_id: e.target.value }))}
                        >
                          <option value="">Select team</option>
                          {teams.map((t) => (
                            <option key={t.team_id} value={t.team_id}>
                              {t.team_name} (@{t.owner_username})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <Button onClick={handleAssignJudge} disabled={!newAssignment.team_id || !newAssignment.judge_user_id}>
                      Assign judge
                    </Button>
                  </div>
                </>
              )}
            </div>
          </TabsContent>
          {canManageUsers && (
            <TabsContent value="users" className="space-y-4">
            {userError && (
              <Alert variant="destructive">
                <AlertTitle>Could not load users</AlertTitle>
                <AlertDescription>{userError.message}</AlertDescription>
              </Alert>
            )}
            {loadingUsers ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-muted-foreground">User directory</h3>
                  <Button variant="outline" size="sm" onClick={loadUsers}>
                    Refresh
                  </Button>
                </div>
                <div className="grid gap-3">
                  {users.map((u) => (
                    <div key={u.user_id} className="rounded-lg border p-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold">@{u.username}</p>
                          <p className="text-xs text-muted-foreground">Created {new Date(u.created_at).toLocaleString()}</p>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {u.roles.length ? (
                            u.roles.map((role) => (
                              <Badge key={role} variant="secondary" className="capitalize">
                                {role}
                              </Badge>
                            ))
                          ) : (
                            <Badge variant="outline">No roles</Badge>
                          )}
                        </div>
                      </div>
                      <Separator className="my-3" />
                      <div className="flex flex-wrap gap-2">
                        {availableRoles.map((role) => {
                          const active = u.roles.includes(role);
                          return (
                            <Button
                              key={role}
                              variant={active ? 'default' : 'outline'}
                              size="sm"
                              className={cn('capitalize', active && 'shadow-sm')}
                              onClick={() => handleToggleRole(u.user_id, role)}
                              disabled={u.user_id === user.userId && role === 'admin' && u.roles.length === 1}
                            >
                              {active ? 'Revoke' : 'Grant'} {role}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
      <CardFooter className="flex items-center justify-end gap-2">
        <Button variant="outline" onClick={load} disabled={loading}>
          Refresh
        </Button>
        <Button onClick={handleSaveHackathon} disabled={saving}>
          {saving ? 'Saving…' : 'Publish updates'}
        </Button>
      </CardFooter>
    </Card>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Separator } from '../ui/separator';
import { Skeleton } from '../ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { cn } from '../../lib/utils';
import { useSessionContext } from '../../hooks/useSessionContext.js';
import { api } from '../../lib/api';

export function DashboardOverview() {
  const { user } = useSessionContext();
  const [team, setTeam] = useState(null);
  const [loadingTeam, setLoadingTeam] = useState(true);
  const [hackathon, setHackathon] = useState(null);
  const [loadingHackathon, setLoadingHackathon] = useState(true);
  const [submissions, setSubmissions] = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(true);
  const [announcements, setAnnouncements] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setError(null);
        setLoadingTeam(true);
        setLoadingHackathon(true);
        setLoadingSubmissions(true);
        const [hackathonData, teamData, submissionData, announcementData] = await Promise.all([
          api.getHackathon(),
          api.getTeam().catch(() => null),
          api.getSubmissions().catch(() => []),
          api.getAnnouncements().catch(() => [])
        ]);
        setHackathon(hackathonData);
        setTeam(teamData);
        setSubmissions(submissionData || []);
        setAnnouncements(announcementData || []);
      } catch (err) {
        setError(err);
      } finally {
        setLoadingTeam(false);
        setLoadingHackathon(false);
        setLoadingSubmissions(false);
      }
    };

    if (user) {
      loadData();
    }
  }, [user]);

  const milestones = useMemo(() => {
    if (!hackathon) return [];
    const rounds = hackathon.rounds || [];
    return rounds.slice(0, 3).map((round) => ({
      label: round.name,
      status: 'upcoming'
    }));
  }, [hackathon]);

  return (
    <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
      <Card className="xl:col-span-2">
        <CardHeader>
          <CardTitle>Team progress</CardTitle>
          <CardDescription>
            Track who's on your team, outstanding invites, and your current project.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertTitle>Unable to load dashboard</AlertTitle>
              <AlertDescription>{error.message}</AlertDescription>
            </Alert>
          )}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground">Members</h3>
              <Badge variant="outline">
                {team?.members?.length || 0} / {hackathon?.max_team_size || '--'}
              </Badge>
            </div>
            {loadingTeam ? (
              <Skeleton className="h-8 w-full" />
            ) : team?.members?.length ? (
              <div className="flex flex-wrap gap-2">
                {team.members.map((member) => (
                  <Badge key={member.user_id} variant="secondary">
                    @{member.username}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">You are not in a team yet.</p>
            )}
          </section>
          <Separator />
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground">Pending invites</h3>
              <Button variant="ghost" size="sm">
                New invite
              </Button>
            </div>
            {loadingTeam ? (
              <Skeleton className="h-10 w-full" />
            ) : team?.invites?.length ? (
              <div className="grid gap-2">
                {team.invites.map((invite) => (
                  <div key={invite.invite_id} className="flex items-center justify-between rounded-lg border bg-muted/40 p-3 text-sm">
                    <div>
                      <p className="font-medium">@{invite.invitee_username}</p>
                      <p className="text-xs text-muted-foreground">Sent {new Date(invite.created_at).toLocaleString()}</p>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {invite.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No outstanding invites.</p>
            )}
          </section>
          <Separator />
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground">Project</h3>
              <Button size="sm">Update project</Button>
            </div>
            {loadingTeam ? (
              <Skeleton className="h-28 w-full" />
            ) : team?.project ? (
              <div className="rounded-lg border p-4">
                <h4 className="font-semibold">{team.project.title}</h4>
                <p className="text-sm text-muted-foreground">{team.project.abstract || 'No summary yet.'}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No project submission yet.</p>
            )}
          </section>
          <Separator />
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground">Latest announcement</h3>
              <Button variant="link" className="h-auto p-0 text-xs">
                View all
              </Button>
            </div>
            {announcements.length ? (
              <div className="rounded-lg border bg-muted/30 p-4 text-sm">
                <p className="font-semibold">{announcements[0].title}</p>
                <p className="text-xs text-muted-foreground">{new Date(announcements[0].created_at).toLocaleString()}</p>
                <p className="mt-2 text-sm text-muted-foreground">{announcements[0].content}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Announcements will appear here.</p>
            )}
          </section>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Milestones</CardTitle>
          <CardDescription>Stay ahead of the schedule and round deadlines.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs defaultValue="timeline">
            <TabsList className="w-full">
              <TabsTrigger value="timeline" className="flex-1">
                Timeline
              </TabsTrigger>
              <TabsTrigger value="submissions" className="flex-1">
                Submissions
              </TabsTrigger>
            </TabsList>
            <TabsContent value="timeline" className="grid gap-3">
              {loadingHackathon ? (
                <Skeleton className="h-24 w-full" />
              ) : milestones.length ? (
                milestones.map((milestone) => (
                  <div
                    key={milestone.label}
                    className={cn(
                      'rounded-lg border p-4 text-sm transition-colors',
                      milestone.status === 'next'
                        ? 'border-primary/40 bg-primary/10 text-primary-foreground/90'
                        : 'bg-muted'
                    )}
                  >
                    <p className="font-medium">{milestone.label}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Judging rounds will appear once published.</p>
              )}
            </TabsContent>
            <TabsContent value="submissions" className="space-y-3">
              {loadingSubmissions ? (
                <Skeleton className="h-24 w-full" />
              ) : submissions.length ? (
                submissions.map((submission) => (
                  <div key={submission.submission_id} className="rounded-lg border bg-muted/40 p-4 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Round {submission.round_id}</span>
                      <span className="text-xs text-muted-foreground">
                        Version {submission.sub_version} · {new Date(submission.submitted_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{submission.notes || 'No notes provided.'}</p>
                  </div>
                ))
              ) : (
                <Alert>
                  <AlertTitle>No submissions yet</AlertTitle>
                  <AlertDescription>Submit before the deadline to appear in judging queues.</AlertDescription>
                </Alert>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex justify-between text-xs text-muted-foreground">
          <span>All times local to the event</span>
          <span>Sync calendar →</span>
        </CardFooter>
      </Card>
    </div>
  );
}


import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Skeleton } from '../ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { api } from '../../lib/api';

export function ResultsOverview() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [teamsParticipation, setTeamsParticipation] = useState([]);
  const [judgesParticipation, setJudgesParticipation] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setError(null);
        setLoading(true);
        const [overall, teamPart, judgePart] = await Promise.all([
          api.getResultsOverall(),
          api.getTeamParticipation(),
          api.getJudgeParticipation()
        ]);
        setLeaderboard(overall || []);
        setTeamsParticipation(teamPart || []);
        setJudgesParticipation(judgePart || []);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const participationBadgeVariant = (status) => {
    if (status === 'complete') return 'default';
    if (status === 'partial') return 'secondary';
    return 'outline';
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Leaderboard</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error.message}</AlertDescription>
            </Alert>
          )}
          {loading ? (
            <Skeleton className="h-32 w-full" />
          ) : leaderboard.length ? (
            leaderboard.map((entry, index) => (
              <div key={entry.team_id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <span className="text-sm font-medium">#{index + 1} {entry.team_name}</span>
                  <p className="text-xs text-muted-foreground">{entry.rounds_participated} rounds</p>
                </div>
                <Badge variant={index === 0 ? 'default' : 'secondary'}>{Number(entry.total_avg_score).toFixed(1)}</Badge>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No results</p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Participation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <span className="text-sm font-medium">Teams</span>
            {loading ? (
              <Skeleton className="h-20 w-full" />
            ) : (
              <div className="grid gap-1 text-sm">
                {teamsParticipation.map((item) => (
                  <div key={item.team_id} className="flex items-center justify-between">
                    <span>{item.team_name}</span>
                    <Badge variant={participationBadgeVariant(item.participation_status)} className="text-xs">
                      {item.participation_status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
          <Separator />
          <div className="space-y-2">
            <span className="text-sm font-medium">Judges</span>
            {loading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <div className="grid gap-1 text-sm">
                {judgesParticipation.map((item) => (
                  <div key={item.user_id} className="flex items-center justify-between">
                    <span>@{item.username}</span>
                    <Badge variant={participationBadgeVariant(item.participation_status)} className="text-xs">
                      {item.participation_status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

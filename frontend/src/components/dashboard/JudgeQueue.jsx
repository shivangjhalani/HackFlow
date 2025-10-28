import { useEffect, useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Skeleton } from '../ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Textarea } from '../ui/textarea';
import { Input } from '../ui/input';
import { api } from '../../lib/api';
import { useSessionContext } from '../../hooks/useSessionContext.js';

export function JudgeQueue() {
  const { user } = useSessionContext();
  const [queue, setQueue] = useState([]);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState('');
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const isJudge = user?.roles?.includes('judge');

  const loadQueue = async () => {
    if (!isJudge) return;
    try {
      setLoading(true);
      const data = await api.getJudgeQueue();
      setQueue(data || []);
      setSelected(null);
      setScore('');
      setFeedback('');
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isJudge]);

  const handleSubmit = async () => {
    if (!selected || !score) return;
    try {
      setSaving(true);
      await api.recordJudgeScore({ submission_id: selected.submission_id, score: Number(score), feedback });
      await loadQueue();
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  };

  if (!isJudge) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Judge role required</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Queue</CardTitle>
          <CardDescription>
            {queue.length} submission{queue.length !== 1 ? 's' : ''} to review
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error.message}</AlertDescription>
            </Alert>
          )}
          {loading ? (
            <Skeleton className="h-32 w-full" />
          ) : queue.length ? (
            queue.map((item) => (
              <div key={item.submission_id} className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{item.team_name}</span>
                    <Badge variant="outline" className="text-xs">
                      {item.round_name || `Round ${item.round_seq}`}
                    </Badge>
                  </div>
                  <Button size="sm" onClick={() => setSelected(item)}>Score</Button>
                </div>
                <p className="text-sm font-medium">{item.title || 'Untitled Project'}</p>
                {item.abstract && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{item.abstract}</p>
                )}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>v{item.sub_version}</span>
                  <span>•</span>
                  <span>{new Date(item.submitted_at).toLocaleString()}</span>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No submissions to review</p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Score</CardTitle>
          <CardDescription>
            {selected ? `${selected.team_name} - ${selected.round_name || `Round ${selected.round_seq}`}` : 'Select a submission to score'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!selected ? (
            <p className="text-sm text-muted-foreground">Select a submission from the queue to begin scoring</p>
          ) : (
            <>
              <div className="rounded-lg border p-3 space-y-2">
                <div>
                  <span className="text-sm font-semibold">{selected.title || 'Untitled Project'}</span>
                  <p className="text-xs text-muted-foreground mt-1">{selected.abstract || 'No description provided'}</p>
                </div>
                <Separator />
                {selected.notes && (
                  <>
                    <div>
                      <p className="text-xs font-medium">Submission Notes:</p>
                      <p className="text-xs text-muted-foreground">{selected.notes}</p>
                    </div>
                    <Separator />
                  </>
                )}
                <div className="flex gap-2">
                  {selected.repo_url && (
                    <a
                      href={selected.repo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Repository →
                    </a>
                  )}
                  {selected.demo_url && (
                    <a
                      href={selected.demo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Demo →
                    </a>
                  )}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium">Score (0-100)</label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  placeholder="Enter score 0-100"
                  value={score}
                  onChange={(e) => setScore(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium">Feedback</label>
                <Textarea
                  rows={4}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Provide constructive feedback for the team..."
                />
              </div>
            </>
          )}
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => setSelected(null)} disabled={!selected}>
            Clear
          </Button>
          <Button className="flex-1" onClick={handleSubmit} disabled={!selected || saving || !score}>
            {saving ? 'Submitting…' : 'Submit Score'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}


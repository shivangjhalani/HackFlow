import { useState } from 'react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Skeleton } from '../ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { CheckCircle2 } from 'lucide-react';
import { useSessionContext } from '../../hooks/useSessionContext.js';

export function ClaimUsername({ onSuccess }) {
  const { claimUsername, loading } = useSessionContext();
  const [username, setUsername] = useState('');
  const [pending, setPending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Please enter a username.');
      return;
    }
    setPending(true);
    setError('');
    try {
      await claimUsername(username.trim());
      setSuccess(true);
      onSuccess?.();
    } catch (err) {
      setError(err?.message || 'Unable to claim username.');
    } finally {
      setPending(false);
    }
  };

  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle>Claim Username</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-3" onSubmit={handleSubmit}>
          <Input
            placeholder="username"
            value={username}
            disabled={pending || success}
            onChange={(e) => setUsername(e.target.value)}
          />
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {success && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>Ready</AlertDescription>
            </Alert>
          )}
          <Button type="submit" disabled={pending || success || loading} className="w-full">
            {pending ? 'Claiming…' : success ? 'Claimed' : 'Claim'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

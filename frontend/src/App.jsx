import { useEffect, useMemo, useState } from 'react';

import { PageShell } from './components/layout/PageShell';
import { ClaimUsername } from './components/dashboard/ClaimUsername';
import { DashboardOverview } from './components/dashboard/DashboardOverview';
import { TeamManagement } from './components/dashboard/TeamManagement';
import { AdminPanel } from './components/dashboard/AdminPanel';
import { JudgeQueue } from './components/dashboard/JudgeQueue';
import { ResultsOverview } from './components/dashboard/ResultsOverview';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Card, CardContent } from './components/ui/card';
import { Badge } from './components/ui/badge';
import { useSessionContext } from './hooks/useSessionContext.js';

export default function App() {
  const { user, loading } = useSessionContext();
  const [active, setActive] = useState('claim');
  const [hasInitializedView, setHasInitializedView] = useState(false);

  const defaultView = useMemo(() => {
    if (!user) return 'claim';
    if (user.roles?.includes('admin') || user.roles?.includes('organizer')) return 'admin';
    if (user.roles?.includes('judge')) return 'judge';
    return 'dashboard';
  }, [user]);

  const viewMap = useMemo(
    () => ({
      claim: {
        label: 'Claim Username',
        description: 'Claim a unique username to enter the event.',
        render: () => <ClaimUsername onSuccess={() => setActive(defaultView)} />,
        hidden: Boolean(user)
      },
      dashboard: {
        label: 'Participant Dashboard',
        description: 'Manage teams, invites, and project submissions.',
        render: () => (
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="team">Team & project</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="space-y-6">
              <DashboardOverview />
            </TabsContent>
            <TabsContent value="team" className="space-y-6">
              <TeamManagement />
            </TabsContent>
          </Tabs>
        )
      },
      admin: {
        label: 'Admin Control',
        description: 'Configure the hackathon setup, tracks, and messaging.',
        render: () => <AdminPanel />,
        hidden: !user?.roles?.some((role) => role === 'admin' || role === 'organizer')
      },
      judge: {
        label: 'Judge Workspace',
        description: 'Review assigned submissions and record scores.',
        render: () => <JudgeQueue />,
        hidden: !user?.roles?.includes('judge')
      },
      results: {
        label: 'Results & Participation',
        description: 'See leaderboards, participation status, and prize outcomes.',
        render: () => <ResultsOverview />
      },
    }),
    [defaultView, user]
  );

  useEffect(() => {
    if (!user) {
      setActive('claim');
      setHasInitializedView(false);
      return;
    }

    if (!hasInitializedView) {
      setActive(defaultView);
      setHasInitializedView(true);
      return;
    }

    const current = viewMap[active];
    if (!current || current.hidden) {
      setActive(defaultView);
    }
  }, [user, defaultView, viewMap, active, hasInitializedView]);

  const effectiveActive = user ? active : 'claim';

  const current = viewMap[effectiveActive];

  return (
    <PageShell active={effectiveActive} onChangeView={(view) => setActive(view)}>
      <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">{current?.label}</h2>
          <p className="text-sm text-muted-foreground">{current?.description}</p>
        </div>
        <Badge variant="secondary" className="w-fit">
          {current?.label}
        </Badge>
      </div>
      <Card className="border-none shadow-none">
        <CardContent className="p-0">
          {loading ? <div className="p-6 text-sm text-muted-foreground">Loading session…</div> : current?.render?.()}
        </CardContent>
      </Card>
    </PageShell>
  );
}

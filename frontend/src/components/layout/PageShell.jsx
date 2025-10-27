import { MainNav } from './MainNav';
import { Separator } from '../ui/separator';

export function PageShell({ active, onChangeView, children }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between">
          <h1 className="font-semibold">Hackathon</h1>
          <MainNav active={active} onChange={onChangeView} />
        </div>
      </header>
      <main className="container py-6">
        {children}
      </main>
    </div>
  );
}




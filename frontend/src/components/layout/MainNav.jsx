import { useState } from 'react';
import { Menu } from 'lucide-react';

import { Button } from '../ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../ui/sheet';
import { cn } from '../../lib/utils';
import { useSessionContext } from '../../hooks/useSessionContext.js';

const links = [
  { id: 'claim', label: 'Claim Username', requireLoggedOut: true },
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'admin', label: 'Admin', roles: ['admin', 'organizer'] },
  { id: 'judge', label: 'Judge', roles: ['judge'] },
  { id: 'results', label: 'Results' }
];

export function MainNav({ active, onChange }) {
  const { user, logout, loading } = useSessionContext();
  const [open, setOpen] = useState(false);

  const availableLinks = links.filter((link) => {
    if (link.requireLoggedOut) return !user;
    if (!link.roles) return true;
    return link.roles.some((role) => user?.roles?.includes(role));
  });

  const handleSelect = (id) => {
    onChange?.(id);
    setOpen(false);
  };

  const userLabel = user?.username ? `@${user.username}` : 'Signed out';

  return (
    <nav className="flex items-center gap-2">
      <div className="hidden gap-2 md:flex">
        {availableLinks.map((link) => (
          <Button
            key={link.id}
            variant={active === link.id ? 'default' : 'ghost'}
            onClick={() => handleSelect(link.id)}
            className={cn('text-sm font-medium', active === link.id && 'shadow-sm')}
          >
            {link.label}
          </Button>
        ))}
      </div>
      {user ? (
        <div className="hidden items-center gap-2 md:flex">
          <span className="text-sm text-muted-foreground">{userLabel}</span>
          <Button variant="outline" size="sm" onClick={logout} disabled={loading}>
            Log out
          </Button>
        </div>
      ) : null}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Open navigation</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-72">
          <SheetHeader>
            <SheetTitle>Navigate</SheetTitle>
          </SheetHeader>
          <div className="mt-6 flex flex-col gap-2">
            {availableLinks.map((link) => (
              <Button
                key={link.id}
                variant={active === link.id ? 'default' : 'outline'}
                className="justify-start"
                onClick={() => handleSelect(link.id)}
              >
                {link.label}
              </Button>
            ))}
          </div>
          {user ? (
            <div className="mt-8 border-t pt-4">
              <p className="text-sm font-medium">{userLabel}</p>
              <Button variant="outline" size="sm" className="mt-3 w-full" onClick={logout} disabled={loading}>
                Log out
              </Button>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </nav>
  );
}

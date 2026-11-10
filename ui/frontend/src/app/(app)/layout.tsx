import {redirect} from 'next/navigation';
import {AppShell} from '@/components/shell/AppShell';
import {AppProvider} from '@/providers/AppProvider';
import {getCurrentUser} from '@/server/session';

export default async function AuthenticatedLayout({children}: {children: React.ReactNode}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return (
    <AppProvider user={user}>
      <AppShell>{children}</AppShell>
    </AppProvider>
  );
}

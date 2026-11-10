import {redirect} from 'next/navigation';
import {getCurrentUser} from '@/server/session';

export default async function IndexPage() {
  const user = await getCurrentUser();
  redirect(user ? '/home' : '/login');
}

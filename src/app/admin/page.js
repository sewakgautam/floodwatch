import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth-session';
import AdminDashboard from '@/components/AdminDashboard';

export default async function AdminPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  if (user.role !== 'admin') redirect('/');

  return <AdminDashboard userEmail={user.email} />;
}

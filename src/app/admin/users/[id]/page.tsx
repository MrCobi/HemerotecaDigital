import { redirect } from 'next/navigation';
import { auth } from '@/auth';

export default async function UserRedirectPage({ params }: { params: { id: string } }) {
  const session = await auth();

  if (!session) redirect("/api/auth/signin");
  if (session.user.role !== "admin") redirect("/acceso-denegado");
  
  // Redirect to the view page for this user
  redirect(`/admin/users/view/${params.id}`);
}

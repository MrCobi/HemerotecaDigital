import { redirect } from "next/navigation";
import { auth } from "@/auth";

type PageProps = {
  params: {
    id: string;
  };
};

export default async function UserRedirectPage({ params }: PageProps) {
  // Await the params before using its properties
  const resolvedParams = await Promise.resolve(params);
  const id = resolvedParams.id;
  
  const session = await auth();

  if (!session) {
    redirect("/api/auth/signin");
  }
  if (session.user.role !== "admin") {
    redirect("/acceso-denegado");
  }
  
  // Now that params is properly awaited, we can safely use it
  redirect(`/admin/users/view/${id}`);
}

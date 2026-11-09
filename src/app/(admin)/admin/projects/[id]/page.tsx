import { notFound, redirect } from "next/navigation";
import { getSession } from "@/core/lib/auth";
import { getProject } from "@/modules/projects/lib/service";
import { ProjectDetailScreen } from "@/modules/projects/components/ProjectDetailScreen";

type Params = { params: Promise<{ id: string }> };

/**
 * /admin/projects/[id] — full project detail with edit/delete.
 * The project is fetched here (server) so the tabs — including the
 * «سهم کارمندان» actions — are present in the SSR HTML.
 */
export default async function AdminProjectDetailPage({ params }: Params) {
  const { id } = await params;
  if (!id) notFound();

  const session = await getSession();
  if (!session) redirect("/login");

  const project = await getProject(id, { sub: session.sub, role: session.role });
  return (
    <ProjectDetailScreen
      id={id}
      basePath="/admin/projects"
      canManage={true}
      initialProject={project}
    />
  );
}

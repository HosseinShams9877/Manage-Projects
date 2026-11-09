import { notFound } from "next/navigation";
import { ProjectDetailScreen } from "@/modules/projects/components/ProjectDetailScreen";

type Params = { params: Promise<{ id: string }> };

/**
 * /admin/projects/[id] — full project detail with edit/delete.
 */
export default async function AdminProjectDetailPage({ params }: Params) {
  const { id } = await params;
  if (!id) notFound();
  return <ProjectDetailScreen id={id} basePath="/admin/projects" canManage={true} />;
}

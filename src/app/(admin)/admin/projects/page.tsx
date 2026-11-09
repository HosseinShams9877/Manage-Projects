import { ProjectsScreen } from "@/modules/projects/components/ProjectsScreen";

/**
 * /admin/projects — full project list with create/edit/delete.
 * The empty state is handled inside the screen.
 */
export default async function AdminProjectsPage() {
  return <ProjectsScreen basePath="/admin/projects" canManage={true} />;
}

import { ProjectsScreen } from "@/modules/projects/components/ProjectsScreen";

/**
 * /me/projects — read-only list of the projects this employee is assigned to.
 */
export default function EmployeeProjectsPage() {
  return <ProjectsScreen basePath="/me/projects" canManage={false} />;
}

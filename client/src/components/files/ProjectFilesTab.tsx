import Files from "@/pages/Files";

export interface ProjectFilesTabProps {
  initialProjectId?: number | null;
}

export default function ProjectFilesTab(props: ProjectFilesTabProps) {
  return <Files embedded initialProjectId={props.initialProjectId} />;
}

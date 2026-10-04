import { ProjectView } from "@/components/projects/project-view";
import React from "react";

export async function Project({ params }: { params: Promise<{ id: string }> }) {
  const {id} = await params;
  return <ProjectView projectId= {id}/>
}

export default Project;

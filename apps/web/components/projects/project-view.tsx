"use client";

import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Code2, Eye, LoaderCircle } from "lucide-react";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProjectHeader from "./project-header";
import MessageContainer from "./message-container";
import FragmentWeb from "./fragment-view";
import { FileExplorer } from "./filex-explorer";
import type { FragementType } from "@repo/database/models/fragment";

export type ProjectFragment = FragementType & {
  files: Record<string, string>;
};

export function ProjectView({ projectId }: { projectId: string }) {
  const [activeFragment, setActiveFragment] = useState<ProjectFragment | null>(null);
  const [tabState, setTabState] = useState<"preview" | "code">("preview");
  const [isGenerating, setIsGenerating] = useState(false);
  const isMobile = useIsMobile();

  return (
    <main className="flex h-dvh min-h-0 flex-col overflow-hidden bg-background">
      <ResizablePanelGroup
        orientation={isMobile ? "vertical" : "horizontal"}
        className="min-h-0 flex-1"
      >
        <ResizablePanel
          defaultSize={isMobile ? "48%" : "34%"}
          minSize={isMobile ? "30%" : "20%"}
          maxSize={isMobile ? "70%" : "60%"}
          className="flex min-h-0 flex-col border-r border-border"
        >
          <ProjectHeader projectId={projectId} />
          <MessageContainer
            projectId={projectId}
            activeFragment={activeFragment}
            setActiveFragment={setActiveFragment}
            onGeneratingChange={setIsGenerating}
          />
        </ResizablePanel>

        <ResizableHandle
          withHandle
          className="z-10 w-2 cursor-col-resize bg-border/70 transition-colors hover:bg-primary/50 aria-[orientation=horizontal]:h-2 aria-[orientation=horizontal]:w-full aria-[orientation=horizontal]:cursor-row-resize aria-[orientation=vertical]:h-full aria-[orientation=vertical]:w-2 aria-[orientation=vertical]:cursor-col-resize"
        />

        <ResizablePanel
          defaultSize={isMobile ? "52%" : "66%"}
          minSize={isMobile ? "30%" : "40%"}
          className="min-h-0 min-w-0"
        >
          <Tabs
            className="flex h-full flex-col"
            value={tabState}
            onValueChange={(value) => setTabState(value as "preview" | "code")}
          >
            <div className="flex h-12 shrink-0 items-center gap-3 border-b bg-background px-3">
              <TabsList className="h-8 rounded-md border bg-muted/50 p-0.5">
                <TabsTrigger
                  value="preview"
                  className="flex items-center gap-2 rounded px-3 text-xs"
                >
                  <Eye className="size-3.5" />
                  <span>Preview</span>
                </TabsTrigger>
                <TabsTrigger value="code" className="flex items-center gap-2 rounded px-3 text-xs">
                  <Code2 className="size-3.5" />
                  <span>Code</span>
                </TabsTrigger>
              </TabsList>

              <div className="ml-auto flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                {isGenerating ? (
                  <>
                    <LoaderCircle className="size-3.5 animate-spin text-primary" />
                    <span className="truncate">Updating your project</span>
                  </>
                ) : activeFragment ? (
                  <>
                    <span className="size-2 rounded-full bg-emerald-500" />
                    <span>Preview ready</span>
                  </>
                ) : (
                  <span>Workspace</span>
                )}
              </div>
            </div>

            <TabsContent
              value="preview"
              className="mt-0 min-h-0 flex-1 overflow-hidden data-[state=inactive]:hidden"
            >
              {activeFragment ? (
                <FragmentWeb data={activeFragment} isGenerating={isGenerating} />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-4 bg-muted/20 px-6 text-center">
                  <div className="flex size-12 items-center justify-center rounded-lg border bg-background shadow-sm">
                    {isGenerating ? (
                      <LoaderCircle className="size-5 animate-spin text-primary" />
                    ) : (
                      <Eye className="size-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="max-w-sm space-y-1.5">
                    <h2 className="text-sm font-medium text-foreground">
                      {isGenerating ? "Building your project" : "Your preview will appear here"}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {isGenerating
                        ? "The AI is writing the project and starting its sandbox preview."
                        : "Describe what you want in the chat to create your first version."}
                    </p>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent
              value="code"
              className="mt-0 min-h-0 flex-1 overflow-hidden data-[state=inactive]:hidden"
            >
              {activeFragment?.files && Object.keys(activeFragment.files).length > 0 ? (
                <div className="flex h-full min-h-0 flex-col">
                  {isGenerating && (
                    <div
                      className="flex h-10 shrink-0 items-center gap-2 border-b bg-muted/20 px-4 text-xs text-muted-foreground"
                      aria-live="polite"
                    >
                      <LoaderCircle className="size-3.5 animate-spin text-primary" />
                      <span>Updating code</span>
                    </div>
                  )}
                  <div className="min-h-0 flex-1">
                    <FileExplorer files={activeFragment.files} />
                  </div>
                </div>
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-4 bg-muted/20 px-6 text-center">
                  <div className="flex size-12 items-center justify-center rounded-lg border bg-background shadow-sm">
                    {isGenerating ? (
                      <LoaderCircle className="size-5 animate-spin text-primary" />
                    ) : (
                      <Code2 className="size-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="max-w-sm space-y-1.5">
                    <h2 className="text-sm font-medium text-foreground">
                      {isGenerating ? "Generating code" : "Your code will appear here"}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {isGenerating
                        ? "The agent is creating project files. They will appear here when the build is ready."
                        : "Generated project files will be available here."}
                    </p>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </ResizablePanel>
      </ResizablePanelGroup>
    </main>
  );
}

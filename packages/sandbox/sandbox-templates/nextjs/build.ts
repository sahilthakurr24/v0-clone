import { Template, defaultBuildLogger } from "e2b";
import { template as nextJSTemplate } from "./template";


Template.build(nextJSTemplate, "c0-build", {
  cpuCount: 4,
  memoryMB: 4096,
  onBuildLogs: defaultBuildLogger(),
  apiKey: "e2b_6b013975757c491fe3dc5c0eceb4231f6419adbb",
});

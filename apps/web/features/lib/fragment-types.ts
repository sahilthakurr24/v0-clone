import type {FragementType} from "@repo/database/models/fragment";

export type ProjectFragment = FragementType & {
    files: Record<string, string>;
  };

export function parseFragmentFiles(files: FragementType["files"]): Record<string, string> {
    if (!files || typeof files !== "object" || Array.isArray(files)) {
      return {};
    }
  
    return files as Record<string, string>;
  }
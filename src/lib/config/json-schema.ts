import { z } from "zod";
import { reviewConfigSchema } from "./schema";

/** JSON Schema for .codereviewer.yaml, for editor autocomplete and validation. */
export function configJsonSchema() {
  return {
    ...z.toJSONSchema(reviewConfigSchema, { io: "input", target: "draft-2020-12" }),
    title: "CodeReviewer configuration (.codereviewer.yaml)",
  };
}

// Writes schema/codereviewer.schema.json from the zod config schema. CI fails if it is stale.
import { writeFileSync } from "node:fs";
import { configJsonSchema } from "../src/lib/config/json-schema";

writeFileSync("schema/codereviewer.schema.json", `${JSON.stringify(configJsonSchema(), null, 2)}\n`);
console.log("Wrote schema/codereviewer.schema.json");

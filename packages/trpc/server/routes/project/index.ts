import { authenticatedProcedure, router } from "../../trpc";
import { generatePath } from "../../utils/path-generator";

const TAGS = ["PROJECT"];
const getPath = generatePath("/project");

export const projectRouter = router({
    // createProject : authenticatedProcedure.meta().input().output().mutation();
})
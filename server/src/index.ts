import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import {
  createUserInputSchema,
  updateUserInputSchema,
  getUsersByRoleInputSchema,
  createCvInputSchema,
  updateCvInputSchema,
  getCvsByUserInputSchema,
  createSearchProjectInputSchema,
  updateSearchProjectInputSchema,
  getProjectsByUserInputSchema,
  createProjectCvInputSchema,
  updateProjectCvInputSchema,
  getProjectCvsInputSchema,
  runMatchingInputSchema
} from './schema';

// Import handlers
import { createUser } from './handlers/create_user';
import { getUsersByRole } from './handlers/get_users_by_role';
import { getUserById } from './handlers/get_user_by_id';
import { createCV } from './handlers/create_cv';
import { getCVsByUser } from './handlers/get_cvs_by_user';
import { updateCVStatus } from './handlers/update_cv_status';
import { createSearchProject } from './handlers/create_search_project';
import { getProjectsByUser } from './handlers/get_projects_by_user';
import { updateSearchProject } from './handlers/update_search_project';
import { getAllProjects } from './handlers/get_all_projects';
import { getProjectDetails } from './handlers/get_project_details';
import { createProjectCV } from './handlers/create_project_cv';
import { getProjectCVs } from './handlers/get_project_cvs';
import { runMatchingAlgorithm } from './handlers/run_matching_algorithm';
import { parseCVWithAI } from './handlers/parse_cv_with_ai';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // User management routes
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),

  updateUser: publicProcedure
    .input(updateUserInputSchema)
    .mutation(({ input }) => {
      // Will need actual update handler implementation
      return Promise.resolve(null);
    }),

  getUsersByRole: publicProcedure
    .input(getUsersByRoleInputSchema)
    .query(({ input }) => getUsersByRole(input)),

  getUserById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getUserById(input.id)),

  // CV management routes (Job Seeker functionality)
  createCV: publicProcedure
    .input(createCvInputSchema)
    .mutation(({ input }) => createCV(input)),

  getCVsByUser: publicProcedure
    .input(getCvsByUserInputSchema)
    .query(({ input }) => getCVsByUser(input)),

  updateCVStatus: publicProcedure
    .input(updateCvInputSchema)
    .mutation(({ input }) => updateCVStatus(input)),

  parseCVWithAI: publicProcedure
    .input(z.object({ filePath: z.string() }))
    .mutation(({ input }) => parseCVWithAI(input.filePath)),

  // Search project routes (Job Provider functionality)
  createSearchProject: publicProcedure
    .input(createSearchProjectInputSchema)
    .mutation(({ input }) => createSearchProject(input)),

  getProjectsByUser: publicProcedure
    .input(getProjectsByUserInputSchema)
    .query(({ input }) => getProjectsByUser(input)),

  updateSearchProject: publicProcedure
    .input(updateSearchProjectInputSchema)
    .mutation(({ input }) => updateSearchProject(input)),

  getProjectDetails: publicProcedure
    .input(z.object({ projectId: z.number() }))
    .query(({ input }) => getProjectDetails(input.projectId)),

  // Project CV routes (CV upload and management for projects)
  createProjectCV: publicProcedure
    .input(createProjectCvInputSchema)
    .mutation(({ input }) => createProjectCV(input)),

  getProjectCVs: publicProcedure
    .input(getProjectCvsInputSchema)
    .query(({ input }) => getProjectCVs(input)),

  updateProjectCV: publicProcedure
    .input(updateProjectCvInputSchema)
    .mutation(({ input }) => {
      // Will need actual update handler implementation
      return Promise.resolve(null);
    }),

  // Matching and scoring routes
  runMatchingAlgorithm: publicProcedure
    .input(runMatchingInputSchema)
    .mutation(({ input }) => runMatchingAlgorithm(input)),

  // Talent acquisition routes (pipeline management)
  getAllProjects: publicProcedure
    .query(() => getAllProjects()),

  // Batch CV upload route (up to 10 CVs per project)
  uploadCVBatch: publicProcedure
    .input(z.object({
      projectId: z.number(),
      cvFiles: z.array(z.object({
        filename: z.string(),
        originalFilename: z.string(),
        filePath: z.string()
      })).max(10) // Enforce maximum 10 CVs per batch
    }))
    .mutation(async ({ input }) => {
      // This is a placeholder declaration! Real code should be implemented here.
      // The goal is to handle batch upload of up to 10 CVs for a project.
      // Should create project CV records, trigger AI parsing, and initiate scoring.
      const results = [];
      for (const cvFile of input.cvFiles) {
        const projectCV = await createProjectCV({
          project_id: input.projectId,
          filename: cvFile.filename,
          original_filename: cvFile.originalFilename,
          file_path: cvFile.filePath
        });
        results.push(projectCV);
      }
      return results;
    }),

  // Re-run matching with updated weights
  rerunMatchingWithNewWeights: publicProcedure
    .input(z.object({
      projectId: z.number(),
      newWeights: z.object({
        years_experience: z.number().min(0).max(100),
        role_match: z.number().min(0).max(100),
        skills_match: z.number().min(0).max(100),
        industry_match: z.number().min(0).max(100),
        job_stability: z.number().min(0).max(100)
      })
    }))
    .mutation(async ({ input }) => {
      // This is a placeholder declaration! Real code should be implemented here.
      // The goal is to update project criteria weights and re-run the matching algorithm.
      // Should validate that weights sum to 100, update project criteria, and re-score all CVs.
      
      // First update the project with new weights
      const updatedProject = await updateSearchProject({
        id: input.projectId,
        criteria: {
          minimum_years_experience: null,
          target_role: null,
          required_skills: [],
          preferred_skills: [],
          target_industries: [],
          max_job_changes_per_year: null,
          weights: input.newWeights
        }
      });

      // Then re-run matching
      const matchingResults = await runMatchingAlgorithm({
        project_id: input.projectId
      });

      return matchingResults;
    })
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`🚀 CV Management & Job Matching Platform API`);
  console.log(`📡 tRPC server listening at port: ${port}`);
  console.log(`🔗 Available at: http://localhost:${port}`);
  console.log(`📋 User Roles: JOB_SEEKER | JOB_PROVIDER | TALENT_ACQUISITION`);
}

start();
import { z } from 'zod';

// User role enum
export const userRoleSchema = z.enum(['JOB_SEEKER', 'JOB_PROVIDER', 'TALENT_ACQUISITION']);
export type UserRole = z.infer<typeof userRoleSchema>;

// User schema
export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  first_name: z.string(),
  last_name: z.string(),
  role: userRoleSchema,
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// CV status enum
export const cvStatusSchema = z.enum(['ACTIVE', 'INACTIVE']);
export type CVStatus = z.infer<typeof cvStatusSchema>;

// CV schema
export const cvSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  filename: z.string(),
  original_filename: z.string(),
  file_path: z.string(),
  status: cvStatusSchema,
  parsed_data: z.any().nullable(), // JSON data from AI parsing
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type CV = z.infer<typeof cvSchema>;

// Search project status enum
export const projectStatusSchema = z.enum(['DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED']);
export type ProjectStatus = z.infer<typeof projectStatusSchema>;

// Search project schema
export const searchProjectSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  created_by_user_id: z.number(),
  status: projectStatusSchema,
  criteria: z.any(), // JSON object with criteria and weights
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type SearchProject = z.infer<typeof searchProjectSchema>;

// Project CV schema (uploaded CVs for a project)
export const projectCvSchema = z.object({
  id: z.number(),
  project_id: z.number(),
  filename: z.string(),
  original_filename: z.string(),
  file_path: z.string(),
  parsed_data: z.any().nullable(), // JSON data from AI parsing
  score: z.number().nullable(), // Calculated match score
  ranking: z.number().nullable(), // Ranking within the project
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type ProjectCV = z.infer<typeof projectCvSchema>;

// Parsed CV data structure (common structure for both user CVs and project CVs)
export const parsedCvDataSchema = z.object({
  total_years_experience: z.number().nullable(),
  employment_history: z.array(z.object({
    company: z.string(),
    position: z.string(),
    start_date: z.string().nullable(),
    end_date: z.string().nullable(),
    duration_months: z.number().nullable(),
    description: z.string().nullable()
  })).nullable(),
  job_changes_frequency: z.number().nullable(), // Jobs per year
  roles_positions: z.array(z.string()).nullable(),
  skills: z.array(z.string()).nullable(),
  dominant_industries: z.array(z.string()).nullable(),
  contact_info: z.object({
    email: z.string().nullable(),
    phone: z.string().nullable(),
    location: z.string().nullable()
  }).nullable(),
  education: z.array(z.object({
    institution: z.string(),
    degree: z.string().nullable(),
    field: z.string().nullable(),
    graduation_year: z.number().nullable()
  })).nullable()
});

export type ParsedCVData = z.infer<typeof parsedCvDataSchema>;

// Project criteria schema
export const projectCriteriaSchema = z.object({
  minimum_years_experience: z.number().nullable(),
  target_role: z.string().nullable(),
  required_skills: z.array(z.string()),
  preferred_skills: z.array(z.string()),
  target_industries: z.array(z.string()),
  max_job_changes_per_year: z.number().nullable(),
  weights: z.object({
    years_experience: z.number().min(0).max(100).default(25),
    role_match: z.number().min(0).max(100).default(25),
    skills_match: z.number().min(0).max(100).default(30),
    industry_match: z.number().min(0).max(100).default(10),
    job_stability: z.number().min(0).max(100).default(10)
  })
});

export type ProjectCriteria = z.infer<typeof projectCriteriaSchema>;

// Input schemas for creating entities

export const createUserInputSchema = z.object({
  email: z.string().email(),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  role: userRoleSchema
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

export const updateUserInputSchema = z.object({
  id: z.number(),
  email: z.string().email().optional(),
  first_name: z.string().min(1).optional(),
  last_name: z.string().min(1).optional(),
  role: userRoleSchema.optional()
});

export type UpdateUserInput = z.infer<typeof updateUserInputSchema>;

export const createCvInputSchema = z.object({
  user_id: z.number(),
  filename: z.string(),
  original_filename: z.string(),
  file_path: z.string(),
  status: cvStatusSchema.default('INACTIVE')
});

export type CreateCVInput = z.infer<typeof createCvInputSchema>;

export const updateCvInputSchema = z.object({
  id: z.number(),
  status: cvStatusSchema.optional(),
  parsed_data: z.any().optional()
});

export type UpdateCVInput = z.infer<typeof updateCvInputSchema>;

export const createSearchProjectInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable(),
  created_by_user_id: z.number(),
  criteria: projectCriteriaSchema,
  status: projectStatusSchema.default('DRAFT')
});

export type CreateSearchProjectInput = z.infer<typeof createSearchProjectInputSchema>;

export const updateSearchProjectInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  status: projectStatusSchema.optional(),
  criteria: projectCriteriaSchema.optional()
});

export type UpdateSearchProjectInput = z.infer<typeof updateSearchProjectInputSchema>;

export const createProjectCvInputSchema = z.object({
  project_id: z.number(),
  filename: z.string(),
  original_filename: z.string(),
  file_path: z.string()
});

export type CreateProjectCVInput = z.infer<typeof createProjectCvInputSchema>;

export const updateProjectCvInputSchema = z.object({
  id: z.number(),
  parsed_data: z.any().optional(),
  score: z.number().optional(),
  ranking: z.number().optional()
});

export type UpdateProjectCVInput = z.infer<typeof updateProjectCvInputSchema>;

// Query input schemas
export const getUsersByRoleInputSchema = z.object({
  role: userRoleSchema
});

export type GetUsersByRoleInput = z.infer<typeof getUsersByRoleInputSchema>;

export const getCvsByUserInputSchema = z.object({
  user_id: z.number()
});

export type GetCVsByUserInput = z.infer<typeof getCvsByUserInputSchema>;

export const getProjectsByUserInputSchema = z.object({
  user_id: z.number()
});

export type GetProjectsByUserInput = z.infer<typeof getProjectsByUserInputSchema>;

export const getProjectCvsInputSchema = z.object({
  project_id: z.number(),
  limit: z.number().optional().default(50),
  offset: z.number().optional().default(0)
});

export type GetProjectCVsInput = z.infer<typeof getProjectCvsInputSchema>;

export const runMatchingInputSchema = z.object({
  project_id: z.number()
});

export type RunMatchingInput = z.infer<typeof runMatchingInputSchema>;

// Response schemas
export const cvMatchResultSchema = z.object({
  cv: projectCvSchema,
  score: z.number(),
  ranking: z.number(),
  highlights: z.object({
    years_experience_match: z.object({
      actual: z.number().nullable(),
      required: z.number().nullable(),
      score: z.number()
    }),
    role_match: z.object({
      matches: z.array(z.string()),
      score: z.number()
    }),
    skills_match: z.object({
      exact_matches: z.array(z.string()),
      semantic_matches: z.array(z.string()),
      score: z.number()
    }),
    industry_match: z.object({
      matches: z.array(z.string()),
      score: z.number()
    }),
    job_stability: z.object({
      job_changes_per_year: z.number().nullable(),
      score: z.number()
    })
  })
});

export type CVMatchResult = z.infer<typeof cvMatchResultSchema>;

export const projectMatchingResultsSchema = z.object({
  project: searchProjectSchema,
  results: z.array(cvMatchResultSchema),
  total_candidates: z.number(),
  processed_at: z.coerce.date()
});

export type ProjectMatchingResults = z.infer<typeof projectMatchingResultsSchema>;
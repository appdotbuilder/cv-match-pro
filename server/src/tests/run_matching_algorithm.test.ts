import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, searchProjectsTable, projectCvsTable } from '../db/schema';
import { type RunMatchingInput, type CreateUserInput, type CreateSearchProjectInput, type CreateProjectCVInput, type ProjectCriteria, type ParsedCVData } from '../schema';
import { runMatchingAlgorithm } from '../handlers/run_matching_algorithm';
import { eq } from 'drizzle-orm';

// Test data
const testUser: CreateUserInput = {
  email: 'talent@test.com',
  first_name: 'Jane',
  last_name: 'Recruiter',
  role: 'TALENT_ACQUISITION'
};

const testCriteria: ProjectCriteria = {
  minimum_years_experience: 3,
  target_role: 'Software Engineer',
  required_skills: ['JavaScript', 'React'],
  preferred_skills: ['TypeScript', 'Node.js'],
  target_industries: ['Technology', 'Software'],
  max_job_changes_per_year: 0.5,
  weights: {
    years_experience: 25,
    role_match: 25,
    skills_match: 30,
    industry_match: 10,
    job_stability: 10
  }
};

const testProject: CreateSearchProjectInput = {
  name: 'Senior Frontend Developer Search',
  description: 'Looking for experienced frontend developers',
  created_by_user_id: 1, // Will be updated after user creation
  criteria: testCriteria,
  status: 'ACTIVE'
};

// Sample parsed CV data for different candidate profiles
const excellentCandidate: ParsedCVData = {
  total_years_experience: 5,
  employment_history: [
    {
      company: 'Tech Corp',
      position: 'Senior Software Engineer',
      start_date: '2019-01',
      end_date: null,
      duration_months: 60,
      description: 'Full-stack development'
    }
  ],
  job_changes_frequency: 0.2,
  roles_positions: ['Software Engineer', 'Senior Software Engineer'],
  skills: ['JavaScript', 'React', 'TypeScript', 'Node.js', 'Python'],
  dominant_industries: ['Technology', 'Software'],
  contact_info: {
    email: 'candidate@example.com',
    phone: '+1234567890',
    location: 'San Francisco, CA'
  },
  education: [
    {
      institution: 'Stanford University',
      degree: 'Bachelor of Science',
      field: 'Computer Science',
      graduation_year: 2019
    }
  ]
};

const averageCandidate: ParsedCVData = {
  total_years_experience: 2,
  employment_history: [
    {
      company: 'Small Startup',
      position: 'Junior Developer',
      start_date: '2022-01',
      end_date: null,
      duration_months: 24,
      description: 'Web development'
    }
  ],
  job_changes_frequency: 0.5,
  roles_positions: ['Junior Developer', 'Web Developer'],
  skills: ['JavaScript', 'HTML', 'CSS'],
  dominant_industries: ['Technology'],
  contact_info: {
    email: 'junior@example.com',
    phone: '+1234567891',
    location: 'Austin, TX'
  },
  education: [
    {
      institution: 'University of Texas',
      degree: 'Bachelor of Science',
      field: 'Computer Science',
      graduation_year: 2022
    }
  ]
};

const poorCandidate: ParsedCVData = {
  total_years_experience: 1,
  employment_history: [
    {
      company: 'Different Industry Corp',
      position: 'Marketing Assistant',
      start_date: '2023-01',
      end_date: '2023-06',
      duration_months: 6,
      description: 'Marketing campaigns'
    },
    {
      company: 'Another Corp',
      position: 'Sales Rep',
      start_date: '2023-07',
      end_date: null,
      duration_months: 6,
      description: 'Sales activities'
    }
  ],
  job_changes_frequency: 2.0,
  roles_positions: ['Marketing Assistant', 'Sales Rep'],
  skills: ['Excel', 'PowerPoint', 'Communication'],
  dominant_industries: ['Marketing', 'Sales'],
  contact_info: {
    email: 'different@example.com',
    phone: '+1234567892',
    location: 'New York, NY'
  },
  education: [
    {
      institution: 'Generic University',
      degree: 'Bachelor of Arts',
      field: 'Business',
      graduation_year: 2023
    }
  ]
};

describe('runMatchingAlgorithm', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should run matching algorithm successfully', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test project
    const projectData = { ...testProject, created_by_user_id: userId };
    const projectResult = await db.insert(searchProjectsTable)
      .values({
        ...projectData,
        criteria: projectData.criteria as any
      })
      .returning()
      .execute();
    const projectId = projectResult[0].id;

    // Create test CVs with different quality profiles
    const cvs = [
      {
        project_id: projectId,
        filename: 'excellent_cv.pdf',
        original_filename: 'excellent_candidate.pdf',
        file_path: '/uploads/excellent.pdf',
        parsed_data: excellentCandidate as any
      },
      {
        project_id: projectId,
        filename: 'average_cv.pdf',
        original_filename: 'average_candidate.pdf',
        file_path: '/uploads/average.pdf',
        parsed_data: averageCandidate as any
      },
      {
        project_id: projectId,
        filename: 'poor_cv.pdf',
        original_filename: 'poor_candidate.pdf',
        file_path: '/uploads/poor.pdf',
        parsed_data: poorCandidate as any
      }
    ];

    await db.insert(projectCvsTable)
      .values(cvs)
      .execute();

    const input: RunMatchingInput = { project_id: projectId };

    // Run the matching algorithm
    const result = await runMatchingAlgorithm(input);

    // Verify basic structure
    expect(result.project).toBeDefined();
    expect(result.project.id).toEqual(projectId);
    expect(result.results).toHaveLength(3);
    expect(result.total_candidates).toEqual(3);
    expect(result.processed_at).toBeInstanceOf(Date);

    // Verify results are sorted by score (descending)
    const scores = result.results.map(r => r.score);
    const sortedScores = [...scores].sort((a, b) => b - a);
    expect(scores).toEqual(sortedScores);

    // Verify rankings are assigned correctly
    result.results.forEach((result, index) => {
      expect(result.ranking).toEqual(index + 1);
    });

    // Verify the excellent candidate scores highest
    const excellentResult = result.results[0];
    expect(excellentResult.score).toBeGreaterThan(result.results[1].score);
    expect(excellentResult.score).toBeGreaterThan(result.results[2].score);

    // Verify score components exist
    expect(excellentResult.highlights.years_experience_match.score).toBeGreaterThan(0);
    expect(excellentResult.highlights.role_match.matches.length).toBeGreaterThan(0);
    expect(excellentResult.highlights.skills_match.exact_matches.length).toBeGreaterThan(0);
  });

  it('should update database with scores and rankings', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test project
    const projectData = { ...testProject, created_by_user_id: userId };
    const projectResult = await db.insert(searchProjectsTable)
      .values({
        ...projectData,
        criteria: projectData.criteria as any
      })
      .returning()
      .execute();
    const projectId = projectResult[0].id;

    // Create a single test CV
    const cvResult = await db.insert(projectCvsTable)
      .values({
        project_id: projectId,
        filename: 'test_cv.pdf',
        original_filename: 'candidate.pdf',
        file_path: '/uploads/test.pdf',
        parsed_data: excellentCandidate as any
      })
      .returning()
      .execute();
    const cvId = cvResult[0].id;

    const input: RunMatchingInput = { project_id: projectId };

    // Run matching algorithm
    await runMatchingAlgorithm(input);

    // Verify database was updated
    const updatedCvs = await db.select()
      .from(projectCvsTable)
      .where(eq(projectCvsTable.id, cvId))
      .execute();

    expect(updatedCvs).toHaveLength(1);
    const updatedCv = updatedCvs[0];
    
    // Verify score and ranking were updated
    expect(typeof parseFloat(updatedCv.score || '0')).toBe('number');
    expect(parseFloat(updatedCv.score || '0')).toBeGreaterThan(0);
    expect(updatedCv.ranking).toEqual(1);
    expect(updatedCv.updated_at).toBeInstanceOf(Date);
  });

  it('should handle project without CVs', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test project without CVs
    const projectData = { ...testProject, created_by_user_id: userId };
    const projectResult = await db.insert(searchProjectsTable)
      .values({
        ...projectData,
        criteria: projectData.criteria as any
      })
      .returning()
      .execute();
    const projectId = projectResult[0].id;

    const input: RunMatchingInput = { project_id: projectId };

    // Run matching algorithm
    const result = await runMatchingAlgorithm(input);

    // Verify empty results
    expect(result.results).toHaveLength(0);
    expect(result.total_candidates).toEqual(0);
    expect(result.project.id).toEqual(projectId);
  });

  it('should skip CVs without parsed data', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test project
    const projectData = { ...testProject, created_by_user_id: userId };
    const projectResult = await db.insert(searchProjectsTable)
      .values({
        ...projectData,
        criteria: projectData.criteria as any
      })
      .returning()
      .execute();
    const projectId = projectResult[0].id;

    // Create CVs with and without parsed data
    await db.insert(projectCvsTable)
      .values([
        {
          project_id: projectId,
          filename: 'parsed_cv.pdf',
          original_filename: 'parsed.pdf',
          file_path: '/uploads/parsed.pdf',
          parsed_data: excellentCandidate as any
        },
        {
          project_id: projectId,
          filename: 'unparsed_cv.pdf',
          original_filename: 'unparsed.pdf',
          file_path: '/uploads/unparsed.pdf',
          parsed_data: null // No parsed data
        }
      ])
      .execute();

    const input: RunMatchingInput = { project_id: projectId };

    // Run matching algorithm
    const result = await runMatchingAlgorithm(input);

    // Should only process the CV with parsed data
    expect(result.results).toHaveLength(1);
    expect(result.total_candidates).toEqual(1);
  });

  it('should handle non-existent project', async () => {
    const input: RunMatchingInput = { project_id: 99999 };

    // Should throw error for non-existent project
    await expect(runMatchingAlgorithm(input)).rejects.toThrow(/not found/i);
  });

  it('should calculate different scores for different candidate profiles', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test project
    const projectData = { ...testProject, created_by_user_id: userId };
    const projectResult = await db.insert(searchProjectsTable)
      .values({
        ...projectData,
        criteria: projectData.criteria as any
      })
      .returning()
      .execute();
    const projectId = projectResult[0].id;

    // Create CVs with very different profiles
    await db.insert(projectCvsTable)
      .values([
        {
          project_id: projectId,
          filename: 'excellent_cv.pdf',
          original_filename: 'excellent.pdf',
          file_path: '/uploads/excellent.pdf',
          parsed_data: excellentCandidate as any
        },
        {
          project_id: projectId,
          filename: 'poor_cv.pdf',
          original_filename: 'poor.pdf',
          file_path: '/uploads/poor.pdf',
          parsed_data: poorCandidate as any
        }
      ])
      .execute();

    const input: RunMatchingInput = { project_id: projectId };

    // Run matching algorithm
    const result = await runMatchingAlgorithm(input);

    // Verify significant score difference
    expect(result.results).toHaveLength(2);
    const [first, second] = result.results;
    
    // Excellent candidate should score much higher than poor candidate
    expect(first.score).toBeGreaterThan(second.score * 1.5);
    
    // Verify individual component scores make sense
    expect(first.highlights.years_experience_match.score).toBeGreaterThan(
      second.highlights.years_experience_match.score
    );
    expect(first.highlights.skills_match.exact_matches.length).toBeGreaterThan(0);
    expect(second.highlights.skills_match.exact_matches.length).toEqual(0);
  });
});
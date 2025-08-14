import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, searchProjectsTable, projectCvsTable } from '../db/schema';
import { type GetProjectCVsInput, type CreateUserInput, type CreateSearchProjectInput, type CreateProjectCVInput } from '../schema';
import { getProjectCVs } from '../handlers/get_project_cvs';

// Test data
const testUser: CreateUserInput = {
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User',
  role: 'TALENT_ACQUISITION'
};

const testProject: CreateSearchProjectInput = {
  name: 'Test Project',
  description: 'A project for testing',
  created_by_user_id: 1, // Will be set after user creation
  status: 'DRAFT',
  criteria: {
    minimum_years_experience: 3,
    target_role: 'Software Engineer',
    required_skills: ['JavaScript', 'React'],
    preferred_skills: ['TypeScript', 'Node.js'],
    target_industries: ['Technology'],
    max_job_changes_per_year: 1,
    weights: {
      years_experience: 25,
      role_match: 25,
      skills_match: 30,
      industry_match: 10,
      job_stability: 10
    }
  }
};

const createTestCV = (projectId: number, filename: string, score?: number, ranking?: number): CreateProjectCVInput & { score?: number, ranking?: number } => ({
  project_id: projectId,
  filename: filename,
  original_filename: `${filename}.pdf`,
  file_path: `/uploads/${filename}.pdf`,
  score,
  ranking
});

describe('getProjectCVs', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no CVs exist for project', async () => {
    // Create user and project
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const projectResult = await db.insert(searchProjectsTable)
      .values({
        ...testProject,
        created_by_user_id: userResult[0].id,
        criteria: testProject.criteria
      })
      .returning()
      .execute();

    const input: GetProjectCVsInput = {
      project_id: projectResult[0].id,
      limit: 50,
      offset: 0
    };

    const result = await getProjectCVs(input);

    expect(result).toEqual([]);
  });

  it('should return CVs for a specific project', async () => {
    // Create user and project
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const projectResult = await db.insert(searchProjectsTable)
      .values({
        ...testProject,
        created_by_user_id: userResult[0].id,
        criteria: testProject.criteria
      })
      .returning()
      .execute();

    // Create CVs for the project
    const cv1Data = createTestCV(projectResult[0].id, 'test-cv-1', 85.5, 1);
    const cv2Data = createTestCV(projectResult[0].id, 'test-cv-2', 72.3, 2);
    
    await db.insert(projectCvsTable)
      .values([
        {
          project_id: cv1Data.project_id,
          filename: cv1Data.filename,
          original_filename: cv1Data.original_filename,
          file_path: cv1Data.file_path,
          score: cv1Data.score?.toString(),
          ranking: cv1Data.ranking
        },
        {
          project_id: cv2Data.project_id,
          filename: cv2Data.filename,
          original_filename: cv2Data.original_filename,
          file_path: cv2Data.file_path,
          score: cv2Data.score?.toString(),
          ranking: cv2Data.ranking
        }
      ])
      .execute();

    const input: GetProjectCVsInput = {
      project_id: projectResult[0].id,
      limit: 50,
      offset: 0
    };

    const result = await getProjectCVs(input);

    expect(result).toHaveLength(2);
    
    // Verify first CV (should be ranked first)
    expect(result[0].filename).toEqual('test-cv-1');
    expect(result[0].original_filename).toEqual('test-cv-1.pdf');
    expect(result[0].file_path).toEqual('/uploads/test-cv-1.pdf');
    expect(result[0].score).toEqual(85.5);
    expect(result[0].ranking).toEqual(1);
    expect(result[0].project_id).toEqual(projectResult[0].id);
    expect(result[0].id).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);

    // Verify second CV (should be ranked second)
    expect(result[1].filename).toEqual('test-cv-2');
    expect(result[1].score).toEqual(72.3);
    expect(result[1].ranking).toEqual(2);
  });

  it('should handle CVs without scores and rankings', async () => {
    // Create user and project
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const projectResult = await db.insert(searchProjectsTable)
      .values({
        ...testProject,
        created_by_user_id: userResult[0].id,
        criteria: testProject.criteria
      })
      .returning()
      .execute();

    // Create CV without score and ranking
    const cvData = createTestCV(projectResult[0].id, 'unranked-cv');
    
    await db.insert(projectCvsTable)
      .values({
        project_id: cvData.project_id,
        filename: cvData.filename,
        original_filename: cvData.original_filename,
        file_path: cvData.file_path
      })
      .execute();

    const input: GetProjectCVsInput = {
      project_id: projectResult[0].id,
      limit: 50,
      offset: 0
    };

    const result = await getProjectCVs(input);

    expect(result).toHaveLength(1);
    expect(result[0].filename).toEqual('unranked-cv');
    expect(result[0].score).toBeNull();
    expect(result[0].ranking).toBeNull();
  });

  it('should order CVs by ranking correctly', async () => {
    // Create user and project
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const projectResult = await db.insert(searchProjectsTable)
      .values({
        ...testProject,
        created_by_user_id: userResult[0].id,
        criteria: testProject.criteria
      })
      .returning()
      .execute();

    // Create CVs with different rankings (insert in random order)
    const cvs = [
      { ...createTestCV(projectResult[0].id, 'cv-rank-3', 60.0, 3), ranking: 3 },
      { ...createTestCV(projectResult[0].id, 'cv-rank-1', 90.0, 1), ranking: 1 },
      { ...createTestCV(projectResult[0].id, 'cv-unranked', 50.0), ranking: null },
      { ...createTestCV(projectResult[0].id, 'cv-rank-2', 75.0, 2), ranking: 2 }
    ];

    for (const cvData of cvs) {
      await db.insert(projectCvsTable)
        .values({
          project_id: cvData.project_id,
          filename: cvData.filename,
          original_filename: cvData.original_filename,
          file_path: cvData.file_path,
          score: cvData.score?.toString(),
          ranking: cvData.ranking
        })
        .execute();
    }

    const input: GetProjectCVsInput = {
      project_id: projectResult[0].id,
      limit: 50,
      offset: 0
    };

    const result = await getProjectCVs(input);

    expect(result).toHaveLength(4);
    
    // Should be ordered by ranking: 1, 2, 3, then unranked (null values come last in ASC order)
    expect(result[0].filename).toEqual('cv-rank-1');
    expect(result[0].ranking).toEqual(1);
    
    expect(result[1].filename).toEqual('cv-rank-2');
    expect(result[1].ranking).toEqual(2);
    
    expect(result[2].filename).toEqual('cv-rank-3');
    expect(result[2].ranking).toEqual(3);
    
    expect(result[3].filename).toEqual('cv-unranked');
    expect(result[3].ranking).toBeNull();
  });

  it('should respect pagination limits', async () => {
    // Create user and project
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const projectResult = await db.insert(searchProjectsTable)
      .values({
        ...testProject,
        created_by_user_id: userResult[0].id,
        criteria: testProject.criteria
      })
      .returning()
      .execute();

    // Create 5 CVs
    const cvs = Array.from({ length: 5 }, (_, i) => 
      createTestCV(projectResult[0].id, `cv-${i + 1}`, 80 - i * 10, i + 1)
    );

    for (const cvData of cvs) {
      await db.insert(projectCvsTable)
        .values({
          project_id: cvData.project_id,
          filename: cvData.filename,
          original_filename: cvData.original_filename,
          file_path: cvData.file_path,
          score: cvData.score?.toString(),
          ranking: cvData.ranking
        })
        .execute();
    }

    // Test with limit
    const inputWithLimit: GetProjectCVsInput = {
      project_id: projectResult[0].id,
      limit: 2,
      offset: 0
    };

    const resultLimited = await getProjectCVs(inputWithLimit);
    expect(resultLimited).toHaveLength(2);
    expect(resultLimited[0].filename).toEqual('cv-1');
    expect(resultLimited[1].filename).toEqual('cv-2');

    // Test with offset
    const inputWithOffset: GetProjectCVsInput = {
      project_id: projectResult[0].id,
      limit: 2,
      offset: 2
    };

    const resultOffset = await getProjectCVs(inputWithOffset);
    expect(resultOffset).toHaveLength(2);
    expect(resultOffset[0].filename).toEqual('cv-3');
    expect(resultOffset[1].filename).toEqual('cv-4');
  });

  it('should only return CVs for the specified project', async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    // Create two projects
    const project1Result = await db.insert(searchProjectsTable)
      .values({
        ...testProject,
        name: 'Project 1',
        created_by_user_id: userResult[0].id,
        criteria: testProject.criteria
      })
      .returning()
      .execute();

    const project2Result = await db.insert(searchProjectsTable)
      .values({
        ...testProject,
        name: 'Project 2',
        created_by_user_id: userResult[0].id,
        criteria: testProject.criteria
      })
      .returning()
      .execute();

    // Create CVs for both projects
    await db.insert(projectCvsTable)
      .values([
        {
          ...createTestCV(project1Result[0].id, 'project1-cv1'),
          score: '85.0',
          ranking: 1
        },
        {
          ...createTestCV(project1Result[0].id, 'project1-cv2'),
          score: '75.0',
          ranking: 2
        },
        {
          ...createTestCV(project2Result[0].id, 'project2-cv1'),
          score: '90.0',
          ranking: 1
        }
      ])
      .execute();

    // Query for project 1 CVs
    const input: GetProjectCVsInput = {
      project_id: project1Result[0].id,
      limit: 50,
      offset: 0
    };

    const result = await getProjectCVs(input);

    expect(result).toHaveLength(2);
    expect(result.every(cv => cv.project_id === project1Result[0].id)).toBe(true);
    expect(result[0].filename).toEqual('project1-cv1');
    expect(result[1].filename).toEqual('project1-cv2');
  });

  it('should convert numeric score correctly', async () => {
    // Create user and project
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const projectResult = await db.insert(searchProjectsTable)
      .values({
        ...testProject,
        created_by_user_id: userResult[0].id,
        criteria: testProject.criteria
      })
      .returning()
      .execute();

    // Create CV with precise score
    const cvData = createTestCV(projectResult[0].id, 'precise-score-cv', 87.65, 1);
    
    await db.insert(projectCvsTable)
      .values({
        project_id: cvData.project_id,
        filename: cvData.filename,
        original_filename: cvData.original_filename,
        file_path: cvData.file_path,
        score: cvData.score?.toString(),
        ranking: cvData.ranking
      })
      .execute();

    const input: GetProjectCVsInput = {
      project_id: projectResult[0].id,
      limit: 50,
      offset: 0
    };

    const result = await getProjectCVs(input);

    expect(result).toHaveLength(1);
    expect(result[0].score).toEqual(87.65);
    expect(typeof result[0].score).toBe('number');
  });
});
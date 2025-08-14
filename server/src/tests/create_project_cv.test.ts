import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, searchProjectsTable, projectCvsTable } from '../db/schema';
import { type CreateProjectCVInput } from '../schema';
import { createProjectCV } from '../handlers/create_project_cv';
import { eq } from 'drizzle-orm';

// Helper function to create a test user
const createTestUser = async () => {
  const result = await db.insert(usersTable)
    .values({
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
      role: 'TALENT_ACQUISITION'
    })
    .returning()
    .execute();
  return result[0];
};

// Helper function to create a test project
const createTestProject = async (createdByUserId: number) => {
  const result = await db.insert(searchProjectsTable)
    .values({
      name: 'Test Project',
      description: 'A test project',
      created_by_user_id: createdByUserId,
      status: 'ACTIVE',
      criteria: {
        minimum_years_experience: 2,
        target_role: 'Software Engineer',
        required_skills: ['JavaScript', 'TypeScript'],
        preferred_skills: ['React', 'Node.js'],
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
    })
    .returning()
    .execute();
  return result[0];
};

// Test input
const testInput: CreateProjectCVInput = {
  project_id: 1, // Will be updated in tests
  filename: 'cv_123456.pdf',
  original_filename: 'john_doe_cv.pdf',
  file_path: '/uploads/projects/1/cv_123456.pdf'
};

describe('createProjectCV', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a project CV successfully', async () => {
    // Create prerequisite data
    const user = await createTestUser();
    const project = await createTestProject(user.id);

    const input = { ...testInput, project_id: project.id };
    const result = await createProjectCV(input);

    // Validate returned data
    expect(result.id).toBeDefined();
    expect(result.project_id).toEqual(project.id);
    expect(result.filename).toEqual('cv_123456.pdf');
    expect(result.original_filename).toEqual('john_doe_cv.pdf');
    expect(result.file_path).toEqual('/uploads/projects/1/cv_123456.pdf');
    expect(result.parsed_data).toBeNull();
    expect(result.score).toBeNull();
    expect(result.ranking).toBeNull();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save project CV to database', async () => {
    // Create prerequisite data
    const user = await createTestUser();
    const project = await createTestProject(user.id);

    const input = { ...testInput, project_id: project.id };
    const result = await createProjectCV(input);

    // Query database to verify record was created
    const projectCvs = await db.select()
      .from(projectCvsTable)
      .where(eq(projectCvsTable.id, result.id))
      .execute();

    expect(projectCvs).toHaveLength(1);
    expect(projectCvs[0].project_id).toEqual(project.id);
    expect(projectCvs[0].filename).toEqual('cv_123456.pdf');
    expect(projectCvs[0].original_filename).toEqual('john_doe_cv.pdf');
    expect(projectCvs[0].file_path).toEqual('/uploads/projects/1/cv_123456.pdf');
    expect(projectCvs[0].parsed_data).toBeNull();
    expect(projectCvs[0].score).toBeNull();
    expect(projectCvs[0].ranking).toBeNull();
    expect(projectCvs[0].created_at).toBeInstanceOf(Date);
    expect(projectCvs[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error when project does not exist', async () => {
    const input = { ...testInput, project_id: 999 };

    await expect(createProjectCV(input)).rejects.toThrow(/project with id 999 not found/i);
  });

  it('should enforce maximum CV limit per project', async () => {
    // Create prerequisite data
    const user = await createTestUser();
    const project = await createTestProject(user.id);

    // Create 10 CVs (maximum limit)
    for (let i = 0; i < 10; i++) {
      const cvInput = {
        ...testInput,
        project_id: project.id,
        filename: `cv_${i + 1}.pdf`,
        original_filename: `candidate_${i + 1}.pdf`,
        file_path: `/uploads/projects/${project.id}/cv_${i + 1}.pdf`
      };
      await createProjectCV(cvInput);
    }

    // Try to add 11th CV - should fail
    const input = {
      ...testInput,
      project_id: project.id,
      filename: 'cv_11.pdf',
      original_filename: 'candidate_11.pdf',
      file_path: `/uploads/projects/${project.id}/cv_11.pdf`
    };

    await expect(createProjectCV(input)).rejects.toThrow(/project has reached maximum limit of 10 cvs/i);
  });

  it('should handle multiple projects with separate CV limits', async () => {
    // Create prerequisite data
    const user = await createTestUser();
    const project1 = await createTestProject(user.id);
    
    // Create second project
    const project2 = await db.insert(searchProjectsTable)
      .values({
        name: 'Test Project 2',
        description: 'Another test project',
        created_by_user_id: user.id,
        status: 'ACTIVE',
        criteria: {
          minimum_years_experience: 3,
          target_role: 'Senior Engineer',
          required_skills: ['Python', 'Django'],
          preferred_skills: ['PostgreSQL'],
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
      })
      .returning()
      .execute();

    // Add 10 CVs to project1 (maximum)
    for (let i = 0; i < 10; i++) {
      const cvInput = {
        ...testInput,
        project_id: project1.id,
        filename: `cv_p1_${i + 1}.pdf`,
        original_filename: `candidate_p1_${i + 1}.pdf`,
        file_path: `/uploads/projects/${project1.id}/cv_${i + 1}.pdf`
      };
      await createProjectCV(cvInput);
    }

    // Should still be able to add CV to project2
    const input = {
      ...testInput,
      project_id: project2[0].id,
      filename: 'cv_p2_1.pdf',
      original_filename: 'candidate_p2_1.pdf',
      file_path: `/uploads/projects/${project2[0].id}/cv_1.pdf`
    };

    const result = await createProjectCV(input);
    expect(result.project_id).toEqual(project2[0].id);
    expect(result.filename).toEqual('cv_p2_1.pdf');
  });

  it('should handle different file types and paths', async () => {
    // Create prerequisite data
    const user = await createTestUser();
    const project = await createTestProject(user.id);

    // Test with different file extension
    const input = {
      project_id: project.id,
      filename: 'resume_456789.docx',
      original_filename: 'jane_smith_resume.docx',
      file_path: '/storage/projects/123/documents/resume_456789.docx'
    };

    const result = await createProjectCV(input);

    expect(result.filename).toEqual('resume_456789.docx');
    expect(result.original_filename).toEqual('jane_smith_resume.docx');
    expect(result.file_path).toEqual('/storage/projects/123/documents/resume_456789.docx');
  });
});
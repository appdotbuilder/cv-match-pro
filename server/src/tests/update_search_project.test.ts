import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, searchProjectsTable, projectCvsTable } from '../db/schema';
import { type UpdateSearchProjectInput, type CreateUserInput, type CreateSearchProjectInput, type CreateProjectCVInput } from '../schema';
import { updateSearchProject } from '../handlers/update_search_project';
import { eq } from 'drizzle-orm';

// Test users
const testUser: CreateUserInput = {
  email: 'project-owner@example.com',
  first_name: 'John',
  last_name: 'Doe',
  role: 'TALENT_ACQUISITION'
};

// Test project data
const testProject: CreateSearchProjectInput = {
  name: 'Software Engineer Search',
  description: 'Looking for senior software engineers',
  created_by_user_id: 1, // Will be set after user creation
  status: 'DRAFT',
  criteria: {
    minimum_years_experience: 5,
    target_role: 'Software Engineer',
    required_skills: ['JavaScript', 'React'],
    preferred_skills: ['Node.js', 'TypeScript'],
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

// Test project CV data
const testProjectCV: Omit<CreateProjectCVInput, 'project_id'> = {
  filename: 'test_cv_001.pdf',
  original_filename: 'candidate_resume.pdf',
  file_path: '/uploads/project_cvs/test_cv_001.pdf'
};

describe('updateSearchProject', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update basic project fields', async () => {
    // Create user first
    const [user] = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    // Create project
    const [project] = await db.insert(searchProjectsTable)
      .values({
        ...testProject,
        created_by_user_id: user.id
      })
      .returning()
      .execute();

    const updateInput: UpdateSearchProjectInput = {
      id: project.id,
      name: 'Updated Project Name',
      description: 'Updated description',
      status: 'ACTIVE'
    };

    const result = await updateSearchProject(updateInput);

    expect(result.id).toEqual(project.id);
    expect(result.name).toEqual('Updated Project Name');
    expect(result.description).toEqual('Updated description');
    expect(result.status).toEqual('ACTIVE');
    expect(result.created_by_user_id).toEqual(user.id);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(project.updated_at.getTime());
  });

  it('should save updates to database', async () => {
    // Create user first
    const [user] = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    // Create project
    const [project] = await db.insert(searchProjectsTable)
      .values({
        ...testProject,
        created_by_user_id: user.id
      })
      .returning()
      .execute();

    const updateInput: UpdateSearchProjectInput = {
      id: project.id,
      name: 'Database Updated Name'
    };

    await updateSearchProject(updateInput);

    // Verify in database
    const updatedProjects = await db.select()
      .from(searchProjectsTable)
      .where(eq(searchProjectsTable.id, project.id))
      .execute();

    expect(updatedProjects).toHaveLength(1);
    expect(updatedProjects[0].name).toEqual('Database Updated Name');
    expect(updatedProjects[0].description).toEqual(testProject.description);
    expect(updatedProjects[0].status).toEqual('DRAFT'); // Unchanged
  });

  it('should update only provided fields', async () => {
    // Create user first
    const [user] = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    // Create project
    const [project] = await db.insert(searchProjectsTable)
      .values({
        ...testProject,
        created_by_user_id: user.id
      })
      .returning()
      .execute();

    // Update only the name
    const updateInput: UpdateSearchProjectInput = {
      id: project.id,
      name: 'Only Name Updated'
    };

    const result = await updateSearchProject(updateInput);

    expect(result.name).toEqual('Only Name Updated');
    expect(result.description).toEqual(testProject.description); // Unchanged
    expect(result.status).toEqual('DRAFT'); // Unchanged
    expect(result.criteria).toEqual(testProject.criteria); // Unchanged
  });

  it('should update project criteria', async () => {
    // Create user first
    const [user] = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    // Create project
    const [project] = await db.insert(searchProjectsTable)
      .values({
        ...testProject,
        created_by_user_id: user.id
      })
      .returning()
      .execute();

    const newCriteria = {
      minimum_years_experience: 8,
      target_role: 'Senior Software Engineer',
      required_skills: ['Python', 'Django'],
      preferred_skills: ['AWS', 'Docker'],
      target_industries: ['FinTech'],
      max_job_changes_per_year: 0.5,
      weights: {
        years_experience: 30,
        role_match: 30,
        skills_match: 25,
        industry_match: 10,
        job_stability: 5
      }
    };

    const updateInput: UpdateSearchProjectInput = {
      id: project.id,
      criteria: newCriteria
    };

    const result = await updateSearchProject(updateInput);

    expect(result.criteria).toEqual(newCriteria);
    expect(result.name).toEqual(testProject.name); // Unchanged
  });

  it('should reset CV scores when criteria are updated', async () => {
    // Create user first
    const [user] = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    // Create project
    const [project] = await db.insert(searchProjectsTable)
      .values({
        ...testProject,
        created_by_user_id: user.id
      })
      .returning()
      .execute();

    // Create project CV with scores
    const [projectCV] = await db.insert(projectCvsTable)
      .values({
        ...testProjectCV,
        project_id: project.id,
        score: '85.50',
        ranking: 1,
        parsed_data: {
          total_years_experience: 6,
          skills: ['JavaScript', 'React', 'Node.js']
        }
      })
      .returning()
      .execute();

    // Verify CV has initial scores
    expect(projectCV.score).toEqual('85.50');
    expect(projectCV.ranking).toEqual(1);

    const newCriteria = {
      minimum_years_experience: 10,
      target_role: 'Lead Engineer',
      required_skills: ['Go', 'Kubernetes'],
      preferred_skills: ['Microservices'],
      target_industries: ['Cloud'],
      max_job_changes_per_year: 0.3,
      weights: {
        years_experience: 40,
        role_match: 20,
        skills_match: 25,
        industry_match: 10,
        job_stability: 5
      }
    };

    const updateInput: UpdateSearchProjectInput = {
      id: project.id,
      criteria: newCriteria
    };

    await updateSearchProject(updateInput);

    // Verify CV scores were reset
    const updatedCVs = await db.select()
      .from(projectCvsTable)
      .where(eq(projectCvsTable.project_id, project.id))
      .execute();

    expect(updatedCVs).toHaveLength(1);
    expect(updatedCVs[0].score).toBeNull();
    expect(updatedCVs[0].ranking).toBeNull();
    expect(updatedCVs[0].parsed_data).toEqual(projectCV.parsed_data); // Unchanged
  });

  it('should not reset CV scores when criteria are not updated', async () => {
    // Create user first
    const [user] = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    // Create project
    const [project] = await db.insert(searchProjectsTable)
      .values({
        ...testProject,
        created_by_user_id: user.id
      })
      .returning()
      .execute();

    // Create project CV with scores
    const [projectCV] = await db.insert(projectCvsTable)
      .values({
        ...testProjectCV,
        project_id: project.id,
        score: '92.25',
        ranking: 1
      })
      .returning()
      .execute();

    const updateInput: UpdateSearchProjectInput = {
      id: project.id,
      name: 'Name Change Only',
      status: 'ACTIVE'
    };

    await updateSearchProject(updateInput);

    // Verify CV scores were NOT reset
    const updatedCVs = await db.select()
      .from(projectCvsTable)
      .where(eq(projectCvsTable.project_id, project.id))
      .execute();

    expect(updatedCVs).toHaveLength(1);
    expect(parseFloat(updatedCVs[0].score!)).toEqual(92.25);
    expect(updatedCVs[0].ranking).toEqual(1);
  });

  it('should handle null description update', async () => {
    // Create user first
    const [user] = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    // Create project
    const [project] = await db.insert(searchProjectsTable)
      .values({
        ...testProject,
        created_by_user_id: user.id
      })
      .returning()
      .execute();

    const updateInput: UpdateSearchProjectInput = {
      id: project.id,
      description: null
    };

    const result = await updateSearchProject(updateInput);

    expect(result.description).toBeNull();
    expect(result.name).toEqual(testProject.name); // Unchanged
  });

  it('should throw error for non-existent project', async () => {
    const updateInput: UpdateSearchProjectInput = {
      id: 999999,
      name: 'This should fail'
    };

    await expect(updateSearchProject(updateInput))
      .rejects
      .toThrow(/not found/i);
  });

  it('should handle multiple project CVs when resetting scores', async () => {
    // Create user first
    const [user] = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    // Create project
    const [project] = await db.insert(searchProjectsTable)
      .values({
        ...testProject,
        created_by_user_id: user.id
      })
      .returning()
      .execute();

    // Create multiple project CVs with scores
    const cvData = [
      { ...testProjectCV, filename: 'cv1.pdf', score: '88.50', ranking: 1 },
      { ...testProjectCV, filename: 'cv2.pdf', score: '76.25', ranking: 2 },
      { ...testProjectCV, filename: 'cv3.pdf', score: '91.00', ranking: 3 }
    ];

    await db.insert(projectCvsTable)
      .values(cvData.map(cv => ({
        ...cv,
        project_id: project.id
      })))
      .execute();

    const newCriteria = {
      ...testProject.criteria,
      minimum_years_experience: 15 // Significant change
    };

    const updateInput: UpdateSearchProjectInput = {
      id: project.id,
      criteria: newCriteria
    };

    await updateSearchProject(updateInput);

    // Verify all CV scores were reset
    const updatedCVs = await db.select()
      .from(projectCvsTable)
      .where(eq(projectCvsTable.project_id, project.id))
      .execute();

    expect(updatedCVs).toHaveLength(3);
    updatedCVs.forEach(cv => {
      expect(cv.score).toBeNull();
      expect(cv.ranking).toBeNull();
    });
  });
});
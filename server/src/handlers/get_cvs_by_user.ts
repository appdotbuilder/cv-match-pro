import { type GetCVsByUserInput, type CV } from '../schema';

export async function getCVsByUser(input: GetCVsByUserInput): Promise<CV[]> {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is fetching all CVs belonging to a specific user.
    // Should return CVs ordered by creation date with the active CV first.
    return Promise.resolve([]);
}
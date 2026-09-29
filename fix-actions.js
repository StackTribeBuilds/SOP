const fs = require('fs');

let content = fs.readFileSync('src/lib/project-actions.ts', 'utf8');

// replace createProject to include getServerSession
const newCreate = `
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth';

export async function createProject(data: { name: string; clientId: string; contractValue: number; startDate?: Date; description?: string }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return { success: false, error: 'Unauthorized' };
    }

    const userId = session.user.id;

    const project = await prisma.project.create({ 
      data: {
        name: data.name,
        clientId: data.clientId,
        contractValue: data.contractValue,
        startDate: data.startDate,
        description: data.description,
        status: 'NOT_STARTED',
        health: 'ON_TRACK',
        completionPercentage: 0,
        projectOwnerId: userId,
        techOwnerId: userId,
      }
    });
    revalidatePath('/projects');
    return { success: true, data: project };
  } catch (error: any) {
    console.error(error);
    return { success: false, error: error.message };
  }
}
`;

content = content.replace(/export async function createProject[\s\S]*?\}\n\}/, newCreate);

fs.writeFileSync('src/lib/project-actions.ts', content);

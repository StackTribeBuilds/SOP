import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const clients = await prisma.client.findMany({
    include: { projects: true, invoices: true }
  });

  const adminUser = await prisma.user.findFirst({ where: { role: 'FOUNDER' } });
  if (!adminUser) return console.log("No admin user found to assign projects");

  for (const client of clients) {
    if (client.projects.length === 0 && client.invoices.length > 0) {
      console.log(`Creating missing project for client: ${client.company}`);
      const totalInvoiceValue = client.invoices.reduce((sum, inv) => sum + inv.amount, 0);
      
      await prisma.project.create({
        data: {
          name: `${client.company} Project`,
          clientId: client.id,
          contractValue: totalInvoiceValue > 0 ? totalInvoiceValue : 50000,
          status: 'IN_PROGRESS',
          health: 'ON_TRACK',
          completionPercentage: 50,
          projectOwnerId: adminUser.id,
          techOwnerId: adminUser.id,
          description: `# Readme\n\nAutomatically generated project for ${client.company}.`
        }
      });
    }
  }
  console.log("Done");
}

main().catch(console.error).finally(() => prisma.$disconnect());

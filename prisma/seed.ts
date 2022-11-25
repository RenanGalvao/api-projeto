import { PrismaClient, Role } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  await prisma.user.upsert({
    where: { email: 'renan.m.galvao@gmail.com' },
    update: {},
    create: {
      firstName: 'Renan',
      lastName: 'Galvão',
      email: 'renan.m.galvao@gmail.com',
      hashedPassword: '$2a$12$VfA2GHHa4f1fhKg482/0xu.zjj4l.qiQVJn7GOXjVrJh/ssvWrPdW',
      role: Role.ADMIN,
      lastAccess: new Date()
    }
  })
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1)
  });


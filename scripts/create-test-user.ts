import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "test@example.com";
  const password = "TestPassword123!";
  
  const hashedPassword = await hash(password, 12);
  
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      password: hashedPassword,
      name: "Test User",
      emailVerified: new Date(),
    },
  });
  
  console.log("User created/updated:", user.id);
  console.log("Email:", email);
  console.log("Password:", password);
}

main().catch(console.error).finally(() => prisma.$disconnect());

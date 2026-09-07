import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("ChangeMe123!", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: { name: "Admin User", email: "admin@example.com", passwordHash, role: "ADMIN" },
  });

  const employee = await prisma.user.upsert({
    where: { email: "employee@example.com" },
    update: {},
    create: { name: "Amit (Employee)", email: "employee@example.com", passwordHash, role: "EMPLOYEE" },
  });

  await prisma.user.upsert({
    where: { email: "manager@example.com" },
    update: {},
    create: { name: "Manager User", email: "manager@example.com", passwordHash, role: "MANAGER" },
  });

  const services = await Promise.all(
    [
      { name: "Birth Certificate", code: "BIRTH_CERT" },
      { name: "PAN Card", code: "PAN" },
      { name: "Income Certificate", code: "INCOME_CERT" },
      { name: "Aadhaar Update", code: "AADHAAR_UPDATE" },
    ].map((s) =>
      prisma.service.upsert({
        where: { code: s.code },
        update: {},
        create: { name: s.name, code: s.code, defaultAmount: 300 },
      })
    )
  );

  const customer = await prisma.customer.upsert({
    where: { customerCode: "CUS-000001" },
    update: {},
    create: {
      customerCode: "CUS-000001",
      fullName: "Rahul Sharma",
      mobile: "9876543210",
      district: "Pune",
      state: "Maharashtra",
      createdById: admin.id,
    },
  });

  await prisma.customerService.upsert({
    where: { workCode: "WRK-000001" },
    update: {},
    create: {
      workCode: "WRK-000001",
      customerId: customer.id,
      serviceId: services[0].id,
      status: "PROCESSING",
      amount: 300,
      createdById: employee.id,
    },
  });

  console.log("Seed complete.");
  console.log("Login with: admin@example.com / ChangeMe123! (and employee@example.com / manager@example.com)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

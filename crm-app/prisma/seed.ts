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

  // Agent portal login — this is what "logging in as an agent" uses.
  const agentUser = await prisma.user.upsert({
    where: { email: "rahul01" },
    update: {},
    create: { name: "Rahul Patil", email: "rahul01", passwordHash, role: "AGENT" },
  });

  // Fixed dual pricing per service — no commission anywhere.
  const serviceDefs = [
    { name: "Birth Certificate", code: "BIRTH_CERT", customerPrice: 500, agentPrice: 350 },
    { name: "PAN Card", code: "PAN", customerPrice: 300, agentPrice: 200 },
    { name: "Income Certificate", code: "INCOME_CERT", customerPrice: 400, agentPrice: 300 },
    { name: "Aadhaar Update", code: "AADHAAR_UPDATE", customerPrice: 200, agentPrice: 150 },
  ];
  const services = await Promise.all(
    serviceDefs.map((s) =>
      prisma.service.upsert({
        where: { code: s.code },
        update: { customerPrice: s.customerPrice, agentPrice: s.agentPrice },
        create: {
          name: s.name,
          code: s.code,
          customerPrice: s.customerPrice,
          agentPrice: s.agentPrice,
        },
      })
    )
  );

  // Agent Raj/Rahul — linked to the AGENT login above, so logging in
  // as rahul01 lands on this exact agent's dashboard.
  const agent = await prisma.agent.upsert({
    where: { agentCode: "AGT-000001" },
    update: { userId: agentUser.id },
    create: {
      agentCode: "AGT-000001",
      name: "Rahul Patil",
      mobile: "9123456780",
      city: "Pune",
      state: "Maharashtra",
      createdById: admin.id,
      userId: agentUser.id,
    },
  });

  // Business UPI ID used to generate every agent's payment QR.
  await prisma.upiConfig.upsert({
    where: { id: "seed-upi-config" },
    update: { upiId: "business@upi", payeeName: "Demo CRM Services", isActive: true },
    create: {
      id: "seed-upi-config",
      upiId: "business@upi",
      payeeName: "Demo CRM Services",
      isActive: true,
      updatedById: admin.id,
    },
  });

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

  // Birth Certificate via Agent Rahul — agent price ₹350, fully paid
  // (already reconciled from a past approved payment).
  await prisma.customerService.upsert({
    where: { workCode: "WRK-000001" },
    update: {},
    create: {
      workCode: "WRK-000001",
      customerId: customer.id,
      serviceId: services[0].id, // Birth Certificate
      agentId: agent.id,
      assignedEmployeeId: employee.id,
      status: "PROCESSING",
      amount: 350, // agent price
      amountReceived: 350,
      paymentStatus: "PAID",
      createdById: employee.id,
    },
  });

  // PAN Card via Agent Rahul — agent price ₹200, unpaid so far. This
  // (plus the one below) makes up the agent's current pending
  // balance, which the seeded payment request below is against.
  await prisma.customerService.upsert({
    where: { workCode: "WRK-000002" },
    update: {},
    create: {
      workCode: "WRK-000002",
      customerId: customer.id,
      serviceId: services[1].id, // PAN Card
      agentId: agent.id,
      assignedEmployeeId: employee.id,
      status: "SUBMITTED",
      amount: 200, // agent price
      amountReceived: 0,
      paymentStatus: "PENDING",
      createdById: employee.id,
    },
  });

  // Aadhaar Update via Agent Rahul — agent price ₹150, also unpaid.
  await prisma.customerService.upsert({
    where: { workCode: "WRK-000004" },
    update: {},
    create: {
      workCode: "WRK-000004",
      customerId: customer.id,
      serviceId: services[3].id, // Aadhaar Update
      agentId: agent.id,
      assignedEmployeeId: employee.id,
      status: "PROCESSING",
      amount: 150,
      amountReceived: 0,
      paymentStatus: "PENDING",
      createdById: employee.id,
    },
  });

  // Income Certificate, direct walk-in customer (no agent) — normal
  // customer price ₹400, unassigned — shows up in the Admin/Manager
  // "Unassigned Queue" on the dashboard.
  await prisma.customerService.upsert({
    where: { workCode: "WRK-000003" },
    update: {},
    create: {
      workCode: "WRK-000003",
      customerId: customer.id,
      serviceId: services[2].id, // Income Certificate
      status: "NEW",
      amount: 400, // customer price
      createdById: admin.id,
    },
  });

  // A payment request Rahul has already submitted, awaiting manager
  // verification — this is what shows up on /payment-requests and
  // on the agent's own "My Payments" history. His current pending
  // total from the two unpaid items above is ₹350 (₹200 + ₹150); he's
  // paid ₹200 of it via UPI and is waiting on verification.
  const existingRequest = await prisma.agentPaymentRequest.findFirst({
    where: { agentId: agent.id, utrNumber: "SEED123456789" },
  });
  if (!existingRequest) {
    await prisma.agentPaymentRequest.create({
      data: {
        agentId: agent.id,
        utrNumber: "SEED123456789",
        // Points at a placeholder — replace with a real screenshot
        // when testing the "view screenshot" link in the UI.
        screenshotUrl: "/uploads/payment-screenshots/.gitkeep",
        status: "PENDING_VERIFICATION",
        submittedById: agentUser.id,
      },
    });
  }

  console.log("Seed complete.");
  console.log("Admin/Manager/Employee login: admin@example.com / manager@example.com / employee@example.com — password ChangeMe123!");
  console.log("Agent portal login: rahul01 — password ChangeMe123!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

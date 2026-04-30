const bcrypt = require("bcryptjs");
const { PrismaClient, Permission, UserRole } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { slug: "marcela-duch" },
    update: {
      name: "Clínica Dra. Marcela Duch",
      email: "contato@dramarceladuch.com.br",
      phone: "(67) 99944-6066",
      address: "Av. 16, nº 890 - Ágatha Center, Chapadão do Sul - MS",
      isActive: true,
    },
    create: {
      name: "Clínica Dra. Marcela Duch",
      slug: "marcela-duch",
      email: "contato@dramarceladuch.com.br",
      phone: "(67) 99944-6066",
      address: "Av. 16, nº 890 - Ágatha Center, Chapadão do Sul - MS",
      isActive: true,
    },
  });

  const adminPasswordHash = await bcrypt.hash("Admin@2024!", 12);
  const staffPasswordHash = await bcrypt.hash("Equipe@2026!", 12);
  const patientPasswordHash = await bcrypt.hash("Paciente@2026", 12);

  const admin = await prisma.user.upsert({
    where: { email_tenantId: { email: "admin@drmarceladuch.com.br", tenantId: tenant.id } },
    update: { passwordHash: adminPasswordHash, role: UserRole.ADMIN, isActive: true, name: "Dra. Marcela Duch" },
    create: {
      email: "admin@drmarceladuch.com.br",
      passwordHash: adminPasswordHash,
      name: "Dra. Marcela Duch",
      role: UserRole.ADMIN,
      tenantId: tenant.id,
      isActive: true,
    },
  });

  const staff = await prisma.user.upsert({
    where: { email_tenantId: { email: "equipe@drmarceladuch.com.br", tenantId: tenant.id } },
    update: { passwordHash: staffPasswordHash, role: UserRole.STAFF, isActive: true, name: "Equipe Demo" },
    create: {
      email: "equipe@drmarceladuch.com.br",
      passwordHash: staffPasswordHash,
      name: "Equipe Demo",
      role: UserRole.STAFF,
      tenantId: tenant.id,
      isActive: true,
    },
  });

  const staffPermissions = [
    Permission.DASHBOARD_READ,
    Permission.PATIENT_READ,
    Permission.PATIENT_WRITE,
    Permission.RECORD_READ,
    Permission.RECORD_WRITE,
    Permission.APPOINTMENT_READ,
    Permission.APPOINTMENT_WRITE,
    Permission.LEAD_READ,
    Permission.LEAD_WRITE,
    Permission.PRESCRIPTION_READ,
    Permission.CMS_READ,
    Permission.SETTINGS_READ,
  ];

  for (const permission of staffPermissions) {
    await prisma.userPermission.upsert({
      where: { userId_permission: { userId: staff.id, permission } },
      update: {},
      create: { userId: staff.id, tenantId: tenant.id, permission },
    });
  }

  const patient = await prisma.patient.upsert({
    where: { email_tenantId: { email: "paciente@exemplo.com", tenantId: tenant.id } },
    update: {
      name: "Paciente VIP Demo",
      phone: "(11) 90000-0000",
      passwordHash: patientPasswordHash,
      isActive: true,
      notes: "Paciente demonstrativa para o PWA da área da paciente.",
    },
    create: {
      name: "Paciente VIP Demo",
      email: "paciente@exemplo.com",
      phone: "(11) 90000-0000",
      passwordHash: patientPasswordHash,
      isActive: true,
      notes: "Paciente demonstrativa para o PWA da área da paciente.",
      tenantId: tenant.id,
    },
  });

  console.log("Demo credentials ensured:");
  console.log(`- Admin: ${admin.email} / Admin@2024!`);
  console.log(`- Staff: ${staff.email} / Equipe@2026!`);
  console.log(`- Patient: ${patient.email} / Paciente@2026`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

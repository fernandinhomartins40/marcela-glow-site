const bcrypt = require("bcryptjs");
const { PrismaClient, UserRole } = require("@prisma/client");

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

  const patient = await prisma.patient.upsert({
    where: { email_tenantId: { email: "paciente@exemplo.com", tenantId: tenant.id } },
    update: {
      name: "Paciente VIP Demo",
      phone: "11900000000",
      passwordHash: patientPasswordHash,
      isActive: true,
      notes: "Paciente demonstrativa para o PWA da área da paciente.",
    },
    create: {
      name: "Paciente VIP Demo",
      email: "paciente@exemplo.com",
      phone: "11900000000",
      passwordHash: patientPasswordHash,
      isActive: true,
      notes: "Paciente demonstrativa para o PWA da área da paciente.",
      tenantId: tenant.id,
    },
  });

  // Expediente da clínica.
  //
  // Sem BusinessHour, getAvailability devolve lista vazia e o agendamento
  // online não oferece nenhum horário — o site sobe funcionando, mas ninguém
  // consegue marcar consulta. Só cria se não houver nenhum: alteração feita
  // pela clínica em Configurações não pode ser desfeita a cada deploy.
  const existingHours = await prisma.businessHour.count({ where: { tenantId: tenant.id } });
  if (existingHours === 0) {
    await prisma.businessHour.createMany({
      // Segunda a sexta, 08:00–12:00 e 13:30–18:00
      data: [1, 2, 3, 4, 5].flatMap((weekday) => [
        { tenantId: tenant.id, weekday, startTime: "08:00", endTime: "12:00", isActive: true },
        { tenantId: tenant.id, weekday, startTime: "13:30", endTime: "18:00", isActive: true },
      ]),
    });
    console.log("Expediente padrão criado (seg-sex, 08:00-12:00 e 13:30-18:00).");
  }

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

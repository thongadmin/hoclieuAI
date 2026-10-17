const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("Bat dau khoi tao du lieu seed cho Hoc Lieu AI...");

  // 1. Truong hoc
  const school = await prisma.school.upsert({
    where: { code: "THCS_THONG_NHAT" },
    update: {},
    create: {
      code: "THCS_THONG_NHAT",
      name: "Trường THCS Thống Nhất",
      address: "123 Đường Giáo Dục, TP. Hà Nội",
      phone: "024-3888-9999"
    }
  });

  // 2. Nam hoc & Hoc ky
  const academicYear = await prisma.academicYear.create({
    data: {
      schoolId: school.id,
      name: "2026-2027",
      isCurrent: true,
      startDate: new Date("2026-09-01"),
      endDate: new Date("2027-05-31"),
      terms: {
        create: [
          { name: "Học kỳ 1", isCurrent: true, startDate: new Date("2026-09-01"), endDate: new Date("2027-01-15") },
          { name: "Học kỳ 2", isCurrent: false, startDate: new Date("2027-01-16"), endDate: new Date("2027-05-31") }
        ]
      }
    }
  });

  // 3. Cac khoi lop THCS (6, 7, 8, 9)
  const grades = {};
  for (const lvl of [6, 7, 8, 9]) {
    grades[lvl] = await prisma.grade.upsert({
      where: { schoolId_level: { schoolId: school.id, level: lvl } },
      update: {},
      create: { schoolId: school.id, level: lvl, name: `Khối ${lvl}` }
    });
  }

  // 4. Danh muc 12 mon hoc THCS
  const subjectsData = [
    { code: "TOAN", name: "Toán học", orderIndex: 1 },
    { code: "VAN", name: "Ngữ văn", orderIndex: 2 },
    { code: "ENG", name: "Tiếng Anh", orderIndex: 3 },
    { code: "KHTN", name: "Khoa học tự nhiên", orderIndex: 4 },
    { code: "LSDLI", name: "Lịch sử và Địa lí", orderIndex: 5 },
    { code: "TIN", name: "Tin học", orderIndex: 6 },
    { code: "CNGH", name: "Công nghệ", orderIndex: 7 },
    { code: "GDCD", name: "Giáo dục công dân", orderIndex: 8 },
    { code: "NGHT", name: "Nghệ thuật (Âm nhạc, Mĩ thuật)", orderIndex: 9 },
    { code: "GDTC", name: "Giáo dục thể chất", orderIndex: 10 },
    { code: "HDTN", name: "Hoạt động trải nghiệm, hướng nghiệp", orderIndex: 11 },
    { code: "GDDPH", name: "Nội dung giáo dục địa phương", orderIndex: 12 }
  ];

  const subjects = {};
  for (const s of subjectsData) {
    subjects[s.code] = await prisma.subject.upsert({
      where: { schoolId_code: { schoolId: school.id, code: s.code } },
      update: {},
      create: { schoolId: school.id, ...s }
    });
  }

  // 5. Nguoi dung: 1 Admin, 2 Giao vien, 3 Hoc sinh o cac lop khac nhau
  const defaultPasswordHash = await bcrypt.hash("MatKhauChuan2026@", 10);

  // Admin
  const admin = await prisma.user.upsert({
    where: { email: "admin@thcsthongnhat.edu.vn" },
    update: {},
    create: {
      schoolId: school.id,
      email: "admin@thcsthongnhat.edu.vn",
      passwordHash: defaultPasswordHash,
      fullName: "Ban Giám Hiệu",
      userCode: "AD001",
      role: "ADMIN"
    }
  });

  // GV 1: Toan
  const teacher1 = await prisma.user.upsert({
    where: { email: "gv.an@thcsthongnhat.edu.vn" },
    update: {},
    create: {
      schoolId: school.id,
      email: "gv.an@thcsthongnhat.edu.vn",
      passwordHash: defaultPasswordHash,
      fullName: "Nguyễn Văn An",
      userCode: "GV001",
      role: "TEACHER"
    }
  });

  // GV 2: Khoa hoc tu nhien
  const teacher2 = await prisma.user.upsert({
    where: { email: "gv.binh@thcsthongnhat.edu.vn" },
    update: {},
    create: {
      schoolId: school.id,
      email: "gv.binh@thcsthongnhat.edu.vn",
      passwordHash: defaultPasswordHash,
      fullName: "Trần Thị Bình",
      userCode: "GV002",
      role: "TEACHER"
    }
  });

  // Lop hoc 7A1 va 8A1
  const class7A1 = await prisma.class.create({
    data: {
      schoolId: school.id,
      gradeId: grades[7].id,
      academicYearId: academicYear.id,
      name: "7A1",
      joinCode: "7A1-2026"
    }
  });

  const class8A1 = await prisma.class.create({
    data: {
      schoolId: school.id,
      gradeId: grades[8].id,
      academicYearId: academicYear.id,
      name: "8A1",
      joinCode: "8A1-2026"
    }
  });

  // Hoc sinh 1 & 2 lop 7A1
  const hs1 = await prisma.user.upsert({
    where: { email: "hs.cuong@thcsthongnhat.edu.vn" },
    update: {},
    create: {
      schoolId: school.id,
      email: "hs.cuong@thcsthongnhat.edu.vn",
      passwordHash: defaultPasswordHash,
      fullName: "Lê Quốc Cường",
      userCode: "HS0701",
      role: "STUDENT"
    }
  });

  const hs2 = await prisma.user.upsert({
    where: { email: "hs.dung@thcsthongnhat.edu.vn" },
    update: {},
    create: {
      schoolId: school.id,
      email: "hs.dung@thcsthongnhat.edu.vn",
      passwordHash: defaultPasswordHash,
      fullName: "Phạm Mỹ Dung",
      userCode: "HS0702",
      role: "STUDENT"
    }
  });

  // Hoc sinh 3 lop 8A1
  const hs3 = await prisma.user.upsert({
    where: { email: "hs.em@thcsthongnhat.edu.vn" },
    update: {},
    create: {
      schoolId: school.id,
      email: "hs.em@thcsthongnhat.edu.vn",
      passwordHash: defaultPasswordHash,
      fullName: "Hoàng Gia Em",
      userCode: "HS0801",
      role: "STUDENT"
    }
  });

  // Xep lop
  await prisma.enrollment.createMany({
    data: [
      { classId: class7A1.id, studentId: hs1.id },
      { classId: class7A1.id, studentId: hs2.id },
      { classId: class8A1.id, studentId: hs3.id }
    ]
  });

  console.log("Khoi tao seed du lieu mau hoan tat thanh cong!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

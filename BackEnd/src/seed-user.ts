import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log("Bắt đầu quá trình seed dữ liệu...");

    // 1. Tạo Hợp tác xã mặc định
    let cooperative = await prisma.cooperative.findFirst({
      where: { htx_code: "BMT01" }
    });

    if (!cooperative) {
      console.log("Không tìm thấy HTX mặc định, đang tạo mới...");
      cooperative = await prisma.cooperative.create({
        data: {
          htx_code: "BMT01",
          name: "Hợp tác xã Nông nghiệp Số Buôn Ma Thuột",
          province: "Đắk Lắk",
          district: "Buôn Ma Thuột",
          address: "123 Lê Duẩn, TP. Buôn Ma Thuột",
          phone: "02623123456",
        }
      });
      console.log(`Đã tạo HTX: ${cooperative.name} (${cooperative.id})`);
    } else {
      console.log(`Đã tìm thấy HTX sẵn có: ${cooperative.name}`);
    }

    // 2. Tạo Tài khoản HTX Manager mặc định
    const phone = "0987654321";
    const rawPassword = "password123";
    const passwordHash = await bcrypt.hash(rawPassword, 12);

    let user = await prisma.user.findUnique({
      where: { phone }
    });

    if (!user) {
      console.log(`Không tìm thấy tài khoản ${phone}, đang tạo mới...`);
      user = await prisma.user.create({
        data: {
          phone,
          password_hash: passwordHash,
          role: UserRole.HTX_MANAGER,
          cooperative_id: cooperative.id,
          is_first_login: true,
          is_active: true,
        }
      });
      console.log(`SUCCESS: Đã tạo tài khoản test thành công!`);
      console.log(`- Số điện thoại: ${phone}`);
      console.log(`- Mật khẩu mặc định: ${rawPassword}`);
      console.log(`- Vai trò: HTX_MANAGER`);
      console.log(`- isFirstLogin: true (Bắt buộc đổi mật khẩu lần đầu)`);
    } else {
      console.log(`Tài khoản ${phone} đã tồn tại trong database.`);
    }

  } catch (err) {
    console.error("LỖI khi seed dữ liệu:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();

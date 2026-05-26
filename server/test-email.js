import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const testEmail = async () => {
  const smtpEmail = process.env.SMTP_EMAIL;
  const smtpPassword = process.env.SMTP_PASSWORD;

  if (!smtpEmail || !smtpPassword) {
    console.error('\n❌ LỖI: Bạn chưa điền SMTP_EMAIL hoặc SMTP_PASSWORD trong file server/.env!');
    console.log('👉 Vui lòng mở file server/.env và điền tài khoản Gmail cùng Mật khẩu ứng dụng 16 ký tự của bạn.\n');
    process.exit(1);
  }

  console.log(`\n🚀 Đang tiến hành kết nối kiểm thử SMTP gửi đến Gmail: ${smtpEmail}...`);

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: smtpEmail,
        pass: smtpPassword
      }
    });

    const mailOptions = {
      from: `"Kiểm Thử BonBonCar" <${smtpEmail}>`,
      to: smtpEmail,
      subject: 'Thử nghiệm kết nối SMTP thành công! 🎉',
      html: `
        <div style="font-family: 'Outfit', sans-serif; max-width: 500px; margin: auto; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; background-color: #fafafa;">
          <h2 style="color: #6366f1; text-align: center;">BonBonCar SMTP Active! ✔️</h2>
          <p>Xin chào bạn,</p>
          <p>Nếu bạn nhận được email này, cấu hình <strong>SMTP Gmail thực tế</strong> của bạn trên ứng dụng BonBonCar đã hoàn toàn chính xác và sẵn sàng hoạt động!</p>
          <div style="font-size: 13px; color: #64748b; border-top: 1px solid #e5e7eb; padding-top: 16px; margin-top: 24px;">
            Trân trọng,<br>
            Đội ngũ hỗ trợ kỹ thuật BonBonCar
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('\n======================================================');
    console.log('✅ THÀNH CÔNG: Email thử nghiệm đã được gửi về Gmail của bạn!');
    console.log('👉 Hãy mở hòm thư Gmail thực của bạn để kiểm tra kết quả.');
    console.log('======================================================\n');
  } catch (error) {
    console.error('\n======================================================');
    console.error('❌ THẤT BẠI: Lỗi gửi email thử nghiệm!');
    console.error('Lý do lỗi:', error.message);
    console.error('👉 Khắc phục: Vui lòng kiểm tra lại tài khoản Gmail và Mật khẩu ứng dụng 16 ký tự của bạn đã chính xác chưa.');
    console.log('======================================================\n');
  }
};

testEmail();

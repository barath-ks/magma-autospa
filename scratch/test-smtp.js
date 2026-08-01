const nodemailer = require('nodemailer');
require('dotenv').config({ path: '.env.local' });

async function testSMTP() {
  console.log("Attempting SMTP connection with:");
  console.log("Host:", process.env.SMTP_HOST);
  console.log("Port:", process.env.SMTP_PORT);
  console.log("User:", process.env.SMTP_USER);

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.SMTP_USER,
      to: process.argv[2] || "test@example.com", 
      subject: "Test SMTP from Magma Autospa",
      text: "If you see this, the SMTP configuration is working perfectly.",
    });

    console.log("SUCCESS! Nodemailer output:");
    console.log(info);
  } catch (err) {
    console.error("ERROR! Nodemailer output:");
    console.error(err);
  }
}

testSMTP();

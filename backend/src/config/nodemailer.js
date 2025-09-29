import nodemailer from 'nodemailer';


// Looking to send emails in production? Check out our Email API/SMTP product!
var transporter= nodemailer.createTransport({
    host: "sandbox.smtp.mailtrap.io",
    port: 2525,
    auth: {
      user: "978d42adbb9a85",
      pass: "5c65841d98bef2"
    }
  });

export default transporter; 
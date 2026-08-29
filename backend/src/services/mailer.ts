import nodemailer, { Transporter } from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

let transporterPromise: Promise<Transporter> | null = null;

/**
 * Lazily creates (and memoizes) an Ethereal SMTP transporter.
 * If ETHEREAL_USER/PASS are set in .env we use those (stable inbox across
 * restarts). Otherwise we auto-generate a fresh Ethereal test account on
 * first use - handy for local dev / demo without any manual setup.
 */
function getTransporter(): Promise<Transporter> {
  if (!transporterPromise) {
    transporterPromise = (async () => {
      let user = process.env.ETHEREAL_USER;
      let pass = process.env.ETHEREAL_PASS;

      if (!user || !pass) {
        const testAccount = await nodemailer.createTestAccount();
        user = testAccount.user;
        pass = testAccount.pass;
        console.log(
          `[mailer] No ETHEREAL_USER/PASS set - generated a test account: ${user}`
        );
      }

      return nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: { user, pass },
      });
    })();
  }
  return transporterPromise;
}

export interface SendEmailInput {
  fromName: string;
  fromEmail: string;
  to: string;
  subject: string;
  html: string;
}

export interface SendEmailResult {
  messageId: string;
  previewUrl: string | false;
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const transporter = await getTransporter();
  const info = await transporter.sendMail({
    from: `"${input.fromName}" <${input.fromEmail}>`,
    to: input.to,
    subject: input.subject,
    html: input.html,
  });

  return {
    messageId: info.messageId,
    previewUrl: nodemailer.getTestMessageUrl(info),
  };
}

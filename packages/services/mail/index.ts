import nodemailer from "nodemailer";
import { logger } from "@repo/logger";

import { env } from "../env";

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASSWORD,
  },
});

type SendMailInput = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[character] ?? character,
  );
}

class MailService {
  public async sendMail({ to, subject, text, html }: SendMailInput) {
    const info = await transporter.sendMail({
      from: `"${env.SMTP_FROM_NAME}" <${env.SMTP_FROM_EMAIL}>`,
      to,
      subject,
      text,
      html,
    });

    logger.debug("Mail sent", { to, subject, messageId: info.messageId });
    return info;
  }

  public async sendEmailVerificationMail({
    to,
    fullName,
    verificationUrl,
  }: {
    to: string;
    fullName: string;
    verificationUrl: string;
  }) {
    const safeFullName = escapeHtml(fullName);
    const safeVerificationUrl = escapeHtml(verificationUrl);

    return this.sendMail({
      to,
      subject: "Verify your Form Builder email",
      text: `Hi ${fullName}, verify your Form Builder account here: ${verificationUrl}`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>Verify your Form Builder email</h2>
          <p>Hi ${safeFullName},</p>
          <p>Confirm this email address to finish setting up your Form Builder account.</p>
          <p><a href="${safeVerificationUrl}">Verify email address</a></p>
          <p>If you did not create this account, you can ignore this email.</p>
        </div>
      `,
    });
  }

  public async sendPasswordResetMail({
    to,
    fullName,
    resetUrl,
  }: {
    to: string;
    fullName: string;
    resetUrl: string;
  }) {
    const safeFullName = escapeHtml(fullName);
    const safeResetUrl = escapeHtml(resetUrl);

    return this.sendMail({
      to,
      subject: "Reset your Form Builder password",
      text: `Hi ${fullName}, reset your Form Builder password here: ${resetUrl}`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>Reset your Form Builder password</h2>
          <p>Hi ${safeFullName},</p>
          <p>Use this link to choose a new password for your Form Builder account.</p>
          <p><a href="${safeResetUrl}">Reset password</a></p>
          <p>If you did not request this, you can ignore this email.</p>
        </div>
      `,
    });
  }
}

export const mailService = new MailService();
export default MailService;

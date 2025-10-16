import nodemailer from "nodemailer";

interface MailOptions {
    to: string;
    subject: string;
    text: string;
    html?: string;
}

const smtpHost = process.env.SMTP_HOST || "smtp.hostinger.com";
const smtpPort = parseInt(process.env.SMTP_PORT || "465", 10);
const smtpUser = process.env.SMTP_USER!;
const smtpPass = process.env.SMTP_PASS!;

if (!smtpUser || !smtpPass) {
    throw new Error("SMTP_USER or SMTP_PASS not set in environment");
}

const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465, // true for SSL (465), false for TLS (587)
    auth: {
        user: smtpUser,
        pass: smtpPass,
    },
    // optional TLS settings
    tls: {
        // do not fail on invalid certs (if Hostinger uses self-signed, etc.)
        rejectUnauthorized: false,
    },
});

async function sendMail({ to, subject, text, html }: MailOptions): Promise<void> {
    try {
        const info = await transporter.sendMail({
            from: smtpUser, // sender address (must match your Hostinger email)
            to,
            subject,
            text,
            html,
        });
        console.log("Email sent:", info.messageId);
    } catch (error) {
        console.error("Error sending email:", error);
        throw error;
    }
}

export { sendMail };

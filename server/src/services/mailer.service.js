import nodemailer from 'nodemailer';
import handlebars from 'handlebars';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../config/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const templatesDir = path.join(__dirname, '../templates');

const getTransporter = () => {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = process.env.SMTP_SECURE === 'true';
  const user = (process.env.SMTP_USER || '').trim();
  const rawPass = (process.env.SMTP_PASS || '').trim();
  const pass = rawPass.replace(/^["']|["']$/g, '');

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user && pass ? { user, pass } : undefined,
  });
};

const defaultTemplates = {
  'welcome': `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #f4f6f9; margin: 0; padding: 20px; color: #333; }
    .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; padding: 30px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .header { font-size: 22px; font-weight: bold; color: #1e293b; margin-bottom: 20px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
    .content { font-size: 15px; line-height: 1.6; color: #475569; }
    .footer { margin-top: 30px; font-size: 12px; color: #94a3b8; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 15px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">Welcome to Campus Resource Booking</div>
    <div class="content">
      <p>Hello {{name}},</p>
      <p>Your student account has been successfully created. You can now reserve campus study rooms, projectors, laboratory workstations, and sports facilities.</p>
      <p>Log in to your account anytime to view availability and make bookings.</p>
    </div>
    <div class="footer">
      Campus Resource Management System &bull; Asia/Kolkata
    </div>
  </div>
</body>
</html>`,
  'otp-verification': `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #0f172a; margin: 0; padding: 20px; color: #f8fafc; }
    .card { max-width: 500px; margin: 0 auto; background: #1e293b; border-radius: 12px; padding: 32px; border: 1px solid #334155; box-shadow: 0 10px 25px rgba(0,0,0,0.3); }
    .header { font-size: 22px; font-weight: bold; color: #3b82f6; margin-bottom: 20px; border-bottom: 1px solid #334155; padding-bottom: 12px; }
    .otp-box { background: #0f172a; border: 2px dashed #3b82f6; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0; }
    .otp-code { font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #10b981; font-family: monospace; }
    .info { font-size: 14px; color: #94a3b8; line-height: 1.5; }
    .footer { margin-top: 30px; font-size: 12px; color: #64748b; text-align: center; border-top: 1px solid #334155; padding-top: 16px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">🏛️ Campus Booking — 2FA Verification</div>
    <div class="info">
      <p>Hello <strong>{{name}}</strong>,</p>
      <p>Your one-time authentication code for sign-in is:</p>
    </div>
    <div class="otp-box">
      <div class="otp-code">{{otpCode}}</div>
    </div>
    <div class="info">
      <p>This code is valid for <strong>5 minutes</strong>. If you did not request this login, please ignore this email.</p>
    </div>
    <div class="footer">
      Campus Resource Management Platform &bull; Security Team
    </div>
  </div>
</body>
</html>`,
  'booking-confirmation': `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #f4f6f9; margin: 0; padding: 20px; color: #333; }
    .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; padding: 30px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .header { font-size: 22px; font-weight: bold; color: #059669; margin-bottom: 20px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
    .details { background: #f8fafc; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 4px; }
    .item { margin-bottom: 8px; font-size: 14px; }
    .label { font-weight: bold; color: #334155; }
    .footer { margin-top: 30px; font-size: 12px; color: #94a3b8; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 15px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">✓ Booking Confirmed</div>
    <div class="content">
      <p>Hello {{userName}},</p>
      <p>Your campus resource reservation has been confirmed.</p>
      <div class="details">
        <div class="item"><span class="label">Booking Ref:</span> {{bookingId}}</div>
        <div class="item"><span class="label">Resource:</span> {{resourceName}} ({{resourceCategory}})</div>
        <div class="item"><span class="label">Location:</span> {{resourceLocation}}</div>
        <div class="item"><span class="label">Date & Time (IST):</span> {{formattedDate}} | {{startsAt}} – {{endsAt}}</div>
        <div class="item"><span class="label">Purpose:</span> {{purpose}}</div>
      </div>
      <p>Please make sure to arrive on time and follow all posted resource guidelines.</p>
    </div>
    <div class="footer">
      Campus Resource Management System &bull; Asia/Kolkata Timezone
    </div>
  </div>
</body>
</html>`,
  'booking-cancellation': `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #f4f6f9; margin: 0; padding: 20px; color: #333; }
    .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; padding: 30px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .header { font-size: 22px; font-weight: bold; color: #dc2626; margin-bottom: 20px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
    .details { background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 4px; }
    .item { margin-bottom: 8px; font-size: 14px; }
    .label { font-weight: bold; color: #7f1d1d; }
    .footer { margin-top: 30px; font-size: 12px; color: #94a3b8; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 15px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">Booking Cancelled</div>
    <div class="content">
      <p>Hello {{userName}},</p>
      <p>Your campus resource reservation has been cancelled.</p>
      <div class="details">
        <div class="item"><span class="label">Booking Ref:</span> {{bookingId}}</div>
        <div class="item"><span class="label">Resource:</span> {{resourceName}}</div>
        <div class="item"><span class="label">Date & Time (IST):</span> {{formattedDate}} | {{startsAt}} – {{endsAt}}</div>
        <div class="item"><span class="label">Cancelled By:</span> {{cancelledBy}}</div>
        <div class="item"><span class="label">Cancellation Reason:</span> {{reason}}</div>
      </div>
    </div>
    <div class="footer">
      Campus Resource Management System &bull; Asia/Kolkata Timezone
    </div>
  </div>
</body>
</html>`
};

const compileTemplate = (templateName, data) => {
  let templateSource = defaultTemplates[templateName];
  try {
    const filePath = path.join(templatesDir, `${templateName}.html`);
    if (fs.existsSync(filePath)) {
      templateSource = fs.readFileSync(filePath, 'utf8');
    }
  } catch (err) {
    // Graceful fallback to embedded template
  }
  const compiled = handlebars.compile(templateSource || '');
  return compiled(data);
};

export const sendOtpEmail = async ({ email, name, otpCode }) => {
  try {
    const rawFromName = process.env.MAIL_FROM_NAME || 'Campus Resource Booking';
    const fromName = rawFromName.replace(/^["']|["']$/g, '').trim();
    const fromAddress = (process.env.MAIL_FROM_ADDRESS || process.env.SMTP_USER || 'no-reply@campus.edu').replace(/^["']|["']$/g, '').trim();
    const html = compileTemplate('otp-verification', { name, otpCode });

    const transporter = getTransporter();
    await transporter.sendMail({
      from: {
        name: fromName,
        address: fromAddress,
      },
      to: email,
      replyTo: fromAddress,
      subject: `[Campus Booking] Your Login Code: ${otpCode}`,
      html,
    });
    logger.info({ email }, 'OTP verification email sent successfully');
  } catch (err) {
    logger.error({ err: err.message, email }, 'Failed to send OTP verification email');
  }
};

export const sendWelcomeEmail = async ({ email, name }) => {
  try {
    const rawFromName = process.env.MAIL_FROM_NAME || 'Campus Resource Booking';
    const fromName = rawFromName.replace(/^["']|["']$/g, '').trim();
    const fromAddress = (process.env.MAIL_FROM_ADDRESS || process.env.SMTP_USER || 'no-reply@campus.edu').replace(/^["']|["']$/g, '').trim();
    const html = compileTemplate('welcome', { name });

    const transporter = getTransporter();
    await transporter.sendMail({
      from: {
        name: fromName,
        address: fromAddress,
      },
      to: email,
      replyTo: fromAddress,
      subject: '[Campus Booking] Welcome to Campus Resource Booking',
      html,
    });
    logger.info({ email }, 'Welcome email sent successfully');
  } catch (err) {
    logger.error({ err: err.message, email }, 'Failed to send welcome email');
  }
};

export const sendBookingConfirmationEmail = async ({ booking, user, resource, slot }) => {
  try {
    const rawFromName = process.env.MAIL_FROM_NAME || 'Campus Resource Booking';
    const fromName = rawFromName.replace(/^["']|["']$/g, '').trim();
    const fromAddress = (process.env.MAIL_FROM_ADDRESS || process.env.SMTP_USER || 'no-reply@campus.edu').replace(/^["']|["']$/g, '').trim();

    const html = compileTemplate('booking-confirmation', {
      userName: user.name,
      bookingId: booking.id,
      resourceName: resource.name,
      resourceCategory: resource.category,
      resourceLocation: resource.location,
      formattedDate: slot.booking_date,
      startsAt: slot.startsAt || '09:00 IST',
      endsAt: slot.endsAt || '10:00 IST',
      purpose: booking.purpose,
    });

    const transporter = getTransporter();
    await transporter.sendMail({
      from: {
        name: fromName,
        address: fromAddress,
      },
      to: user.email,
      replyTo: fromAddress,
      subject: `[Campus Booking] Confirmed: ${resource.name}`,
      html,
    });
    logger.info({ bookingId: booking.id, email: user.email }, 'Confirmation email sent successfully');
  } catch (err) {
    logger.error({ err: err.message, bookingId: booking.id }, 'Failed to send confirmation email');
  }
};

export const sendBookingCancellationEmail = async ({ booking, user, resource, slot, reason, cancelledBy }) => {
  try {
    const rawFromName = process.env.MAIL_FROM_NAME || 'Campus Resource Booking';
    const fromName = rawFromName.replace(/^["']|["']$/g, '').trim();
    const fromAddress = (process.env.MAIL_FROM_ADDRESS || process.env.SMTP_USER || 'no-reply@campus.edu').replace(/^["']|["']$/g, '').trim();

    const html = compileTemplate('booking-cancellation', {
      userName: user.name,
      bookingId: booking.id,
      resourceName: resource.name,
      formattedDate: slot.booking_date,
      startsAt: slot.startsAt || '09:00 IST',
      endsAt: slot.endsAt || '10:00 IST',
      reason: reason || 'Cancelled by user prior to slot start.',
      cancelledBy: cancelledBy || 'Student',
    });

    const transporter = getTransporter();
    await transporter.sendMail({
      from: {
        name: fromName,
        address: fromAddress,
      },
      to: user.email,
      replyTo: fromAddress,
      subject: `[Campus Booking] Cancelled: ${resource.name}`,
      html,
    });
    logger.info({ bookingId: booking.id, email: user.email }, 'Cancellation email sent successfully');
  } catch (err) {
    logger.error({ err: err.message, bookingId: booking.id }, 'Failed to send cancellation email');
  }
};


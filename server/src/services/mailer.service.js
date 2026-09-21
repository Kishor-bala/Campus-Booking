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
  const user = process.env.SMTP_USER || '';
  const pass = process.env.SMTP_PASS || '';

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user && pass ? { user, pass } : undefined,
  });
};

const compileTemplate = (templateName, data) => {
  const filePath = path.join(templatesDir, `${templateName}.html`);
  const templateSource = fs.readFileSync(filePath, 'utf8');
  const compiled = handlebars.compile(templateSource);
  return compiled(data);
};

export const sendOtpEmail = async ({ email, name, otpCode }) => {
  try {
    const fromName = process.env.MAIL_FROM_NAME || 'Campus Resource Booking';
    const fromAddress = process.env.MAIL_FROM_ADDRESS || 'no-reply@campus.edu';
    const html = compileTemplate('otp-verification', { name, otpCode });

    const transporter = getTransporter();
    await transporter.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      to: email,
      subject: `Your Campus Login Code: ${otpCode}`,
      html,
    });
    logger.info({ email }, 'OTP verification email sent successfully');
  } catch (err) {
    logger.error({ err: err.message, email }, 'Failed to send OTP verification email');
  }
};

export const sendWelcomeEmail = async ({ email, name }) => {
  try {
    const fromName = process.env.MAIL_FROM_NAME || 'Campus Resource Booking';
    const fromAddress = process.env.MAIL_FROM_ADDRESS || 'no-reply@campus.edu';
    const html = compileTemplate('welcome', { name });

    const transporter = getTransporter();
    await transporter.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      to: email,
      subject: 'Welcome to Campus Resource Booking',
      html,
    });
    logger.info({ email }, 'Welcome email sent successfully');
  } catch (err) {
    logger.error({ err: err.message, email }, 'Failed to send welcome email');
  }
};

export const sendBookingConfirmationEmail = async ({ booking, user, resource, slot }) => {
  try {
    const fromName = process.env.MAIL_FROM_NAME || 'Campus Resource Booking';
    const fromAddress = process.env.MAIL_FROM_ADDRESS || 'no-reply@campus.edu';

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
      from: `"${fromName}" <${fromAddress}>`,
      to: user.email,
      subject: `Booking Confirmed: ${resource.name}`,
      html,
    });
    logger.info({ bookingId: booking.id, email: user.email }, 'Confirmation email sent successfully');
  } catch (err) {
    logger.error({ err: err.message, bookingId: booking.id }, 'Failed to send confirmation email');
  }
};

export const sendBookingCancellationEmail = async ({ booking, user, resource, slot, reason, cancelledBy }) => {
  try {
    const fromName = process.env.MAIL_FROM_NAME || 'Campus Resource Booking';
    const fromAddress = process.env.MAIL_FROM_ADDRESS || 'no-reply@campus.edu';

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
      from: `"${fromName}" <${fromAddress}>`,
      to: user.email,
      subject: `Booking Cancelled: ${resource.name}`,
      html,
    });
    logger.info({ bookingId: booking.id, email: user.email }, 'Cancellation email sent successfully');
  } catch (err) {
    logger.error({ err: err.message, bookingId: booking.id }, 'Failed to send cancellation email');
  }
};

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import {
  bookingConfirmedTemplate,
  BookingConfirmedContext,
} from './templates/booking-confirmed.template';
import {
  bookingCancelledTemplate,
  BookingCancelledContext,
} from './templates/booking-cancelled.template';
import {
  paymentReceivedTemplate,
  PaymentReceivedContext,
} from './templates/payment-received.template';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly transporter: nodemailer.Transporter;
  private readonly fromAddress: string;

  constructor(private readonly config: ConfigService) {
    // ── SMTP Transporter Configuration ────────────────────────────
    // Uses environment variables so the same code works in:
    //   - Development: Mailtrap (catches emails, no real delivery)
    //   - Production:  Gmail SMTP / SendGrid / AWS SES
    this.transporter = nodemailer.createTransport({
      host: this.config.get<string>('SMTP_HOST', 'sandbox.smtp.mailtrap.io'),
      port: this.config.get<number>('SMTP_PORT', 2525),
      auth: {
        user: this.config.get<string>('SMTP_USER', ''),
        pass: this.config.get<string>('SMTP_PASS', ''),
      },
    });

    this.fromAddress = this.config.get<string>(
      'SMTP_FROM',
      '"CourtHub" <noreply@courthub.app>',
    );
  }

  // ── Core send helper ──────────────────────────────────────────
  /**
   * Sends an HTML email. Errors are caught and logged — we never
   * let an email failure propagate to the HTTP response (fire-and-forget).
   */
  private async sendMail(
    to: string,
    subject: string,
    html: string,
  ): Promise<void> {
    // If no SMTP credentials configured (e.g. unit tests), skip silently
    const user = this.config.get<string>('SMTP_USER', '');
    if (!user) {
      this.logger.warn(
        `SMTP not configured — skipping email to ${to}: "${subject}"`,
      );
      return;
    }

    try {
      const info = await this.transporter.sendMail({
        from: this.fromAddress,
        to,
        subject,
        html,
      });
      this.logger.log(`Email sent to ${to} [messageId: ${info.messageId}]`);
    } catch (err) {
      // Log the error but do NOT throw — email failures must not break
      // the booking/payment flow for the user.
      this.logger.error(
        `Failed to send email to ${to}: ${(err as Error).message}`,
        (err as Error).stack,
      );
    }
  }

  // ── Public notification methods ───────────────────────────────

  /**
   * Fired after payment is confirmed and booking transitions to CONFIRMED.
   * Sends both a "booking confirmed" + "payment receipt" email.
   */
  async sendBookingConfirmed(
    to: string,
    ctx: BookingConfirmedContext,
  ): Promise<void> {
    const { subject, html } = bookingConfirmedTemplate(ctx);
    await this.sendMail(to, subject, html);
  }

  /**
   * Fired when a booking is cancelled (by customer or admin).
   * Includes refund status in the email body.
   */
  async sendBookingCancelled(
    to: string,
    ctx: BookingCancelledContext,
  ): Promise<void> {
    const { subject, html } = bookingCancelledTemplate(ctx);
    await this.sendMail(to, subject, html);
  }

  /**
   * Fired after a payment is received.
   * Acts as the customer's payment receipt.
   */
  async sendPaymentReceived(
    to: string,
    ctx: PaymentReceivedContext,
  ): Promise<void> {
    const { subject, html } = paymentReceivedTemplate(ctx);
    await this.sendMail(to, subject, html);
  }
}

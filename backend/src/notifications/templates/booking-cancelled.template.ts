export interface BookingCancelledContext {
  customerName: string;
  venueName: string;
  courtName: string;
  date: string;
  startTime: string;
  endTime: string;
  bookingId: string;
  refundStatus: 'REFUNDED' | 'NO_REFUND';
}

export function bookingCancelledTemplate(ctx: BookingCancelledContext): {
  subject: string;
  html: string;
} {
  const refundBadge =
    ctx.refundStatus === 'REFUNDED'
      ? '<span style="display:inline-block;background:#f59e0b;color:#fff;padding:6px 16px;border-radius:20px;font-size:13px;font-weight:600;">💳 Refund Initiated</span>'
      : '<span style="display:inline-block;background:#6b7280;color:#fff;padding:6px 16px;border-radius:20px;font-size:13px;font-weight:600;">No Refund Applied</span>';

  const refundNote =
    ctx.refundStatus === 'REFUNDED'
      ? 'A refund has been initiated to your original payment method. It may take 3-5 business days to reflect.'
      : 'This booking was cancelled within the non-refundable window (less than 1 hour before the slot).';

  return {
    subject: `❌ Booking Cancelled — ${ctx.venueName} (${ctx.date})`,
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Booking Cancelled</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f7fb;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f7fb;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1a56db,#0ea5e9);padding:40px 40px 30px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;letter-spacing:-0.5px;">🏟️ CourtHub</h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:15px;">Sports Court Booking Platform</p>
            </td>
          </tr>

          <!-- Cancel Banner -->
          <tr>
            <td style="background:#fef2f2;padding:20px 40px;text-align:center;border-bottom:1px solid #fecaca;">
              <span style="display:inline-block;background:#ef4444;color:#fff;padding:8px 20px;border-radius:20px;font-size:14px;font-weight:600;">
                ❌ Booking Cancelled
              </span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 24px;color:#374151;font-size:16px;">
                Hi <strong>${ctx.customerName}</strong>,
              </p>
              <p style="margin:0 0 28px;color:#6b7280;font-size:15px;line-height:1.6;">
                Your booking has been cancelled. Here's a summary of the cancelled booking:
              </p>

              <!-- Booking Details Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;margin-bottom:24px;">
                <tr>
                  <td colspan="2" style="background:#ef4444;padding:14px 20px;">
                    <span style="color:#ffffff;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">📋 Cancelled Booking</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:14px 20px;color:#6b7280;font-size:14px;border-bottom:1px solid #e2e8f0;width:40%;">Booking ID</td>
                  <td style="padding:14px 20px;color:#111827;font-size:14px;font-weight:600;border-bottom:1px solid #e2e8f0;font-family:monospace;">${ctx.bookingId.substring(0, 8).toUpperCase()}</td>
                </tr>
                <tr>
                  <td style="padding:14px 20px;color:#6b7280;font-size:14px;border-bottom:1px solid #e2e8f0;">Venue</td>
                  <td style="padding:14px 20px;color:#111827;font-size:14px;font-weight:600;border-bottom:1px solid #e2e8f0;">${ctx.venueName}</td>
                </tr>
                <tr>
                  <td style="padding:14px 20px;color:#6b7280;font-size:14px;border-bottom:1px solid #e2e8f0;">Court</td>
                  <td style="padding:14px 20px;color:#111827;font-size:14px;font-weight:600;border-bottom:1px solid #e2e8f0;">${ctx.courtName}</td>
                </tr>
                <tr>
                  <td style="padding:14px 20px;color:#6b7280;font-size:14px;border-bottom:1px solid #e2e8f0;">Date</td>
                  <td style="padding:14px 20px;color:#111827;font-size:14px;font-weight:600;border-bottom:1px solid #e2e8f0;">${ctx.date}</td>
                </tr>
                <tr>
                  <td style="padding:14px 20px;color:#6b7280;font-size:14px;">Time</td>
                  <td style="padding:14px 20px;color:#111827;font-size:14px;font-weight:600;">${ctx.startTime} – ${ctx.endTime}</td>
                </tr>
              </table>

              <!-- Refund Status -->
              <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
                <p style="margin:0 0 10px;color:#92400e;font-size:14px;font-weight:600;">💰 Refund Status</p>
                <div style="margin-bottom:8px;">${refundBadge}</div>
                <p style="margin:10px 0 0;color:#78350f;font-size:13px;line-height:1.6;">${refundNote}</p>
              </div>

              <p style="margin:0;color:#6b7280;font-size:14px;line-height:1.6;">
                We hope to see you back on the court soon. Browse available courts at CourtHub.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;padding:24px 40px;text-align:center;border-top:1px solid #e2e8f0;">
              <p style="margin:0;color:#9ca3af;font-size:13px;">© 2025 CourtHub • Sports Court Booking Platform</p>
              <p style="margin:6px 0 0;color:#9ca3af;font-size:12px;">This is an automated email, please do not reply.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim(),
  };
}

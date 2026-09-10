export interface PaymentReceivedContext {
  customerName: string;
  venueName: string;
  courtName: string;
  date: string;
  startTime: string;
  endTime: string;
  amount: string;
  bookingId: string;
  paymentMethod: string;
}

export function paymentReceivedTemplate(ctx: PaymentReceivedContext): {
  subject: string;
  html: string;
} {
  return {
    subject: `💳 Payment Received — LKR ${ctx.amount} for ${ctx.venueName}`,
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Payment Received</title>
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

          <!-- Payment Banner -->
          <tr>
            <td style="background:#eff6ff;padding:20px 40px;text-align:center;border-bottom:1px solid #bfdbfe;">
              <span style="display:inline-block;background:#1a56db;color:#fff;padding:8px 20px;border-radius:20px;font-size:14px;font-weight:600;">
                💳 Payment Received
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
                We've received your payment successfully. Your booking is now confirmed!
              </p>

              <!-- Amount Display -->
              <div style="background:linear-gradient(135deg,#1a56db,#0ea5e9);border-radius:12px;padding:28px;text-align:center;margin-bottom:28px;">
                <p style="margin:0 0 6px;color:rgba(255,255,255,0.8);font-size:14px;text-transform:uppercase;letter-spacing:1px;">Amount Paid</p>
                <p style="margin:0;color:#ffffff;font-size:42px;font-weight:800;">LKR ${ctx.amount}</p>
                <p style="margin:8px 0 0;color:rgba(255,255,255,0.7);font-size:13px;">via ${ctx.paymentMethod}</p>
              </div>

              <!-- Booking Details Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;margin-bottom:24px;">
                <tr>
                  <td colspan="2" style="background:#1a56db;padding:14px 20px;">
                    <span style="color:#ffffff;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">🧾 Receipt</span>
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
                  <td style="padding:14px 20px;color:#6b7280;font-size:14px;">Time Slot</td>
                  <td style="padding:14px 20px;color:#111827;font-size:14px;font-weight:600;">${ctx.startTime} – ${ctx.endTime}</td>
                </tr>
              </table>

              <p style="margin:0;color:#6b7280;font-size:14px;line-height:1.6;">
                Save this email as your receipt. Have a great game! 🏸
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

// Resend email service — sends transactional emails
// Uses Resend free tier (3,000/month, no credit card needed)
// Sign up at resend.com, create API key, add VITE_RESEND_API_KEY to Vercel env vars

const RESEND_API_KEY = import.meta.env.VITE_RESEND_API_KEY

const FROM_EMAIL = 'TradeFlow <noreply@tradeflow.app>'
// Note: use your verified domain in Resend. Until then, use onboarding@resend.dev for testing.
const FROM_FALLBACK = 'TradeFlow <onboarding@resend.dev>'

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) {
    console.log('No Resend API key — skipping email')
    return { ok: false, reason: 'no_key' }
  }
  try {
    const from = RESEND_API_KEY.startsWith('re_') ? FROM_EMAIL : FROM_FALLBACK
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to: [to], subject, html }),
    })
    if (!res.ok) {
      const err = await res.text()
      console.error('Resend error:', err)
      return { ok: false, reason: err }
    }
    return { ok: true }
  } catch (e) {
    console.error('Email send failed:', e)
    return { ok: false, reason: String(e) }
  }
}

// ── Price Alert Email ─────────────────────────────────────────────────────────

export async function sendPriceAlertEmail({
  to,
  name,
  symbol,
  condition,
  targetPrice,
  currentPrice,
  note,
}: {
  to: string
  name?: string
  symbol: string
  condition: 'above' | 'below'
  targetPrice: number
  currentPrice: number
  note?: string
}) {
  const firstName  = name?.split(' ')[0] || 'Trader'
  const condLabel  = condition === 'above' ? 'risen above' : 'fallen below'
  const condColor  = condition === 'above' ? '#10b981' : '#ef4444'
  const condBg     = condition === 'above' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)'
  const condBorder = condition === 'above' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'
  const arrow      = condition === 'above' ? '↑' : '↓'
  const decimals   = symbol.includes('JPY') || symbol === 'XAUUSD' ? 2 : 4

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Price Alert Triggered — ${symbol}</title>
</head>
<body style="margin:0;padding:0;background:#070714;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#070714;padding:40px 20px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;">

        <!-- Logo -->
        <tr><td align="center" style="padding-bottom:28px;">
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="background:linear-gradient(135deg,#7c3aed,#2563eb);border-radius:12px;width:40px;height:40px;text-align:center;vertical-align:middle;">
                <span style="color:white;font-size:18px;line-height:40px;">📈</span>
              </td>
              <td style="padding-left:10px;vertical-align:middle;">
                <span style="color:white;font-size:20px;font-weight:900;letter-spacing:-0.5px;">TradeFlow</span>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Alert card -->
        <tr><td style="background:linear-gradient(135deg,#0d1a3a,#1a0a2e);border-radius:24px;padding:40px 36px;text-align:center;border:1px solid rgba(255,255,255,0.08);">

          <!-- Bell icon -->
          <div style="font-size:40px;margin-bottom:16px;">🔔</div>

          <h1 style="color:white;font-size:28px;font-weight:900;margin:0 0 8px;letter-spacing:-0.5px;">
            Price Alert Triggered
          </h1>
          <p style="color:rgba(255,255,255,0.5);font-size:14px;margin:0 0 28px;">
            Hey ${firstName}, your alert for <strong style="color:white;">${symbol}</strong> just fired.
          </p>

          <!-- Main alert box -->
          <table width="100%" cellpadding="0" cellspacing="0"
            style="background:${condBg};border:1px solid ${condBorder};border-radius:16px;margin-bottom:24px;">
            <tr><td style="padding:24px;">
              <div style="color:${condColor};font-size:36px;font-weight:900;margin-bottom:4px;">
                ${arrow} ${symbol}
              </div>
              <div style="color:rgba(255,255,255,0.6);font-size:14px;margin-bottom:16px;">
                has <strong style="color:${condColor};">${condLabel}</strong> your target
              </div>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="text-align:center;padding:0 8px;">
                    <div style="color:rgba(255,255,255,0.4);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Your Target</div>
                    <div style="color:white;font-size:22px;font-weight:900;">${targetPrice.toFixed(decimals)}</div>
                  </td>
                  <td style="text-align:center;padding:0 8px;">
                    <div style="color:rgba(255,255,255,0.4);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Current Price</div>
                    <div style="color:${condColor};font-size:22px;font-weight:900;">${currentPrice.toFixed(decimals)}</div>
                  </td>
                </tr>
              </table>
              ${note ? `<div style="margin-top:16px;padding:12px;background:rgba(255,255,255,0.05);border-radius:10px;color:rgba(255,255,255,0.6);font-size:13px;font-style:italic;">"${note}"</div>` : ''}
            </td></tr>
          </table>

          <!-- CTA -->
          <a href="https://tradeflow-one-ruddy.vercel.app/app/trading"
            style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#2563eb);color:white;font-size:14px;font-weight:800;text-decoration:none;padding:14px 36px;border-radius:12px;letter-spacing:0.3px;">
            Open Chart →
          </a>

        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:24px 0 0;text-align:center;">
          <p style="color:rgba(255,255,255,0.2);font-size:11px;margin:0;">
            TradeFlow Price Alert · You set this alert in the Trading page.
            <br/>
            <a href="https://tradeflow-one-ruddy.vercel.app/app/trading" style="color:rgba(124,58,237,0.5);text-decoration:none;">Manage your alerts</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`.trim()

  return sendEmail(
    to,
    `🔔 ${symbol} Alert — price has ${condLabel} ${targetPrice.toFixed(decimals)}`,
    html,
  )
}

// ── Waitlist Email ────────────────────────────────────────────────────────────

export async function sendWaitlistConfirmation({
  to,
  name,
  plan,
  currency,
  billing,
}: {
  to: string
  name?: string
  plan: string
  currency: string
  billing: string
}) {
  const firstName = name?.split(' ')[0] || 'Trader'
  const planLabel = plan === 'pro' ? 'Edge Pro' : 'Trader'
  const billingLabel = billing === 'annual' ? 'Annual' : 'Monthly'

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>You're on the TradeFlow waitlist</title>
</head>
<body style="margin:0;padding:0;background:#070714;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#070714;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

        <!-- Logo -->
        <tr><td align="center" style="padding-bottom:32px;">
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="background:linear-gradient(135deg,#7c3aed,#2563eb);border-radius:14px;width:44px;height:44px;text-align:center;vertical-align:middle;">
                <span style="color:white;font-size:20px;line-height:44px;">📈</span>
              </td>
              <td style="padding-left:12px;vertical-align:middle;">
                <span style="color:white;font-size:22px;font-weight:900;letter-spacing:-0.5px;">TradeFlow</span>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Hero card -->
        <tr><td style="background:linear-gradient(135deg,#1a0a2e,#0d1a3a);border-radius:24px;padding:48px 40px;text-align:center;border:1px solid rgba(255,255,255,0.08);">

          <!-- Gold badge -->
          <div style="display:inline-block;background:linear-gradient(135deg,#f59e0b,#d97706);border-radius:50px;padding:8px 20px;margin-bottom:24px;">
            <span style="color:white;font-size:13px;font-weight:800;letter-spacing:0.5px;">🥇 EDGE PRO WAITLIST</span>
          </div>

          <h1 style="color:white;font-size:36px;font-weight:900;margin:0 0 12px;line-height:1.1;letter-spacing:-1px;">
            You're in,<br/>
            <span style="background:linear-gradient(90deg,#a78bfa,#60a5fa);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">${firstName}! 🎉</span>
          </h1>

          <p style="color:rgba(255,255,255,0.6);font-size:16px;line-height:1.6;margin:0 0 32px;max-width:380px;margin-left:auto;margin-right:auto;">
            You've reserved your spot on the <strong style="color:rgba(255,255,255,0.9);">Edge Pro</strong> waitlist.
            We'll email you the moment payments go live — with an early-bird discount.
          </p>

          <!-- Plan summary box -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:16px;margin-bottom:32px;">
            <tr>
              <td style="padding:20px 24px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="color:rgba(255,255,255,0.5);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;padding-bottom:4px;">Your reserved plan</td>
                    <td align="right" style="color:rgba(255,255,255,0.5);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;padding-bottom:4px;">Billing</td>
                  </tr>
                  <tr>
                    <td style="color:white;font-size:18px;font-weight:900;">🥇 ${planLabel}</td>
                    <td align="right" style="color:white;font-size:16px;font-weight:700;">${billingLabel} · ${currency}</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <!-- CTA button -->
          <a href="https://tradeflow-one-ruddy.vercel.app/app/dashboard"
            style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#2563eb);color:white;font-size:15px;font-weight:800;text-decoration:none;padding:16px 40px;border-radius:14px;letter-spacing:0.3px;box-shadow:0 8px 30px rgba(124,58,237,0.35);">
            Go to TradeFlow →
          </a>

        </td></tr>

        <!-- What you get section -->
        <tr><td style="padding:32px 0 0;">
          <h2 style="color:white;font-size:18px;font-weight:800;margin:0 0 16px;text-align:center;">What you'll unlock with Edge Pro</h2>
          <table width="100%" cellpadding="0" cellspacing="0">
            ${[
              ['🤖', 'AI Trade Coach', 'Analyses your journal and finds your actual patterns'],
              ['📊', 'Unlimited Journal', 'Log every trade, every day — no limits'],
              ['🏆', 'Prop Firm Simulator', 'Practice FTMO, MyForexFunds challenges'],
              ['📈', '2yr+ Chart Replay', 'Deeper historical data for better backtesting'],
              ['📥', 'MT4/MT5 Import', 'Import your trades from MetaTrader automatically'],
            ].map(([emoji, title, desc]) => `
            <tr>
              <td style="padding:8px 0;">
                <table cellpadding="0" cellspacing="0" style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:12px;width:100%;">
                  <tr>
                    <td style="padding:14px 16px;width:40px;text-align:center;font-size:20px;">${emoji}</td>
                    <td style="padding:14px 16px 14px 0;">
                      <div style="color:white;font-size:14px;font-weight:700;margin-bottom:2px;">${title}</div>
                      <div style="color:rgba(255,255,255,0.45);font-size:12px;">${desc}</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>`).join('')}
          </table>
        </td></tr>

        <!-- Currently free banner -->
        <tr><td style="padding:24px 0 0;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,rgba(245,158,11,0.1),rgba(217,119,6,0.1));border:1px solid rgba(245,158,11,0.3);border-radius:16px;">
            <tr><td style="padding:20px 24px;text-align:center;">
              <p style="color:#fbbf24;font-size:14px;font-weight:800;margin:0 0 6px;">⚡ All Pro features are FREE right now</p>
              <p style="color:rgba(251,191,36,0.7);font-size:12px;margin:0;">
                While we're in early access, every Trader account has full Pro access. Enjoy it!
              </p>
            </td></tr>
          </table>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:32px 0 0;text-align:center;border-top:1px solid rgba(255,255,255,0.06);margin-top:32px;">
          <p style="color:rgba(255,255,255,0.25);font-size:12px;margin:0 0 8px;">
            TradeFlow — Practice trading without losing money
          </p>
          <p style="color:rgba(255,255,255,0.15);font-size:11px;margin:0;">
            Built with ❤️ by Kishore JR ·
            <a href="https://tradeflow-one-ruddy.vercel.app" style="color:rgba(124,58,237,0.6);text-decoration:none;">tradeflow-one-ruddy.vercel.app</a>
          </p>
          <p style="color:rgba(255,255,255,0.1);font-size:10px;margin:12px 0 0;">
            You're receiving this because you joined the TradeFlow waitlist.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
  `.trim()

  try {
    const from = RESEND_API_KEY.startsWith('re_') ? FROM_EMAIL : FROM_FALLBACK
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: `🥇 You're on the TradeFlow Edge Pro waitlist, ${firstName}!`,
        html,
      }),
    })
    if (!res.ok) {
      const err = await res.text()
      console.error('Resend error:', err)
      return { ok: false, reason: err }
    }
    return { ok: true }
  } catch (e) {
    console.error('Email send failed:', e)
    return { ok: false, reason: String(e) }
  }
}

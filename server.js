const express = require('express');
const path = require('path');
const fs = require('fs');
const { Resend } = require('resend');

const app = express();
const PORT = process.env.PORT || 8080;

// ── Manual Environment Variables Loader (Zero Dependency) ──
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  try {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split(/\r?\n/).forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const separatorIdx = trimmedLine.indexOf('=');
        if (separatorIdx > 0) {
          const key = trimmedLine.slice(0, separatorIdx).trim();
          const val = trimmedLine.slice(separatorIdx + 1).trim().replace(/^['"]|['"]$/g, '');
          if (key) {
            process.env[key] = val;
          }
        }
      }
    });
    console.log('✅ Loaded environment variables from .env file.');
  } catch (err) {
    console.error('⚠️ Failed to parse .env file:', err);
  }
}

// Initialize Resend API client
const RESEND_API_KEY = process.env.RESEND_API_KEY;
let resend = null;
if (RESEND_API_KEY) {
  try {
    resend = new Resend(RESEND_API_KEY);
  } catch (e) {
    console.error('⚠️ Failed to initialize Resend client:', e);
  }
} else {
  console.warn('⚠️ RESEND_API_KEY environment variable is not defined.');
}

// ── Security Headers Middleware ──
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self';"
  );
  next();
});

// Parse JSON request bodies (limit payload size to prevent DOS)
app.use(express.json({ limit: '10kb' }));

// Serve static files from the current directory
app.use(express.static(__dirname));

// ── Custom In-Memory Rate Limiter ──
const ipLimits = new Map();
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_REQUESTS_PER_WINDOW = 5; // Max 5 requests per IP in the window

function rateLimiter(req, res, next) {
  const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const now = Date.now();

  if (!ipLimits.has(ip)) {
    ipLimits.set(ip, []);
  }

  // Filter out request timestamps outside the window
  const requestTimes = ipLimits.get(ip).filter(time => now - time < RATE_LIMIT_WINDOW_MS);
  requestTimes.push(now);
  ipLimits.set(ip, requestTimes);

  if (requestTimes.length > MAX_REQUESTS_PER_WINDOW) {
    console.warn(`⚠️ Rate limit exceeded for IP: ${ip}`);
    return res.status(429).json({ error: 'Too many contact requests from this IP. Please try again in 15 minutes.' });
  }

  next();
}

// ── HTML Escaping Utility (XSS Prevention) ──
function escapeHTML(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

// POST endpoint to handle sending email (with rate-limiting)
app.post('/api/send-email', rateLimiter, async (req, res) => {
  const { name, email, phone, message } = req.body;

  // Basic presence checks
  if (!name || !email || !phone || !message || message.trim() === '') {
    return res.status(400).json({ error: 'Name, email, phone, and message are required.' });
  }

  // Validate Input Lengths (prevent massive inputs or memory overflow)
  if (name.length > 100 || email.length > 100 || phone.length > 30 || message.length > 2000) {
    return res.status(400).json({ error: 'Input lengths exceed secure threshold limits.' });
  }

  // Validate Email Format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email address format.' });
  }

  // Sanitize user inputs for rendering inside email HTML (XSS prevention)
  const safeName = escapeHTML(name);
  const safeEmail = escapeHTML(email);
  const safePhone = escapeHTML(phone);
  const safeMessage = escapeHTML(message);

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

  if (!RESEND_API_KEY && (!SUPABASE_URL || !SUPABASE_KEY)) {
    console.error('❌ ERROR: Neither Resend nor Supabase credentials are configured!');
    return res.status(500).json({ error: 'Messaging API configurations are missing.' });
  }

  let supabaseSuccess = false;
  let supabaseError = null;

  // ── 1. Store in Supabase ──
  if (SUPABASE_URL && SUPABASE_KEY) {
    try {
      const supabaseRes = await fetch(`${SUPABASE_URL}/rest/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          name: safeName,
          email: safeEmail,
          phone: safePhone,
          message: safeMessage
        })
      });

      if (supabaseRes.ok) {
        console.log('✅ Message successfully saved to Supabase.');
        supabaseSuccess = true;
      } else {
        const errorText = await supabaseRes.text();
        console.error('❌ Supabase insert failed:', errorText);
        supabaseError = errorText;
      }
    } catch (err) {
      console.error('❌ Supabase network call error:', err);
      supabaseError = err.message;
    }
  }

  // ── 2. Dispatch email via Resend ──
  let emailSuccess = false;
  let emailError = null;

  if (RESEND_API_KEY && resend) {
    try {
      const data = await resend.emails.send({
        from: 'onboarding@resend.dev',
        to: 'csit2081041_sambhav@achsnepal.edu.np',
        subject: `💬 New Message from ${safeName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 4px solid #000; padding: 25px; background-color: #ECEAE4;">
            <h2 style="background-color: #FF1A3C; color: #fff; padding: 12px; margin-top: 0; transform: skewX(-5deg); text-transform: uppercase; font-size: 20px; font-weight: bold; display: inline-block;">
              PORTFOLIO CONTACT FORM
            </h2>
            
            <table style="width: 100%; border-collapse: collapse; margin-top: 20px; margin-bottom: 20px;">
              <tr style="border-bottom: 1px solid #ccc;">
                <td style="padding: 8px 0; font-weight: bold; width: 120px; color: #0b0b0f;">Name:</td>
                <td style="padding: 8px 0; color: #333;">${safeName}</td>
              </tr>
              <tr style="border-bottom: 1px solid #ccc;">
                <td style="padding: 8px 0; font-weight: bold; color: #0b0b0f;">Email:</td>
                <td style="padding: 8px 0; color: #333;"><a href="mailto:${safeEmail}">${safeEmail}</a></td>
              </tr>
              <tr style="border-bottom: 1px solid #ccc;">
                <td style="padding: 8px 0; font-weight: bold; color: #0b0b0f;">Phone:</td>
                <td style="padding: 8px 0; color: #333;"><a href="tel:${safePhone}">${safePhone}</a></td>
              </tr>
            </table>

            <p style="font-size: 16px; color: #0b0b0f; font-weight: bold; margin-bottom: 8px;">Message:</p>
            <div style="background-color: #0b0b0f; color: #fff; padding: 20px; border-left: 6px solid #FF1A3C; font-size: 15px; line-height: 1.6; margin-bottom: 25px; border-radius: 4px;">
              ${safeMessage.replace(/\n/g, '<br>')}
            </div>
            <p style="font-size: 12px; color: #666; border-top: 1px dashed #999; padding-top: 15px;">
              Sender Host IP: Served via Portfolio Backend System.
            </p>
          </div>
        `
      });

      console.log('✅ Email sent successfully via Resend:', data);
      emailSuccess = true;
    } catch (err) {
      console.error('❌ Resend dispatch error:', err);
      emailError = err.message;
    }
  }

  // ── 3. Return Combined Status ──
  if (supabaseSuccess || emailSuccess) {
    return res.status(200).json({
      success: true,
      storedInDb: supabaseSuccess,
      emailSent: emailSuccess
    });
  } else {
    return res.status(500).json({
      error: 'Message delivery failed.',
      details: {
        database: supabaseError,
        email: emailError
      }
    });
  }
});

// Start the Express server
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(`PHANTOM THIEF OS SERVER RUNNING ON PORT ${PORT}`);
    console.log(`Navigate to: http://localhost:${PORT}`);
    console.log(`=========================================`);
  });
}

module.exports = app;

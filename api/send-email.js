const { Resend } = require('resend');

// Helper to escape HTML (XSS prevention)
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

// Handler function for Vercel Serverless
module.exports = async (req, res) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { name, email, phone, message } = req.body;

  // Basic presence checks
  if (!name || !email || !phone || !message || message.trim() === '') {
    return res.status(400).json({ error: 'Name, email, phone, and message are required.' });
  }

  // Validate Input Lengths
  if (name.length > 100 || email.length > 100 || phone.length > 30 || message.length > 2000) {
    return res.status(400).json({ error: 'Input lengths exceed secure threshold limits.' });
  }

  // Validate Email Format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email address format.' });
  }

  // Sanitize user inputs
  const safeName = escapeHTML(name);
  const safeEmail = escapeHTML(email);
  const safePhone = escapeHTML(phone);
  const safeMessage = escapeHTML(message);

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

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

  if (RESEND_API_KEY) {
    try {
      const resend = new Resend(RESEND_API_KEY);
      const data = await resend.emails.send({
        from: 'onboarding@resend.dev',
        to: process.env.DESTINATION_EMAIL || 'girisambhav321@gmail.com',
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
};

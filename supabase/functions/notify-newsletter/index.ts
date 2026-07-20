/**

 * Edge Function : envoi d'une notification newsletter lors d'un nouvel article.

 *

 * Secrets Supabase (Settings → Edge Functions) :

 *   RESEND_API_KEY          — clé API Resend (https://resend.com)

 *   NEWSLETTER_FROM_EMAIL   — ex. newsletter@votre-domaine.com

 *

 * Déploiement :

 *   supabase functions deploy notify-newsletter

 */

import { createClient } from 'jsr:@supabase/supabase-js@2';



const corsHeaders = {

  'Access-Control-Allow-Origin': '*',

  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',

};



type ArticlePayload = {

  title?: string;

  slug?: string;

  url?: string;

  excerpt?: string;

  author?: string;

};



function jsonResponse(body: Record<string, unknown>, status = 200) {

  return new Response(JSON.stringify(body), {

    status,

    headers: { ...corsHeaders, 'Content-Type': 'application/json' },

  });

}



function escapeHtml(value: string) {

  return String(value || '')

    .replace(/&/g, '&amp;')

    .replace(/</g, '&lt;')

    .replace(/>/g, '&gt;')

    .replace(/"/g, '&quot;')

    .replace(/'/g, '&#39;');

}



function buildEmailSubject(lang: string, title: string) {

  const safeTitle = title.trim();

  if (lang === 'en') {

    return `New on mwatsimulamo · ${safeTitle}`;

  }

  return `Nouveau sur mwatsimulamo · ${safeTitle}`;

}



function buildEmailText(lang: string, payload: ArticlePayload) {

  const isEn = lang === 'en';

  const title = String(payload.title || '').trim();

  const url = String(payload.url || '').trim();

  const excerpt = String(payload.excerpt || '').trim();

  const author = String(payload.author || '').trim();



  const lines = isEn

    ? [

        'Hello,',

        '',

        'A new article has just been published on mwatsimulamo.',

        '',

        title,

        author ? `By ${author}` : '',

        excerpt ? excerpt : '',

        url ? `\nRead the article: ${url}` : '',

        '',

        'Thank you for following along,',

        'Olivier Mwatsimulamo',

        'mwatsimulamo.com',

      ]

    : [

        'Bonjour,',

        '',

        'Un nouvel article vient d\'être publié sur mwatsimulamo.',

        '',

        title,

        author ? `Par ${author}` : '',

        excerpt ? excerpt : '',

        url ? `\nLire l'article : ${url}` : '',

        '',

        'Merci de me suivre,',

        'Olivier Mwatsimulamo',

        'mwatsimulamo.com',

      ];



  return lines.filter(Boolean).join('\n');

}



function buildEmailHtml(lang: string, payload: ArticlePayload) {

  const isEn = lang === 'en';

  const title = escapeHtml(String(payload.title || (isEn ? 'New article' : 'Nouvel article')).trim());

  const url = escapeHtml(String(payload.url || '').trim());

  const excerpt = escapeHtml(String(payload.excerpt || '').trim());

  const author = escapeHtml(String(payload.author || '').trim());



  const greeting = isEn ? 'Hello,' : 'Bonjour,';

  const intro = isEn

    ? 'I just published a new article on <strong style="color:#0033ad;">mwatsimulamo</strong>. Here is a quick preview — I hope you enjoy the read.'

    : 'Je viens de publier un nouvel article sur <strong style="color:#0033ad;">mwatsimulamo</strong>. Voici un aperçu — bonne lecture !';

  const labelArticle = isEn ? 'New article' : 'Nouvel article';

  const cta = isEn ? 'Read the article' : 'Lire l\'article';

  const byLine = author

    ? (isEn ? `By ${author}` : `Par ${author}`)

    : (isEn ? 'By Olivier Mwatsimulamo' : 'Par Olivier Mwatsimulamo');

  const signOff = isEn ? 'Thank you for following along,' : 'Merci de me suivre,';

  const signature = 'Olivier Mwatsimulamo';

  const tagline = isEn

    ? 'Web3 · Cardano · Content & projects'

    : 'Web3 · Cardano · Contenus & projets';

  const footerNote = isEn

    ? 'You receive this email because you subscribed to the mwatsimulamo newsletter.'

    : 'Vous recevez cet email car vous êtes inscrit(e) à la newsletter mwatsimulamo.';



  const excerptBlock = excerpt

    ? `<p style="margin:0;font-size:15px;line-height:1.75;color:#475569;font-style:italic;border-left:3px solid #4da2ff;padding-left:14px;">&ldquo;${excerpt}${excerpt.length >= 220 ? '…' : ''}&rdquo;</p>`

    : '';



  const ctaBlock = url

    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;">

        <tr>

          <td style="border-radius:10px;background:linear-gradient(135deg,#0033ad 0%,#1d4ed8 55%,#2563eb 100%);">

            <a href="${url}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:0.01em;">${cta} &rarr;</a>

          </td>

        </tr>

      </table>`

    : '';



  return `<!DOCTYPE html>

<html lang="${isEn ? 'en' : 'fr'}">

<head>

  <meta charset="UTF-8">

  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <meta name="color-scheme" content="light">

  <title>${title}</title>

</head>

<body style="margin:0;padding:0;background:#eef2f8;font-family:Georgia,'Times New Roman',serif;color:#121c32;-webkit-font-smoothing:antialiased;">

  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${labelArticle}: ${title}</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(180deg,#dbeafe 0%,#eef2f8 42%,#f8fafc 100%);padding:32px 16px 40px;">

    <tr>

      <td align="center">

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">

          <tr>

            <td style="padding:0 0 18px;text-align:center;">

              <div style="display:inline-block;width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,#0033ad,#4da2ff);color:#fff;font-size:22px;font-weight:700;line-height:52px;text-align:center;box-shadow:0 8px 24px rgba(0,51,173,0.28);">O</div>

              <p style="margin:12px 0 4px;font-size:13px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#0033ad;">mwatsimulamo</p>

              <p style="margin:0;font-size:12px;color:#64748b;">${tagline}</p>

            </td>

          </tr>

          <tr>

            <td style="background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden;box-shadow:0 18px 48px rgba(15,23,42,0.08);">

              <div style="height:5px;background:linear-gradient(90deg,#0033ad 0%,#4da2ff 50%,#0033ad 100%);"></div>

              <div style="padding:34px 32px 30px;">

                <p style="margin:0 0 10px;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#4da2ff;">Newsletter</p>

                <p style="margin:0 0 16px;font-size:18px;line-height:1.5;color:#0f172a;">${greeting}</p>

                <p style="margin:0 0 26px;font-size:15px;line-height:1.75;color:#334155;">${intro}</p>



                <div style="background:linear-gradient(180deg,#f8fbff 0%,#f1f5f9 100%);border:1px solid #dbeafe;border-radius:14px;padding:22px 22px 20px;margin-bottom:8px;">

                  <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#64748b;">${labelArticle}</p>

                  <h1 style="margin:0 0 10px;font-size:24px;line-height:1.35;font-weight:700;color:#0033ad;">${title}</h1>

                  <p style="margin:0 0 ${excerpt ? '16px' : '0'};font-size:13px;color:#64748b;">${byLine}</p>

                  ${excerptBlock}

                </div>



                ${ctaBlock}



                <p style="margin:24px 0 6px;font-size:15px;line-height:1.6;color:#334155;">${signOff}</p>

                <p style="margin:0;font-size:16px;font-weight:700;color:#0f172a;">${signature}</p>

              </div>

            </td>

          </tr>

          <tr>

            <td style="padding:22px 8px 0;text-align:center;">

              <p style="margin:0 0 6px;font-size:12px;line-height:1.6;color:#94a3b8;">${footerNote}</p>

              <p style="margin:0;font-size:12px;color:#94a3b8;">

                <a href="https://mwatsimulamo.com" style="color:#0033ad;text-decoration:none;font-weight:600;">mwatsimulamo.com</a>

              </p>

            </td>

          </tr>

        </table>

      </td>

    </tr>

  </table>

</body>

</html>`;

}



Deno.serve(async (req) => {

  if (req.method === 'OPTIONS') {

    return new Response('ok', { headers: corsHeaders });

  }



  if (req.method !== 'POST') {

    return jsonResponse({ ok: false, reason: 'method_not_allowed' }, 405);

  }



  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';

  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  const resendApiKey = Deno.env.get('RESEND_API_KEY') ?? '';

  const fromEmail = Deno.env.get('NEWSLETTER_FROM_EMAIL') ?? '';



  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {

    return jsonResponse({ ok: false, reason: 'missing_supabase_env' }, 500);

  }



  const authHeader = req.headers.get('Authorization');

  if (!authHeader) {

    return jsonResponse({ ok: false, reason: 'no_auth' }, 401);

  }



  const userClient = createClient(supabaseUrl, supabaseAnonKey, {

    global: { headers: { Authorization: authHeader } },

  });

  const { data: userData, error: userError } = await userClient.auth.getUser();

  if (userError || !userData.user) {

    return jsonResponse({ ok: false, reason: 'unauthorized' }, 401);

  }



  let payload: ArticlePayload = {};

  try {

    payload = await req.json();

  } catch (_err) {

    return jsonResponse({ ok: false, reason: 'invalid_json' }, 400);

  }



  if (!payload.title || !String(payload.title).trim()) {

    return jsonResponse({ ok: false, reason: 'missing_title' }, 400);

  }



  if (!resendApiKey || !fromEmail) {

    return jsonResponse({ ok: false, reason: 'email_not_configured' }, 503);

  }



  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const { data: subscribers, error: subError } = await adminClient

    .from('newsletter_subscribers')

    .select('email, lang')

    .eq('active', true);



  if (subError) {

    return jsonResponse({ ok: false, reason: subError.message }, 500);

  }



  const list = Array.isArray(subscribers) ? subscribers : [];

  if (!list.length) {

    return jsonResponse({ ok: true, sent: 0, failed: 0, message: 'no_subscribers' });

  }



  let sent = 0;

  let failed = 0;

  let lastResendError = '';

  const articleTitle = String(payload.title).trim();



  for (const row of list) {

    const email = String(row.email || '').trim().toLowerCase();

    const lang = row.lang === 'en' ? 'en' : 'fr';

    if (!email) continue;



    const subject = buildEmailSubject(lang, articleTitle);

    const html = buildEmailHtml(lang, payload);

    const text = buildEmailText(lang, payload);



    try {

      const res = await fetch('https://api.resend.com/emails', {

        method: 'POST',

        headers: {

          Authorization: `Bearer ${resendApiKey}`,

          'Content-Type': 'application/json',

        },

        body: JSON.stringify({

          from: fromEmail,

          to: [email],

          subject,

          html,

          text,

        }),

      });



      if (!res.ok) {

        const errBody = await res.text().catch(() => '');

        failed += 1;

        lastResendError = errBody || `HTTP ${res.status}`;

        continue;

      }

      sent += 1;

    } catch (_err) {

      failed += 1;

    }

  }



  return jsonResponse({

    ok: true,

    sent,

    failed,

    total: list.length,

    resend_error: failed > 0 ? lastResendError : undefined,

  });

});



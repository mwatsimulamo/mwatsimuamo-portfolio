/**
 * Génère `supabase-config.js` à la racine du projet.
 *
 * Sur Vercel : définir les variables d'environnement (Settings → Environment Variables) :
 *   PORTFOLIO_SUPABASE_URL
 *   PORTFOLIO_SUPABASE_ANON_KEY
 *   PORTFOLIO_PUBLIC_URL (optionnel, ex. https://ton-site.vercel.app)
 *
 * En local : si ce fichier existe déjà et qu'aucune paire URL+clé n'est dans l'env, on ne l'écrase pas.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const out = path.join(root, 'supabase-config.js');
const example = path.join(root, 'supabase-config.example.js');

const url = (process.env.PORTFOLIO_SUPABASE_URL || '').trim();
const key = (process.env.PORTFOLIO_SUPABASE_ANON_KEY || '').trim();
const publicUrl = (process.env.PORTFOLIO_PUBLIC_URL || '').trim();

const onVercel = process.env.VERCEL === '1' || String(process.env.VERCEL || '').toLowerCase() === 'true';

function writeConfig(u, k, p) {
    const body =
        '/**\n' +
        ' * Généré par scripts/generate-supabase-config.cjs au build.\n' +
        ' */\n' +
        'window.PORTFOLIO_SUPABASE_URL = ' +
        JSON.stringify(u) +
        ';\n' +
        'window.PORTFOLIO_SUPABASE_ANON_KEY = ' +
        JSON.stringify(k) +
        ';\n' +
        'window.PORTFOLIO_PUBLIC_URL = ' +
        JSON.stringify(p) +
        ';\n';
    fs.writeFileSync(out, body, 'utf8');
}

if (url && key) {
    writeConfig(url, key, publicUrl);
    console.log('[generate-supabase-config] supabase-config.js écrit depuis les variables d’environnement.');
} else if (onVercel) {
    writeConfig('', '', publicUrl);
    console.warn(
        '[generate-supabase-config] Sur Vercel : PORTFOLIO_SUPABASE_URL et PORTFOLIO_SUPABASE_ANON_KEY sont requis pour activer Supabase. Fichier vide généré.'
    );
} else if (fs.existsSync(out)) {
    console.log('[generate-supabase-config] supabase-config.js local conservé.');
} else if (fs.existsSync(example)) {
    fs.copyFileSync(example, out);
    console.log('[generate-supabase-config] Copie supabase-config.example.js → supabase-config.js (première fois).');
} else {
    writeConfig('', '', '');
    console.log('[generate-supabase-config] supabase-config.js minimal créé.');
}

/**
 * Slugs d’articles, URL de partage et fusion local / distant.
 * Chargé avant script.js (pas de bundler).
 */
function slugifyArticleTitle(text) {
    return String(text || '')
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80) || ('article-' + Date.now());
}

function normalizeArticleSlug(slug) {
    return slugifyArticleTitle(String(slug || '').trim());
}

function getArticleCanonicalSlug(article) {
    if (article && article.slug && String(article.slug).trim()) return normalizeArticleSlug(article.slug);
    if (article && article.title && String(article.title).trim()) return slugifyArticleTitle(article.title);
    return slugifyArticleTitle('');
}

function getShareBaseUrl() {
    const runtimeBase = `${window.location.origin}${window.location.pathname}`.replace(/\/+$/, '');
    const configured = window.PORTFOLIO_PUBLIC_URL ? String(window.PORTFOLIO_PUBLIC_URL).trim() : '';
    if (!configured) return runtimeBase;

    try {
        const parsed = new URL(configured, window.location.href);
        const currentHost = String(window.location.hostname || '').toLowerCase();
        const configuredHost = String(parsed.hostname || '').toLowerCase();
        const isCurrentLocal = currentHost === 'localhost' || currentHost === '127.0.0.1';
        const isConfiguredLocal = configuredHost === 'localhost' || configuredHost === '127.0.0.1';

        if (isCurrentLocal && isConfiguredLocal && parsed.port !== window.location.port) return runtimeBase;

        return `${parsed.origin}${parsed.pathname}`.replace(/\/+$/, '');
    } catch (_err) {
        return runtimeBase;
    }
}

function getArticleShareUrl(article) {
    const slug = getArticleCanonicalSlug(article);
    const configured = window.PORTFOLIO_PUBLIC_URL ? String(window.PORTFOLIO_PUBLIC_URL).trim() : '';
    if (!configured) return `?article=${encodeURIComponent(slug)}`;
    return `${getShareBaseUrl()}?article=${encodeURIComponent(slug)}`;
}

function getArticleDedupKey(article) {
    if (!article || typeof article !== 'object') return '';
    const link = String(article.link || '').trim().toLowerCase();
    if (link && link !== '#') return 'link:' + link;
    return 'slug:' + getArticleCanonicalSlug(article);
}

/**
 * Fusionne articles distants (ex. Supabase) et articles locaux (localStorage).
 * Même slug ou même lien : le local écrase le distant.
 */
function mergeArticleListsPreferLocal(local, remote) {
    const map = new Map();
    (Array.isArray(remote) ? remote : []).forEach(function (a) {
        if (!a || typeof a !== 'object') return;
        map.set(getArticleDedupKey(a), Object.assign({}, a));
    });
    (Array.isArray(local) ? local : []).forEach(function (a) {
        if (!a || typeof a !== 'object') return;
        const k = getArticleDedupKey(a);
        const prev = map.get(k);
        map.set(k, prev ? Object.assign({}, prev, a) : Object.assign({}, a));
    });
    return Array.from(map.values());
}

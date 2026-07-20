/**
 * Client Supabase : lecture du contenu portfolio + écriture si session Auth.
 * Dépend de : CDN supabase-js, window.PORTFOLIO_SUPABASE_URL / ANON_KEY.
 */
(function () {
    var sbClient = null;
    var INLINE_IMAGE_BUCKET = 'portfolio-inline-images';

    function publishAuthState(session) {
        window.__portfolioSupabaseSession = session || null;
        window.__portfolioSupabaseAuthenticated = !!session;
        try {
            window.dispatchEvent(new CustomEvent('portfolio-supabase-auth-changed', {
                detail: { session: session || null, authenticated: !!session }
            }));
        } catch (_err) {
            // ignore CustomEvent issue on very old browsers
        }
    }

    function getClient() {
        if (sbClient) return sbClient;
        var url = window.PORTFOLIO_SUPABASE_URL;
        var key = window.PORTFOLIO_SUPABASE_ANON_KEY;
        if (!url || !key || typeof window.supabase === 'undefined' || typeof window.supabase.createClient !== 'function') {
            return null;
        }
        sbClient = window.supabase.createClient(String(url).trim(), String(key).trim());
        return sbClient;
    }

    window.fetchPortfolioBody = async function (contentKey) {
        var client = getClient();
        if (!client) return null;
        var res = await client.from('portfolio_content').select('body').eq('content_key', contentKey).maybeSingle();
        if (res.error) {
            console.warn('[Supabase]', res.error.message);
            return null;
        }
        if (!res.data || res.data.body === undefined || res.data.body === null) return null;
        return res.data.body;
    };

    window.persistPortfolioContentToSupabase = async function (contentKey, body) {
        var client = getClient();
        if (!client) return { ok: false, reason: 'no_client' };
        var sess = await client.auth.getSession();
        if (!sess.data || !sess.data.session) return { ok: false, reason: 'no_session' };
        var row = {
            content_key: contentKey,
            body: body,
            updated_at: new Date().toISOString()
        };
        var ins = await client.from('portfolio_content').upsert(row, { onConflict: 'content_key' });
        if (ins.error) return { ok: false, reason: ins.error.message };
        return { ok: true };
    };

    window.uploadPortfolioInlineImage = async function (file, options) {
        var client = getClient();
        if (!client) return { ok: false, reason: 'no_client' };
        if (!file || !file.type || String(file.type).indexOf('image/') !== 0) return { ok: false, reason: 'invalid_file' };
        var sess = await client.auth.getSession();
        if (!sess.data || !sess.data.session) return { ok: false, reason: 'no_session' };
        var ext = '';
        var fileName = (file.name || '').trim();
        var extMatch = fileName.match(/\.([a-z0-9]+)$/i);
        if (extMatch && extMatch[1]) ext = '.' + String(extMatch[1]).toLowerCase();
        if (!ext) {
            if (file.type === 'image/png') ext = '.png';
            else if (file.type === 'image/webp') ext = '.webp';
            else if (file.type === 'image/gif') ext = '.gif';
            else ext = '.jpg';
        }
        var bucket = (options && options.bucket) ? String(options.bucket) : INLINE_IMAGE_BUCKET;
        var pathPrefix = (options && options.pathPrefix) ? String(options.pathPrefix) : 'editor';
        var path = pathPrefix + '/' + Date.now() + '-' + Math.random().toString(36).slice(2, 10) + ext;
        var up = await client.storage.from(bucket).upload(path, file, {
            upsert: false,
            contentType: file.type || undefined
        });
        if (up.error) return { ok: false, reason: up.error.message };
        var pub = client.storage.from(bucket).getPublicUrl(path);
        var url = pub && pub.data && pub.data.publicUrl ? pub.data.publicUrl : '';
        if (!url) return { ok: false, reason: 'no_public_url', path: path, bucket: bucket };
        return { ok: true, url: url, path: path, bucket: bucket };
    };

    window.fetchArticleEngagementFromSupabase = async function (articleSlug) {
        var client = getClient();
        if (!client) return { ok: false, reason: 'no_client' };
        var slug = String(articleSlug || '').trim();
        if (!slug) return { ok: false, reason: 'no_slug' };
        var res = await client.from('article_engagement')
            .select('article_slug, likes, reactions, comments, updated_at')
            .eq('article_slug', slug)
            .maybeSingle();
        if (res.error) return { ok: false, reason: res.error.message };
        if (!res.data) return {
            ok: true,
            data: { article_slug: slug, likes: 0, reactions: {}, comments: [], updated_at: null }
        };
        return { ok: true, data: res.data };
    };

    window.persistArticleEngagementToSupabase = async function (articleSlug, payload) {
        var client = getClient();
        if (!client) return { ok: false, reason: 'no_client' };
        var slug = String(articleSlug || '').trim();
        if (!slug) return { ok: false, reason: 'no_slug' };
        var row = {
            article_slug: slug,
            likes: Number(payload && payload.likes) || 0,
            reactions: (payload && payload.reactions && typeof payload.reactions === 'object') ? payload.reactions : {},
            comments: Array.isArray(payload && payload.comments) ? payload.comments : [],
            updated_at: new Date().toISOString()
        };
        var up = await client.from('article_engagement').upsert(row, { onConflict: 'article_slug' });
        if (up.error) return { ok: false, reason: up.error.message };
        return { ok: true };
    };

    window.portfolioSbSignOutAll = async function () {
        var client = getClient();
        if (client) await client.auth.signOut();
    };

    window.portfolioSbSignInWithPassword = async function (email, password) {
        var client = getClient();
        if (!client) return { ok: false, reason: 'no_client' };
        var out = await client.auth.signInWithPassword({
            email: String(email || '').trim(),
            password: String(password || '')
        });
        if (out.error) return { ok: false, reason: out.error.message };
        return { ok: true, session: out.data && out.data.session ? out.data.session : null };
    };

    window.subscribeNewsletterEmail = async function (email, lang) {
        var client = getClient();
        if (!client) return { ok: false, reason: 'no_client' };
        var normalized = String(email || '').trim().toLowerCase();
        if (!normalized || normalized.indexOf('@') < 1) return { ok: false, reason: 'invalid_email' };
        var safeLang = lang === 'en' ? 'en' : 'fr';
        var ins = await client.from('newsletter_subscribers').insert({
            email: normalized,
            lang: safeLang,
            active: true
        });
        if (ins.error) {
            if (ins.error.code === '23505') return { ok: true, already: true };
            if (ins.error.code === 'PGRST205' || /newsletter_subscribers/i.test(ins.error.message || '')) {
                return { ok: false, reason: 'table_missing' };
            }
            return { ok: false, reason: ins.error.message };
        }
        return { ok: true };
    };

    window.notifyNewsletterNewArticle = async function (articleMeta) {
        var client = getClient();
        if (!client) return { ok: false, reason: 'no_client' };
        var sess = await client.auth.getSession();
        if (!sess.data || !sess.data.session) return { ok: false, reason: 'no_session' };
        try {
            var res = await client.functions.invoke('notify-newsletter', {
                body: articleMeta || {}
            });
            if (res.error) {
                var msg = res.error.message || 'invoke_failed';
                if (/Function not found|404|not deployed/i.test(msg)) {
                    return { ok: false, reason: 'function_not_deployed' };
                }
                return { ok: false, reason: msg };
            }
            var data = res.data || {};
            if (data.ok === false) return { ok: false, reason: data.reason || 'notify_failed' };
            return {
                ok: true,
                sent: Number(data.sent) || 0,
                failed: Number(data.failed) || 0,
                total: Number(data.total) || 0,
                resendError: data.resend_error || ''
            };
        } catch (err) {
            return { ok: false, reason: (err && err.message) ? err.message : 'invoke_failed' };
        }
    };

    var sbBarReady = false;
    window.initSupabasePortfolioBar = function () {
        if (sbBarReady) return;
        sbBarReady = true;

        var signInBtn = document.getElementById('sbPortfolioSignIn');
        var signOutBtn = document.getElementById('sbPortfolioSignOut');
        var emailEl = document.getElementById('sbPortfolioEmail');
        var passEl = document.getElementById('sbPortfolioPassword');
        var statusEl = document.getElementById('sbPortfolioStatus');

        function setStatus(text) {
            if (statusEl) statusEl.textContent = text || '';
        }

        function refreshAuthUi(session) {
            publishAuthState(session || null);
            if (!signInBtn || !signOutBtn || !emailEl || !passEl) return;
            if (session) {
                signInBtn.style.display = 'none';
                signOutBtn.style.display = '';
                emailEl.disabled = true;
                passEl.disabled = true;
                setStatus('Connecté : ' + (session.user.email || 'OK'));
            } else {
                signInBtn.style.display = '';
                signOutBtn.style.display = 'none';
                emailEl.disabled = false;
                passEl.disabled = false;
                setStatus(getClient() ? 'Non connecté' : 'Supabase non configuré');
            }
        }

        var client = getClient();
        if (!client) {
            publishAuthState(null);
            setStatus('Supabase non configuré');
            return;
        }

        client.auth.getSession().then(function (res) {
            refreshAuthUi(res.data && res.data.session);
        });

        client.auth.onAuthStateChange(function (_event, session) {
            refreshAuthUi(session);
        });

        if (signInBtn) {
            signInBtn.addEventListener('click', async function () {
                var email = emailEl && emailEl.value.trim();
                var password = passEl && passEl.value;
                if (!email || !password) {
                    setStatus('Email et mot de passe requis.');
                    return;
                }
                setStatus('Connexion…');
                var out = await client.auth.signInWithPassword({ email: email, password: password });
                if (out.error) {
                    setStatus(out.error.message);
                    return;
                }
                setStatus('Connecté.');
            });
        }

        if (signOutBtn) {
            signOutBtn.addEventListener('click', async function () {
                await client.auth.signOut();
                setStatus('Déconnecté.');
            });
        }
    };
})();

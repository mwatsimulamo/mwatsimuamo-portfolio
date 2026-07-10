/**
 * ============================================
 * SCRIPT PRINCIPAL DU PORTFOLIO
 * ============================================
 * Ce fichier gère :
 * - La navigation et le scroll
 * - Le chargement dynamique des projets depuis projects.json
 * - Le chargement dynamique des articles depuis articles.json
 * - Le formulaire de contact
 * - L'affichage du CV
 *
 * Dépendances (chargées avant ce script) : js/article-slugs.js, js/markdown-portfolio.js (markdown + images inline).
 * ============================================
 */

// ============================================
// VARIABLES GLOBALES
// ============================================
let translations = {};
let currentLang = localStorage.getItem('portfolio-lang') || 'fr';
/** Machine à écrire sous le nom (hero), chaîne de setTimeout */
let heroTypewriterTimerId = null;
/** Pause entre deux phrases (rotation continue sous le nom) */
let heroRotateDelayId = null;
/** Durée d’affichage d’une phrase terminée avant la suivante (ms) */
const HERO_ROTATE_PAUSE_MS = 2800;

const THEME_STORAGE_KEY = 'portfolio-theme';

/** Email de réception des messages du formulaire de contact */
const CONTACT_EMAIL = 'mwatsimulamoolivier@gmail.com';
/** Formspree : collez uniquement l'ID du formulaire (ex: mjgearjz) ou l'URL complète. */
const FORMSPREE_FORM_ID = 'mjgearjz';

/** Nombre d'articles et d'expériences affichés par page (pagination). */
const ITEMS_PER_PAGE = 4;
const ARTICLE_CATEGORIES = [
    'Web3',
    'Cardano Blockchain',
    'Crypto',
    'Actualites',
    'Tutoriels',
    'Education',
    'IA',
    'Developpement',
    'Communaute'
];
const SKILLS_STORAGE_KEY = 'portfolio-skills';
const SKILL_CATEGORIES = ['frontend', 'backend', 'blockchain', 'tools', 'certifications'];
let currentSkillsData = {
    frontend: [],
    backend: [],
    blockchain: [],
    tools: [],
    certifications: []
};
let currentProjectsData = [];
let currentArticlesData = [];
let currentExperiencesData = [];
const articleFilterState = { query: '', category: '' };
let supabaseAdminAuthenticated = false;
let articleReaderReturnFocus = null;
let currentReaderArticleSlug = null;
const ARTICLE_ENGAGEMENT_STORAGE_KEY = 'portfolio-article-engagement';
const articleEngagementCache = {};

// ============================================
// TOAST NOTIFICATIONS
// ============================================

/**
 * Affiche un toast (notification éphémère)
 * @param {string} message - Message à afficher
 * @param {string} type - 'success' | 'info'
 * @param {number} duration - Durée en ms avant disparition (défaut: 4000)
 */
function showToast(message, type = 'success', duration = 2500) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.style.setProperty('--toast-duration', (duration / 1000) + 's');
    const icon = type === 'success' ? 'fa-check-circle' : 'fa-info-circle';
    toast.innerHTML = `
        <i class="fas ${icon} toast-icon" aria-hidden="true"></i>
        <span class="toast-message">${message}</span>
    `;
    container.appendChild(toast);
    const removeToast = () => {
        toast.classList.add('toast--out');
        setTimeout(() => toast.remove(), 300);
    };
    const timer = setTimeout(removeToast, duration);
    toast.addEventListener('click', () => {
        clearTimeout(timer);
        removeToast();
    });
}

/**
 * Insère du texte autour de la sélection dans un textarea (pour la barre de formatage).
 */
function wrapSelectionInTextarea(textarea, before, after) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.slice(start, end);
    const placeholder = selected.length > 0 ? selected : 'texte';
    const newText = text.slice(0, start) + before + placeholder + after + text.slice(end);
    textarea.value = newText;
    if (selected.length > 0) {
        textarea.selectionStart = start + before.length;
        textarea.selectionEnd = end + before.length;
    } else {
        textarea.selectionStart = start + before.length;
        textarea.selectionEnd = textarea.selectionStart + placeholder.length;
    }
    textarea.focus();
}

/**
 * Insère un préfixe au début de la ligne courante (pour listes à puces).
 */
function insertPrefixAtLineStart(textarea, prefix) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const lineStart = text.lastIndexOf('\n', start - 1) + 1;
    let lineEnd = text.indexOf('\n', end);
    if (lineEnd < 0) lineEnd = text.length;
    const block = text.slice(lineStart, lineEnd);
    const lines = block.split('\n');
    const pref = String(prefix || '');
    const updated = lines.map(function (line) {
        if (!line.trim()) return line;
        return pref + line;
    }).join('\n');
    textarea.value = text.slice(0, lineStart) + updated + text.slice(lineEnd);
    textarea.selectionStart = lineStart;
    textarea.selectionEnd = lineStart + updated.length;
    textarea.focus();
}

function applyHeadingAtLineStart(textarea, level) {
    const safeLevel = Math.max(1, Math.min(6, Number(level) || 1));
    const headingPrefix = '#'.repeat(safeLevel) + ' ';
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const blockStart = text.lastIndexOf('\n', start - 1) + 1;
    let blockEnd = text.indexOf('\n', end);
    if (blockEnd < 0) blockEnd = text.length;
    const block = text.slice(blockStart, blockEnd);
    const updated = block.split('\n').map(function (line) {
        const clean = line.replace(/^#{1,6}\s+/, '');
        if (!clean.trim()) return line;
        return headingPrefix + clean;
    }).join('\n');
    textarea.value = text.slice(0, blockStart) + updated + text.slice(blockEnd);
    textarea.selectionStart = blockStart;
    textarea.selectionEnd = blockStart + updated.length;
    textarea.focus();
}

function insertTextAtCursor(textarea, textToInsert) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const insert = String(textToInsert || '');
    textarea.value = text.slice(0, start) + insert + text.slice(end);
    const caret = start + insert.length;
    textarea.selectionStart = textarea.selectionEnd = caret;
    textarea.focus();
}

function continueListOnEnter(textarea, event) {
    if (!textarea || !event || event.key !== 'Enter' || event.shiftKey) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value || '';
    const lineStart = text.lastIndexOf('\n', start - 1) + 1;
    let lineEnd = text.indexOf('\n', start);
    if (lineEnd < 0) lineEnd = text.length;
    const line = text.slice(lineStart, lineEnd);
    const beforeCaret = line.slice(0, Math.max(0, start - lineStart));
    const afterCaret = line.slice(Math.max(0, start - lineStart));

    const bulletMatch = line.match(/^(\s*)([-*+•◦▪→✓.])\s+(.*)$/);
    const orderedMatch = line.match(/^(\s*)((?:\d+|[a-zA-Z]|[ivxlcdmIVXLCDM]+)[.)])\s+(.*)$/);
    if (!bulletMatch && !orderedMatch) return;
    if (start !== end) return;

    event.preventDefault();

    if (bulletMatch) {
        const indent = bulletMatch[1] || '';
        const marker = bulletMatch[2] || '-';
        const content = (bulletMatch[3] || '').trim();
        // Si la ligne de liste est vide, second Enter retire la puce.
        if (!content) {
            const cleanedLine = '';
            textarea.value = text.slice(0, lineStart) + cleanedLine + text.slice(lineEnd);
            textarea.selectionStart = textarea.selectionEnd = lineStart;
            return;
        }
        const insert = '\n' + indent + marker + ' ';
        textarea.value = text.slice(0, start) + insert + text.slice(end);
        const pos = start + insert.length;
        textarea.selectionStart = textarea.selectionEnd = pos;
        return;
    }

    const indent = orderedMatch[1] || '';
    const marker = orderedMatch[2] || '1.';
    const content = (orderedMatch[3] || '').trim();
    if (!content) {
        textarea.value = text.slice(0, lineStart) + '' + text.slice(lineEnd);
        textarea.selectionStart = textarea.selectionEnd = lineStart;
        return;
    }

    let nextMarker = marker;
    const numMatch = marker.match(/^(\d+)([.)])$/);
    const alphaMatch = marker.match(/^([a-zA-Z])([.)])$/);
    const romanMatch = marker.match(/^([ivxlcdmIVXLCDM]+)([.)])$/);
    if (numMatch) {
        nextMarker = String(Number(numMatch[1]) + 1) + numMatch[2];
    } else if (alphaMatch) {
        const code = alphaMatch[1].charCodeAt(0);
        const isLower = code >= 97 && code <= 122;
        const isUpper = code >= 65 && code <= 90;
        if (isLower || isUpper) {
            const base = isLower ? 97 : 65;
            const next = ((code - base + 1) % 26) + base;
            nextMarker = String.fromCharCode(next) + alphaMatch[2];
        }
    } else if (romanMatch) {
        // Pour la liste romaine, on garde le même préfixe (simple et prévisible).
        nextMarker = marker;
    }

    const insert = '\n' + indent + nextMarker + ' ';
    textarea.value = text.slice(0, start) + insert + text.slice(end);
    const pos = start + insert.length;
    textarea.selectionStart = textarea.selectionEnd = pos;
}

function escapeRegExp(value) {
    return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function wrapSelectionAsBlock(textarea, kind) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.slice(start, end) || 'votre texte';
    const marker = String(kind || 'left').toLowerCase();
    const wrapped = `[${marker}]\n${selected}\n[/${marker}]`;
    textarea.value = text.slice(0, start) + wrapped + text.slice(end);
    textarea.selectionStart = start + wrapped.length;
    textarea.selectionEnd = textarea.selectionStart;
    textarea.focus();
}

/**
 * Initialise les barres d'outils de formatage (gras, italique, souligné, liste) au-dessus des textareas description.
 */
function initDescriptionToolbars() {
    document.querySelectorAll('.description-toolbar').forEach(toolbar => {
        const targetId = toolbar.getAttribute('data-target');
        const textarea = document.getElementById(targetId);
        if (!textarea) return;
        toolbar.querySelectorAll('.toolbar-btn[data-wrap]').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                const wrap = this.getAttribute('data-wrap');
                wrapSelectionInTextarea(textarea, wrap, wrap);
            });
        });
        toolbar.querySelectorAll('[data-prefix]').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                const prefix = this.getAttribute('data-prefix');
                insertPrefixAtLineStart(textarea, prefix);
                if (typeof refreshArticleEditorPreview === 'function') refreshArticleEditorPreview();
                toolbar.querySelectorAll('[data-bullet-dropdown]').forEach(function (dd) {
                    dd.classList.remove('toolbar-dropdown--open');
                });
            });
        });
        toolbar.querySelectorAll('[data-bullet-menu-toggle]').forEach(btn => {
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                const dropdown = this.closest('[data-bullet-dropdown]');
                if (!dropdown) return;
                const shouldOpen = !dropdown.classList.contains('toolbar-dropdown--open');
                toolbar.querySelectorAll('[data-bullet-dropdown]').forEach(function (dd) {
                    dd.classList.remove('toolbar-dropdown--open');
                });
                if (shouldOpen) dropdown.classList.add('toolbar-dropdown--open');
            });
        });
        toolbar.querySelectorAll('.toolbar-btn[data-heading]').forEach(btn => {
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                const level = this.getAttribute('data-heading');
                applyHeadingAtLineStart(textarea, level);
                if (typeof refreshArticleEditorPreview === 'function') refreshArticleEditorPreview();
            });
        });
        toolbar.querySelectorAll('.toolbar-btn[data-insert]').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                const insertText = this.getAttribute('data-insert');
                insertTextAtCursor(textarea, insertText);
                if (typeof refreshArticleEditorPreview === 'function') refreshArticleEditorPreview();
            });
        });
        toolbar.querySelectorAll('.toolbar-btn[data-block]').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                const blockType = String(this.getAttribute('data-block') || '').toLowerCase();
                const selected = textarea.value.slice(textarea.selectionStart, textarea.selectionEnd);
                const wrappedRe = new RegExp('^\\[\\s*' + escapeRegExp(blockType) + '\\s*\\]\\n([\\s\\S]*?)\\n\\[\\s*\\/\\s*' + escapeRegExp(blockType) + '\\s*\\]$');
                if (selected && wrappedRe.test(selected)) {
                    insertTextAtCursor(textarea, selected.replace(wrappedRe, '$1'));
                } else {
                    wrapSelectionAsBlock(textarea, blockType);
                }
                if (typeof refreshArticleEditorPreview === 'function') refreshArticleEditorPreview();
            });
        });
        toolbar.querySelectorAll('.toolbar-btn[data-image-local]').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                const picker = document.createElement('input');
                picker.type = 'file';
                picker.accept = 'image/*';
                picker.addEventListener('change', function () {
                    const f = picker.files && picker.files[0];
                    if (f) insertMarkdownImageFileAtCursor(textarea, f);
                });
                picker.click();
            });
        });
        textarea.addEventListener('paste', function (e) {
            const items = e.clipboardData && e.clipboardData.items;
            if (!items || !items.length) return;
            for (let i = 0; i < items.length; i++) {
                const it = items[i];
                if (it.kind === 'file' && it.type.startsWith('image/')) {
                    e.preventDefault();
                    const file = it.getAsFile();
                    if (file) insertMarkdownImageFileAtCursor(textarea, file);
                    break;
                }
            }
        });
        textarea.addEventListener('keydown', function (e) {
            continueListOnEnter(textarea, e);
            if (typeof refreshArticleEditorPreview === 'function') {
                window.requestAnimationFrame(function () {
                    refreshArticleEditorPreview();
                });
            }
        });
    });
    document.addEventListener('click', function () {
        document.querySelectorAll('[data-bullet-dropdown]').forEach(function (dd) {
            dd.classList.remove('toolbar-dropdown--open');
        });
    });
}

/**
 * Scroll en douceur vers une section
 * @param {string} sectionId - Id de la section (ex: 'articles', 'projets')
 */
function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// ============================================
// PROTECTION ACCÈS ADMIN
// ============================================

/**
 * Affiche la modal de connexion admin Supabase et renvoie
 * { email, password } ou null si annulé.
 */
function showAdminSupabaseModal() {
    const overlay = document.getElementById('adminModalOverlay');
    const form = document.getElementById('adminModalForm');
    const emailInput = document.getElementById('adminModalEmail');
    const input = document.getElementById('adminModalPassword');
    const toggleBtn = document.getElementById('adminModalTogglePassword');
    const cancelBtn = document.getElementById('adminModalCancel');
    if (!overlay || !form || !input || !emailInput) return Promise.resolve(null);

    return new Promise(function(resolve) {
        var settled = false;
        function setPasswordVisibility(show) {
            input.type = show ? 'text' : 'password';
            if (toggleBtn) {
                toggleBtn.innerHTML = show
                    ? '<i class="fas fa-eye-slash" aria-hidden="true"></i>'
                    : '<i class="fas fa-eye" aria-hidden="true"></i>';
                toggleBtn.setAttribute('aria-label', show ? 'Masquer le mot de passe' : 'Afficher le mot de passe');
                toggleBtn.setAttribute('title', show ? 'Masquer le mot de passe' : 'Afficher le mot de passe');
            }
        }
        function closeModal() {
            overlay.classList.remove('admin-modal--open');
            overlay.setAttribute('aria-hidden', 'true');
            emailInput.value = '';
            input.value = '';
            setPasswordVisibility(false);
        }
        function done(value) {
            if (settled) return;
            settled = true;
            closeModal();
            form.removeEventListener('submit', onSubmit);
            cancelBtn.removeEventListener('click', onCancel);
            overlay.removeEventListener('click', onOverlayClick);
            document.removeEventListener('keydown', onEscape);
            if (toggleBtn) toggleBtn.removeEventListener('click', onTogglePassword);
            resolve(value);
        }

        function onSubmit(e) {
            e.preventDefault();
            done({
                email: String(emailInput.value || '').trim(),
                password: String(input.value || '')
            });
        }
        function onCancel() { done(null); }
        function onOverlayClick(e) {
            if (e.target === overlay) done(null);
        }
        function onEscape(e) {
            if (e.key === 'Escape') done(null);
        }
        function onTogglePassword() {
            setPasswordVisibility(input.type === 'password');
        }

        form.addEventListener('submit', onSubmit);
        cancelBtn.addEventListener('click', onCancel);
        overlay.addEventListener('click', onOverlayClick);
        document.addEventListener('keydown', onEscape);
        if (toggleBtn) toggleBtn.addEventListener('click', onTogglePassword);

        setPasswordVisibility(false);
        overlay.classList.add('admin-modal--open');
        overlay.setAttribute('aria-hidden', 'false');
        emailInput.focus();
    });
}

/**
 * Affiche ou masque l'interface d'administration selon la session
 */
function setAdminUIVisibility(isAdmin) {
    const adminOnly = document.querySelectorAll('.admin-only');
    const unlockLink = document.getElementById('adminUnlockTrigger');
    const logoutLink = document.getElementById('adminLogoutTrigger');
    adminOnly.forEach(el => {
        el.style.display = isAdmin ? '' : 'none';
    });
    if (unlockLink) unlockLink.style.display = isAdmin ? 'none' : '';
    if (logoutLink) logoutLink.style.display = isAdmin ? '' : 'none';
}

function refreshAdminOnlyVisibility() {
    setAdminUIVisibility(!!supabaseAdminAuthenticated);
}

function setSupabaseStripVisibility(visible) {
    const strip = document.getElementById('supabaseAdminStrip');
    if (!strip) return;
    strip.style.display = 'none';
}

function setAdminFromSupabaseSession(session) {
    supabaseAdminAuthenticated = !!session;
    refreshAdminOnlyVisibility();
}

/**
 * Initialise la protection : masque les boutons admin sauf si déjà authentifié
 */
function initAdminGate() {
    setAdminUIVisibility(!!supabaseAdminAuthenticated);
    setSupabaseStripVisibility(false);

    if (window.__portfolioSupabaseSession) {
        setAdminFromSupabaseSession(window.__portfolioSupabaseSession);
    }

    window.addEventListener('portfolio-supabase-auth-changed', function (ev) {
        const session = ev && ev.detail ? ev.detail.session : null;
        setAdminFromSupabaseSession(session);
    });

    const unlockTrigger = document.getElementById('adminUnlockTrigger');
    const logoutTrigger = document.getElementById('adminLogoutTrigger');

    if (unlockTrigger) {
        unlockTrigger.addEventListener('click', function(e) {
            e.preventDefault();
            if (supabaseAdminAuthenticated) {
                showToast('Mode admin actif via Supabase.', 'success');
                return;
            }
            showAdminSupabaseModal().then(async function (credentials) {
                if (!credentials) return;
                if (!credentials.email || !credentials.password) {
                    showToast('Email et mot de passe requis.', 'info');
                    return;
                }
                if (typeof window.portfolioSbSignInWithPassword !== 'function') {
                    showToast('Supabase non configure.', 'info');
                    return;
                }
                const out = await window.portfolioSbSignInWithPassword(credentials.email, credentials.password);
                if (!out || !out.ok) {
                    showToast((out && out.reason) ? out.reason : 'Connexion impossible.', 'info');
                    return;
                }
                showToast('Mode admin active.', 'success');
            });
        });
    }

    if (logoutTrigger) {
        logoutTrigger.addEventListener('click', function(e) {
            e.preventDefault();
            supabaseAdminAuthenticated = false;
            setAdminUIVisibility(false);
            setSupabaseStripVisibility(false);
            document.getElementById('adminPanel') && (document.getElementById('adminPanel').style.display = 'none');
            document.getElementById('adminProjectPanel') && (document.getElementById('adminProjectPanel').style.display = 'none');
            document.getElementById('adminExperiencePanel') && (document.getElementById('adminExperiencePanel').style.display = 'none');
            if (typeof window.portfolioSbSignOutAll === 'function') {
                window.portfolioSbSignOutAll();
            }
            showToast('Mode admin désactivé.', 'info');
        });
    }
}

/**
 * Applique le thème (light | dark) et met à jour le bouton
 */
function applyTheme(theme) {
    const safeTheme = theme === 'dark' ? 'dark' : 'light';
    document.body.setAttribute('data-theme', safeTheme);
    localStorage.setItem(THEME_STORAGE_KEY, safeTheme);

    const icon = document.getElementById('themeToggleIcon');
    const btn = document.getElementById('themeToggleBtn');
    if (icon) {
        icon.className = safeTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
    if (btn) {
        const fr = currentLang === 'fr';
        const toDark = fr ? 'Activer le mode sombre' : 'Enable dark mode';
        const toLight = fr ? 'Activer le mode clair' : 'Enable light mode';
        const label = safeTheme === 'dark' ? toLight : toDark;
        btn.title = label;
        btn.setAttribute('aria-label', label);
    }
}

/**
 * Initialise le bouton de thème (clair/sombre)
 */
function initThemeToggle() {
    const btn = document.getElementById('themeToggleBtn');
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');

    applyTheme(initialTheme);

    if (btn) {
        btn.addEventListener('click', function() {
            const isDark = document.body.getAttribute('data-theme') === 'dark';
            applyTheme(isDark ? 'light' : 'dark');
        });
    }
}

// ============================================
// INITIALISATION
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    initThemeToggle();
    initAdminGate();
    initProjectDescriptionModal();
    initArticleReaderModal();
    initArticleListClickDelegation();
    initTranslations();
    initNavigation();
    initArticleFilters();
    loadProjects();
    loadExperiences();
    loadArticles();
    loadSkills();
    initContactForm();
    initCVPreview();
    checkProfileImage();
    initScrollAnimations();
    initLanguageSelector();
    initArticleAdmin();
    initProjectAdmin();
    initExperienceAdmin();
    initSkillsAdmin();
    initInlineAdminQuickEdit();
    initArticleImageTools();
    initDescriptionToolbars();
    if (typeof window.initSupabasePortfolioBar === 'function') {
        window.initSupabasePortfolioBar();
    }

    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(function() {
            syncHeroRoleLineToNameWidthSoon();
        });
    }
    window.addEventListener('popstate', function () {
        const slug = new URL(window.location.href).searchParams.get('article');
        if (!slug) closeArticleReaderModal(false);
        else tryOpenArticleFromUrl();
    });
});

// ============================================
// NAVIGATION
// ============================================

/**
 * Synchronise la hauteur de l’en-tête fixe (CSS var --header-stack-height) pour le padding du hero et le scroll.
 */
function syncHeaderStackHeight() {
    const header = document.getElementById('siteHeader');
    if (!header) return;
    const h = Math.ceil(header.getBoundingClientRect().height);
    document.documentElement.style.setProperty('--header-stack-height', `${Math.max(h, 72)}px`);
}

function getScrollMarginTop() {
    const raw = getComputedStyle(document.documentElement).getPropertyValue('--header-stack-height').trim();
    const n = parseInt(raw, 10);
    return Number.isFinite(n) ? n : 100;
}

/**
 * Aligne la fin du bloc sous-titres avec la fin du nom : .hero-identity prend la même largeur
 * que le h1 (kicker + nom), pas toute la colonne — le texte du sous-titre se termine donc au même niveau.
 */
function syncHeroRoleLineToNameWidth() {
    const title = document.querySelector('.hero-title');
    const name = document.querySelector('.hero-title-name');
    const identity = document.querySelector('.hero-identity');
    if (!title || !identity) return;
    /* Mobile : la colonne centrée utilise toute la largeur utile, pas de calage sur le h1 */
    if (typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 960px)').matches) {
        identity.style.width = '';
        identity.style.maxWidth = '';
        return;
    }
    const titleRectW = Math.ceil(title.getBoundingClientRect().width);
    const titleScrollW = Math.ceil(title.scrollWidth || 0);
    const nameRectW = name ? Math.ceil(name.getBoundingClientRect().width) : 0;
    const titleW = Math.max(titleRectW, titleScrollW, nameRectW, 0);
    const parent = identity.parentElement;
    const capW = parent ? Math.ceil(parent.getBoundingClientRect().width) : titleW;
    const safeCap = Math.max(capW, 0);
    const w = Math.min(Math.max(titleW, 1), safeCap || titleW);

    // Garde-fou: si la mesure est incohérente (ex: 1px), revenir en auto.
    if (!Number.isFinite(w) || w < 120) {
        identity.style.width = '';
        identity.style.maxWidth = '';
        return;
    }
    identity.style.width = w + 'px';
    identity.style.maxWidth = w + 'px';
}

/** Recalcul après reflow (police, justify, taille du sous-titre). */
function syncHeroRoleLineToNameWidthSoon() {
    syncHeroRoleLineToNameWidth();
    requestAnimationFrame(function() {
        syncHeroRoleLineToNameWidth();
    });
}

/** Fin de frappe : texte seul (sans curseur inline) pour un justify fiable sur toutes les lignes. */
function finalizeHeroTypewriterPlainText(el, full) {
    el.textContent = full;
    el.classList.add('hero-typewriter--final');
}

/**
 * Initialise la navigation (menu hamburger, scroll, active links)
 */
function initNavigation() {
    const navbar = document.getElementById('navbar');
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.getElementById('navMenu');
    const navLinks = document.querySelectorAll('.nav-link');

    syncHeaderStackHeight();
    syncHeroRoleLineToNameWidthSoon();
    window.addEventListener('resize', function() {
        syncHeaderStackHeight();
        syncHeroRoleLineToNameWidthSoon();
    });
    window.addEventListener('load', function() {
        syncHeaderStackHeight();
        syncHeroRoleLineToNameWidthSoon();
    });

    // Menu hamburger pour mobile
    if (hamburger) {
        hamburger.addEventListener('click', function() {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
        });
    }

    // Fermer le menu mobile quand on clique sur un lien
    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            if (window.innerWidth <= 768) {
                hamburger.classList.remove('active');
                navMenu.classList.remove('active');
            }
        });
    });

    const brandHomeLink = document.querySelector('.nav-brand a[href="#accueil"]');
    if (brandHomeLink && hamburger && navMenu) {
        brandHomeLink.addEventListener('click', function() {
            if (window.innerWidth <= 768) {
                hamburger.classList.remove('active');
                navMenu.classList.remove('active');
            }
        });
    }

    // Ajouter la classe 'scrolled' à la navbar au scroll
    window.addEventListener('scroll', function() {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // Mettre à jour le lien actif au scroll
    window.addEventListener('scroll', updateActiveNavLink);

    // Smooth scroll pour les ancres
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href !== '#' && href.length > 1) {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    const offsetTop = target.offsetTop - getScrollMarginTop();
                    window.scrollTo({
                        top: offsetTop,
                        behavior: 'smooth'
                    });
                }
            }
        });
    });

    updateActiveNavLink();
}

/**
 * Met à jour le lien de navigation actif selon la section visible
 */
function updateActiveNavLink() {
    const sections = document.querySelectorAll('.section, .hero');
    const navLinks = document.querySelectorAll('.nav-link');
    const brandHome = document.querySelector('.nav-brand a[href="#accueil"]');

    let current = '';
    const margin = getScrollMarginTop() + 12;
    sections.forEach(section => {
        const sectionTop = section.offsetTop - margin;
        const sectionHeight = section.clientHeight;
        if (window.scrollY >= sectionTop && window.scrollY < sectionTop + sectionHeight) {
            current = section.getAttribute('id');
        }
    });

    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${current}`) {
            link.classList.add('active');
        }
    });

    if (brandHome) {
        if (current === 'accueil') {
            brandHome.classList.add('active');
        } else {
            brandHome.classList.remove('active');
        }
    }
}

// ============================================
// CHARGEMENT DES PROJETS
// ============================================

async function mergeProjectsFromSources() {
    let fromFile = [];
    try {
        const response = await fetch('projects.json');
        if (response.ok) fromFile = await response.json();
    } catch (e) {
        /* ignore */
    }
    return [...getLocalProjects(), ...fromFile];
}

async function mergeArticlesFromSources() {
    let fromFile = [];
    try {
        const response = await fetch('articles.json');
        if (response.ok) fromFile = await response.json();
    } catch (e) {
        /* ignore */
    }
    return mergeArticleListsPreferLocal(getLocalArticles(), Array.isArray(fromFile) ? fromFile : []);
}

async function mergeExperiencesFromSources() {
    let fromFile = [];
    try {
        const response = await fetch('experiences.json');
        if (response.ok) fromFile = await response.json();
    } catch (e) {
        /* ignore */
    }
    return [...getLocalExperiences(), ...fromFile];
}

async function mergeSkillsFromSources() {
    const local = getLocalSkills();
    if (hasAnySkills(local)) return cloneSkillsData(local);
    let fromFile = createEmptySkillsData();
    try {
        const response = await fetch('skills.json');
        if (response.ok) fromFile = normalizeSkillsData(await response.json());
    } catch (e) {
        /* ignore */
    }
    return cloneSkillsData(fromFile);
}

async function getPortfolioBodyForPersist(contentKey) {
    if (contentKey === 'articles' && Array.isArray(currentArticlesData)) {
        return currentArticlesData.map(function (a) { return Object.assign({}, a); });
    }
    if (contentKey === 'projects' && Array.isArray(currentProjectsData)) {
        return currentProjectsData.map(function (p) { return Object.assign({}, p); });
    }
    if (contentKey === 'experiences' && Array.isArray(currentExperiencesData)) {
        return currentExperiencesData.map(function (e) { return Object.assign({}, e); });
    }
    if (contentKey === 'skills' && currentSkillsData) {
        return cloneSkillsData(currentSkillsData);
    }
    if (contentKey === 'projects') return mergeProjectsFromSources();
    if (contentKey === 'articles') return mergeArticlesFromSources();
    if (contentKey === 'experiences') return mergeExperiencesFromSources();
    if (contentKey === 'skills') return mergeSkillsFromSources();
    return null;
}

function syncArticlesLocalFromCurrent() {
    setLocalArticles(currentArticlesData);
}

function syncProjectsLocalFromCurrent() {
    localStorage.setItem('portfolio-projects', JSON.stringify(currentProjectsData));
}

function syncExperiencesLocalFromCurrent() {
    localStorage.setItem('portfolio-experiences', JSON.stringify(currentExperiencesData));
}

function ensureProjectsEditableSnapshot() {
    if (!Array.isArray(currentProjectsData) || currentProjectsData.length === 0) return;
    syncProjectsLocalFromCurrent();
}

function ensureExperiencesEditableSnapshot() {
    if (!Array.isArray(currentExperiencesData) || currentExperiencesData.length === 0) return;
    syncExperiencesLocalFromCurrent();
}

function normalizeArticleRecord(article) {
    const clone = Object.assign({}, article);
    clone.slug = getArticleCanonicalSlug(clone);
    const bodyText = getArticleInternalBody(clone);
    if (!clone.content && bodyText) clone.content = bodyText;
    if (!clone.type) clone.type = bodyText ? 'direct' : 'external';
    clone.category = normalizeArticleCategory(clone.category);
    return clone;
}

function setCurrentArticlesDataset(articles) {
    currentArticlesData = (Array.isArray(articles) ? articles : [])
        .map(normalizeArticleRecord)
        .sort(sortArticlesByPublicationDateDesc);
    syncArticlesLocalFromCurrent();
}

function setCurrentProjectsDataset(projects) {
    currentProjectsData = (Array.isArray(projects) ? projects : []).map(function (p) {
        return Object.assign({}, p);
    });
    syncProjectsLocalFromCurrent();
}

function setCurrentExperiencesDataset(experiences) {
    currentExperiencesData = (Array.isArray(experiences) ? experiences : []).map(function (e) {
        return Object.assign({}, e);
    });
    syncExperiencesLocalFromCurrent();
}

/**
 * Pousse le contenu affiché (current*Data) vers Supabase si l’admin est connecté.
 * @param {'projects'|'articles'|'experiences'|'skills'} contentKey
 * @returns {Promise<{ok:boolean, reason?:string}>}
 */
async function notifySupabasePortfolioPersist(contentKey) {
    if (typeof window.persistPortfolioContentToSupabase !== 'function') {
        return { ok: false, reason: 'no_client_fn' };
    }
    if (!isAdminUnlocked()) {
        showToast('Connectez-vous en mode admin pour enregistrer dans Supabase.', 'info');
        return { ok: false, reason: 'no_admin' };
    }
    try {
        const body = await getPortfolioBodyForPersist(contentKey);
        if (!body) return { ok: false, reason: 'no_body' };
        const res = await window.persistPortfolioContentToSupabase(contentKey, body);
        if (!res) return { ok: false, reason: 'no_response' };
        if (res.ok) showToast('Synchronisé sur Supabase.', 'success');
        else if (res.reason === 'no_session') {
            showToast('Session Supabase expirée. Reconnectez-vous via Mode admin.', 'info');
        } else if (res.reason !== 'no_client') {
            showToast('Supabase : ' + res.reason, 'info');
        }
        return res;
    } catch (err) {
        console.warn('Supabase persist', err);
        const msg = (err && err.message) ? err.message : 'échec de synchronisation';
        showToast('Erreur réseau Supabase : ' + msg, 'info');
        return { ok: false, reason: msg };
    }
}

/**
 * Charge les projets depuis projects.json et localStorage, puis les affiche
 */
async function loadProjects() {
    const projectsGrid = document.getElementById('projectsGrid');
    
    if (!projectsGrid) {
        console.error('Élément projectsGrid non trouvé');
        return;
    }
    
    try {
        let allProjects = [];
        let usedSupabase = false;
        if (typeof window.fetchPortfolioBody === 'function') {
            try {
                const remote = await window.fetchPortfolioBody('projects');
                if (Array.isArray(remote) && remote.length > 0) {
                    allProjects = remote;
                    usedSupabase = true;
                }
            } catch (e) {
                console.warn('Lecture Supabase projects:', e);
            }
        }
        if (!usedSupabase) {
            let projectsFromFile = [];
            try {
                const response = await fetch('projects.json');
                if (response.ok) {
                    projectsFromFile = await response.json();
                }
            } catch (e) {
                console.warn('Fichier projects.json non disponible, utilisation des projets locaux uniquement.');
            }
            const localProjects = getLocalProjects();
            allProjects = [...localProjects, ...projectsFromFile];
        }
        
        if (allProjects.length === 0) {
            currentProjectsData = [];
            const noProjectsText = (translations[currentLang] && translations[currentLang].projects && translations[currentLang].projects.noProjects) 
                ? translations[currentLang].projects.noProjects 
                : 'Aucun projet disponible pour le moment.';
            projectsGrid.innerHTML = `<p class="loading">${noProjectsText}</p>`;
            return;
        }
        
        currentProjectsData = allProjects.map(function (p) { return { ...p }; });
        projectsGrid.innerHTML = '';
        allProjects.forEach(function(project, index) {
            const projectCard = createProjectCard(project, index);
            projectsGrid.appendChild(projectCard);
        });
        refreshAdminOnlyVisibility();
        
    } catch (error) {
        console.error('Erreur lors du chargement des projets:', error);
        if (projectsGrid) {
            projectsGrid.innerHTML = `
                <p class="loading" style="color: #ef4444;">
                    Erreur lors du chargement des projets. 
                    Vérifiez que le fichier projects.json existe et est valide.
                </p>
            `;
        }
    }
}

/**
 * Récupère les projets stockés dans localStorage
 */
function getLocalProjects() {
    try {
        const stored = localStorage.getItem('portfolio-projects');
        return stored ? JSON.parse(stored) : [];
    } catch (error) {
        console.error('Erreur lors de la lecture des projets locaux:', error);
        return [];
    }
}

/**
 * Sauvegarde un projet dans localStorage
 */
function saveLocalProject(project) {
    const projects = getLocalProjects();
    projects.push(project);
    localStorage.setItem('portfolio-projects', JSON.stringify(projects));
}

/**
 * Supprime tous les projets locaux
 */
function clearLocalProjects() {
    localStorage.removeItem('portfolio-projects');
}

/**
 * Exporte tous les projets (JSON + localStorage) en fichier JSON
 */
function exportProjects() {
    const localProjects = getLocalProjects();
    fetch('projects.json')
        .then(response => response.ok ? response.json() : [])
        .then(projectsFromFile => {
            const allProjects = [...localProjects, ...projectsFromFile];
            const dataStr = JSON.stringify(allProjects, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'projects.json';
            a.click();
            URL.revokeObjectURL(url);
        })
        .catch(() => {
            const dataStr = JSON.stringify(localProjects, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'projects.json';
            a.click();
            URL.revokeObjectURL(url);
        });
}

/**
 * Crée une carte de projet à partir des données JSON
 * @param {Object} project - Données du projet
 * @returns {HTMLElement} - Élément HTML de la carte projet
 */
function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function escapeAttr(str) {
    if (str == null) return '';
    return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

/**
 * Lit une chaîne dans translations[currentLang] via un chemin « a.b.c ».
 * @param {string} path
 * @returns {string|null}
 */
function getTranslationStringByPath(path) {
    if (!path || typeof path !== 'string') return null;
    const keys = path.split('.').filter(Boolean);
    let node = translations[currentLang];
    for (let i = 0; i < keys.length; i++) {
        if (!node || typeof node !== 'object' || node[keys[i]] === undefined) {
            return null;
        }
        node = node[keys[i]];
    }
    return typeof node === 'string' ? node : null;
}

/**
 * Texte projet : clé i18n (contributionsKey / descriptionKey) ou champ brut.
 * @param {Object} project
 * @param {'contributions'|'description'} fieldName
 * @returns {string}
 */
function resolveProjectTextField(project, fieldName) {
    const keyPath = project[fieldName + 'Key'];
    if (keyPath && typeof keyPath === 'string') {
        const fromPack = getTranslationStringByPath(keyPath.trim());
        if (fromPack) return fromPack.trim();
    }
    const raw = project[fieldName];
    if (raw != null && String(raw).trim()) return String(raw).trim();
    return '';
}

let projectDescModalReturnFocus = null;

function projectDescModalOnKeydown(e) {
    if (e.key === 'Escape') {
        e.preventDefault();
        closeProjectDescriptionModal();
    }
}

function initProjectDescriptionModal() {
    const overlay = document.getElementById('projectDescModalOverlay');
    if (!overlay) return;
    overlay.addEventListener('click', function (e) {
        if (e.target === overlay) {
            closeProjectDescriptionModal();
        }
    });
    const closeBtn = document.getElementById('projectDescModalClose');
    if (closeBtn) {
        closeBtn.addEventListener('click', function (e) {
            e.preventDefault();
            closeProjectDescriptionModal();
        });
    }
}

function openProjectDescriptionModal(projectTitle, contributionsHtml, descriptionHtml, contributionsHeadingOverride) {
    const overlay = document.getElementById('projectDescModalOverlay');
    const titleEl = document.getElementById('projectDescModalTitle');
    const bodyEl = document.getElementById('projectDescModalBody');
    const closeBtn = document.getElementById('projectDescModalClose');
    if (!overlay || !titleEl || !bodyEl) return;

    const alreadyOpen = overlay.classList.contains('project-desc-modal--open');
    if (alreadyOpen) {
        document.removeEventListener('keydown', projectDescModalOnKeydown);
    } else {
        projectDescModalReturnFocus = document.activeElement;
    }

    const tProj = translations[currentLang] && translations[currentLang].projects;
    titleEl.textContent = projectTitle || '';

    const contributionsHeading = (contributionsHeadingOverride && String(contributionsHeadingOverride).trim())
        ? String(contributionsHeadingOverride).trim()
        : ((tProj && tProj.contributionsTitle) ? tProj.contributionsTitle : 'Mes contributions');
    const descriptionHeading = (tProj && tProj.descriptionSectionTitle) ? tProj.descriptionSectionTitle : 'Description';

    const sections = [];
    if (descriptionHtml) {
        sections.push(`<div class="project-desc-modal-section"><h4 class="project-desc-modal-block-title">${escapeHtml(descriptionHeading)}</h4><div class="project-desc-modal-block description-block">${descriptionHtml}</div></div>`);
    }
    if (contributionsHtml) {
        sections.push(`<div class="project-desc-modal-section"><h4 class="project-desc-modal-block-title">${escapeHtml(contributionsHeading)}</h4><div class="project-desc-modal-block description-block">${contributionsHtml}</div></div>`);
    }
    bodyEl.innerHTML = sections.join('');

    if (closeBtn) {
        closeBtn.setAttribute('aria-label', (tProj && tProj.closeDescription) ? tProj.closeDescription : 'Fermer');
    }

    overlay.classList.add('project-desc-modal--open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', projectDescModalOnKeydown);
    if (closeBtn) {
        closeBtn.focus();
    }
}

function closeProjectDescriptionModal() {
    const overlay = document.getElementById('projectDescModalOverlay');
    if (!overlay || !overlay.classList.contains('project-desc-modal--open')) {
        return;
    }
    overlay.classList.remove('project-desc-modal--open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    const bodyEl = document.getElementById('projectDescModalBody');
    if (bodyEl) {
        bodyEl.innerHTML = '';
    }
    const titleEl = document.getElementById('projectDescModalTitle');
    if (titleEl) {
        titleEl.textContent = '';
    }
    document.removeEventListener('keydown', projectDescModalOnKeydown);
    const ref = projectDescModalReturnFocus;
    projectDescModalReturnFocus = null;
    if (ref && typeof ref.focus === 'function') {
        try {
            ref.focus();
        } catch (err) {
            /* ignore */
        }
    }
}

function getArticleEngagementStore() {
    try {
        const raw = localStorage.getItem(ARTICLE_ENGAGEMENT_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : {};
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (_err) {
        return {};
    }
}

function setArticleEngagementStore(store) {
    try {
        localStorage.setItem(ARTICLE_ENGAGEMENT_STORAGE_KEY, JSON.stringify(store || {}));
    } catch (_err) {
        // ignore
    }
}

function getArticleEngagement(slug) {
    const all = getArticleEngagementStore();
    const key = String(slug || '').trim();
    const fallback = { likes: 0, reactions: {}, comments: [] };
    if (!key || !all[key]) return fallback;
    return Object.assign({}, fallback, all[key]);
}

function isAdminUnlocked() {
    return !!supabaseAdminAuthenticated;
}

async function fetchArticleEngagement(slug) {
    const key = String(slug || '').trim();
    if (!key) return { likes: 0, reactions: {}, comments: [] };
    if (articleEngagementCache[key]) return articleEngagementCache[key];
    if (typeof window.fetchArticleEngagementFromSupabase === 'function') {
        const remote = await window.fetchArticleEngagementFromSupabase(key);
        if (remote && remote.ok && remote.data) {
            const state = {
                likes: Number(remote.data.likes) || 0,
                reactions: (remote.data.reactions && typeof remote.data.reactions === 'object') ? remote.data.reactions : {},
                comments: Array.isArray(remote.data.comments) ? remote.data.comments : []
            };
            articleEngagementCache[key] = state;
            return state;
        }
    }
    const local = getArticleEngagement(key);
    articleEngagementCache[key] = local;
    return local;
}

async function saveArticleEngagement(slug, state) {
    const key = String(slug || '').trim();
    if (!key) return false;
    articleEngagementCache[key] = state;
    if (typeof window.persistArticleEngagementToSupabase === 'function') {
        const out = await window.persistArticleEngagementToSupabase(key, state);
        if (out && out.ok) return true;
    }
    const all = getArticleEngagementStore();
    all[key] = state;
    setArticleEngagementStore(all);
    return false;
}

async function updateArticleEngagement(slug, updater) {
    const key = String(slug || '').trim();
    if (!key) return null;
    const current = await fetchArticleEngagement(key);
    const next = updater ? updater(current) : current;
    await saveArticleEngagement(key, next);
    return next;
}

function renderArticleComments(comments) {
    const listEl = document.getElementById('articleCommentsList');
    if (!listEl) return;
    const arr = Array.isArray(comments) ? comments : [];
    if (!arr.length) {
        listEl.innerHTML = '<p class="description-para">Aucun commentaire pour le moment.</p>';
        return;
    }
    const canModerate = isAdminUnlocked();
    listEl.innerHTML = arr.map(function (c, idx) {
        const cid = c && c.id ? String(c.id) : `legacy-${idx}`;
        const deleteBtn = canModerate
            ? `<button type="button" class="article-comment-delete" data-comment-id="${escapeAttr(cid)}" title="Supprimer ce commentaire"><i class="fas fa-trash"></i></button>`
            : '';
        return `
            <div class="article-comment-item">
                <div class="article-comment-head">
                    <strong>${escapeHtml(c.name || 'Lecteur')}</strong>
                    <span>${escapeHtml(c.date || '')}</span>
                    ${deleteBtn}
                </div>
                <div>${escapeHtml(c.text || '')}</div>
            </div>
        `;
    }).join('');
}

async function renderReaderEngagement(slug) {
    const likeCountEl = document.getElementById('articleLikeCount');
    const reactionsWrap = document.getElementById('articleReactions');
    const data = await fetchArticleEngagement(slug);
    if (likeCountEl) likeCountEl.textContent = String(data.likes || 0);
    if (reactionsWrap) {
        reactionsWrap.querySelectorAll('.reaction-btn[data-emoji]').forEach(function (btn) {
            const emoji = btn.getAttribute('data-emoji');
            const count = data.reactions && data.reactions[emoji] ? data.reactions[emoji] : 0;
            btn.setAttribute('title', count > 0 ? `${emoji} ${count}` : emoji);
        });
    }
    renderArticleComments(data.comments || []);
}

/**
 * Contenu markdown principal (admin / JSON : souvent `content`, parfois `body` selon la source).
 */
function getArticleInternalBody(article) {
    if (!article || typeof article !== 'object') return '';
    const c = article.content;
    if (c != null && String(c).trim()) return String(c).trim();
    const b = article.body;
    if (b != null && String(b).trim()) return String(b).trim();
    return '';
}

function articleContentHtml(article) {
    const full = getArticleInternalBody(article);
    if (full) return markdownToHtml(full);
    const legacy = article && article.description && String(article.description).trim() ? String(article.description).trim() : '';
    if (legacy) return markdownToHtml(legacy);
    return '<p class="description-para article-empty-state">Le contenu de cet article n’est pas encore disponible.</p>';
}

function setArticleReaderPageOpen(isOpen) {
    const page = document.getElementById('articlePageSection');
    if (!page) return;
    if (isOpen) {
        const header = document.getElementById('siteHeader');
        if (header && header.parentNode && header.nextElementSibling !== page) {
            header.insertAdjacentElement('afterend', page);
        }
    }
    page.style.display = isOpen ? '' : 'none';
    document.body.classList.toggle('article-page-open', !!isOpen);
    if (isOpen) window.scrollTo({ top: 0, behavior: 'auto' });
}

function initArticleReaderModal() {
    const page = document.getElementById('articlePageSection');
    if (!page) return;
    const closeBtn = document.getElementById('articleReaderClose');
    if (closeBtn) {
        closeBtn.addEventListener('click', function (e) {
            e.preventDefault();
            closeArticleReaderModal(true);
        });
    }
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeArticleReaderModal(true);
    });
    const shareBtn = document.getElementById('articleReaderShareBtn');
    const shareLinkEl = document.getElementById('articleReaderShareLink');
    const likeBtn = document.getElementById('articleLikeBtn');
    const reactionsWrap = document.getElementById('articleReactions');
    const commentForm = document.getElementById('articleCommentForm');
    const commentInput = document.getElementById('articleCommentInput');
    const commentName = document.getElementById('articleCommentName');
    const commentsList = document.getElementById('articleCommentsList');
    if (shareBtn) {
        shareBtn.addEventListener('click', async function () {
            const url = shareBtn.getAttribute('data-share-url') || window.location.href;
            try {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    await navigator.clipboard.writeText(url);
                    showToast('Lien copié !', 'success');
                }
            } catch (err) {
                showToast('Impossible de copier automatiquement.', 'info');
            }
        });
    }
    if (shareLinkEl) {
        shareLinkEl.addEventListener('click', function () {
            shareLinkEl.select();
        });
    }
    if (likeBtn) {
        likeBtn.addEventListener('click', function () {
            if (!currentReaderArticleSlug) return;
            updateArticleEngagement(currentReaderArticleSlug, function (state) {
                return Object.assign({}, state, { likes: (state.likes || 0) + 1 });
            }).then(function () {
                renderReaderEngagement(currentReaderArticleSlug);
            });
        });
    }
    if (reactionsWrap) {
        reactionsWrap.addEventListener('click', function (e) {
            const btn = e.target.closest('.reaction-btn[data-emoji]');
            if (!btn || !currentReaderArticleSlug) return;
            const emoji = btn.getAttribute('data-emoji');
            updateArticleEngagement(currentReaderArticleSlug, function (state) {
                const reactions = Object.assign({}, state.reactions || {});
                reactions[emoji] = (reactions[emoji] || 0) + 1;
                return Object.assign({}, state, { reactions: reactions });
            }).then(function () {
                renderReaderEngagement(currentReaderArticleSlug);
            });
        });
    }
    if (commentForm) {
        commentForm.addEventListener('submit', function (e) {
            e.preventDefault();
            if (!currentReaderArticleSlug) return;
            const txt = commentInput ? commentInput.value.trim() : '';
            if (!txt) return;
            const name = commentName && commentName.value.trim() ? commentName.value.trim() : 'Lecteur';
            const date = new Date().toLocaleString();
            updateArticleEngagement(currentReaderArticleSlug, function (state) {
                const comments = Array.isArray(state.comments) ? state.comments.slice() : [];
                comments.unshift({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8), name: name, text: txt, date: date });
                return Object.assign({}, state, { comments: comments.slice(0, 100) });
            }).then(function () {
                renderReaderEngagement(currentReaderArticleSlug);
            });
            if (commentInput) commentInput.value = '';
            showToast('Commentaire publié.', 'success');
        });
    }
    if (commentsList) {
        commentsList.addEventListener('click', function (e) {
            const btn = e.target.closest('.article-comment-delete[data-comment-id]');
            if (!btn || !currentReaderArticleSlug) return;
            if (!isAdminUnlocked()) {
                showToast('Mode admin requis pour modérer.', 'info');
                return;
            }
            const commentId = btn.getAttribute('data-comment-id');
            updateArticleEngagement(currentReaderArticleSlug, function (state) {
                const comments = Array.isArray(state.comments) ? state.comments.slice() : [];
                const next = comments.filter(function (c, idx) {
                    const cid = c && c.id ? String(c.id) : `legacy-${idx}`;
                    return cid !== commentId;
                });
                return Object.assign({}, state, { comments: next });
            }).then(function () {
                renderReaderEngagement(currentReaderArticleSlug);
                showToast('Commentaire supprimé.', 'success');
            });
        });
    }
}

/**
 * Ouverture du lecteur au clic (délégation : évite les soucis de sélecteur CSS / slug et les re-rendus).
 */
function initArticleListClickDelegation() {
    const list = document.getElementById('articlesList');
    if (!list || list.dataset.articleDelegationBound === '1') return;
    list.dataset.articleDelegationBound = '1';
    list.addEventListener('click', function (e) {
        const a = e.target.closest('a.article-link-internal[data-article-slug]');
        if (!a || !list.contains(a)) return;
        e.preventDefault();
        const slugAttr = a.getAttribute('data-article-slug');
        if (!slugAttr || !Array.isArray(currentArticlesData)) return;
        const normalized = normalizeArticleSlug(slugAttr);
        const article = currentArticlesData.find(function (art) {
            return getArticleCanonicalSlug(art) === normalized;
        });
        if (!article || !getArticleInternalBody(article)) return;
        openArticleReaderModal(article, true);
    });
}

function openArticleReaderModal(article, pushHistory) {
    const page = document.getElementById('articlePageSection');
    const titleEl = document.getElementById('articleReaderTitle');
    const dateEl = document.getElementById('articleReaderDate');
    const bodyEl = document.getElementById('articleReaderBody');
    const shareBtn = document.getElementById('articleReaderShareBtn');
    const shareLinkEl = document.getElementById('articleReaderShareLink');
    const closeBtn = document.getElementById('articleReaderClose');
    if (!page || !titleEl || !bodyEl) return;
    articleReaderReturnFocus = document.activeElement;
    titleEl.textContent = article.title || '';
    const dateText = article.date ? formatDate(article.date) : '';
    const authorText = article.author ? ('Par ' + article.author) : '';
    dateEl.textContent = [dateText, authorText].filter(Boolean).join(' - ');
    const img = article.image
        ? `<img src="${escapeAttr(article.image)}" alt="${escapeAttr(article.title || 'Article')}" class="article-cover-image" decoding="async" fetchpriority="high">`
        : '';
    bodyEl.innerHTML = `${img}${articleContentHtml(article)}`;
    const shareUrl = getArticleShareUrl(article);
    if (shareBtn) shareBtn.setAttribute('data-share-url', shareUrl);
    if (shareLinkEl) shareLinkEl.value = shareUrl;
    currentReaderArticleSlug = getArticleCanonicalSlug(article);
    renderReaderEngagement(currentReaderArticleSlug);
    setArticleReaderPageOpen(true);
    if (pushHistory) {
        history.pushState({ articleSlug: getArticleCanonicalSlug(article) }, '', shareUrl);
    }
    if (closeBtn) closeBtn.focus();
}

function closeArticleReaderModal(popHistory) {
    const page = document.getElementById('articlePageSection');
    if (!page || page.style.display === 'none') return;
    setArticleReaderPageOpen(false);
    const bodyEl = document.getElementById('articleReaderBody');
    if (bodyEl) bodyEl.innerHTML = '';
    currentReaderArticleSlug = null;
    if (popHistory) {
        const url = new URL(window.location.href);
        if (url.searchParams.has('article')) {
            url.searchParams.delete('article');
            history.pushState({}, '', url.pathname + (url.search ? '?' + url.searchParams.toString() : '') + url.hash);
        }
    }
    const ref = articleReaderReturnFocus;
    articleReaderReturnFocus = null;
    if (ref && typeof ref.focus === 'function') {
        try { ref.focus(); } catch (e) { /* ignore */ }
    }
}

function tryOpenArticleFromUrl() {
    const raw = new URL(window.location.href).searchParams.get('article');
    if (!raw || !Array.isArray(currentArticlesData) || currentArticlesData.length === 0) return;
    const normalized = normalizeArticleSlug(raw);
    let match = currentArticlesData.find(function (a) {
        return getArticleCanonicalSlug(a) === normalized;
    });
    if (!match) {
        match = currentArticlesData.find(function (a) {
            return slugifyArticleTitle(a.title || '') === normalized;
        });
    }
    if (match && getArticleInternalBody(match)) {
        openArticleReaderModal(match, false);
    } else {
        setArticleReaderPageOpen(false);
    }
}

function projectTechIconClass(tech) {
    const t = String(tech).toLowerCase();
    if (t.includes('react')) return 'fab fa-react';
    if (t.includes('vue')) return 'fab fa-vuejs';
    if (t.includes('angular')) return 'fab fa-angular';
    if (t.includes('node')) return 'fab fa-node-js';
    if (t.includes('python')) return 'fab fa-python';
    if (t.includes('figma')) return 'fab fa-figma';
    if (t.includes('html')) return 'fab fa-html5';
    if (t.includes('css') || t.includes('tailwind')) return 'fab fa-css3-alt';
    if (t.includes('javascript') || t === 'js') return 'fab fa-js';
    if (t.includes('typescript') || t === 'ts') return 'fas fa-code';
    if (t.includes('vite')) return 'fas fa-bolt';
    if (t.includes('shadcn')) return 'fas fa-cubes';
    if (t.includes('cardano')) return 'fas fa-coins';
    if (t.includes('supabase')) return 'fas fa-database';
    if (t.includes('github')) return 'fab fa-github';
    if (t.includes('git') && !t.includes('github')) return 'fab fa-git-alt';
    return 'fas fa-layer-group';
}

function createProjectCard(project, projectIndex) {
    const card = document.createElement('div');
    card.className = 'project-card';

    const titleSafe = escapeHtml(project.title);
    const imgSrc = project.image ? escapeAttr(project.image) : '';

    let imageHTML = '<div class="project-image-wrap">';
    if (project.image) {
        imageHTML += `<img src="${imgSrc}" alt="${titleSafe}" class="project-image" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">`;
    }
    imageHTML += `
        <div class="project-image-placeholder" style="display: ${project.image ? 'none' : 'flex'};">
            <i class="fas fa-code"></i>
        </div>
    </div>`;

    const technologies = Array.isArray(project.technologies) ? project.technologies : [];
    const techItems = technologies
        .map(tech => {
            const techSafe = escapeHtml(tech);
            const iconClass = projectTechIconClass(tech);
            return `<span class="project-tech-item"><i class="${iconClass}" aria-hidden="true"></i><span>${techSafe}</span></span>`;
        })
        .join('');

    const t = translations[currentLang] && translations[currentLang].projects ? translations[currentLang].projects : {};
    const codeText = t.viewCode || 'Code';
    const visitText = t.visit || t.viewDemo || 'Visiter';
    const descriptionBtnText = t.descriptionBtn || 'Résumé';

    const hasDemo = !!(project.demo && String(project.demo).trim());
    const hasGh = !!(project.github && String(project.github).trim());
    const primaryUrl = hasDemo ? project.demo : (hasGh ? project.github : '');
    const primaryLabel = hasDemo ? visitText : (hasGh ? codeText : '');
    const hasAbout = !!(project.about && String(project.about).trim());
    const aboutUrlRaw = hasAbout ? String(project.about).trim() : '';
    const aboutEsc = hasAbout ? escapeAttr(aboutUrlRaw) : '';
    const presentationLabel = escapeHtml(t.viewPresentation || 'Présentation');
    const githubUnavailableTip = escapeAttr(t.githubUnavailable || 'Dépôt GitHub non communiqué');

    const rawContrib = resolveProjectTextField(project, 'contributions');
    const contribBodyHtml = rawContrib ? formatDescriptionAsParagraphs(rawContrib) : '';
    const rawDesc = resolveProjectTextField(project, 'description');
    const descBodyHtml = rawDesc ? formatDescriptionAsParagraphs(rawDesc) : '';
    const hasOverviewContent = !!(rawContrib || rawDesc);

    let githubSlot = '';
    if (hasGh) {
        githubSlot = `<a href="${escapeAttr(project.github)}" target="_blank" rel="noopener noreferrer" class="project-github-mini" aria-label="${escapeAttr(codeText)}"><i class="fab fa-github"></i></a>`;
    } else if (hasDemo && !hasGh) {
        githubSlot = `<span class="project-github-mini project-github-mini--disabled" role="img" aria-label="${githubUnavailableTip}" title="${githubUnavailableTip}"><i class="fab fa-github" aria-hidden="true"></i></span>`;
    }

    let presentationSlot = '';
    if (hasAbout) {
        presentationSlot = `<a href="${aboutEsc}" target="_blank" rel="noopener noreferrer" class="project-presentation-btn">
                    <span>${presentationLabel}</span>
                    <i class="fas fa-external-link-alt" aria-hidden="true"></i>
                </a>`;
    }

    let visitSlot = '';
    if (primaryUrl) {
        const hrefEsc = escapeAttr(primaryUrl);
        visitSlot = `<a href="${hrefEsc}" target="_blank" rel="noopener noreferrer" class="project-visit-btn">
                    <span>${escapeHtml(primaryLabel)}</span>
                    <i class="fas fa-external-link-alt" aria-hidden="true"></i>
                </a>`;
    }

    let actionsHTML = '';
    if (githubSlot || presentationSlot || visitSlot) {
        actionsHTML = `${githubSlot}${presentationSlot}${visitSlot}`;
    }

    let footerHTML = '';
    if (hasOverviewContent || actionsHTML) {
        const descBtn = hasOverviewContent
            ? `<button type="button" class="project-desc-toggle" aria-haspopup="dialog">
                    <i class="fas fa-align-left" aria-hidden="true"></i>
                    <span>${escapeHtml(descriptionBtnText)}</span>
                </button>`
            : '';

        const innerFooter = `${descBtn}${descBtn && actionsHTML ? '<span class="project-card-footer-grow" aria-hidden="true"></span>' : ''}${!descBtn && actionsHTML ? '<span class="project-card-footer-grow" aria-hidden="true"></span>' : ''}${actionsHTML ? `<div class="project-card-footer-actions">${actionsHTML}</div>` : ''}`;

        footerHTML = `
            <div class="project-card-footer-wrap">
                <div class="project-card-footer">${innerFooter}</div>
            </div>`;
    }

    card.innerHTML = `
        ${imageHTML}
        <div class="project-content">
            <h3 class="project-title">${titleSafe}</h3>
            <div class="project-tech-row">${techItems}</div>
            ${footerHTML}
        </div>
    `;
    if (Number.isFinite(projectIndex)) {
        card.insertAdjacentHTML('beforeend', `
            <button type="button" class="inline-edit-btn admin-only" data-entity="project" data-index="${projectIndex}" style="display:none;">
                <i class="fas fa-pen"></i>
            </button>
        `);
    }

    const descToggle = card.querySelector('.project-desc-toggle');
    if (descToggle && hasOverviewContent) {
        descToggle.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            openProjectDescriptionModal(project.title, contribBodyHtml, descBodyHtml, project.contributionsTitle);
        });
    }

    return card;
}

// ============================================
// CHARGEMENT DES EXPÉRIENCES
// ============================================

/**
 * Affiche une page d'expériences et met à jour la pagination
 */
function renderExperiencesPage(page) {
    const listEl = document.getElementById('experiencesList');
    if (!listEl || !listEl._allData) return;
    const all = listEl._allData;
    const totalPages = Math.max(1, Math.ceil(all.length / ITEMS_PER_PAGE));
    const currentPage = Math.min(Math.max(1, page), totalPages);
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const slice = all.slice(start, start + ITEMS_PER_PAGE);

    listEl.innerHTML = '';
    slice.forEach((exp, i) => listEl.appendChild(createExperienceItem(exp, start + i)));
    listEl.dataset.currentPage = String(currentPage);
    refreshAdminOnlyVisibility();

    const container = listEl.parentNode;
    let paginationWrap = document.getElementById('experiencesPagination');
    if (paginationWrap && paginationWrap.parentNode) paginationWrap.parentNode.removeChild(paginationWrap);

    if (totalPages <= 1) return;

    const prevText = (translations[currentLang] && translations[currentLang].experiences && translations[currentLang].experiences.previous) ? translations[currentLang].experiences.previous : 'Précédent';
    const nextText = (translations[currentLang] && translations[currentLang].experiences && translations[currentLang].experiences.next) ? translations[currentLang].experiences.next : 'Suivant';

    paginationWrap = document.createElement('div');
    paginationWrap.className = 'pagination-wrap';
    paginationWrap.id = 'experiencesPagination';
    const nav = document.createElement('nav');
    nav.className = 'pagination';
    nav.setAttribute('aria-label', 'Pagination expériences');

    const prevBtn = document.createElement('button');
    prevBtn.type = 'button';
    prevBtn.className = 'pagination-btn pagination-prev';
    prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i> ' + prevText;
    prevBtn.disabled = currentPage === 1;
    prevBtn.addEventListener('click', () => { renderExperiencesPage(currentPage - 1); scrollToSection('experiences'); });

    const pagesContainer = document.createElement('span');
    pagesContainer.className = 'pagination-pages';
    for (let p = 1; p <= totalPages; p++) {
        const bp = document.createElement('button');
        bp.type = 'button';
        bp.className = 'pagination-btn pagination-page' + (p === currentPage ? ' active' : '');
        bp.textContent = p;
        bp.addEventListener('click', () => { renderExperiencesPage(p); scrollToSection('experiences'); });
        pagesContainer.appendChild(bp);
    }

    const nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'pagination-btn pagination-next';
    nextBtn.innerHTML = nextText + ' <i class="fas fa-chevron-right"></i>';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.addEventListener('click', () => { renderExperiencesPage(currentPage + 1); scrollToSection('experiences'); });

    nav.appendChild(prevBtn);
    nav.appendChild(pagesContainer);
    nav.appendChild(nextBtn);
    paginationWrap.appendChild(nav);
    container.appendChild(paginationWrap);
}

/**
 * Charge les expériences depuis experiences.json et localStorage, puis affiche la page 1
 */
async function loadExperiences() {
    const listEl = document.getElementById('experiencesList');
    if (!listEl) return;
    try {
        let all = [];
        let usedSupabase = false;
        if (typeof window.fetchPortfolioBody === 'function') {
            try {
                const remote = await window.fetchPortfolioBody('experiences');
                if (Array.isArray(remote) && remote.length > 0) {
                    all = remote;
                    usedSupabase = true;
                }
            } catch (e) {
                console.warn('Lecture Supabase experiences:', e);
            }
        }
        if (!usedSupabase) {
            let fromFile = [];
            try {
                const response = await fetch('experiences.json');
                if (response.ok) fromFile = await response.json();
            } catch (e) {
                console.warn('experiences.json non disponible.');
            }
            const local = getLocalExperiences();
            all = [...local, ...fromFile];
        }
        if (all.length === 0) {
            currentExperiencesData = [];
            const msg = (translations[currentLang] && translations[currentLang].experiences && translations[currentLang].experiences.noExperiences)
                ? translations[currentLang].experiences.noExperiences
                : 'Aucune expérience renseignée pour le moment.';
            listEl.innerHTML = `<p class="loading">${msg}</p>`;
            listEl._allData = null;
            return;
        }
        currentExperiencesData = all.map(function (e) { return { ...e }; });
        listEl._allData = all;
        renderExperiencesPage(1);
        refreshAdminOnlyVisibility();
    } catch (err) {
        console.error('Erreur chargement expériences:', err);
        listEl.innerHTML = '<p class="loading">Erreur lors du chargement des expériences.</p>';
    }
}

function getLocalExperiences() {
    try {
        const s = localStorage.getItem('portfolio-experiences');
        return s ? JSON.parse(s) : [];
    } catch (e) {
        return [];
    }
}

function saveLocalExperience(experience) {
    const list = getLocalExperiences();
    list.push(experience);
    localStorage.setItem('portfolio-experiences', JSON.stringify(list));
}

function clearLocalExperiences() {
    localStorage.removeItem('portfolio-experiences');
}

function exportExperiences() {
    const local = getLocalExperiences();
    fetch('experiences.json')
        .then(r => r.ok ? r.json() : [])
        .then(fromFile => {
            const all = [...local, ...fromFile];
            const blob = new Blob([JSON.stringify(all, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'experiences.json';
            a.click();
            URL.revokeObjectURL(url);
        })
        .catch(() => {
            const blob = new Blob([JSON.stringify(local, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'experiences.json';
            a.click();
            URL.revokeObjectURL(url);
        });
}

/**
 * Crée un élément DOM pour une expérience
 */
function createExperienceItem(exp, expIndex) {
    const item = document.createElement('div');
    item.className = 'experience-item';
    const period = exp.period ? `<p class="experience-period"><i class="fas fa-calendar-alt"></i> ${exp.period}</p>` : '';
    const link = exp.link
        ? `<a href="${exp.link}" target="_blank" rel="noopener" class="experience-link"><i class="fas fa-external-link-alt"></i> En savoir plus</a>`
        : '';
    const descriptionHtml = formatDescriptionAsParagraphs(exp.description);
    item.innerHTML = `
        <div class="experience-header">
            <h3 class="experience-title">${exp.title}</h3>
            ${exp.organization ? `<span class="experience-org">${exp.organization}</span>` : ''}
        </div>
        ${period}
        <div class="experience-description description-block">${descriptionHtml}</div>
        ${link}
    `;
    if (Number.isFinite(expIndex)) {
        item.insertAdjacentHTML('beforeend', `
            <button type="button" class="inline-edit-btn admin-only" data-entity="experience" data-index="${expIndex}" style="display:none;">
                <i class="fas fa-pen"></i>
            </button>
        `);
    }
    return item;
}

// ============================================
// CHARGEMENT DES ARTICLES
// ============================================

/**
 * Affiche une page d'articles et met à jour la pagination
 */
function renderArticlesPage(page) {
    const listEl = document.getElementById('articlesList');
    if (!listEl || !listEl._allData) return;
    const all = listEl._filteredData || listEl._allData;
    const totalPages = Math.max(1, Math.ceil(all.length / ITEMS_PER_PAGE));
    const currentPage = Math.min(Math.max(1, page), totalPages);
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const slice = all.slice(start, start + ITEMS_PER_PAGE);

    listEl.innerHTML = '';
    slice.forEach((article) => {
        const dataIndex = getArticleDataIndex(article, listEl._allData);
        listEl.appendChild(createArticleItem(article, dataIndex));
    });
    listEl.dataset.currentPage = String(currentPage);
    refreshAdminOnlyVisibility();

    const container = listEl.parentNode;
    let paginationWrap = document.getElementById('articlesPagination');
    if (paginationWrap && paginationWrap.parentNode) paginationWrap.parentNode.removeChild(paginationWrap);

    if (totalPages <= 1) return;

    const prevText = (translations[currentLang] && translations[currentLang].articles && translations[currentLang].articles.previous) ? translations[currentLang].articles.previous : 'Précédent';
    const nextText = (translations[currentLang] && translations[currentLang].articles && translations[currentLang].articles.next) ? translations[currentLang].articles.next : 'Suivant';

    paginationWrap = document.createElement('div');
    paginationWrap.className = 'pagination-wrap';
    paginationWrap.id = 'articlesPagination';
    const nav = document.createElement('nav');
    nav.className = 'pagination';
    nav.setAttribute('aria-label', 'Pagination articles');

    const prevBtn = document.createElement('button');
    prevBtn.type = 'button';
    prevBtn.className = 'pagination-btn pagination-prev';
    prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i> ' + prevText;
    prevBtn.disabled = currentPage === 1;
    prevBtn.addEventListener('click', () => { renderArticlesPage(currentPage - 1); scrollToSection('articles'); });

    const pagesContainer = document.createElement('span');
    pagesContainer.className = 'pagination-pages';
    for (let p = 1; p <= totalPages; p++) {
        const bp = document.createElement('button');
        bp.type = 'button';
        bp.className = 'pagination-btn pagination-page' + (p === currentPage ? ' active' : '');
        bp.textContent = p;
        bp.addEventListener('click', () => { renderArticlesPage(p); scrollToSection('articles'); });
        pagesContainer.appendChild(bp);
    }

    const nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'pagination-btn pagination-next';
    nextBtn.innerHTML = nextText + ' <i class="fas fa-chevron-right"></i>';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.addEventListener('click', () => { renderArticlesPage(currentPage + 1); scrollToSection('articles'); });

    nav.appendChild(prevBtn);
    nav.appendChild(pagesContainer);
    nav.appendChild(nextBtn);
    paginationWrap.appendChild(nav);
    container.appendChild(paginationWrap);
}

/**
 * Charge les articles depuis articles.json et localStorage, puis affiche la page 1
 */
async function loadArticles() {
    const articlesList = document.getElementById('articlesList');
    if (!articlesList) {
        console.error('Élément articlesList non trouvé');
        return;
    }
    try {
        let allArticles = [];
        let usedSupabase = false;
        if (typeof window.fetchPortfolioBody === 'function') {
            try {
                const remote = await window.fetchPortfolioBody('articles');
                if (Array.isArray(remote) && remote.length > 0) {
                    allArticles = mergeArticleListsPreferLocal(getLocalArticles(), remote);
                    usedSupabase = true;
                }
            } catch (e) {
                console.warn('Lecture Supabase articles:', e);
            }
        }
        if (!usedSupabase) {
            const response = await fetch('articles.json');
            let jsonArticles = [];
            if (response.ok) jsonArticles = await response.json();
            const localArticles = getLocalArticles();
            allArticles = [...localArticles, ...jsonArticles];
        }

        if (allArticles.length === 0) {
            currentArticlesData = [];
            const noArticlesText = (translations[currentLang] && translations[currentLang].articles && translations[currentLang].articles.noArticles)
                ? translations[currentLang].articles.noArticles
                : 'Aucun article disponible pour le moment.';
            articlesList.innerHTML = `<p class="loading">${noArticlesText}</p>`;
            articlesList._allData = null;
            return;
        }
        currentArticlesData = allArticles.map(function (a) {
            const clone = { ...a };
            clone.slug = getArticleCanonicalSlug(clone);
            const bodyText = getArticleInternalBody(clone);
            if (!clone.content && bodyText) clone.content = bodyText;
            if (!clone.type) clone.type = bodyText ? 'direct' : 'external';
            clone.category = normalizeArticleCategory(clone.category);
            return clone;
        }).sort(sortArticlesByPublicationDateDesc);
        articlesList._allData = currentArticlesData;
        applyArticleFiltersAndRender(1);
        refreshAdminOnlyVisibility();
        tryOpenArticleFromUrl();
    } catch (error) {
        console.error('Erreur lors du chargement des articles:', error);
        articlesList.innerHTML = `
            <p class="loading" style="color: #ef4444;">
                Erreur lors du chargement des articles. 
                Vérifiez que le fichier articles.json existe et est valide.
            </p>
        `;
    }
}

/**
 * Récupère les articles stockés dans localStorage
 */
function getLocalArticles() {
    try {
        const stored = localStorage.getItem('portfolio-articles');
        return stored ? JSON.parse(stored) : [];
    } catch (error) {
        console.error('Erreur lors de la lecture des articles locaux:', error);
        return [];
    }
}

function setLocalArticles(articles) {
    localStorage.setItem('portfolio-articles', JSON.stringify(Array.isArray(articles) ? articles : []));
}

function ensureArticlesEditableSnapshot() {
    if (!Array.isArray(currentArticlesData) || currentArticlesData.length === 0) return;
    syncArticlesLocalFromCurrent();
}

function normalizeArticleCategory(category) {
    return String(category || '').trim();
}

function ensureArticleCategoryOption(value) {
    const select = document.getElementById('articleCategory');
    const normalized = normalizeArticleCategory(value);
    if (!select || !normalized) return;
    const exists = Array.from(select.options).some(function (opt) {
        return normalizeArticleCategory(opt.value).toLowerCase() === normalized.toLowerCase();
    });
    if (!exists) {
        const option = document.createElement('option');
        option.value = normalized;
        option.textContent = normalized;
        select.appendChild(option);
    }
}

function setupArticleCategorySelect(selectedValue) {
    const select = document.getElementById('articleCategory');
    if (!select) return;
    const current = normalizeArticleCategory(selectedValue);
    const options = ['<option value="">Sélectionner une catégorie</option>'].concat(
        ARTICLE_CATEGORIES.map(function (cat) {
            const selected = current && current.toLowerCase() === cat.toLowerCase() ? ' selected' : '';
            return `<option value="${escapeAttr(cat)}"${selected}>${escapeHtml(cat)}</option>`;
        })
    );
    select.innerHTML = options.join('');
    if (current) {
        ensureArticleCategoryOption(current);
        select.value = current;
    }
}

function sortArticlesByPublicationDateDesc(a, b) {
    const tsA = Date.parse(a && a.date ? a.date : '');
    const tsB = Date.parse(b && b.date ? b.date : '');
    const safeA = Number.isFinite(tsA) ? tsA : 0;
    const safeB = Number.isFinite(tsB) ? tsB : 0;
    if (safeB !== safeA) return safeB - safeA;
    return String((b && b.title) || '').localeCompare(String((a && a.title) || ''), 'fr');
}

function initArticleFilters() {
    const searchInput = document.getElementById('articleSearchInput');
    const categorySelect = document.getElementById('articleCategoryFilter');
    if (searchInput) {
        searchInput.addEventListener('input', function () {
            articleFilterState.query = String(searchInput.value || '').trim().toLowerCase();
            applyArticleFiltersAndRender(1);
        });
    }
    if (categorySelect) {
        categorySelect.addEventListener('change', function () {
            articleFilterState.category = String(categorySelect.value || '').trim().toLowerCase();
            applyArticleFiltersAndRender(1);
        });
    }
}

function applyArticleFiltersAndRender(page) {
    const listEl = document.getElementById('articlesList');
    if (!listEl || !Array.isArray(listEl._allData)) return;
    const query = articleFilterState.query;
    const selectedCategory = articleFilterState.category;
    const filtered = listEl._allData.filter(function (article) {
        const category = normalizeArticleCategory(article.category).toLowerCase();
        if (selectedCategory && category !== selectedCategory) return false;
        if (!query) return true;
        const text = [
            article.title,
            article.author,
            article.category,
            article.description,
            getArticleInternalBody(article)
        ].map(function (v) { return String(v || '').toLowerCase(); }).join(' ');
        return text.indexOf(query) !== -1;
    });
    listEl._filteredData = filtered;
    buildArticleCategoryFilter(listEl._allData);
    if (filtered.length === 0) {
        const noArticlesText = (translations[currentLang] && translations[currentLang].articles && translations[currentLang].articles.noArticles)
            ? translations[currentLang].articles.noArticles
            : 'Aucun article disponible pour le moment.';
        listEl.innerHTML = `<p class="loading">${noArticlesText}</p>`;
        const paginationWrap = document.getElementById('articlesPagination');
        if (paginationWrap && paginationWrap.parentNode) paginationWrap.parentNode.removeChild(paginationWrap);
        return;
    }
    renderArticlesPage(page || 1);
}

function buildArticleCategoryFilter(allArticles) {
    const select = document.getElementById('articleCategoryFilter');
    if (!select) return;
    const categories = Array.from(new Set((allArticles || [])
        .map(function (a) { return normalizeArticleCategory(a.category); })
        .filter(Boolean)))
        .sort(function (a, b) { return a.localeCompare(b, 'fr'); });
    const current = articleFilterState.category;
    const options = ['<option value="">Toutes les catégories</option>']
        .concat(categories.map(function (cat) {
            const value = escapeAttr(cat.toLowerCase());
            const label = escapeHtml(cat);
            const selected = current && current === cat.toLowerCase() ? ' selected' : '';
            return `<option value="${value}"${selected}>${label}</option>`;
        }));
    select.innerHTML = options.join('');
}

function getArticleDataIndex(article, allArticles) {
    if (!Array.isArray(allArticles) || !article) return -1;
    const targetSlug = getArticleCanonicalSlug(article);
    const idxBySlug = allArticles.findIndex(function (a) {
        return getArticleCanonicalSlug(a) === targetSlug;
    });
    if (idxBySlug >= 0) return idxBySlug;
    return allArticles.findIndex(function (a) { return a === article; });
}

/**
 * Sauvegarde un article dans localStorage
 */
function saveLocalArticle(article) {
    const articles = getLocalArticles();
    articles.push(article);
    localStorage.setItem('portfolio-articles', JSON.stringify(articles));
}

/**
 * Supprime tous les articles locaux
 */
function clearLocalArticles() {
    localStorage.removeItem('portfolio-articles');
}

/**
 * Exporte tous les articles (JSON + localStorage) en fichier JSON
 */
function exportArticles() {
    const jsonArticles = [];
    const localArticles = getLocalArticles();
    
    // Essayer de charger les articles du JSON
    fetch('articles.json')
        .then(response => response.json())
        .then(articles => {
            const allArticles = [...localArticles, ...articles];
            const jsonString = JSON.stringify(allArticles, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'articles.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        })
        .catch(() => {
            // Si le fichier JSON n'existe pas, exporter seulement les articles locaux
            const jsonString = JSON.stringify(localArticles, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'articles.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
}

/**
 * Crée un élément d'article à partir des données JSON
 * @param {Object} article - Données de l'article
 * @returns {HTMLElement} - Élément HTML de l'article
 */
function formatArticleRelativeDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const ts = date.getTime();
    if (!Number.isFinite(ts)) return '';
    const now = Date.now();
    const diffMs = Math.max(0, now - ts);
    const minutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMs / 3600000);
    const days = Math.floor(diffMs / 86400000);
    const weeks = Math.floor(days / 7);
    const isEn = currentLang === 'en';
    if (minutes < 1) return isEn ? 'Just now' : 'À l\'instant';
    if (minutes < 60) return isEn ? `${minutes} min ago` : `Il y a ${minutes} min`;
    if (hours < 24) return isEn ? `${hours} hour${hours > 1 ? 's' : ''} ago` : `Il y a ${hours} heure${hours > 1 ? 's' : ''}`;
    if (days < 7) return isEn ? `${days} day${days > 1 ? 's' : ''} ago` : `Il y a ${days} jour${days > 1 ? 's' : ''}`;
    if (weeks < 5) return isEn ? `${weeks} week${weeks > 1 ? 's' : ''} ago` : `Il y a ${weeks} semaine${weeks > 1 ? 's' : ''}`;
    return formatDate(dateString);
}

function createArticleItem(article, articleIndex) {
    const item = document.createElement('article');
    item.className = 'article-item article-card';

    const hasInternalContent = !!getArticleInternalBody(article);
    const articleUrl = hasInternalContent ? getArticleShareUrl(article) : (article.link || '#');
    const titleSafe = escapeHtml(article.title || '');
    const slugAttr = escapeAttr(getArticleCanonicalSlug(article));
    const linkClass = hasInternalContent
        ? 'article-card-link article-link-internal'
        : 'article-card-link';
    const linkTarget = hasInternalContent
        ? `href="${escapeAttr(articleUrl)}" class="${linkClass}" data-article-slug="${slugAttr}"`
        : `href="${escapeAttr(article.link || '#')}" class="${linkClass}" target="_blank" rel="noopener noreferrer"`;

    let mediaHTML = '<div class="article-card-media">';
    if (article.image) {
        mediaHTML += `<img src="${escapeAttr(article.image)}" alt="${titleSafe}" class="article-card-image" loading="lazy" decoding="async" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">`;
    }
    mediaHTML += `<div class="article-card-placeholder" style="display: ${article.image ? 'none' : 'flex'};" aria-hidden="true"><i class="fas fa-newspaper"></i></div>`;
    if (article.category) {
        mediaHTML += `<span class="article-card-badge">${escapeHtml(article.category)}</span>`;
    }
    mediaHTML += '</div>';

    const authorPrefix = currentLang === 'en' ? 'By' : 'Par';
    const metaParts = [];
    if (article.author) {
        metaParts.push(`<span class="article-card-author">${authorPrefix} ${escapeHtml(article.author)}</span>`);
    }
    if (article.date) {
        metaParts.push(`<span class="article-card-date">${escapeHtml(formatArticleRelativeDate(article.date))}</span>`);
    }
    const metaHTML = metaParts.length
        ? `<div class="article-card-meta">${metaParts.join('<span class="article-card-meta-sep" aria-hidden="true">·</span>')}</div>`
        : '';

    item.innerHTML = `
        <a ${linkTarget}>
            ${mediaHTML}
            <div class="article-card-body">
                <h3 class="article-card-title">${titleSafe}</h3>
                ${metaHTML}
            </div>
        </a>
    `;
    if (Number.isFinite(articleIndex)) {
        item.insertAdjacentHTML('beforeend', `
            <button type="button" class="inline-edit-btn admin-only" data-entity="article" data-index="${articleIndex}" style="display:none;">
                <i class="fas fa-pen"></i>
            </button>
            <button type="button" class="inline-edit-btn inline-delete-btn admin-only" data-entity="article-delete" data-index="${articleIndex}" style="display:none;">
                <i class="fas fa-trash"></i>
            </button>
        `);
    }
    
    return item;
}

// ============================================
// FORMULAIRE DE CONTACT
// ============================================

/**
 * Initialise le formulaire de contact
 */
function initContactForm() {
    const contactForm = document.getElementById('contactForm');
    
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            handleContactFormSubmit(this);
        });
    }
}

/**
 * Gère la soumission du formulaire de contact
 * Utilise Formspree si FORMSPREE_FORM_ID est défini, sinon mailto vers CONTACT_EMAIL.
 * @param {HTMLFormElement} form - Le formulaire
 */
function handleContactFormSubmit(form) {
    const formData = new FormData(form);
    const submitButton = form.querySelector('button[type="submit"]');
    const originalText = submitButton.innerHTML;
    
    function setLoading(loading) {
        submitButton.disabled = loading;
        if (loading) {
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Envoi...';
        } else {
            submitButton.innerHTML = originalText;
        }
    }
    
    if (FORMSPREE_FORM_ID) {
        setLoading(true);
        // Extraire uniquement l'ID si l'URL complète a été collée (ex: https://formspree.io/f/mjgearjz -> mjgearjz)
        const formId = String(FORMSPREE_FORM_ID).trim().replace(/^https?:\/\/formspree\.io\/f\//i, '').split(/[\/?#]/)[0] || '';
        if (!formId) {
            setLoading(false);
            showToast('Configuration Formspree invalide. Utilisez l\'email direct.', 'info');
            return;
        }
        const body = new FormData(form);
        body.append('_replyto', formData.get('email'));
        body.append('_subject', formData.get('subject'));
        fetch('https://formspree.io/f/' + formId, {
            method: 'POST',
            body: body,
            headers: { 'Accept': 'application/json' }
        })
            .then(async (response) => {
                const data = await response.json().catch(() => ({}));
                if (response.ok) {
                    form.reset();
                    showToast('Message envoyé ! Vous recevrez une réponse sous peu.', 'success');
                } else {
                    const msg = (data && data.error) ? data.error : 'Erreur ' + response.status;
                    throw new Error(msg);
                }
            })
            .catch((err) => {
                const message = err && err.message && !err.message.startsWith('Erreur envoi') ? err.message : 'Erreur lors de l\'envoi. Réessayez ou contactez-moi par email.';
                showToast(message, 'info');
            })
            .finally(() => setLoading(false));
        return;
    }
    
    // Fallback : mailto (ouvre le client mail avec le message prérempli)
    const name = encodeURIComponent(formData.get('name') || '');
    const email = encodeURIComponent(formData.get('email') || '');
    const subject = encodeURIComponent(formData.get('subject') || '');
    const message = encodeURIComponent(
        (formData.get('message') || '') + '\n\n--\nEnvoyé depuis le formulaire portfolio\nDe: ' + (formData.get('name') || '') + ' <' + (formData.get('email') || '') + '>'
    );
    const mailtoUrl = 'mailto:' + CONTACT_EMAIL + '?subject=' + subject + '&body=' + message;
    form.reset();
    window.location.href = mailtoUrl;
    showToast('Ouverture de votre client mail. Si rien ne s\'ouvre, écrivez à ' + CONTACT_EMAIL, 'info');
    setTimeout(() => {
        submitButton.innerHTML = originalText;
        submitButton.disabled = false;
    }, 1500);
    
    // Pour recevoir les messages directement par email sans ouvrir le client du visiteur :
    // 1. Créez un compte sur formspree.io, 2. Créez un formulaire (email = CONTACT_EMAIL),
    // 3. Copiez l'ID du formulaire (ex: xjvqklop) et assignez-le à FORMSPREE_FORM_ID ci-dessus.
}

// ============================================
// APERÇU DU CV
// ============================================

/**
 * Initialise l'aperçu du CV : bouton "Voir le CV" pour afficher/masquer l'aperçu, téléchargement
 */
function initCVPreview() {
    const cvPreview = document.getElementById('cvPreview');
    const cvPreviewContainer = document.getElementById('cvPreviewContainer');
    const toggleBtn = document.getElementById('toggleCvPreviewBtn');
    const downloadCvBtn = document.getElementById('downloadCvBtn');
    
    const cvFileName = 'CV Olivier.pdf';
    const cvPath = `assets/cv/${cvFileName}`;
    const encodedPath = cvPath.replace(/ /g, '%20');
    const cvFullUrl = new URL(cvPath, window.location.href).href;
    
    if (downloadCvBtn) {
        downloadCvBtn.href = cvFullUrl;
        downloadCvBtn.download = cvFileName;
        downloadCvBtn.addEventListener('click', function(e) {
            fetch(encodedPath)
                .then(response => response.blob())
                .then(blob => {
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = cvFileName;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);
                })
                .catch(() => {});
        });
    }
    
    const cvOpenInNewTab = document.getElementById('cvOpenInNewTab');
    if (cvOpenInNewTab) cvOpenInNewTab.href = cvFullUrl;
    
    if (toggleBtn && cvPreviewContainer && cvPreview) {
        toggleBtn.addEventListener('click', function() {
            const isVisible = cvPreviewContainer.style.display !== 'none';
            const viewText = (translations[currentLang] && translations[currentLang].cv && translations[currentLang].cv.view) ? translations[currentLang].cv.view : 'Voir le CV';
            const hideText = (translations[currentLang] && translations[currentLang].cv && translations[currentLang].cv.hide) ? translations[currentLang].cv.hide : 'Masquer le CV';
            if (!isVisible) {
                if (!cvPreview.src) cvPreview.src = cvFullUrl;
                cvPreviewContainer.style.display = 'block';
                toggleBtn.querySelector('span').textContent = hideText;
                toggleBtn.querySelector('i').className = 'fas fa-eye-slash';
            } else {
                cvPreviewContainer.style.display = 'none';
                toggleBtn.querySelector('span').textContent = viewText;
                toggleBtn.querySelector('i').className = 'fas fa-eye';
            }
        });
    }
}

// ============================================
// VÉRIFICATION DE L'IMAGE DE PROFIL
// ============================================

/**
 * Vérifie si l'image de profil existe, sinon affiche le placeholder
 */
function checkProfileImage() {
    const profileImage = document.getElementById('profileImage');
    const profilePlaceholder = document.getElementById('profilePlaceholder');
    
    if (profileImage && profilePlaceholder) {
        profileImage.onerror = function() {
            this.style.display = 'none';
            profilePlaceholder.style.display = 'flex';
        };
        
        // Vérifier si l'image existe
        const img = new Image();
        img.onload = function() {
            profileImage.style.display = 'block';
            profilePlaceholder.style.display = 'none';
        };
        img.onerror = function() {
            profileImage.style.display = 'none';
            profilePlaceholder.style.display = 'flex';
        };
        img.src = profileImage.src;
    }
}

// ============================================
// UTILITAIRES
// ============================================

/**
 * Fonction utilitaire pour formater les dates
 * @param {string} dateString - Date au format ISO
 * @returns {string} - Date formatée
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// ============================================
// CHARGEMENT DES COMPÉTENCES
// ============================================

function createEmptySkillsData() {
    return {
        frontend: [],
        backend: [],
        blockchain: [],
        tools: [],
        certifications: []
    };
}

function cloneSkillsData(data) {
    const normalized = normalizeSkillsData(data);
    const out = createEmptySkillsData();
    SKILL_CATEGORIES.forEach(function (cat) {
        out[cat] = normalized[cat].map(function (item) { return { ...item }; });
    });
    return out;
}

function hasAnySkills(data) {
    const normalized = normalizeSkillsData(data);
    return SKILL_CATEGORIES.some(function (cat) {
        return normalized[cat].length > 0;
    });
}

function normalizeSkillsData(raw) {
    const base = createEmptySkillsData();
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return base;
    SKILL_CATEGORIES.forEach(function (cat) {
        base[cat] = Array.isArray(raw[cat]) ? raw[cat] : [];
    });
    return base;
}

function getLocalSkills() {
    try {
        const stored = localStorage.getItem(SKILLS_STORAGE_KEY);
        if (!stored) return createEmptySkillsData();
        return normalizeSkillsData(JSON.parse(stored));
    } catch (e) {
        return createEmptySkillsData();
    }
}

function setLocalSkills(data) {
    localStorage.setItem(SKILLS_STORAGE_KEY, JSON.stringify(normalizeSkillsData(data)));
}

function clearLocalSkills() {
    localStorage.removeItem(SKILLS_STORAGE_KEY);
}

function saveLocalSkillEntry(category, skill) {
    const all = getLocalSkills();
    if (!SKILL_CATEGORIES.includes(category)) return;
    all[category].push(skill);
    setLocalSkills(all);
}

function ensureSkillsEditableSnapshot() {
    const local = getLocalSkills();
    if (hasAnySkills(local)) {
        currentSkillsData = cloneSkillsData(local);
        return currentSkillsData;
    }
    const seeded = cloneSkillsData(currentSkillsData);
    if (hasAnySkills(seeded)) {
        setLocalSkills(seeded);
    }
    return seeded;
}

function exportSkills() {
    mergeSkillsFromSources()
        .then(function (all) {
            const blob = new Blob([JSON.stringify(all, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'skills.json';
            a.click();
            URL.revokeObjectURL(url);
        })
        .catch(function () {
            const blob = new Blob([JSON.stringify(getLocalSkills(), null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'skills.json';
            a.click();
            URL.revokeObjectURL(url);
        });
}

/**
 * Charge les compétences depuis skills.json et les affiche avec des barres de progression
 */
async function loadSkills() {
    const skillCategories = {
        'skillsFrontend': 'frontend',
        'skillsBackend': 'backend',
        'skillsBlockchain': 'blockchain',
        'skillsTools': 'tools',
        'skillsCertifications': 'certifications'
    };
    
    try {
        let skillsData = null;
        let usedSupabase = false;
        if (typeof window.fetchPortfolioBody === 'function') {
            try {
                const remote = await window.fetchPortfolioBody('skills');
                if (remote && typeof remote === 'object' && !Array.isArray(remote)) {
                    skillsData = normalizeSkillsData(remote);
                    usedSupabase = true;
                }
            } catch (e) {
                console.warn('Lecture Supabase skills:', e);
            }
        }
        if (!usedSupabase) {
            skillsData = await mergeSkillsFromSources();
        }
        skillsData = normalizeSkillsData(skillsData);
        currentSkillsData = cloneSkillsData(skillsData);
        
        // Charger chaque catégorie
        for (const [elementId, categoryKey] of Object.entries(skillCategories)) {
            const container = document.getElementById(elementId);
            if (!container) continue;
            
            const skills = skillsData[categoryKey];
            if (!skills || skills.length === 0) {
                container.innerHTML = '<p class="loading">Aucune compétence disponible.</p>';
                continue;
            }
            
            container.innerHTML = '';
            skills.forEach((skill, index) => {
                const skillElement = createSkillItem(skill);
                const wrap = document.createElement('div');
                wrap.className = 'skill-admin-wrap';
                wrap.appendChild(skillElement);
                wrap.insertAdjacentHTML('beforeend', `
                    <button type="button" class="inline-edit-btn inline-edit-btn--skill admin-only" data-entity="skill" data-category="${categoryKey}" data-index="${index}" style="display:none;">
                        <i class="fas fa-pen"></i>
                    </button>
                `);
                container.appendChild(wrap);
            });
        }
        refreshAdminOnlyVisibility();
        
    } catch (error) {
        console.error('Erreur lors du chargement des compétences:', error);
        // Afficher un message d'erreur dans tous les conteneurs
        Object.keys(skillCategories).forEach(elementId => {
            const container = document.getElementById(elementId);
            if (container) {
                container.innerHTML = '<p class="loading" style="color: #ef4444;">Erreur lors du chargement des compétences.</p>';
            }
        });
    }
}

/**
 * Crée un élément de compétence premium (sans pourcentage affiché) ; si skill.link est défini, toute la carte est cliquable.
 * @param {Object} skill - Données de la compétence (name, icon, level, link?)
 * @returns {HTMLElement} - Élément HTML de la compétence (a ou div)
 */
function createSkillItem(skill) {
    const hasLink = skill.link && typeof skill.link === 'string' && skill.link.trim() !== '';
    const isCertified = !!skill.certification;
    const safeLevel = Number.isFinite(Number(skill.level)) ? Math.max(0, Math.min(100, Number(skill.level))) : 0;
    const tag = hasLink ? 'a' : 'div';
    const skillItem = document.createElement(tag);
    skillItem.className = 'skill-item' + (hasLink ? ' skill-item--link' : '') + (isCertified ? ' skill-item--certified' : '');
    skillItem.style.setProperty('--skill-level', safeLevel + '%');
    if (hasLink) {
        skillItem.href = skill.link.trim();
        skillItem.target = '_blank';
        skillItem.rel = 'noopener noreferrer';
        skillItem.setAttribute('title', 'Ouvrir ' + skill.name);
    }
    const certifiedText = (translations[currentLang] && translations[currentLang].skills && translations[currentLang].skills.certified) ? translations[currentLang].skills.certified : 'Certifié';
    const badgeText = isCertified ? certifiedText : '';
    skillItem.innerHTML = `
        <span class="skill-item-icon"><i class="${skill.icon}" aria-hidden="true"></i></span>
        <span class="skill-name">${skill.name}</span>
        <span class="skill-meter" aria-hidden="true"><span class="skill-meter-fill"></span></span>
        ${isCertified ? `<span class="skill-badge">${badgeText}</span>` : ''}
        ${hasLink ? '<i class="fas fa-external-link-alt skill-item-external" aria-hidden="true"></i>' : ''}
    `;
    return skillItem;
}


// ============================================
// ANIMATIONS AU SCROLL
// ============================================

/**
 * Initialise les animations au scroll pour les éléments
 */
function initScrollAnimations() {
    // Sélectionner tous les éléments à animer
    const animatedElements = document.querySelectorAll('.section, .skill-category, .project-card, .article-item, .experience-item, .service-card');
    
    
    // Créer un Intersection Observer pour détecter quand les éléments entrent dans la vue
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                // Ajouter un délai progressif pour un effet en cascade
                setTimeout(() => {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                    
                    // Ajouter une classe pour les animations spécifiques
                    if (entry.target.classList.contains('skill-category')) {
                        entry.target.style.animation = 'fadeInScale 0.6s ease forwards';
                    } else if (entry.target.classList.contains('project-card')) {
                        entry.target.style.animation = `zoomIn 0.6s ease forwards ${index * 0.1}s`;
                    } else if (entry.target.classList.contains('service-card')) {
                        entry.target.style.animation = `fadeInUp 0.55s ease forwards ${index * 0.05}s`;
                    } else if (entry.target.classList.contains('article-item')) {
                        const isEven = Array.from(entry.target.parentElement.children).indexOf(entry.target) % 2 === 0;
                        entry.target.style.animation = isEven 
                            ? 'slideInLeft 0.6s ease forwards' 
                            : 'slideInRight 0.6s ease forwards';
                    } else if (entry.target.classList.contains('experience-item')) {
                        entry.target.style.animation = 'slideInLeft 0.6s ease forwards';
                    }
                }, index * 100);
                
                // Ne plus observer cet élément une fois animé
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });
    
    // Observer tous les éléments
    animatedElements.forEach((element, index) => {
        // Initialiser l'état invisible
        element.style.opacity = '0';
        element.style.transform = 'translateY(30px)';
        element.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        
        observer.observe(element);
    });
    
    // Animation spéciale pour l'image de profil
    const aboutImage = document.querySelector('.about-image');
    if (aboutImage) {
        const imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.animation = 'fadeInScale 0.8s ease forwards';
                    imageObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.3 });
        
        imageObserver.observe(aboutImage);
    }
}

// ============================================
// SYSTÈME DE TRADUCTION
// ============================================
// Les variables translations et currentLang sont déjà déclarées en haut du fichier

/**
 * Phrases du sous-titre hero (rotation une ligne à la fois).
 * @param {string} lang
 * @returns {string[]}
 */
function getHeroSubtitleRotate(lang) {
    const pack = translations[lang];
    const rotate = pack && pack.hero && pack.hero.subtitleRotate;
    if (!Array.isArray(rotate) || !rotate.length) {
        return [];
    }
    return rotate.filter(function(p) {
        return typeof p === 'string' && p.trim().length;
    });
}

function stopHeroTypewriter() {
    if (heroTypewriterTimerId !== null) {
        clearTimeout(heroTypewriterTimerId);
        heroTypewriterTimerId = null;
    }
    if (heroRotateDelayId !== null) {
        clearTimeout(heroRotateDelayId);
        heroRotateDelayId = null;
    }
}

/**
 * Machine à écrire + rotation continue : chaque phrase sur une seule ligne, puis pause puis suivante.
 */
function startHeroTypewriter(lang) {
    const el = document.getElementById('heroTypewriter');
    if (!el) return;
    stopHeroTypewriter();

    const phrases = getHeroSubtitleRotate(lang);
    el.setAttribute('aria-label', phrases.join(' — '));
    el.classList.remove('hero-typewriter--final');
    el.replaceChildren();

    if (!phrases.length) {
        return;
    }

    let phraseIndex = 0;
    const stepMs = 175;

    function scheduleNextPhrase() {
        heroRotateDelayId = setTimeout(function() {
            heroRotateDelayId = null;
            phraseIndex = (phraseIndex + 1) % phrases.length;
            el.classList.remove('hero-typewriter--final');
            el.replaceChildren();
            beginPhraseTypewriter(phrases[phraseIndex]);
        }, HERO_ROTATE_PAUSE_MS);
    }

    function beginPhraseTypewriter(full) {
        const cursorEl = document.createElement('span');
        cursorEl.className = 'hero-role-cursor';
        cursorEl.setAttribute('aria-hidden', 'true');
        el.appendChild(cursorEl);
        syncHeroRoleLineToNameWidthSoon();

        const chars = Array.from(full);
        let i = 0;

        function tick() {
            if (i >= chars.length) {
                heroTypewriterTimerId = null;
                finalizeHeroTypewriterPlainText(el, full);
                syncHeroRoleLineToNameWidthSoon();
                scheduleNextPhrase();
                return;
            }
            const span = document.createElement('span');
            span.className = 'hero-typewriter-char';
            span.setAttribute('aria-hidden', 'true');
            span.textContent = chars[i];
            el.insertBefore(span, cursorEl);
            i++;
            heroTypewriterTimerId = setTimeout(tick, stepMs);
        }

        heroTypewriterTimerId = setTimeout(tick, 450);
    }

    beginPhraseTypewriter(phrases[0]);
}

/**
 * Initialise le système de traduction
 */
async function initTranslations() {
    try {
        const response = await fetch('translations.json');
        if (!response.ok) {
            throw new Error('Impossible de charger les traductions');
        }
        translations = await response.json();
        
        // Appliquer la langue sauvegardée
        changeLanguage(currentLang);
    } catch (error) {
        console.error('Erreur lors du chargement des traductions:', error);
    }
}

/**
 * Change la langue du portfolio
 * @param {string} lang - Code de la langue ('fr' ou 'en')
 */
function changeLanguage(lang) {
    if (!translations[lang]) {
        console.error(`Langue non supportée: ${lang}`);
        return;
    }
    
    currentLang = lang;
    localStorage.setItem('portfolio-lang', lang);
    
    // Mettre à jour l'attribut lang du HTML
    document.documentElement.lang = lang;
    const htmlLang = document.getElementById('htmlLang');
    if (htmlLang) {
        htmlLang.lang = lang;
    }
    
    // Mettre à jour tous les éléments avec data-i18n
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        const keys = key.split('.');
        let value = translations[lang];
        
        // Naviguer dans l'objet de traduction
        for (const k of keys) {
            if (value && value[k]) {
                value = value[k];
            } else {
                value = null;
                break;
            }
        }
        
        if (value) {
            // Si l'élément contient des icônes, préserver le HTML
            if (element.innerHTML.includes('<i class=') || element.innerHTML.includes('<i class="')) {
                const iconMatch = element.innerHTML.match(/<i[^>]*>.*?<\/i>/);
                if (iconMatch) {
                    element.innerHTML = iconMatch[0] + ' ' + value;
                } else {
                    element.textContent = value;
                }
            } else {
                element.textContent = value;
            }
        }
    });
    
    // Mettre à jour l'indicateur de langue
    const currentLangSpan = document.getElementById('currentLang');
    if (currentLangSpan) {
        currentLangSpan.textContent = lang.toUpperCase();
    }
    
    // Fermer le menu déroulant
    const langDropdown = document.getElementById('langDropdown');
    const langBtnClose = document.getElementById('langBtn');
    if (langDropdown) {
        langDropdown.classList.remove('active');
    }
    if (langBtnClose) {
        langBtnClose.setAttribute('aria-expanded', 'false');
        langBtnClose.closest('.language-selector')?.classList.remove('is-open');
    }

    // Mettre à jour le libellé du bouton de thème selon la langue
    const activeTheme = document.body.getAttribute('data-theme') || 'light';
    applyTheme(activeTheme);
    
    // Recharger les projets, expériences et articles pour mettre à jour les textes dynamiques
    loadProjects();
    loadExperiences();
    loadArticles();
    syncHeaderStackHeight();
    requestAnimationFrame(function() {
        syncHeroRoleLineToNameWidthSoon();
    });
    startHeroTypewriter(lang);
}

/**
 * Initialise le sélecteur de langue
 */
function initLanguageSelector() {
    const langBtn = document.getElementById('langBtn');
    const langDropdown = document.getElementById('langDropdown');
    const langOptions = document.querySelectorAll('.lang-option');
    
    // Toggle du menu déroulant
    if (langBtn && langDropdown) {
        langBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            langDropdown.classList.toggle('active');
            const open = langDropdown.classList.contains('active');
            langBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
            langBtn.closest('.language-selector')?.classList.toggle('is-open', open);
        });
        
        // Fermer le menu en cliquant ailleurs
        document.addEventListener('click', function() {
            langDropdown.classList.remove('active');
            langBtn.setAttribute('aria-expanded', 'false');
            langBtn.closest('.language-selector')?.classList.remove('is-open');
        });
        
        // Empêcher la fermeture en cliquant dans le menu
        langDropdown.addEventListener('click', function(e) {
            e.stopPropagation();
        });

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && langDropdown.classList.contains('active')) {
                langDropdown.classList.remove('active');
                langBtn.setAttribute('aria-expanded', 'false');
                langBtn.closest('.language-selector')?.classList.remove('is-open');
                langBtn.focus();
            }
        });
    }
    
    // Gérer les clics sur les options de langue
    langOptions.forEach(option => {
        option.addEventListener('click', function() {
            const lang = this.getAttribute('data-lang');
            changeLanguage(lang);
        });
    });
}

// ============================================
// ADMINISTRATION DES ARTICLES
// ============================================

/**
 * Initialise le système d'administration des articles
 */
function initArticleAdmin() {
    const adminBtn = document.getElementById('adminBtn');
    const adminPanel = document.getElementById('adminPanel');
    const closeAdminBtn = document.getElementById('closeAdminBtn');
    const addArticleForm = document.getElementById('addArticleForm');
    const exportBtn = document.getElementById('exportArticlesBtn');
    const clearBtn = document.getElementById('clearLocalArticlesBtn');
    const typeDirect = document.getElementById('articleTypeDirect');
    const typeExternal = document.getElementById('articleTypeExternal');
    const titleInput = document.getElementById('articleTitle');
    const authorInput = document.getElementById('articleAuthor');
    const categoryInput = document.getElementById('articleCategory');
    const contentInput = document.getElementById('articleContent');
    const linkInput = document.getElementById('articleLink');
    const externalDescriptionInput = document.getElementById('articleExternalDescription');
    const slugInput = document.getElementById('articleSlug');
    
    // Ouvrir le panneau d'administration (réinitialiser le mode édition)
    if (adminBtn && adminPanel) {
        adminBtn.addEventListener('click', function() {
            adminPanel.style.display = 'flex';
            ensureArticlesEditableSnapshot();
            setupArticleCategorySelect('');
            if (addArticleForm) {
                addArticleForm.dataset.editingIndex = '';
                addArticleForm.reset();
                window.__articleImageDataUrl = '';
                const imgFile = document.getElementById('articleImageFile');
                const imgStatus = document.getElementById('articleImageStatus');
                if (imgFile) imgFile.value = '';
                if (imgStatus) imgStatus.textContent = 'Choisissez un fichier image de couverture (optionnel).';
                if (typeDirect) typeDirect.checked = true;
                toggleArticleAdminMode();
                const submitBtn = document.getElementById('articleSubmitBtn');
                if (submitBtn) submitBtn.innerHTML = '<i class="fas fa-plus"></i> Ajouter l\'article';
            }
            updateLocalArticlesList();
            refreshArticleEditorPreview();
        });
    }
    
    // Fermer le panneau d'administration
    if (closeAdminBtn && adminPanel) {
        closeAdminBtn.addEventListener('click', function() {
            adminPanel.style.display = 'none';
        });
    }
    
    // Fermer en cliquant en dehors
    if (adminPanel) {
        adminPanel.addEventListener('click', function(e) {
            if (e.target === adminPanel) {
                adminPanel.style.display = 'none';
            }
        });
    }
    
    // Gérer l'ajout ou la mise à jour d'un article
    if (typeDirect) typeDirect.addEventListener('change', toggleArticleAdminMode);
    if (typeExternal) typeExternal.addEventListener('change', toggleArticleAdminMode);
    if (typeDirect) typeDirect.addEventListener('change', refreshArticleEditorPreview);
    if (typeExternal) typeExternal.addEventListener('change', refreshArticleEditorPreview);
    if (titleInput) titleInput.addEventListener('input', function () {
        const slugEl = document.getElementById('articleSlug');
        const isEditing = !!(addArticleForm && addArticleForm.dataset.editingIndex !== undefined && addArticleForm.dataset.editingIndex !== '');
        if (slugEl && !isEditing) slugEl.value = slugifyArticleTitle(titleInput.value || '');
        refreshArticleEditorPreview();
    });
    if (authorInput) authorInput.addEventListener('input', refreshArticleEditorPreview);
    if (categoryInput) categoryInput.addEventListener('change', refreshArticleEditorPreview);
    if (contentInput) contentInput.addEventListener('input', refreshArticleEditorPreview);
    if (linkInput) linkInput.addEventListener('input', refreshArticleEditorPreview);
    if (externalDescriptionInput) externalDescriptionInput.addEventListener('input', refreshArticleEditorPreview);
    if (slugInput) slugInput.addEventListener('input', refreshArticleEditorPreview);

    if (addArticleForm) {
        addArticleForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const title = document.getElementById('articleTitle').value;
            const author = document.getElementById('articleAuthor').value.trim();
            const category = normalizeArticleCategory(document.getElementById('articleCategory').value);
            const content = document.getElementById('articleContent').value.trim() || null;
            const link = document.getElementById('articleLink').value.trim() || null;
            const externalDescription = document.getElementById('articleExternalDescription').value.trim() || null;
            const image = (window.__articleImageDataUrl && String(window.__articleImageDataUrl).trim()) ? String(window.__articleImageDataUrl).trim() : null;
            const editingIndex = addArticleForm.dataset.editingIndex;
            const slug = editingIndex !== undefined && editingIndex !== ''
                ? getArticleCanonicalSlug(currentArticlesData[parseInt(editingIndex, 10)] || { title: title })
                : slugifyArticleTitle(title);
            const articleType = typeExternal && typeExternal.checked ? 'external' : 'direct';
            const directContent = articleType === 'direct' ? content : null;
            const externalLink = articleType === 'external' ? link : null;
            if (articleType === 'direct' && !author) {
                showToast('Ajoutez le nom de l’auteur pour un article direct.', 'info');
                return;
            }
            if ((articleType === 'direct' && !directContent) || (articleType === 'external' && !externalLink)) {
                showToast(articleType === 'direct'
                    ? 'Ajoutez le contenu complet de l’article.'
                    : 'Ajoutez le lien externe de l’article.', 'info');
                return;
            }
            const publishedAt = new Date().toISOString().split('T')[0];
            const article = {
                title: title,
                author: author,
                category: category || null,
                content: directContent,
                description: articleType === 'external' ? externalDescription : null,
                slug: slug,
                link: externalLink,
                type: articleType,
                image: image,
                date: publishedAt
            };
            const next = currentArticlesData.slice();
            if (editingIndex !== undefined && editingIndex !== '') {
                const idx = parseInt(editingIndex, 10);
                const old = next[idx] || {};
                article.slug = old.slug ? normalizeArticleSlug(old.slug) : article.slug;
                if (!article.image && old.image) article.image = old.image;
                if (old.date) article.date = old.date;
                if (idx >= 0 && idx < next.length) next[idx] = article;
                else next.push(article);
                addArticleForm.dataset.editingIndex = '';
                addArticleForm.reset();
                window.__articleImageDataUrl = '';
                const submitBtn = document.getElementById('articleSubmitBtn');
                if (submitBtn) submitBtn.innerHTML = '<i class="fas fa-plus"></i> Ajouter l\'article';
                showToast('Article mis à jour !', 'success');
            } else {
                next.unshift(article);
                addArticleForm.reset();
                window.__articleImageDataUrl = '';
                showToast('Article ajouté avec succès !', 'success');
            }
            setCurrentArticlesDataset(next);
            refreshArticleEditorPreview();
            await notifySupabasePortfolioPersist('articles');
            loadArticles();
            updateLocalArticlesList();
            if (adminPanel) adminPanel.style.display = 'none';
            scrollToSection('articles');
        });
    }
    
    // Exporter les articles
    if (exportBtn) {
        exportBtn.addEventListener('click', function() {
            exportArticles();
            showToast('Fichier articles.json téléchargé !', 'info');
        });
    }
    
    // Effacer les articles locaux
    if (clearBtn) {
        clearBtn.addEventListener('click', function() {
            if (confirm('Êtes-vous sûr de vouloir effacer tous les articles ajoutés localement ?')) {
                clearLocalArticles();
                loadArticles();
                updateLocalArticlesList();
                showToast('Articles locaux effacés.', 'info');
            }
        });
    }
    refreshArticleEditorPreview();
}

function toggleArticleAdminMode() {
    const isExternal = !!(document.getElementById('articleTypeExternal') && document.getElementById('articleTypeExternal').checked);
    const contentWrap = document.getElementById('articleContentWrap');
    const slugWrap = document.getElementById('articleSlugWrap');
    const linkWrap = document.getElementById('articleLinkWrap');
    const externalDescriptionWrap = document.getElementById('articleExternalDescriptionWrap');
    const imageWrap = document.getElementById('articleImageWrap');
    if (contentWrap) contentWrap.style.display = isExternal ? 'none' : '';
    if (slugWrap) slugWrap.style.display = isExternal ? 'none' : '';
    if (linkWrap) linkWrap.style.display = isExternal ? '' : 'none';
    if (externalDescriptionWrap) externalDescriptionWrap.style.display = isExternal ? '' : 'none';
    if (imageWrap) imageWrap.style.display = '';
}

function initArticleImageTools() {
    const fileInput = document.getElementById('articleImageFile');
    const statusEl = document.getElementById('articleImageStatus');
    if (!fileInput) return;
    window.__articleImageDataUrl = '';

    const setStatus = function (msg) {
        if (statusEl) statusEl.textContent = msg || '';
    };

    fileInput.addEventListener('change', function () {
        const file = fileInput.files && fileInput.files[0];
        if (!file) {
            window.__articleImageDataUrl = '';
            setStatus('Aucun fichier sélectionné.');
            refreshArticleEditorPreview();
            return;
        }
        if (!file.type || !file.type.startsWith('image/')) {
            window.__articleImageDataUrl = '';
            setStatus('Le fichier sélectionné n’est pas une image.');
            refreshArticleEditorPreview();
            return;
        }
        const reader = new FileReader();
        reader.onload = function () {
            window.__articleImageDataUrl = String(reader.result || '');
            setStatus('Image prête pour publication.');
            refreshArticleEditorPreview();
        };
        reader.onerror = function () {
            setStatus('Erreur lors de l’import local.');
        };
        reader.readAsDataURL(file);
    });
}

function getAdminArticleDraft() {
    const title = (document.getElementById('articleTitle') && document.getElementById('articleTitle').value.trim()) || '';
    const author = (document.getElementById('articleAuthor') && document.getElementById('articleAuthor').value.trim()) || '';
    const category = normalizeArticleCategory((document.getElementById('articleCategory') && document.getElementById('articleCategory').value.trim()) || '');
    const content = (document.getElementById('articleContent') && document.getElementById('articleContent').value.trim()) || '';
    const externalLink = (document.getElementById('articleLink') && document.getElementById('articleLink').value.trim()) || '';
    const externalDescription = (document.getElementById('articleExternalDescription') && document.getElementById('articleExternalDescription').value.trim()) || '';
    const isExternal = !!(document.getElementById('articleTypeExternal') && document.getElementById('articleTypeExternal').checked);
    return {
        title: title,
        author: author,
        category: category,
        content: isExternal ? '' : content,
        description: isExternal ? externalDescription : '',
        type: isExternal ? 'external' : 'direct',
        link: isExternal ? externalLink : null,
        image: (window.__articleImageDataUrl && String(window.__articleImageDataUrl).trim()) ? String(window.__articleImageDataUrl).trim() : null,
        date: new Date().toISOString().split('T')[0]
    };
}

function refreshArticleEditorPreview() {
    const emptyEl = document.getElementById('articleEditorPreviewEmpty');
    const cardEl = document.getElementById('articleEditorPreviewCard');
    const titleEl = document.getElementById('articleEditorPreviewTitle');
    const metaEl = document.getElementById('articleEditorPreviewMeta');
    const coverEl = document.getElementById('articleEditorPreviewCover');
    const bodyEl = document.getElementById('articleEditorPreviewBody');
    if (!emptyEl || !cardEl || !titleEl || !metaEl || !coverEl || !bodyEl) return;

    const draft = getAdminArticleDraft();
    const hasContent = !!(draft.title || draft.author || draft.content || draft.link || draft.image);
    if (!hasContent) {
        emptyEl.style.display = '';
        cardEl.style.display = 'none';
        titleEl.textContent = '';
        metaEl.textContent = '';
        coverEl.innerHTML = '';
        bodyEl.innerHTML = '';
        return;
    }

    emptyEl.style.display = 'none';
    cardEl.style.display = '';
    titleEl.textContent = draft.title || 'Titre de l’article';
    const typeLabel = draft.type === 'external' ? 'Aperçu lien externe' : 'Aperçu article direct';
    const categoryPart = draft.category ? (' - ' + draft.category) : '';
    metaEl.textContent = `${typeLabel} - ${draft.author ? ('Par ' + draft.author + ' - ') : ''}${formatDate(draft.date)}${categoryPart}`;

    coverEl.innerHTML = draft.image
        ? `<img src="${escapeAttr(draft.image)}" alt="${escapeAttr(draft.title || 'Image article')}" loading="lazy">`
        : '';

    if (draft.type === 'external') {
        const desc = draft.description ? `<p class="description-para">${markdownInlineToHtml(draft.description)}</p>` : '';
        if (draft.link) {
            bodyEl.innerHTML = `${desc}<p class="description-para"><strong>Lien externe :</strong> <a href="${escapeAttr(draft.link)}" target="_blank" rel="noopener">${escapeAttr(draft.link)}</a></p>`;
        } else {
            bodyEl.innerHTML = `${desc}<p class="description-para">Ajoutez un lien externe pour voir le rendu.</p>`;
        }
        return;
    }

    const contentSource = draft.content;
    bodyEl.innerHTML = contentSource ? markdownToHtml(contentSource) : '<p class="description-para">Commencez à écrire le contenu de l’article.</p>';
}

/**
 * Met à jour la liste des articles locaux dans le panneau d'administration
 */
function updateLocalArticlesList() {
    const localArticlesList = document.getElementById('localArticlesList');
    if (!localArticlesList) return;

    const articles = currentArticlesData;

    if (articles.length === 0) {
        localArticlesList.innerHTML = '<p style="color: var(--text-secondary);">Aucun article disponible.</p>';
        return;
    }

    localArticlesList.innerHTML = articles.map((article, index) => `
        <div class="admin-article-item">
            <div class="admin-article-info">
                <strong>${article.title}</strong>
                <p>${article.author ? ('Par ' + article.author) : ''}${article.type === 'external' && article.description ? ' - ' + article.description : ''}</p>
                <small>${article.date || 'Date non spécifiée'}${article.category ? ' · ' + article.category : ''}${article.slug ? ' · ' + article.slug : ''}</small>
            </div>
            <div class="admin-item-actions">
                <button type="button" class="btn-edit btn-edit-article" data-index="${index}" title="Modifier">
                    <i class="fas fa-edit"></i>
                </button>
                <button type="button" class="btn-remove-article" data-index="${index}" title="Supprimer">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
    
    const addArticleForm = document.getElementById('addArticleForm');
    const articleSubmitBtn = document.getElementById('articleSubmitBtn');
    localArticlesList.querySelectorAll('.btn-edit-article').forEach(btn => {
        btn.addEventListener('click', function() {
            const index = parseInt(this.getAttribute('data-index'), 10);
            const a = currentArticlesData[index];
            if (!a) return;
            document.getElementById('articleTitle').value = a.title || '';
            document.getElementById('articleAuthor').value = a.author || '';
            setupArticleCategorySelect(a.category || '');
            document.getElementById('articleContent').value = a.content || '';
            document.getElementById('articleExternalDescription').value = a.description || '';
            document.getElementById('articleSlug').value = getArticleCanonicalSlug(a);
            window.__articleImageDataUrl = a.image || '';
            const imgStatus = document.getElementById('articleImageStatus');
            if (imgStatus) imgStatus.textContent = a.image ? 'Image déjà enregistrée pour cet article.' : 'Choisissez un fichier image de couverture (optionnel).';
            document.getElementById('articleTypeExternal').checked = (a.type === 'external');
            document.getElementById('articleTypeDirect').checked = (a.type !== 'external');
            document.getElementById('articleLink').value = a.link || '';
            toggleArticleAdminMode();
            addArticleForm.dataset.editingIndex = String(index);
            if (articleSubmitBtn) articleSubmitBtn.innerHTML = '<i class="fas fa-save"></i> Mettre à jour';
            refreshArticleEditorPreview();
        });
    });
    localArticlesList.querySelectorAll('.btn-remove-article').forEach(btn => {
        btn.addEventListener('click', async function() {
            const index = parseInt(this.getAttribute('data-index'), 10);
            if (addArticleForm && addArticleForm.dataset.editingIndex === String(index)) {
                addArticleForm.reset();
                addArticleForm.dataset.editingIndex = '';
                if (articleSubmitBtn) articleSubmitBtn.innerHTML = '<i class="fas fa-plus"></i> Ajouter l\'article';
            }
            const next = currentArticlesData.slice();
            next.splice(index, 1);
            setCurrentArticlesDataset(next);
            await notifySupabasePortfolioPersist('articles');
            loadArticles();
            updateLocalArticlesList();
            showToast('Article supprimé.', 'info');
        });
    });
}

// ============================================
// ADMINISTRATION DES PROJETS
// ============================================

/**
 * Initialise le système d'administration des projets
 */
function initProjectAdmin() {
    const adminBtn = document.getElementById('adminProjectBtn');
    const adminPanel = document.getElementById('adminProjectPanel');
    const closeAdminBtn = document.getElementById('closeAdminProjectBtn');
    const addProjectForm = document.getElementById('addProjectForm');
    const exportBtn = document.getElementById('exportProjectsBtn');
    const clearBtn = document.getElementById('clearLocalProjectsBtn');
    
    if (adminBtn && adminPanel) {
        adminBtn.addEventListener('click', function() {
            adminPanel.style.display = 'flex';
            ensureProjectsEditableSnapshot();
            if (addProjectForm) {
                addProjectForm.dataset.editingIndex = '';
                addProjectForm.reset();
                const submitBtn = document.getElementById('projectSubmitBtn');
                if (submitBtn) submitBtn.innerHTML = '<i class="fas fa-plus"></i> Ajouter le projet';
            }
            updateLocalProjectsList();
        });
    }
    
    if (closeAdminBtn && adminPanel) {
        closeAdminBtn.addEventListener('click', function() {
            adminPanel.style.display = 'none';
        });
    }
    
    if (adminPanel) {
        adminPanel.addEventListener('click', function(e) {
            if (e.target === adminPanel) {
                adminPanel.style.display = 'none';
            }
        });
    }
    
    if (addProjectForm) {
        addProjectForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const title = document.getElementById('projectTitle').value;
            const description = document.getElementById('projectDescription').value;
            const contributions = document.getElementById('projectContributions').value.trim() || null;
            const image = document.getElementById('projectImage').value.trim() || null;
            const technologiesInput = document.getElementById('projectTechnologies').value;
            const technologies = technologiesInput ? technologiesInput.split(',').map(t => t.trim()).filter(Boolean) : [];
            const github = document.getElementById('projectGithub').value.trim() || null;
            const demo = document.getElementById('projectDemo').value.trim() || null;
            const about = document.getElementById('projectAbout').value.trim() || null;
            const cardano = document.getElementById('projectCardano').checked;
            const project = { title: title, description: description, contributions: contributions, image: image, technologies: technologies, github: github, demo: demo, about: about, cardano: cardano };
            const editingIndex = addProjectForm.dataset.editingIndex;
            const next = currentProjectsData.slice();
            if (editingIndex !== undefined && editingIndex !== '') {
                const idx = parseInt(editingIndex, 10);
                if (idx >= 0 && idx < next.length) next[idx] = project;
                else next.push(project);
                addProjectForm.dataset.editingIndex = '';
                addProjectForm.reset();
                const submitBtn = document.getElementById('projectSubmitBtn');
                if (submitBtn) submitBtn.innerHTML = '<i class="fas fa-plus"></i> Ajouter le projet';
                showToast('Projet mis à jour !', 'success');
            } else {
                next.unshift(project);
                addProjectForm.reset();
                showToast('Projet ajouté avec succès !', 'success');
            }
            setCurrentProjectsDataset(next);
            await notifySupabasePortfolioPersist('projects');
            loadProjects();
            updateLocalProjectsList();
            if (adminPanel) adminPanel.style.display = 'none';
            scrollToSection('projets');
        });
    }
    
    if (exportBtn) {
        exportBtn.addEventListener('click', function() {
            exportProjects();
            showToast('Fichier projects.json téléchargé !', 'info');
        });
    }
    
    if (clearBtn) {
        clearBtn.addEventListener('click', function() {
            if (confirm('Êtes-vous sûr de vouloir effacer tous les projets ajoutés localement ?')) {
                clearLocalProjects();
                loadProjects();
                updateLocalProjectsList();
                showToast('Projets locaux effacés.', 'info');
            }
        });
    }
}

/**
 * Met à jour la liste des projets locaux dans le panneau d'administration
 */
function updateLocalProjectsList() {
    const localProjectsList = document.getElementById('localProjectsList');
    if (!localProjectsList) return;

    const projects = currentProjectsData;

    if (projects.length === 0) {
        localProjectsList.innerHTML = '<p style="color: var(--text-secondary);">Aucun projet disponible.</p>';
        return;
    }
    
    localProjectsList.innerHTML = projects.map((project, index) => `
        <div class="admin-article-item admin-project-item">
            <div class="admin-article-info admin-project-info">
                <strong>${project.title}</strong>
                <p>${project.description}</p>
                <small>${project.technologies && project.technologies.length ? project.technologies.join(', ') : 'Aucune technologie'}</small>
            </div>
            <div class="admin-item-actions">
                <button type="button" class="btn-edit btn-edit-project" data-index="${index}" title="Modifier">
                    <i class="fas fa-edit"></i>
                </button>
                <button type="button" class="btn-remove-article btn-remove-project" data-index="${index}" title="Supprimer">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
    
    const addProjectForm = document.getElementById('addProjectForm');
    const projectSubmitBtn = document.getElementById('projectSubmitBtn');
    localProjectsList.querySelectorAll('.btn-edit-project').forEach(btn => {
        btn.addEventListener('click', function() {
            const index = parseInt(this.getAttribute('data-index'), 10);
            const p = currentProjectsData[index];
            if (!p) return;
            document.getElementById('projectTitle').value = p.title || '';
            document.getElementById('projectDescription').value = p.description || '';
            document.getElementById('projectContributions').value = p.contributions || '';
            document.getElementById('projectImage').value = p.image || '';
            document.getElementById('projectTechnologies').value = (p.technologies && p.technologies.length) ? p.technologies.join(', ') : '';
            document.getElementById('projectGithub').value = p.github || '';
            document.getElementById('projectDemo').value = p.demo || '';
            document.getElementById('projectAbout').value = p.about || '';
            document.getElementById('projectCardano').checked = !!p.cardano;
            addProjectForm.dataset.editingIndex = String(index);
            if (projectSubmitBtn) projectSubmitBtn.innerHTML = '<i class="fas fa-save"></i> Mettre à jour';
        });
    });
    localProjectsList.querySelectorAll('.btn-remove-project').forEach(btn => {
        btn.addEventListener('click', async function() {
            const index = parseInt(this.getAttribute('data-index'), 10);
            if (addProjectForm && addProjectForm.dataset.editingIndex === String(index)) {
                addProjectForm.reset();
                addProjectForm.dataset.editingIndex = '';
                if (projectSubmitBtn) projectSubmitBtn.innerHTML = '<i class="fas fa-plus"></i> Ajouter le projet';
            }
            const next = currentProjectsData.slice();
            next.splice(index, 1);
            setCurrentProjectsDataset(next);
            await notifySupabasePortfolioPersist('projects');
            loadProjects();
            updateLocalProjectsList();
            showToast('Projet supprimé.', 'info');
        });
    });
}

// ============================================
// ADMINISTRATION DES EXPÉRIENCES
// ============================================

function initExperienceAdmin() {
    const adminBtn = document.getElementById('adminExperienceBtn');
    const adminPanel = document.getElementById('adminExperiencePanel');
    const closeBtn = document.getElementById('closeAdminExperienceBtn');
    const form = document.getElementById('addExperienceForm');
    const exportBtn = document.getElementById('exportExperiencesBtn');
    const clearBtn = document.getElementById('clearLocalExperiencesBtn');
    
    if (adminBtn && adminPanel) {
        adminBtn.addEventListener('click', function() {
            adminPanel.style.display = 'flex';
            ensureExperiencesEditableSnapshot();
            if (form) {
                form.dataset.editingIndex = '';
                form.reset();
                const submitBtn = document.getElementById('experienceSubmitBtn');
                if (submitBtn) submitBtn.innerHTML = '<i class="fas fa-plus"></i> Ajouter l\'expérience';
            }
            updateLocalExperiencesList();
        });
    }
    if (closeBtn && adminPanel) {
        closeBtn.addEventListener('click', function() {
            adminPanel.style.display = 'none';
        });
    }
    if (adminPanel) {
        adminPanel.addEventListener('click', function(e) {
            if (e.target === adminPanel) adminPanel.style.display = 'none';
        });
    }
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            const experience = {
                title: document.getElementById('experienceTitle').value,
                organization: document.getElementById('experienceOrganization').value.trim() || null,
                description: document.getElementById('experienceDescription').value,
                period: document.getElementById('experiencePeriod').value.trim() || null,
                link: document.getElementById('experienceLink').value.trim() || null
            };
            const editingIndex = form.dataset.editingIndex;
            const next = currentExperiencesData.slice();
            if (editingIndex !== undefined && editingIndex !== '') {
                const idx = parseInt(editingIndex, 10);
                if (idx >= 0 && idx < next.length) next[idx] = experience;
                else next.push(experience);
                form.dataset.editingIndex = '';
                form.reset();
                const submitBtn = document.getElementById('experienceSubmitBtn');
                if (submitBtn) submitBtn.innerHTML = '<i class="fas fa-plus"></i> Ajouter l\'expérience';
                showToast('Expérience mise à jour !', 'success');
            } else {
                next.unshift(experience);
                form.reset();
                showToast('Expérience ajoutée avec succès !', 'success');
            }
            setCurrentExperiencesDataset(next);
            await notifySupabasePortfolioPersist('experiences');
            loadExperiences();
            updateLocalExperiencesList();
            if (adminPanel) adminPanel.style.display = 'none';
            scrollToSection('experiences');
        });
    }
    if (exportBtn) {
        exportBtn.addEventListener('click', function() {
            exportExperiences();
            showToast('Fichier experiences.json téléchargé !', 'info');
        });
    }
    if (clearBtn) {
        clearBtn.addEventListener('click', function() {
            if (confirm('Effacer toutes les expériences ajoutées localement ?')) {
                clearLocalExperiences();
                loadExperiences();
                updateLocalExperiencesList();
                showToast('Expériences locales effacées.', 'info');
            }
        });
    }
}

function updateLocalExperiencesList() {
    const list = document.getElementById('localExperiencesList');
    if (!list) return;
    const experiences = currentExperiencesData;
    if (experiences.length === 0) {
        list.innerHTML = '<p style="color: var(--text-secondary);">Aucune expérience disponible.</p>';
        return;
    }
    list.innerHTML = experiences.map((exp, i) => `
        <div class="admin-article-item">
            <div class="admin-article-info">
                <strong>${exp.title}</strong>
                <p>${exp.description}</p>
                <small>${exp.organization || ''} ${exp.period ? ' · ' + exp.period : ''}</small>
            </div>
            <div class="admin-item-actions">
                <button type="button" class="btn-edit btn-edit-experience" data-index="${i}" title="Modifier">
                    <i class="fas fa-edit"></i>
                </button>
                <button type="button" class="btn-remove-article btn-remove-experience" data-index="${i}" title="Supprimer">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
    const addExperienceForm = document.getElementById('addExperienceForm');
    const experienceSubmitBtn = document.getElementById('experienceSubmitBtn');
    list.querySelectorAll('.btn-edit-experience').forEach(btn => {
        btn.addEventListener('click', function() {
            const index = parseInt(this.getAttribute('data-index'), 10);
            const exp = currentExperiencesData[index];
            if (!exp) return;
            document.getElementById('experienceTitle').value = exp.title || '';
            document.getElementById('experienceOrganization').value = exp.organization || '';
            document.getElementById('experienceDescription').value = exp.description || '';
            document.getElementById('experiencePeriod').value = exp.period || '';
            document.getElementById('experienceLink').value = exp.link || '';
            addExperienceForm.dataset.editingIndex = String(index);
            if (experienceSubmitBtn) experienceSubmitBtn.innerHTML = '<i class="fas fa-save"></i> Mettre à jour';
        });
    });
    list.querySelectorAll('.btn-remove-experience').forEach(btn => {
        btn.addEventListener('click', async function() {
            const index = parseInt(this.getAttribute('data-index'), 10);
            if (addExperienceForm && addExperienceForm.dataset.editingIndex === String(index)) {
                addExperienceForm.reset();
                addExperienceForm.dataset.editingIndex = '';
                if (experienceSubmitBtn) experienceSubmitBtn.innerHTML = '<i class="fas fa-plus"></i> Ajouter l\'expérience';
            }
            const next = currentExperiencesData.slice();
            next.splice(index, 1);
            setCurrentExperiencesDataset(next);
            await notifySupabasePortfolioPersist('experiences');
            loadExperiences();
            updateLocalExperiencesList();
            showToast('Expérience supprimée.', 'info');
        });
    });
}

function initInlineAdminQuickEdit() {
    document.addEventListener('click', function (e) {
        const btn = e.target.closest('.inline-edit-btn');
        if (!btn) return;
        e.preventDefault();
        e.stopPropagation();
        const entity = btn.getAttribute('data-entity');
        const index = parseInt(btn.getAttribute('data-index'), 10);
        if (!Number.isFinite(index) || index < 0) return;
        if (entity === 'project') openQuickEditProject(index);
        else if (entity === 'article') openQuickEditArticle(index);
        else if (entity === 'article-delete') removeArticleAtIndex(index);
        else if (entity === 'experience') openQuickEditExperience(index);
        else if (entity === 'skill') {
            const category = btn.getAttribute('data-category');
            openQuickEditSkill(category, index);
        }
    });
}

function openQuickEditProject(index) {
    const adminPanel = document.getElementById('adminProjectPanel');
    const form = document.getElementById('addProjectForm');
    const submitBtn = document.getElementById('projectSubmitBtn');
    if (!adminPanel || !form || !currentProjectsData[index]) return;
    ensureProjectsEditableSnapshot();
    const p = currentProjectsData[index];
    document.getElementById('projectTitle').value = p.title || '';
    document.getElementById('projectDescription').value = p.description || '';
    document.getElementById('projectContributions').value = p.contributions || '';
    document.getElementById('projectImage').value = p.image || '';
    document.getElementById('projectTechnologies').value = (p.technologies && p.technologies.length) ? p.technologies.join(', ') : '';
    document.getElementById('projectGithub').value = p.github || '';
    document.getElementById('projectDemo').value = p.demo || '';
    document.getElementById('projectAbout').value = p.about || '';
    document.getElementById('projectCardano').checked = !!p.cardano;
    form.dataset.editingIndex = String(index);
    if (submitBtn) submitBtn.innerHTML = '<i class="fas fa-save"></i> Mettre à jour';
    adminPanel.style.display = 'flex';
    updateLocalProjectsList();
}

function openQuickEditArticle(index) {
    const adminPanel = document.getElementById('adminPanel');
    const form = document.getElementById('addArticleForm');
    const submitBtn = document.getElementById('articleSubmitBtn');
    if (!adminPanel || !form || !currentArticlesData[index]) return;
    ensureArticlesEditableSnapshot();
    const a = currentArticlesData[index];
    document.getElementById('articleTitle').value = a.title || '';
    document.getElementById('articleAuthor').value = a.author || '';
    setupArticleCategorySelect(a.category || '');
    document.getElementById('articleContent').value = a.content || '';
    document.getElementById('articleExternalDescription').value = a.description || '';
    document.getElementById('articleSlug').value = getArticleCanonicalSlug(a);
    window.__articleImageDataUrl = a.image || '';
    const imgFile = document.getElementById('articleImageFile');
    const imgStatus = document.getElementById('articleImageStatus');
    if (imgFile) imgFile.value = '';
    if (imgStatus) imgStatus.textContent = a.image ? 'Image déjà enregistrée pour cet article.' : 'Choisissez un fichier image de couverture (optionnel).';
    document.getElementById('articleTypeExternal').checked = (a.type === 'external');
    document.getElementById('articleTypeDirect').checked = (a.type !== 'external');
    document.getElementById('articleLink').value = a.link || '';
    toggleArticleAdminMode();
    form.dataset.editingIndex = String(index);
    if (submitBtn) submitBtn.innerHTML = '<i class="fas fa-save"></i> Mettre à jour';
    adminPanel.style.display = 'flex';
    updateLocalArticlesList();
    refreshArticleEditorPreview();
}

function removeArticleAtIndex(index) {
    if (!Array.isArray(currentArticlesData) || !currentArticlesData[index]) return;
    const target = currentArticlesData[index];
    const title = target && target.title ? String(target.title) : 'cet article';
    if (!confirm(`Supprimer "${title}" ?`)) return;
    const next = currentArticlesData.slice();
    next.splice(index, 1);
    setCurrentArticlesDataset(next);
    notifySupabasePortfolioPersist('articles').then(function () {
        loadArticles();
        updateLocalArticlesList();
        showToast('Article supprimé.', 'info');
    });
}

function openQuickEditExperience(index) {
    const adminPanel = document.getElementById('adminExperiencePanel');
    const form = document.getElementById('addExperienceForm');
    const submitBtn = document.getElementById('experienceSubmitBtn');
    if (!adminPanel || !form || !currentExperiencesData[index]) return;
    ensureExperiencesEditableSnapshot();
    const exp = currentExperiencesData[index];
    document.getElementById('experienceTitle').value = exp.title || '';
    document.getElementById('experienceOrganization').value = exp.organization || '';
    document.getElementById('experienceDescription').value = exp.description || '';
    document.getElementById('experiencePeriod').value = exp.period || '';
    document.getElementById('experienceLink').value = exp.link || '';
    form.dataset.editingIndex = String(index);
    if (submitBtn) submitBtn.innerHTML = '<i class="fas fa-save"></i> Mettre à jour';
    adminPanel.style.display = 'flex';
    updateLocalExperiencesList();
}

function openQuickEditSkill(category, index) {
    const adminPanel = document.getElementById('adminSkillsPanel');
    const form = document.getElementById('addSkillForm');
    const submitBtn = document.getElementById('skillSubmitBtn');
    if (!adminPanel || !form || !SKILL_CATEGORIES.includes(category)) return;
    ensureSkillsEditableSnapshot();
    const skill = currentSkillsData[category] && currentSkillsData[category][index];
    if (!skill) return;
    document.getElementById('skillCategory').value = category;
    document.getElementById('skillName').value = skill.name || '';
    document.getElementById('skillIcon').value = skill.icon || '';
    document.getElementById('skillLevel').value = Number.isFinite(Number(skill.level)) ? Number(skill.level) : 0;
    document.getElementById('skillLink').value = skill.link || '';
    document.getElementById('skillCertification').checked = !!skill.certification;
    form.dataset.editingCategory = category;
    form.dataset.editingIndex = String(index);
    if (submitBtn) submitBtn.innerHTML = '<i class="fas fa-save"></i> Mettre à jour';
    adminPanel.style.display = 'flex';
    updateLocalSkillsList();
}

// ============================================
// ADMINISTRATION DES COMPÉTENCES
// ============================================

function initSkillsAdmin() {
    const adminBtn = document.getElementById('adminSkillsBtn');
    const adminPanel = document.getElementById('adminSkillsPanel');
    const closeBtn = document.getElementById('closeAdminSkillsBtn');
    const form = document.getElementById('addSkillForm');
    const exportBtn = document.getElementById('exportSkillsBtn');
    const clearBtn = document.getElementById('clearLocalSkillsBtn');

    if (adminBtn && adminPanel) {
        adminBtn.addEventListener('click', function () {
            ensureSkillsEditableSnapshot();
            adminPanel.style.display = 'flex';
            if (form) {
                form.dataset.editingCategory = '';
                form.dataset.editingIndex = '';
                form.reset();
                const submitBtn = document.getElementById('skillSubmitBtn');
                if (submitBtn) submitBtn.innerHTML = '<i class="fas fa-plus"></i> Ajouter la compétence';
            }
            updateLocalSkillsList();
        });
    }

    if (closeBtn && adminPanel) {
        closeBtn.addEventListener('click', function () {
            adminPanel.style.display = 'none';
        });
    }

    if (adminPanel) {
        adminPanel.addEventListener('click', function (e) {
            if (e.target === adminPanel) adminPanel.style.display = 'none';
        });
    }

    if (form) {
        form.addEventListener('submit', async function (e) {
            e.preventDefault();
            const category = document.getElementById('skillCategory').value;
            const skill = {
                name: document.getElementById('skillName').value.trim(),
                icon: document.getElementById('skillIcon').value.trim(),
                level: Math.max(0, Math.min(100, Number(document.getElementById('skillLevel').value))),
                link: document.getElementById('skillLink').value.trim() || null,
                certification: !!document.getElementById('skillCertification').checked
            };
            if (!category || !skill.name || !skill.icon || !Number.isFinite(skill.level)) {
                showToast('Veuillez renseigner les champs obligatoires.', 'info');
                return;
            }

            const editingCategory = form.dataset.editingCategory;
            const editingIndex = form.dataset.editingIndex;
            const all = cloneSkillsData(currentSkillsData);
            if (editingCategory && editingIndex !== '') {
                const idx = parseInt(editingIndex, 10);
                if (SKILL_CATEGORIES.includes(editingCategory) && Number.isFinite(idx) && all[editingCategory][idx]) {
                    all[editingCategory][idx] = skill;
                    setLocalSkills(all);
                    currentSkillsData = cloneSkillsData(all);
                    showToast('Compétence mise à jour !', 'success');
                }
                form.dataset.editingCategory = '';
                form.dataset.editingIndex = '';
            } else {
                if (!SKILL_CATEGORIES.includes(category)) {
                    showToast('Catégorie invalide.', 'info');
                    return;
                }
                all[category].push(skill);
                setLocalSkills(all);
                currentSkillsData = cloneSkillsData(all);
                showToast('Compétence ajoutée avec succès !', 'success');
            }

            form.reset();
            const submitBtn = document.getElementById('skillSubmitBtn');
            if (submitBtn) submitBtn.innerHTML = '<i class="fas fa-plus"></i> Ajouter la compétence';
            await notifySupabasePortfolioPersist('skills');
            loadSkills();
            updateLocalSkillsList();
            if (adminPanel) adminPanel.style.display = 'none';
            scrollToSection('competences');
        });
    }

    if (exportBtn) {
        exportBtn.addEventListener('click', function () {
            exportSkills();
            showToast('Fichier skills.json téléchargé !', 'info');
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', async function () {
            if (confirm('Effacer toutes les compétences ?')) {
                clearLocalSkills();
                currentSkillsData = createEmptySkillsData();
                await notifySupabasePortfolioPersist('skills');
                loadSkills();
                updateLocalSkillsList();
                showToast('Compétences effacées.', 'info');
            }
        });
    }
}

function updateLocalSkillsList() {
    const list = document.getElementById('localSkillsList');
    if (!list) return;
    const local = cloneSkillsData(currentSkillsData);
    const rows = [];
    SKILL_CATEGORIES.forEach(function (cat) {
        local[cat].forEach(function (skill, index) {
            rows.push({ cat: cat, index: index, skill: skill });
        });
    });
    if (rows.length === 0) {
        list.innerHTML = '<p style="color: var(--text-secondary);">Aucune compétence disponible.</p>';
        return;
    }

    list.innerHTML = rows.map(function (row) {
        const s = row.skill;
        return `
        <div class="admin-article-item">
            <div class="admin-article-info">
                <strong>${s.name}</strong>
                <p>Catégorie: ${row.cat} · Niveau: ${s.level}%</p>
                <small>${s.icon}${s.link ? ' · ' + s.link : ''}${s.certification ? ' · certification' : ''}</small>
            </div>
            <div class="admin-item-actions">
                <button type="button" class="btn-edit btn-edit-skill" data-category="${row.cat}" data-index="${row.index}" title="Modifier">
                    <i class="fas fa-edit"></i>
                </button>
                <button type="button" class="btn-remove-article btn-remove-skill" data-category="${row.cat}" data-index="${row.index}" title="Supprimer">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>`;
    }).join('');

    const form = document.getElementById('addSkillForm');
    const submitBtn = document.getElementById('skillSubmitBtn');

    list.querySelectorAll('.btn-edit-skill').forEach(function (btn) {
        btn.addEventListener('click', function () {
            const category = this.getAttribute('data-category');
            const index = parseInt(this.getAttribute('data-index'), 10);
            const all = cloneSkillsData(currentSkillsData);
            const skill = all[category] && all[category][index];
            if (!skill || !form) return;
            document.getElementById('skillCategory').value = category;
            document.getElementById('skillName').value = skill.name || '';
            document.getElementById('skillIcon').value = skill.icon || '';
            document.getElementById('skillLevel').value = Number.isFinite(Number(skill.level)) ? Number(skill.level) : 0;
            document.getElementById('skillLink').value = skill.link || '';
            document.getElementById('skillCertification').checked = !!skill.certification;
            form.dataset.editingCategory = category;
            form.dataset.editingIndex = String(index);
            if (submitBtn) submitBtn.innerHTML = '<i class="fas fa-save"></i> Mettre à jour';
        });
    });

    list.querySelectorAll('.btn-remove-skill').forEach(function (btn) {
        btn.addEventListener('click', async function () {
            const category = this.getAttribute('data-category');
            const index = parseInt(this.getAttribute('data-index'), 10);
            const all = cloneSkillsData(currentSkillsData);
            if (!SKILL_CATEGORIES.includes(category) || !Number.isFinite(index)) return;
            all[category].splice(index, 1);
            setLocalSkills(all);
            currentSkillsData = cloneSkillsData(all);
            if (form && form.dataset.editingCategory === category && form.dataset.editingIndex === String(index)) {
                form.reset();
                form.dataset.editingCategory = '';
                form.dataset.editingIndex = '';
                if (submitBtn) submitBtn.innerHTML = '<i class="fas fa-plus"></i> Ajouter la compétence';
            }
            await notifySupabasePortfolioPersist('skills');
            loadSkills();
            updateLocalSkillsList();
            showToast('Compétence supprimée.', 'info');
        });
    });
}


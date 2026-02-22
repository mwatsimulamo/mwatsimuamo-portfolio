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
 * ============================================
 */

// ============================================
// VARIABLES GLOBALES
// ============================================
let translations = {};
let currentLang = localStorage.getItem('portfolio-lang') || 'fr';

/** Mot de passe pour accéder au mode administration (articles / projets). Changez-le ! */
const ADMIN_PASSWORD = '2054';
const ADMIN_STORAGE_KEY = 'portfolio-admin';

/** Email de réception des messages du formulaire de contact */
const CONTACT_EMAIL = 'mwatsimulamoolivier@gmail.com';
/** Formspree : collez uniquement l'ID du formulaire (ex: mjgearjz) ou l'URL complète. */
const FORMSPREE_FORM_ID = 'mjgearjz';

/** Nombre d'articles et d'expériences affichés avant "Voir plus". */
const INITIAL_DISPLAY_COUNT = 3;

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
 * Formate le formatage inline : **gras**, *italique*, __souligné__
 * À appliquer sur du texte déjà échappé HTML.
 */
function applyInlineFormatting(escapedText) {
    return escapedText
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/__([^_]+)__/g, '<u>$1</u>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>');
}

/**
 * Formate un texte description en HTML avec paragraphes, listes et formatage (gras, italique, souligné).
 * Syntaxe : **gras** *italique* __souligné__ ; lignes commençant par "- " ou "* " = liste à puces.
 * Échappe le HTML pour la sécurité.
 */
function formatDescriptionAsParagraphs(description) {
    if (!description || typeof description !== 'string') return '';
    const escape = (s) => String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    const blocks = description.split(/\n\n+/).map(b => b.trim()).filter(Boolean);
    if (blocks.length === 0) {
        const t = description.trim();
        if (!t) return '';
        const escaped = escape(t).replace(/\n/g, '<br>');
        return `<p class="description-para">${applyInlineFormatting(escaped)}</p>`;
    }
    const out = [];
    for (const block of blocks) {
        const lines = block.split(/\n/).map(l => l.trimEnd());
        const isList = lines.every(l => l === '' || /^[-*]\s/.test(l));
        if (isList && lines.some(l => l.length > 0)) {
            const items = lines.filter(l => l.length > 0).map(l => {
                const content = l.replace(/^[-*]\s+/, '');
                return '<li>' + applyInlineFormatting(escape(content).replace(/\n/g, ' ')) + '</li>';
            }).join('');
            out.push('<ul class="description-list">' + items + '</ul>');
        } else {
            const escaped = escape(block).replace(/\n/g, '<br>');
            out.push('<p class="description-para">' + applyInlineFormatting(escaped) + '</p>');
        }
    }
    return out.join('');
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
    const text = textarea.value;
    let lineStart = text.lastIndexOf('\n', start - 1) + 1;
    const before = text.slice(0, lineStart);
    const after = text.slice(lineStart);
    textarea.value = before + prefix + after;
    textarea.selectionStart = textarea.selectionEnd = start + prefix.length;
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
        toolbar.querySelectorAll('.toolbar-btn[data-prefix]').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                const prefix = this.getAttribute('data-prefix');
                insertPrefixAtLineStart(textarea, prefix);
            });
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
 * Affiche la modal premium de saisie du mot de passe admin et renvoie une Promise avec la valeur saisie ou null si annulé.
 */
function showAdminPasswordModal() {
    const overlay = document.getElementById('adminModalOverlay');
    const form = document.getElementById('adminModalForm');
    const input = document.getElementById('adminModalPassword');
    const cancelBtn = document.getElementById('adminModalCancel');
    if (!overlay || !form || !input) return Promise.resolve(null);

    return new Promise(function(resolve) {
        var settled = false;
        function closeModal() {
            overlay.classList.remove('admin-modal--open');
            overlay.setAttribute('aria-hidden', 'true');
            input.value = '';
        }
        function done(value) {
            if (settled) return;
            settled = true;
            closeModal();
            form.removeEventListener('submit', onSubmit);
            cancelBtn.removeEventListener('click', onCancel);
            overlay.removeEventListener('click', onOverlayClick);
            document.removeEventListener('keydown', onEscape);
            resolve(value);
        }

        function onSubmit(e) {
            e.preventDefault();
            done(input.value.trim());
        }
        function onCancel() { done(null); }
        function onOverlayClick(e) {
            if (e.target === overlay) done(null);
        }
        function onEscape(e) {
            if (e.key === 'Escape') done(null);
        }

        form.addEventListener('submit', onSubmit);
        cancelBtn.addEventListener('click', onCancel);
        overlay.addEventListener('click', onOverlayClick);
        document.addEventListener('keydown', onEscape);

        overlay.classList.add('admin-modal--open');
        overlay.setAttribute('aria-hidden', 'false');
        input.focus();
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

/**
 * Initialise la protection : masque les boutons admin sauf si déjà authentifié
 */
function initAdminGate() {
    const isUnlocked = localStorage.getItem(ADMIN_STORAGE_KEY) === '1';
    setAdminUIVisibility(!!isUnlocked);

    const unlockTrigger = document.getElementById('adminUnlockTrigger');
    const logoutTrigger = document.getElementById('adminLogoutTrigger');

    if (unlockTrigger) {
        unlockTrigger.addEventListener('click', function(e) {
            e.preventDefault();
            showAdminPasswordModal().then(function(password) {
                if (password === ADMIN_PASSWORD) {
                    localStorage.setItem(ADMIN_STORAGE_KEY, '1');
                    setAdminUIVisibility(true);
                    showToast('Mode admin activé.', 'success');
                } else if (password !== null) {
                    showToast('Mot de passe incorrect.', 'info');
                }
            });
        });
    }

    if (logoutTrigger) {
        logoutTrigger.addEventListener('click', function(e) {
            e.preventDefault();
            localStorage.removeItem(ADMIN_STORAGE_KEY);
            setAdminUIVisibility(false);
            document.getElementById('adminPanel') && (document.getElementById('adminPanel').style.display = 'none');
            document.getElementById('adminProjectPanel') && (document.getElementById('adminProjectPanel').style.display = 'none');
            document.getElementById('adminExperiencePanel') && (document.getElementById('adminExperiencePanel').style.display = 'none');
            showToast('Mode admin désactivé.', 'info');
        });
    }
}

// ============================================
// INITIALISATION
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    initAdminGate();
    initTranslations();
    initNavigation();
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
    initDescriptionToolbars();
});

// ============================================
// NAVIGATION
// ============================================

/**
 * Initialise la navigation (menu hamburger, scroll, active links)
 */
function initNavigation() {
    const navbar = document.getElementById('navbar');
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.getElementById('navMenu');
    const navLinks = document.querySelectorAll('.nav-link');

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
                    const offsetTop = target.offsetTop - 80;
                    window.scrollTo({
                        top: offsetTop,
                        behavior: 'smooth'
                    });
                }
            }
        });
    });
}

/**
 * Met à jour le lien de navigation actif selon la section visible
 */
function updateActiveNavLink() {
    const sections = document.querySelectorAll('.section, .hero');
    const navLinks = document.querySelectorAll('.nav-link');

    let current = '';
    sections.forEach(section => {
        const sectionTop = section.offsetTop - 100;
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
}

// ============================================
// CHARGEMENT DES PROJETS
// ============================================

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
        const allProjects = [...localProjects, ...projectsFromFile];
        
        if (allProjects.length === 0) {
            const noProjectsText = (translations[currentLang] && translations[currentLang].projects && translations[currentLang].projects.noProjects) 
                ? translations[currentLang].projects.noProjects 
                : 'Aucun projet disponible pour le moment.';
            projectsGrid.innerHTML = `<p class="loading">${noProjectsText}</p>`;
            return;
        }
        
        projectsGrid.innerHTML = '';
        allProjects.forEach(project => {
            const projectCard = createProjectCard(project);
            projectsGrid.appendChild(projectCard);
        });
        
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
const PROJECT_DESCRIPTION_COLLAPSE_CHARS = 200;

function createProjectCard(project) {
    const card = document.createElement('div');
    card.className = 'project-card';
    
    const loadMoreText = (translations[currentLang] && translations[currentLang].projects && translations[currentLang].projects.loadMore) ? translations[currentLang].projects.loadMore : 'Charger plus';
    const loadLessText = (translations[currentLang] && translations[currentLang].projects && translations[currentLang].projects.loadLess) ? translations[currentLang].projects.loadLess : 'Charger moins';

    let imageHTML = '<div class="project-image-wrap">';
    if (project.image) {
        imageHTML += `<img src="${project.image}" alt="${project.title}" class="project-image" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">`;
    }
    imageHTML += `
        <div class="project-image-placeholder" style="display: ${project.image ? 'none' : 'flex'};">
            <i class="fas fa-code"></i>
        </div>
    </div>`;
    
    const technologies = Array.isArray(project.technologies) ? project.technologies : [];
    const techTags = technologies
        .map(tech => `<span class="tech-tag">${tech}</span>`)
        .join('');
    
    const cardanoBadge = project.cardano 
        ? '<span class="cardano-badge"><i class="fas fa-coins"></i> Cardano</span>' 
        : '';
    
    const codeText = (translations[currentLang] && translations[currentLang].projects && translations[currentLang].projects.viewCode) 
        ? translations[currentLang].projects.viewCode 
        : 'Code';
    const demoText = (translations[currentLang] && translations[currentLang].projects && translations[currentLang].projects.viewDemo) 
        ? translations[currentLang].projects.viewDemo 
        : 'Démo';
    let linksHTML = '';
    if (project.github) {
        linksHTML += `
            <a href="${project.github}" target="_blank" rel="noopener" class="project-link">
                <i class="fab fa-github"></i> ${codeText}
            </a>
        `;
    }
    if (project.demo) {
        linksHTML += `
            <a href="${project.demo}" target="_blank" rel="noopener" class="project-link secondary">
                <i class="fas fa-external-link-alt"></i> ${demoText}
            </a>
        `;
    }
    
    const descriptionHtml = formatDescriptionAsParagraphs(project.description);
    const isLongDescription = (project.description || '').length > PROJECT_DESCRIPTION_COLLAPSE_CHARS;
    const descriptionWrapHTML = isLongDescription
        ? `<div class="project-description-wrap">
            <div class="project-description description-block project-description--collapsed">${descriptionHtml}</div>
            <button type="button" class="project-description-toggle" aria-expanded="false">
                <i class="fas fa-chevron-down"></i> <span class="project-description-toggle-text">${loadMoreText}</span>
            </button>
           </div>`
        : `<div class="project-description-wrap">
            <div class="project-description description-block">${descriptionHtml}</div>
           </div>`;

    card.innerHTML = `
        ${imageHTML}
        <div class="project-content">
            <h3 class="project-title">
                ${project.title}
                ${cardanoBadge}
            </h3>
            ${descriptionWrapHTML}
            <div class="project-tech">${techTags}</div>
            <div class="project-links">${linksHTML}</div>
        </div>
    `;

    if (isLongDescription) {
        const descEl = card.querySelector('.project-description');
        const btn = card.querySelector('.project-description-toggle');
        const toggleText = card.querySelector('.project-description-toggle-text');
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const expanded = descEl.classList.toggle('project-description--collapsed');
            btn.classList.toggle('expanded', !expanded);
            btn.setAttribute('aria-expanded', !expanded);
            toggleText.textContent = expanded ? loadMoreText : loadLessText;
        });
    }
    
    return card;
}

// ============================================
// CHARGEMENT DES EXPÉRIENCES
// ============================================

/**
 * Charge les expériences depuis experiences.json et localStorage, puis les affiche
 */
async function loadExperiences() {
    const listEl = document.getElementById('experiencesList');
    if (!listEl) return;
    try {
        let fromFile = [];
        try {
            const response = await fetch('experiences.json');
            if (response.ok) fromFile = await response.json();
        } catch (e) {
            console.warn('experiences.json non disponible.');
        }
        const local = getLocalExperiences();
        const all = [...local, ...fromFile];
        if (all.length === 0) {
            const msg = (translations[currentLang] && translations[currentLang].experiences && translations[currentLang].experiences.noExperiences)
                ? translations[currentLang].experiences.noExperiences
                : 'Aucune expérience renseignée pour le moment.';
            listEl.innerHTML = `<p class="loading">${msg}</p>`;
            return;
        }
        listEl.innerHTML = '';
        listEl.dataset.visibleCount = String(INITIAL_DISPLAY_COUNT);
        const totalExperiences = all.length;
        all.forEach((exp, index) => {
            const el = createExperienceItem(exp);
            if (index >= INITIAL_DISPLAY_COUNT) el.classList.add('item-over-limit');
            listEl.appendChild(el);
        });
        const container = listEl.parentNode;
        const existingBtn = document.getElementById('experiencesLoadMoreBtn');
        if (existingBtn && existingBtn.parentNode) existingBtn.parentNode.remove();
        if (totalExperiences > INITIAL_DISPLAY_COUNT) {
            const wrap = document.createElement('div');
            wrap.className = 'load-more-wrap';
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'btn btn-secondary btn-load-more';
            btn.id = 'experiencesLoadMoreBtn';
            const loadMoreText = (translations[currentLang] && translations[currentLang].experiences && translations[currentLang].experiences.loadMore) ? translations[currentLang].experiences.loadMore : 'Voir plus';
            const loadLessText = (translations[currentLang] && translations[currentLang].experiences && translations[currentLang].experiences.loadLess) ? translations[currentLang].experiences.loadLess : 'Voir moins';
            btn.innerHTML = '<i class="fas fa-chevron-down"></i> <span class="btn-load-more-text">' + loadMoreText + '</span>';
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                let v = parseInt(listEl.dataset.visibleCount || '0', 10);
                const isShowingMore = v < totalExperiences;
                if (isShowingMore) {
                    v = Math.min(v + 3, totalExperiences);
                    listEl.dataset.visibleCount = String(v);
                    for (let i = 0; i < listEl.children.length; i++) {
                        listEl.children[i].classList.toggle('item-over-limit', i >= v);
                    }
                    btn.querySelector('.btn-load-more-text').textContent = v >= totalExperiences ? loadLessText : loadMoreText;
                    btn.querySelector('i').className = v >= totalExperiences ? 'fas fa-chevron-up' : 'fas fa-chevron-down';
                } else {
                    listEl.dataset.visibleCount = String(INITIAL_DISPLAY_COUNT);
                    for (let i = 0; i < listEl.children.length; i++) {
                        listEl.children[i].classList.toggle('item-over-limit', i >= INITIAL_DISPLAY_COUNT);
                    }
                    btn.querySelector('.btn-load-more-text').textContent = loadMoreText;
                    btn.querySelector('i').className = 'fas fa-chevron-down';
                }
                const experiencesSection = document.getElementById('experiences');
                if (experiencesSection) experiencesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
            wrap.appendChild(btn);
            container.appendChild(wrap);
        }
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
function createExperienceItem(exp) {
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
    return item;
}

// ============================================
// CHARGEMENT DES ARTICLES
// ============================================

/**
 * Charge les articles depuis articles.json et localStorage, puis les affiche
 */
async function loadArticles() {
    const articlesList = document.getElementById('articlesList');
    
    if (!articlesList) {
        console.error('Élément articlesList non trouvé');
        return;
    }
    
    try {
        // Charger les articles depuis le fichier JSON
        const response = await fetch('articles.json');
        let jsonArticles = [];
        
        if (response.ok) {
            jsonArticles = await response.json();
        }
        
        // Charger les articles depuis localStorage
        const localArticles = getLocalArticles();
        
        // Combiner les deux listes (articles locaux en premier)
        const allArticles = [...localArticles, ...jsonArticles];
        
        if (allArticles.length === 0) {
            const noArticlesText = (translations[currentLang] && translations[currentLang].articles && translations[currentLang].articles.noArticles) 
                ? translations[currentLang].articles.noArticles 
                : 'Aucun article disponible pour le moment.';
            articlesList.innerHTML = `<p class="loading">${noArticlesText}</p>`;
            return;
        }
        
        articlesList.innerHTML = '';
        articlesList.dataset.visibleCount = String(INITIAL_DISPLAY_COUNT);
        const totalArticles = allArticles.length;
        allArticles.forEach((article, index) => {
            const articleItem = createArticleItem(article);
            if (index >= INITIAL_DISPLAY_COUNT) articleItem.classList.add('item-over-limit');
            articlesList.appendChild(articleItem);
        });
        const container = articlesList.parentNode;
        const existingBtn = document.getElementById('articlesLoadMoreBtn');
        if (existingBtn && existingBtn.parentNode) existingBtn.parentNode.remove();
        if (totalArticles > INITIAL_DISPLAY_COUNT) {
            const wrap = document.createElement('div');
            wrap.className = 'load-more-wrap';
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'btn btn-secondary btn-load-more';
            btn.id = 'articlesLoadMoreBtn';
            const loadMoreText = (translations[currentLang] && translations[currentLang].articles && translations[currentLang].articles.loadMore) ? translations[currentLang].articles.loadMore : 'Voir plus';
            const loadLessText = (translations[currentLang] && translations[currentLang].articles && translations[currentLang].articles.loadLess) ? translations[currentLang].articles.loadLess : 'Voir moins';
            btn.innerHTML = '<i class="fas fa-chevron-down"></i> <span class="btn-load-more-text">' + loadMoreText + '</span>';
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                let v = parseInt(articlesList.dataset.visibleCount || '0', 10);
                const isShowingMore = v < totalArticles;
                if (isShowingMore) {
                    v = Math.min(v + 3, totalArticles);
                    articlesList.dataset.visibleCount = String(v);
                    for (let i = 0; i < articlesList.children.length; i++) {
                        articlesList.children[i].classList.toggle('item-over-limit', i >= v);
                    }
                    btn.querySelector('.btn-load-more-text').textContent = v >= totalArticles ? loadLessText : loadMoreText;
                    btn.querySelector('i').className = v >= totalArticles ? 'fas fa-chevron-up' : 'fas fa-chevron-down';
                } else {
                    articlesList.dataset.visibleCount = String(INITIAL_DISPLAY_COUNT);
                    for (let i = 0; i < articlesList.children.length; i++) {
                        articlesList.children[i].classList.toggle('item-over-limit', i >= INITIAL_DISPLAY_COUNT);
                    }
                    btn.querySelector('.btn-load-more-text').textContent = loadMoreText;
                    btn.querySelector('i').className = 'fas fa-chevron-down';
                }
                var articlesSection = document.getElementById('articles');
                if (articlesSection) articlesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
            wrap.appendChild(btn);
            container.appendChild(wrap);
        }
        
    } catch (error) {
        console.error('Erreur lors du chargement des articles:', error);
        if (articlesList) {
            articlesList.innerHTML = `
                <p class="loading" style="color: #ef4444;">
                    Erreur lors du chargement des articles. 
                    Vérifiez que le fichier articles.json existe et est valide.
                </p>
            `;
        }
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
function createArticleItem(article) {
    const item = document.createElement('div');
    item.className = 'article-item';
    
    const readArticleText = (translations[currentLang] && translations[currentLang].articles && translations[currentLang].articles.readArticle) 
        ? translations[currentLang].articles.readArticle 
        : 'Lire l\'article';
    const descriptionHtml = formatDescriptionAsParagraphs(article.description);
    item.innerHTML = `
        <h3 class="article-title">
            <a href="${article.link}" target="_blank" rel="noopener">${article.title}</a>
        </h3>
        <div class="article-description description-block">${descriptionHtml}</div>
        <a href="${article.link}" target="_blank" rel="noopener" class="article-link">
            ${readArticleText} <i class="fas fa-arrow-right"></i>
        </a>
    `;
    
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
        const response = await fetch('skills.json');
        if (!response.ok) {
            throw new Error('Impossible de charger les compétences');
        }
        
        const skillsData = await response.json();
        
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
            skills.forEach(skill => {
                const skillElement = createSkillItem(skill);
                container.appendChild(skillElement);
            });
        }
        
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
 * Crée un élément de compétence avec pourcentage ; si skill.link est défini, toute la carte est cliquable (ouverture dans un nouvel onglet).
 * @param {Object} skill - Données de la compétence (name, icon, level, link?)
 * @returns {HTMLElement} - Élément HTML de la compétence (a ou div)
 */
function createSkillItem(skill) {
    const hasLink = skill.link && typeof skill.link === 'string' && skill.link.trim() !== '';
    const tag = hasLink ? 'a' : 'div';
    const skillItem = document.createElement(tag);
    skillItem.className = 'skill-item' + (hasLink ? ' skill-item--link' : '');
    if (hasLink) {
        skillItem.href = skill.link.trim();
        skillItem.target = '_blank';
        skillItem.rel = 'noopener noreferrer';
        skillItem.setAttribute('title', 'Ouvrir ' + skill.name);
    }
    const certifiedText = (translations[currentLang] && translations[currentLang].skills && translations[currentLang].skills.certified) ? translations[currentLang].skills.certified : 'Certifié';
    const badgeText = skill.certification ? certifiedText : (skill.level + '%');
    skillItem.innerHTML = `
        <i class="${skill.icon}"></i>
        <span class="skill-name">${skill.name}</span>
        <span class="skill-percentage">${badgeText}</span>
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
    const animatedElements = document.querySelectorAll('.section, .skill-category, .project-card, .article-item, .experience-item');
    
    
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
    if (langDropdown) {
        langDropdown.classList.remove('active');
    }
    
    // Recharger les projets, expériences et articles pour mettre à jour les textes dynamiques
    loadProjects();
    loadExperiences();
    loadArticles();
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
        });
        
        // Fermer le menu en cliquant ailleurs
        document.addEventListener('click', function() {
            langDropdown.classList.remove('active');
        });
        
        // Empêcher la fermeture en cliquant dans le menu
        langDropdown.addEventListener('click', function(e) {
            e.stopPropagation();
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
    
    // Ouvrir le panneau d'administration (réinitialiser le mode édition)
    if (adminBtn && adminPanel) {
        adminBtn.addEventListener('click', function() {
            adminPanel.style.display = 'flex';
            if (addArticleForm) {
                addArticleForm.dataset.editingIndex = '';
                addArticleForm.reset();
                const submitBtn = document.getElementById('articleSubmitBtn');
                if (submitBtn) submitBtn.innerHTML = '<i class="fas fa-plus"></i> Ajouter l\'article';
            }
            updateLocalArticlesList();
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
    if (addArticleForm) {
        addArticleForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const title = document.getElementById('articleTitle').value;
            const description = document.getElementById('articleDescription').value;
            const link = document.getElementById('articleLink').value;
            const date = document.getElementById('articleDate').value || new Date().toISOString().split('T')[0];
            const article = { title: title, description: description, link: link, date: date };
            const editingIndex = addArticleForm.dataset.editingIndex;
            if (editingIndex !== undefined && editingIndex !== '') {
                const articles = getLocalArticles();
                articles[parseInt(editingIndex, 10)] = article;
                localStorage.setItem('portfolio-articles', JSON.stringify(articles));
                addArticleForm.dataset.editingIndex = '';
                addArticleForm.reset();
                const submitBtn = document.getElementById('articleSubmitBtn');
                if (submitBtn) submitBtn.innerHTML = '<i class="fas fa-plus"></i> Ajouter l\'article';
                showToast('Article mis à jour !', 'success');
            } else {
                saveLocalArticle(article);
                addArticleForm.reset();
                showToast('Article ajouté avec succès !', 'success');
            }
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
}

/**
 * Met à jour la liste des articles locaux dans le panneau d'administration
 */
function updateLocalArticlesList() {
    const localArticlesList = document.getElementById('localArticlesList');
    if (!localArticlesList) return;
    
    const articles = getLocalArticles();
    
    if (articles.length === 0) {
        localArticlesList.innerHTML = '<p style="color: var(--text-secondary);">Aucun article ajouté localement.</p>';
        return;
    }
    
    localArticlesList.innerHTML = articles.map((article, index) => `
        <div class="admin-article-item">
            <div class="admin-article-info">
                <strong>${article.title}</strong>
                <p>${article.description}</p>
                <small>${article.date || 'Date non spécifiée'}</small>
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
            const articles = getLocalArticles();
            const a = articles[index];
            if (!a) return;
            document.getElementById('articleTitle').value = a.title || '';
            document.getElementById('articleDescription').value = a.description || '';
            document.getElementById('articleLink').value = a.link || '';
            document.getElementById('articleDate').value = a.date || '';
            addArticleForm.dataset.editingIndex = String(index);
            if (articleSubmitBtn) articleSubmitBtn.innerHTML = '<i class="fas fa-save"></i> Mettre à jour';
        });
    });
    localArticlesList.querySelectorAll('.btn-remove-article').forEach(btn => {
        btn.addEventListener('click', function() {
            const index = parseInt(this.getAttribute('data-index'), 10);
            if (addArticleForm && addArticleForm.dataset.editingIndex === String(index)) {
                addArticleForm.reset();
                addArticleForm.dataset.editingIndex = '';
                if (articleSubmitBtn) articleSubmitBtn.innerHTML = '<i class="fas fa-plus"></i> Ajouter l\'article';
            }
            const articles = getLocalArticles();
            articles.splice(index, 1);
            localStorage.setItem('portfolio-articles', JSON.stringify(articles));
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
        addProjectForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const title = document.getElementById('projectTitle').value;
            const description = document.getElementById('projectDescription').value;
            const image = document.getElementById('projectImage').value.trim() || null;
            const technologiesInput = document.getElementById('projectTechnologies').value;
            const technologies = technologiesInput ? technologiesInput.split(',').map(t => t.trim()).filter(Boolean) : [];
            const github = document.getElementById('projectGithub').value.trim() || null;
            const demo = document.getElementById('projectDemo').value.trim() || null;
            const cardano = document.getElementById('projectCardano').checked;
            const project = { title: title, description: description, image: image, technologies: technologies, github: github, demo: demo, cardano: cardano };
            const editingIndex = addProjectForm.dataset.editingIndex;
            if (editingIndex !== undefined && editingIndex !== '') {
                const projects = getLocalProjects();
                projects[parseInt(editingIndex, 10)] = project;
                localStorage.setItem('portfolio-projects', JSON.stringify(projects));
                addProjectForm.dataset.editingIndex = '';
                addProjectForm.reset();
                const submitBtn = document.getElementById('projectSubmitBtn');
                if (submitBtn) submitBtn.innerHTML = '<i class="fas fa-plus"></i> Ajouter le projet';
                showToast('Projet mis à jour !', 'success');
            } else {
                saveLocalProject(project);
                addProjectForm.reset();
                showToast('Projet ajouté avec succès !', 'success');
            }
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
    
    const projects = getLocalProjects();
    
    if (projects.length === 0) {
        localProjectsList.innerHTML = '<p style="color: var(--text-secondary);">Aucun projet ajouté localement.</p>';
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
            const projects = getLocalProjects();
            const p = projects[index];
            if (!p) return;
            document.getElementById('projectTitle').value = p.title || '';
            document.getElementById('projectDescription').value = p.description || '';
            document.getElementById('projectImage').value = p.image || '';
            document.getElementById('projectTechnologies').value = (p.technologies && p.technologies.length) ? p.technologies.join(', ') : '';
            document.getElementById('projectGithub').value = p.github || '';
            document.getElementById('projectDemo').value = p.demo || '';
            document.getElementById('projectCardano').checked = !!p.cardano;
            addProjectForm.dataset.editingIndex = String(index);
            if (projectSubmitBtn) projectSubmitBtn.innerHTML = '<i class="fas fa-save"></i> Mettre à jour';
        });
    });
    localProjectsList.querySelectorAll('.btn-remove-project').forEach(btn => {
        btn.addEventListener('click', function() {
            const index = parseInt(this.getAttribute('data-index'), 10);
            if (addProjectForm && addProjectForm.dataset.editingIndex === String(index)) {
                addProjectForm.reset();
                addProjectForm.dataset.editingIndex = '';
                if (projectSubmitBtn) projectSubmitBtn.innerHTML = '<i class="fas fa-plus"></i> Ajouter le projet';
            }
            const projects = getLocalProjects();
            projects.splice(index, 1);
            localStorage.setItem('portfolio-projects', JSON.stringify(projects));
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
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            const experience = {
                title: document.getElementById('experienceTitle').value,
                organization: document.getElementById('experienceOrganization').value.trim() || null,
                description: document.getElementById('experienceDescription').value,
                period: document.getElementById('experiencePeriod').value.trim() || null,
                link: document.getElementById('experienceLink').value.trim() || null
            };
            const editingIndex = form.dataset.editingIndex;
            if (editingIndex !== undefined && editingIndex !== '') {
                const list = getLocalExperiences();
                list[parseInt(editingIndex, 10)] = experience;
                localStorage.setItem('portfolio-experiences', JSON.stringify(list));
                form.dataset.editingIndex = '';
                form.reset();
                const submitBtn = document.getElementById('experienceSubmitBtn');
                if (submitBtn) submitBtn.innerHTML = '<i class="fas fa-plus"></i> Ajouter l\'expérience';
                showToast('Expérience mise à jour !', 'success');
            } else {
                saveLocalExperience(experience);
                form.reset();
                showToast('Expérience ajoutée avec succès !', 'success');
            }
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
    const experiences = getLocalExperiences();
    if (experiences.length === 0) {
        list.innerHTML = '<p style="color: var(--text-secondary);">Aucune expérience ajoutée localement.</p>';
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
            const arr = getLocalExperiences();
            const exp = arr[index];
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
        btn.addEventListener('click', function() {
            const index = parseInt(this.getAttribute('data-index'), 10);
            if (addExperienceForm && addExperienceForm.dataset.editingIndex === String(index)) {
                addExperienceForm.reset();
                addExperienceForm.dataset.editingIndex = '';
                if (experienceSubmitBtn) experienceSubmitBtn.innerHTML = '<i class="fas fa-plus"></i> Ajouter l\'expérience';
            }
            const arr = getLocalExperiences();
            arr.splice(index, 1);
            localStorage.setItem('portfolio-experiences', JSON.stringify(arr));
            loadExperiences();
            updateLocalExperiencesList();
            showToast('Expérience supprimée.', 'info');
        });
    });
}


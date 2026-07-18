/**
 * Markdown (descriptions projets / expériences / articles) + images inline (upload://) + insertion d’image dans l’éditeur.
 * Chargé après js/article-slugs.js, avant script.js (pas de bundler).
 */
const INLINE_UPLOADS_STORAGE_KEY = 'portfolio-inline-uploads';

function getInlineUploadsMap() {
    try {
        const raw = localStorage.getItem(INLINE_UPLOADS_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : {};
        if (!parsed || typeof parsed !== 'object') return {};
        return parsed;
    } catch (_err) {
        return {};
    }
}

function setInlineUploadsMap(map) {
    try {
        localStorage.setItem(INLINE_UPLOADS_STORAGE_KEY, JSON.stringify(map || {}));
    } catch (_err) {
        // Ignore les erreurs de quota/stockage.
    }
}

function rememberInlineUpload(token, dataUrl) {
    if (!token || !dataUrl) return;
    const map = getInlineUploadsMap();
    map[token] = dataUrl;
    setInlineUploadsMap(map);
}

function resolveInlineUploadSource(src) {
    const candidate = String(src || '').trim();
    if (!candidate.startsWith('upload://')) return candidate;
    const map = getInlineUploadsMap();
    return map[candidate] || candidate;
}

function sanitizeUploadFilename(name) {
    return String(name || 'image')
        .toLowerCase()
        .replace(/[^a-z0-9._-]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') || 'image';
}

function buildInlineUploadToken(fileName) {
    const safeName = sanitizeUploadFilename(fileName);
    const seed = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
    return `upload://${seed}-${safeName}`;
}

function readFileAsDataUrl(file) {
    return new Promise(function (resolve, reject) {
        const reader = new FileReader();
        reader.onload = function () { resolve(String(reader.result || '')); };
        reader.onerror = function () { reject(new Error('read_failed')); };
        reader.readAsDataURL(file);
    });
}

function getImageSizeFromDataUrl(dataUrl) {
    const out = { width: 0, height: 0 };
    const m = String(dataUrl || '').match(/^data:image\/[^;]+;base64,/i);
    if (!m) return out;
    const b64 = dataUrl.slice(m[0].length);
    if (!b64) return out;
    try {
        const bin = atob(b64);
        if (bin.length < 24) return out;
        if (bin.charCodeAt(0) === 0x89 && bin.charCodeAt(1) === 0x50 && bin.charCodeAt(2) === 0x4E && bin.charCodeAt(3) === 0x47) {
            out.width = ((bin.charCodeAt(16) << 24) | (bin.charCodeAt(17) << 16) | (bin.charCodeAt(18) << 8) | bin.charCodeAt(19)) >>> 0;
            out.height = ((bin.charCodeAt(20) << 24) | (bin.charCodeAt(21) << 16) | (bin.charCodeAt(22) << 8) | bin.charCodeAt(23)) >>> 0;
            return out;
        }
        let i = 2;
        while (i + 9 < bin.length) {
            if (bin.charCodeAt(i) !== 0xFF) break;
            const marker = bin.charCodeAt(i + 1);
            const len = (bin.charCodeAt(i + 2) << 8) + bin.charCodeAt(i + 3);
            if ((marker >= 0xC0 && marker <= 0xC3) || (marker >= 0xC5 && marker <= 0xC7) || (marker >= 0xC9 && marker <= 0xCB) || (marker >= 0xCD && marker <= 0xCF)) {
                out.height = (bin.charCodeAt(i + 5) << 8) + bin.charCodeAt(i + 6);
                out.width = (bin.charCodeAt(i + 7) << 8) + bin.charCodeAt(i + 8);
                return out;
            }
            if (len <= 0) break;
            i += 2 + len;
        }
    } catch (_err) {
        return out;
    }
    return out;
}

/**
 * Formate le formatage inline : **gras**, *italique*, __souligné__
 * À appliquer sur du texte déjà échappé HTML.
 */
function applyInlineFormatting(escapedText) {
    return escapedText
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/__([\s\S]+?)__/g, '<u>$1</u>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>');
}

function markdownInlineToHtml(text) {
    const escape = (s) => String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    const buildImageTag = (rawAlt, rawSrc) => {
        const srcResolved = resolveInlineUploadSource(rawSrc);
        const altWithSize = String(rawAlt || '').trim();
        const sizeMatch = altWithSize.match(/^(.*?)(?:\|(\d{1,4})x(\d{1,4}))?$/i);
        const altText = sizeMatch ? sizeMatch[1].trim() : altWithSize;
        const width = sizeMatch && sizeMatch[2] ? parseInt(sizeMatch[2], 10) : 0;
        const height = sizeMatch && sizeMatch[3] ? parseInt(sizeMatch[3], 10) : 0;
        const safeSrc = escape(srcResolved || String(rawSrc || ''));
        const safeAlt = escape(altText);
        const widthAttr = width > 0 ? ` width="${width}"` : '';
        const heightAttr = height > 0 ? ` height="${height}"` : '';
        return `<img src="${safeSrc}" alt="${safeAlt}" loading="lazy" class="description-inline-image"${widthAttr}${heightAttr}>`;
    };
    let out = escape(text || '');
    out = out.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, function (_m, alt, src) {
        return buildImageTag(alt, src);
    });
    out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    out = out.replace(/__([\s\S]+?)__/g, '<u>$1</u>');
    out = out.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
    return out;
}

function parseMarkdownTableRow(line) {
    const trimmed = String(line || '').trim();
    if (!trimmed.includes('|')) return null;
    const normalized = trimmed.replace(/^\|/, '').replace(/\|$/, '');
    const cells = normalized.split('|').map(function (cell) { return cell.trim(); });
    if (!cells.length) return null;
    return cells;
}

function isMarkdownTableSeparator(line) {
    const cells = parseMarkdownTableRow(line);
    if (!cells || !cells.length) return false;
    return cells.every(function (cell) {
        return /^:?-{3,}:?$/.test(cell);
    });
}

function markdownToHtml(md) {
    if (!md || typeof md !== 'string') return '';
    const lines = md.replace(/\r\n/g, '\n').split('\n');
    const out = [];
    let inUl = false;
    let ulMarker = '';
    let inOl = false;
    let inCode = false;
    let codeLang = '';
    let codeLines = [];
    let para = [];
    let hasRenderedBlock = false;
    const escape = (s) => String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    const flushPara = () => {
        if (!para.length) return;
        out.push('<p class="description-para">' + markdownInlineToHtml(para.join('<br>')) + '</p>');
        para = [];
        hasRenderedBlock = true;
    };
    const flushCode = () => {
        if (!inCode) return;
        const langClass = codeLang ? ` language-${escape(codeLang)}` : '';
        out.push(`<pre class="description-code"><code class="${langClass.trim()}">${escape(codeLines.join('\n'))}</code></pre>`);
        inCode = false;
        codeLang = '';
        codeLines = [];
        hasRenderedBlock = true;
    };
    const closeLists = () => {
        if (inUl) { out.push('</ul>'); inUl = false; ulMarker = ''; }
        if (inOl) { out.push('</ol>'); inOl = false; }
    };
    const isCustomBulletMarker = (marker) => !['-', '*', '+'].includes(marker);
    const escapeAttrMarker = (s) => String(s)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        const trimEnd = line.replace(/\s+$/g, '');
        const codeFence = trimmed.match(/^```([\w-]+)?\s*$/);
        if (codeFence) {
            flushPara();
            closeLists();
            if (inCode) {
                flushCode();
            } else {
                inCode = true;
                codeLang = codeFence[1] || '';
                codeLines = [];
            }
            continue;
        }
        if (inCode) {
            codeLines.push(line);
            continue;
        }
        if (trimmed === '') {
            flushPara();
            closeLists();
            continue;
        }
        if (/^([-*_])(?:\s*\1){2,}\s*$/.test(trimmed)) {
            flushPara();
            closeLists();
            out.push('<hr class="description-hr">');
            hasRenderedBlock = true;
            continue;
        }
        const h = trimmed.match(/^(#{1,6})\s+(.+)$/);
        if (h) {
            flushPara(); closeLists();
            const level = h[1].length;
            out.push(`<h${level}>${markdownInlineToHtml(h[2])}</h${level}>`);
            hasRenderedBlock = true;
            continue;
        }
        const bq = trimmed.match(/^>\s?(.*)$/);
        if (bq) {
            flushPara(); closeLists();
            out.push('<blockquote>' + markdownInlineToHtml(bq[1]) + '</blockquote>');
            hasRenderedBlock = true;
            continue;
        }
        const alignInlineMatch = trimmed.match(/^\[\s*(left|center|right|justify)\s*\](.*)\[\s*\/\s*\1\s*\]$/i);
        if (alignInlineMatch) {
            flushPara();
            closeLists();
            out.push('<p class="description-para description-para--' + alignInlineMatch[1].toLowerCase() + '">' + markdownInlineToHtml(alignInlineMatch[2].trim()) + '</p>');
            hasRenderedBlock = true;
            continue;
        }
        const alignOpenMatch = trimmed.match(/^\[\s*(left|center|right|justify)\s*\]$/i);
        if (alignOpenMatch) {
            flushPara();
            closeLists();
            const align = alignOpenMatch[1].toLowerCase();
            const collected = [];
            let j = i + 1;
            while (j < lines.length) {
                const candidate = String(lines[j] || '').trim();
                if (new RegExp('^\\[\\s*/\\s*' + align + '\\s*\\]$', 'i').test(candidate)) break;
                collected.push(lines[j]);
                j += 1;
            }
            if (j < lines.length) {
                const inner = collected.join('\n').trim();
                const innerHtml = inner ? markdownInlineToHtml(inner).replace(/\n/g, '<br>') : '';
                out.push('<p class="description-para description-para--' + align + '">' + innerHtml + '</p>');
                hasRenderedBlock = true;
                i = j;
                continue;
            }
        }
        const nextLine = i + 1 < lines.length ? lines[i + 1] : '';
        const headerCells = parseMarkdownTableRow(line);
        if (headerCells && isMarkdownTableSeparator(nextLine)) {
            flushPara();
            closeLists();
            const bodyRows = [];
            let j = i + 2;
            while (j < lines.length) {
                const rowLine = lines[j];
                if (!rowLine || !rowLine.trim()) break;
                const rowCells = parseMarkdownTableRow(rowLine);
                if (!rowCells) break;
                bodyRows.push(rowCells);
                j += 1;
            }
            let tableHtml = '<div class="description-table-wrap"><table class="description-table"><thead><tr>';
            tableHtml += headerCells.map(function (cell) {
                return '<th>' + markdownInlineToHtml(cell) + '</th>';
            }).join('');
            tableHtml += '</tr></thead><tbody>';
            tableHtml += bodyRows.map(function (row) {
                const cells = row.slice(0, headerCells.length);
                while (cells.length < headerCells.length) cells.push('');
                return '<tr>' + cells.map(function (cell) {
                    return '<td>' + markdownInlineToHtml(cell) + '</td>';
                }).join('') + '</tr>';
            }).join('');
            tableHtml += '</tbody></table></div>';
            out.push(tableHtml);
            hasRenderedBlock = true;
            i = j - 1;
            continue;
        }
        const ul = trimmed.match(/^([-*+•◦▪→✓.])\s+(.+)$/);
        if (ul) {
            flushPara();
            if (inOl) { out.push('</ol>'); inOl = false; }
            const marker = ul[1];
            const itemText = ul[2];
            const custom = isCustomBulletMarker(marker);
            if (!inUl || ulMarker !== marker) {
                if (inUl) out.push('</ul>');
                out.push('<ul class="description-list' + (custom ? ' description-list--custom' : '') + '">');
                inUl = true;
                ulMarker = marker;
            }
            if (custom) {
                out.push('<li><span class="description-list-marker">' + escapeAttrMarker(marker) + '</span><span>' + markdownInlineToHtml(itemText) + '</span></li>');
            } else {
                out.push('<li>' + markdownInlineToHtml(itemText) + '</li>');
            }
            hasRenderedBlock = true;
            continue;
        }
        const ol = trimmed.match(/^((?:\d+|[a-zA-Z]|[ivxlcdmIVXLCDM]+)[.)])\s+(.+)$/);
        if (ol) {
            flushPara();
            if (inUl) { out.push('</ul>'); inUl = false; }
            if (!inOl) { out.push('<ol class="description-list">'); inOl = true; }
            out.push('<li>' + markdownInlineToHtml(ol[2]) + '</li>');
            hasRenderedBlock = true;
            continue;
        }
        if (!hasRenderedBlock && para.length === 0 && trimmed.length <= 120) {
            out.push('<h2 class="description-main-title">' + markdownInlineToHtml(trimmed) + '</h2>');
            hasRenderedBlock = true;
            continue;
        }
        para.push(trimEnd);
    }
    flushPara();
    closeLists();
    flushCode();
    return out.join('');
}

/**
 * Remplace les tirets longs (—, –) par une virgule pour l'affichage public.
 */
function sanitizeDisplayDashes(text) {
    if (text == null) return '';
    if (typeof text !== 'string') return String(text);
    return text
        .replace(/\s*[\u2014\u2013]\s*/g, ', ')
        .replace(/,\s*,+/g, ', ')
        .replace(/,\s+\./g, '.')
        .replace(/\s{2,}/g, ' ')
        .trim();
}

/**
 * Formate un texte description en HTML avec paragraphes, listes et formatage (gras, italique, souligné).
 */
function formatDescriptionAsParagraphs(description) {
    if (!description || typeof description !== 'string') return '';
    description = sanitizeDisplayDashes(description);
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
        const imageOnly = block.match(/^!\[([^\]]*)\]\(([^)\s]+)\)$/i);
        if (imageOnly) {
            const altWithSize = String(imageOnly[1] || '');
            const sizeMatch = altWithSize.match(/^(.*?)(?:\|(\d{1,4})x(\d{1,4}))?$/i);
            const alt = escape(sizeMatch ? sizeMatch[1].trim() : 'Image');
            const srcResolved = resolveInlineUploadSource(imageOnly[2]);
            const src = escape(srcResolved || '');
            const width = sizeMatch && sizeMatch[2] ? parseInt(sizeMatch[2], 10) : 0;
            const height = sizeMatch && sizeMatch[3] ? parseInt(sizeMatch[3], 10) : 0;
            const widthAttr = width > 0 ? ` width="${width}"` : '';
            const heightAttr = height > 0 ? ` height="${height}"` : '';
            out.push(`<figure class="description-figure"><img src="${src}" alt="${alt}" loading="lazy" class="description-inline-image"${widthAttr}${heightAttr}></figure>`);
            continue;
        }
        const alignMatch = block.match(/^\[(left|center|right|justify)\]([\s\S]*)\[\/\1\]$/i);
        let paraClass = 'description-para';
        let blockContent = block;
        if (alignMatch) {
            const align = alignMatch[1].toLowerCase();
            blockContent = alignMatch[2].trim();
            paraClass += ' description-para--' + align;
        }
        const lines = block.split(/\n/).map(l => l.trimEnd());
        const isList = lines.every(l => l === '' || /^[-*]\s/.test(l));
        if (isList && lines.some(l => l.length > 0)) {
            const items = lines.filter(l => l.length > 0).map(l => {
                const content = l.replace(/^[-*]\s+/, '');
                return '<li>' + applyInlineFormatting(escape(content).replace(/\n/g, ' ')) + '</li>';
            }).join('');
            out.push('<ul class="description-list">' + items + '</ul>');
        } else {
            const escaped = escape(blockContent).replace(/\n/g, '<br>');
            out.push('<p class="' + paraClass + '">' + applyInlineFormatting(escaped) + '</p>');
        }
    }
    return out.join('');
}

function insertMarkdownImageFileAtCursor(textarea, file) {
    if (!file || !file.type || !file.type.startsWith('image/')) return;
    (async function () {
        try {
            const dataUrl = await readFileAsDataUrl(file);
            if (!dataUrl) return;
            if (typeof window.uploadPortfolioInlineImage !== 'function') {
                if (typeof showToast === 'function') showToast('Upload Supabase indisponible.', 'info');
                return;
            }
            const uploaded = await window.uploadPortfolioInlineImage(file, { pathPrefix: 'articles/inline' });
            if (!uploaded || !uploaded.ok || !uploaded.url) {
                const reason = uploaded && uploaded.reason ? String(uploaded.reason) : 'upload_failed';
                if (typeof showToast === 'function') showToast('Upload image impossible : ' + reason, 'info');
                return;
            }
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const text = textarea.value;
            const alt = (file.name || 'image').replace(/\.[^.]+$/, '');
            const dims = getImageSizeFromDataUrl(dataUrl);
            const altWithSize = dims.width > 0 && dims.height > 0 ? `${alt}|${dims.width}x${dims.height}` : alt;
            const markdown = `![${altWithSize}](${String(uploaded.url)})`;
            textarea.value = text.slice(0, start) + markdown + text.slice(end);
            textarea.selectionStart = textarea.selectionEnd = start + markdown.length;
            textarea.focus();
            if (typeof refreshArticleEditorPreview === 'function') refreshArticleEditorPreview();
            if (typeof showToast === 'function') showToast('Image envoyée sur Supabase et insérée.', 'success');
        } catch (_err) {
            if (typeof showToast === 'function') showToast('Erreur lors de l’insertion de l’image.', 'info');
        }
    })();
}

# ⚡ Référence Rapide - Configuration Vercel

## 📋 Valeurs exactes à utiliser

Lors de la configuration de votre projet sur Vercel, utilisez ces valeurs :

```
┌─────────────────────────────────────────────┐
│  Framework Preset:     Other               │
│  Root Directory:       ./                   │
│  Build Command:        (LAISSER VIDE)      │
│  Output Directory:     (LAISSER VIDE)      │
│  Install Command:      npm install         │
│  Environment Variables: (AUCUNE)            │
└─────────────────────────────────────────────┘
```

---

## ✅ Configuration Recommandée

| Paramètre | Valeur | Notes |
|-----------|--------|-------|
| **Framework Preset** | `Other` | ⚠️ Important : Ne pas choisir "Next.js" ou autre |
| **Root Directory** | `./` | Ou laissez vide si votre projet est à la racine |
| **Build Command** | *(vide)* | ⚠️ Très important : Ne rien mettre |
| **Output Directory** | *(vide)* | ⚠️ Très important : Ne rien mettre |
| **Install Command** | `npm install` | Valeur par défaut, laissez tel quel |
| **Environment Variables** | *(aucune)* | Pas nécessaire pour votre portfolio actuel |

---

## 🎯 Pourquoi ces valeurs ?

### Framework Preset = `Other`
- Votre portfolio est un site statique (HTML/CSS/JS)
- Pas de framework (React, Vue, Next.js, etc.)
- Vercel doit le traiter comme un site statique simple

### Build Command = *(vide)*
- Pas de compilation nécessaire
- Les fichiers sont déjà prêts
- Vercel servira directement vos fichiers HTML/CSS/JS

### Output Directory = *(vide)*
- Vercel cherche `index.html` à la racine
- Pas de dossier `dist/` ou `build/` à spécifier
- Les fichiers sont déjà à la bonne place

### Root Directory = `./`
- Votre projet est à la racine du repository GitHub
- `./` signifie "dossier actuel"
- Si vous laissez vide, Vercel comprendra aussi

---

## ⚠️ Erreurs courantes à éviter

❌ **NE PAS** mettre "Next.js" comme Framework Preset  
✅ **UTILISER** "Other"

❌ **NE PAS** mettre une commande de build  
✅ **LAISSER VIDE**

❌ **NE PAS** mettre "dist" ou "build" dans Output Directory  
✅ **LAISSER VIDE**

---

## 🚀 Après la configuration

Une fois ces valeurs configurées :

1. Cliquez sur **"Deploy"**
2. Attendez 1-2 minutes
3. Votre site sera en ligne !

---

**Pour plus de détails** : Consultez [CONFIGURATION_VERCEL.md](CONFIGURATION_VERCEL.md)


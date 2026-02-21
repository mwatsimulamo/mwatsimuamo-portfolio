# ⚙️ Guide de Configuration Vercel - Paramètres Détaillés

Ce guide vous explique en détail comment configurer chaque paramètre lors du déploiement de votre portfolio sur Vercel.

---

## 📋 Vue d'ensemble des paramètres

Lors de l'import de votre projet sur Vercel, vous verrez une page de configuration avec plusieurs options. Voici comment les remplir pour votre portfolio :

---

## 1️⃣ Framework Preset (Application Preset)

### 🔍 Qu'est-ce que c'est ?
Vercel détecte automatiquement le type de framework utilisé dans votre projet.

### ✅ Configuration pour votre Portfolio

**Option recommandée :**
```
Other
```
ou
```
Static Site
```

### 📝 Pourquoi ?
- Votre portfolio est un site statique (HTML, CSS, JavaScript)
- Pas de framework (React, Vue, Next.js, etc.)
- Pas besoin de build process

### ⚠️ Si Vercel détecte autre chose :
- Si Vercel détecte "Next.js" ou autre : **Changez manuellement en "Other"**
- Votre projet n'utilise pas de framework, donc "Other" est le bon choix

---

## 2️⃣ Root Directory

### 🔍 Qu'est-ce que c'est ?
Le dossier racine où se trouve votre projet. C'est le dossier qui contient `index.html`.

### ✅ Configuration pour votre Portfolio

**Option recommandée :**
```
./
```
ou
```
/
```
ou
```
(laisser vide)
```

### 📝 Explication
- `./` signifie "dossier actuel" (racine du repository)
- Si votre `index.html` est à la racine du repository GitHub, laissez vide ou mettez `./`
- Si votre projet était dans un sous-dossier (ex: `portfolio/`), vous mettriez `portfolio/`

### ✅ Vérification
Votre structure devrait être :
```
mon-portfolio/          ← Root Directory pointe ici
├── index.html          ← Fichier principal
├── style.css
├── script.js
├── assets/
└── ...
```

**Donc : Root Directory = `./` ou laissez vide**

---

## 3️⃣ Build Command

### 🔍 Qu'est-ce que c'est ?
La commande à exécuter pour "construire" votre projet avant le déploiement.

### ✅ Configuration pour votre Portfolio

**Option recommandée :**
```
(laisser vide)
```

### 📝 Pourquoi ?
- Votre portfolio est un site statique
- Pas besoin de compilation ou de build
- Les fichiers sont déjà prêts à être servis

### ⚠️ Si vous voulez quand même mettre quelque chose :
```
echo "No build needed"
```
Mais ce n'est **pas nécessaire** - laissez vide.

---

## 4️⃣ Output Directory (Build Outputs)

### 🔍 Qu'est-ce que c'est ?
Le dossier contenant les fichiers finaux à déployer après le build.

### ✅ Configuration pour votre Portfolio

**Option recommandée :**
```
(laisser vide)
```

### 📝 Pourquoi ?
- Pour un site statique, Vercel sert directement les fichiers à la racine
- Pas de dossier `dist/` ou `build/` à spécifier
- Vercel cherchera automatiquement `index.html` à la racine

### ⚠️ Si vous aviez un build process :
Si vous utilisiez un outil de build qui génère un dossier `dist/`, vous mettriez :
```
dist
```
Mais pour votre portfolio actuel : **laissez vide**

---

## 5️⃣ Install Command

### 🔍 Qu'est-ce que c'est ?
La commande pour installer les dépendances (npm, yarn, etc.).

### ✅ Configuration pour votre Portfolio

**Option recommandée :**
```
npm install
```
ou
```
(laisser vide si pas de node_modules)
```

### 📝 Explication
- Si vous avez un `package.json` : Vercel exécutera automatiquement `npm install`
- Si vous n'avez pas de dépendances : vous pouvez laisser vide
- Pour votre portfolio : **laissez la valeur par défaut** (`npm install`)

### ✅ Vérification
Votre `package.json` existe, donc Vercel installera les dépendances automatiquement. Pas besoin de changer.

---

## 6️⃣ Environment Variables (Variables d'environnement)

### 🔍 Qu'est-ce que c'est ?
Des variables secrètes ou configurables pour votre application (clés API, URLs, etc.).

### ✅ Configuration pour votre Portfolio

**Option recommandée :**
```
(Aucune variable nécessaire pour l'instant)
```

### 📝 Pourquoi ?
Votre portfolio actuel n'utilise pas de variables d'environnement car :
- ✅ Pas de clés API à protéger
- ✅ Pas de backend nécessitant des secrets
- ✅ Tous les fichiers JSON sont publics
- ✅ Le formulaire de contact n'utilise pas encore de service externe

### 🔮 Si vous ajoutez des fonctionnalités plus tard :

#### Exemple 1 : EmailJS pour le formulaire de contact
Si vous intégrez EmailJS, vous ajouteriez :
```
VARIABLE_NAME: EMAILJS_PUBLIC_KEY
VALUE: votre-clé-publique-emailjs
```

#### Exemple 2 : API Backend
Si vous ajoutez un backend :
```
VARIABLE_NAME: API_URL
VALUE: https://votre-api.com
```

#### Exemple 3 : Analytics
```
VARIABLE_NAME: GOOGLE_ANALYTICS_ID
VALUE: UA-XXXXXXXXX-X
```

### 📝 Comment ajouter des variables plus tard :
1. Allez dans votre projet Vercel
2. **Settings** → **Environment Variables**
3. Cliquez sur **"Add New"**
4. Entrez le nom et la valeur
5. Sélectionnez les environnements (Production, Preview, Development)
6. Cliquez sur **"Save"**
7. Redéployez votre projet

### ⚠️ Sécurité importante :
- ❌ **NE JAMAIS** commiter des secrets dans Git
- ✅ Utilisez toujours les Environment Variables de Vercel
- ✅ Les variables sont chiffrées et sécurisées

---

## 📊 Résumé des configurations recommandées

| Paramètre | Valeur recommandée | Explication |
|-----------|-------------------|-------------|
| **Framework Preset** | `Other` ou `Static Site` | Site statique sans framework |
| **Root Directory** | `./` ou (vide) | Projet à la racine du repository |
| **Build Command** | (vide) | Pas de build nécessaire |
| **Output Directory** | (vide) | Fichiers à la racine |
| **Install Command** | `npm install` (par défaut) | Installation des dépendances |
| **Environment Variables** | Aucune | Pas nécessaire pour l'instant |

---

## 🎯 Configuration étape par étape sur Vercel

### Étape 1 : Import du projet
1. Connectez-vous à Vercel
2. Cliquez sur **"Add New..."** → **"Project"**
3. Sélectionnez votre repository `mon-portfolio`

### Étape 2 : Configuration du projet
Vous verrez cette interface :

```
┌─────────────────────────────────────┐
│ Configure Project                   │
├─────────────────────────────────────┤
│                                     │
│ Framework Preset: [Other ▼]        │ ← Changez en "Other"
│                                     │
│ Root Directory: [./]               │ ← Laissez ./ ou vide
│                                     │
│ Build Command: [ ]                  │ ← Laissez vide
│                                     │
│ Output Directory: [ ]               │ ← Laissez vide
│                                     │
│ Install Command: [npm install]      │ ← Laissez par défaut
│                                     │
│ Environment Variables:              │
│ [No variables]                      │ ← Aucune pour l'instant
│                                     │
│         [Deploy]                    │
└─────────────────────────────────────┘
```

### Étape 3 : Remplir les champs

1. **Framework Preset** :
   - Cliquez sur le menu déroulant
   - Sélectionnez **"Other"**

2. **Root Directory** :
   - Laissez `./` ou vide
   - Vercel détectera automatiquement

3. **Build Command** :
   - Laissez complètement vide
   - Pas besoin de build

4. **Output Directory** :
   - Laissez vide
   - Vercel servira les fichiers à la racine

5. **Install Command** :
   - Laissez `npm install` (valeur par défaut)
   - Vercel l'exécutera automatiquement

6. **Environment Variables** :
   - Cliquez sur **"Add"** si vous en avez besoin
   - Pour l'instant, laissez vide

### Étape 4 : Déployer
Cliquez sur **"Deploy"** et attendez 1-2 minutes !

---

## 🔧 Configuration avancée (optionnel)

### Si vous voulez personnaliser davantage :

#### Créer un fichier `vercel.json` (déjà créé pour vous)

Ce fichier permet de configurer :
- Redirections
- Headers de sécurité
- Cache
- Et plus...

Le fichier `vercel.json` est déjà dans votre projet avec les bonnes configurations.

---

## ✅ Vérification après déploiement

Une fois déployé, vérifiez :

1. ✅ Le site s'affiche correctement
2. ✅ Les fichiers JSON se chargent (articles, projets, compétences)
3. ✅ Les images s'affichent
4. ✅ Le CV se télécharge
5. ✅ La traduction fonctionne
6. ✅ Le formulaire de contact fonctionne

---

## 🐛 Problèmes courants et solutions

### Problème : "Build failed"

**Cause possible** : Build Command configuré alors qu'il ne devrait pas l'être

**Solution** :
- Allez dans **Settings** → **General**
- Mettez **Build Command** à vide
- Redéployez

### Problème : "404 - Page not found"

**Cause possible** : Output Directory mal configuré

**Solution** :
- Vérifiez que **Output Directory** est vide
- Vérifiez que `index.html` est à la racine

### Problème : Les fichiers JSON ne se chargent pas

**Cause possible** : Chemins incorrects

**Solution** :
- Vérifiez que les chemins dans votre code sont relatifs : `./articles.json`
- Pas absolus : `/articles.json`

---

## 📝 Checklist de configuration

Avant de cliquer sur "Deploy", vérifiez :

- [ ] Framework Preset = `Other`
- [ ] Root Directory = `./` ou vide
- [ ] Build Command = **vide**
- [ ] Output Directory = **vide**
- [ ] Install Command = `npm install` (par défaut)
- [ ] Environment Variables = Aucune (pour l'instant)
- [ ] Tous vos fichiers sont commités sur GitHub
- [ ] `index.html` est à la racine du repository

---

## 🎉 C'est tout !

Avec ces configurations, votre portfolio devrait se déployer sans problème sur Vercel.

**Rappel** : Les configurations les plus importantes sont :
1. ✅ Framework Preset = `Other`
2. ✅ Build Command = **vide**
3. ✅ Output Directory = **vide**

Le reste peut généralement rester aux valeurs par défaut.

---

**Besoin d'aide ?** Consultez aussi le [GUIDE_DEPLOIEMENT_VERCEL.md](GUIDE_DEPLOIEMENT_VERCEL.md) pour le processus complet.


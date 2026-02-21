# 🚀 Guide Complet : Déployer votre Portfolio sur Vercel

Ce guide vous explique étape par étape comment déployer votre portfolio professionnel sur Vercel.

## 📋 Prérequis

- Un compte GitHub (gratuit)
- Un compte Vercel (gratuit)
- Votre portfolio prêt et fonctionnel localement

---

## 📝 Étape 1 : Préparer votre projet pour GitHub

### 1.1 Vérifier que votre projet est prêt

Assurez-vous que tous vos fichiers sont à jour :
- ✅ `index.html`
- ✅ `style.css`
- ✅ `script.js`
- ✅ `projects.json`
- ✅ `articles.json`
- ✅ `skills.json`
- ✅ `translations.json`
- ✅ `assets/` (images, CV)

### 1.2 Initialiser Git (si pas déjà fait)

Ouvrez votre terminal dans le dossier du projet et exécutez :

```bash
# Vérifier si Git est déjà initialisé
git status

# Si erreur, initialiser Git
git init

# Ajouter tous les fichiers
git add .

# Faire le premier commit
git commit -m "Initial commit - Portfolio professionnel"
```

### 1.3 Créer un repository sur GitHub

1. Allez sur [GitHub.com](https://github.com) et connectez-vous
2. Cliquez sur le bouton **"+"** en haut à droite → **"New repository"**
3. Remplissez les informations :
   - **Repository name** : `mon-portfolio` (ou le nom de votre choix)
   - **Description** : "Portfolio professionnel - Olivier Mwatsimulamo"
   - **Visibilité** : Public (recommandé pour Vercel gratuit)
   - **NE PAS** cocher "Initialize with README" (vous avez déjà des fichiers)
4. Cliquez sur **"Create repository"**

### 1.4 Connecter votre projet local à GitHub

GitHub vous donnera des commandes. Utilisez celles-ci :

```bash
# Ajouter le remote GitHub (remplacez VOTRE-USERNAME par votre nom d'utilisateur GitHub)
git remote add origin https://github.com/VOTRE-USERNAME/mon-portfolio.git

# Renommer la branche principale en 'main' (si nécessaire)
git branch -M main

# Pousser votre code vers GitHub
git push -u origin main
```

**Note** : Si GitHub vous demande vos identifiants, utilisez un **Personal Access Token** au lieu de votre mot de passe.

---

## 🌐 Étape 2 : Créer un compte Vercel

### 2.1 S'inscrire sur Vercel

1. Allez sur [vercel.com](https://vercel.com)
2. Cliquez sur **"Sign Up"**
3. Choisissez **"Continue with GitHub"** (recommandé)
4. Autorisez Vercel à accéder à votre compte GitHub

### 2.2 Vérifier votre compte

Une fois connecté, vous devriez voir le tableau de bord Vercel.

---

## 🚀 Étape 3 : Déployer votre Portfolio

### 3.1 Importer votre projet

1. Dans le tableau de bord Vercel, cliquez sur **"Add New..."** → **"Project"**
2. Vous verrez la liste de vos repositories GitHub
3. Trouvez `mon-portfolio` et cliquez sur **"Import"**

### 3.2 Configurer le projet

Vercel détectera automatiquement que c'est un projet statique. Vérifiez les paramètres :

- **Project Name** : `mon-portfolio` (ou votre choix)
- **Framework Preset** : `Other` (ou laissez Vercel détecter)
- **Root Directory** : `./` (racine du projet)
- **Build Command** : Laissez vide (projet statique)
- **Output Directory** : Laissez vide (Vercel servira `index.html`)

### 3.3 Variables d'environnement

Pour ce portfolio, vous n'avez **pas besoin** de variables d'environnement. Cliquez simplement sur **"Deploy"**.

### 3.4 Attendre le déploiement

Vercel va :
1. Cloner votre repository
2. Détecter le type de projet
3. Déployer votre site
4. Vous donner une URL (ex: `mon-portfolio.vercel.app`)

⏱️ **Temps estimé** : 1-2 minutes

---

## ✅ Étape 4 : Vérifier le déploiement

### 4.1 Tester votre site

Une fois le déploiement terminé :
1. Cliquez sur **"Visit"** pour ouvrir votre site
2. Vérifiez que tout fonctionne :
   - ✅ Navigation
   - ✅ Sections
   - ✅ Images
   - ✅ CV téléchargeable
   - ✅ Formulaire de contact
   - ✅ Traduction FR/EN

### 4.2 Vérifier les fichiers JSON

Si certains fichiers JSON ne se chargent pas :
- Vérifiez que les fichiers sont bien dans le repository GitHub
- Vérifiez les chemins dans votre code (ils doivent être relatifs)

---

## 🔧 Étape 5 : Configuration avancée (optionnel)

### 5.1 Ajouter un domaine personnalisé

1. Dans votre projet Vercel, allez dans **"Settings"** → **"Domains"**
2. Ajoutez votre domaine (ex: `olivier-mwatsimulamo.com`)
3. Suivez les instructions pour configurer les DNS

### 5.2 Configurer les redirections

Si nécessaire, créez un fichier `vercel.json` à la racine :

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### 5.3 Variables d'environnement (si besoin plus tard)

Si vous ajoutez des fonctionnalités nécessitant des clés API :
1. Allez dans **"Settings"** → **"Environment Variables"**
2. Ajoutez vos variables
3. Redéployez le projet

---

## 🔄 Étape 6 : Mettre à jour votre Portfolio

### 6.1 Faire des modifications

1. Modifiez vos fichiers localement
2. Testez en local avec `npm run dev`
3. Commitez vos changements :

```bash
git add .
git commit -m "Description de vos modifications"
git push origin main
```

### 6.2 Déploiement automatique

Vercel redéploiera automatiquement votre site à chaque `git push` ! 🎉

Vous pouvez voir les déploiements dans l'onglet **"Deployments"** de votre projet Vercel.

---

## 🐛 Résolution de problèmes

### Problème : Les fichiers JSON ne se chargent pas

**Solution** :
- Vérifiez que les fichiers sont bien dans le repository
- Vérifiez les chemins (doivent être relatifs : `./articles.json` pas `/articles.json`)
- Vérifiez la console du navigateur (F12) pour les erreurs

### Problème : Les images ne s'affichent pas

**Solution** :
- Vérifiez que les images sont dans le dossier `assets/images/`
- Vérifiez les chemins dans le HTML
- Assurez-vous que les fichiers sont commités dans Git

### Problème : Le CV ne se télécharge pas

**Solution** :
- Vérifiez que `assets/cv/CV Olivier.pdf` existe
- Vérifiez que le fichier est commité dans Git
- Vérifiez l'encodage de l'URL dans le code

### Problème : Erreur 404 sur certaines pages

**Solution** :
- Créez un fichier `vercel.json` avec les redirections (voir étape 5.2)
- Vérifiez que `index.html` est à la racine

### Problème : Le site ne se met pas à jour après un push

**Solution** :
- Vérifiez que le webhook GitHub est configuré dans Vercel
- Allez dans **"Settings"** → **"Git"** et reconnectez si nécessaire
- Déclenchez un déploiement manuel depuis Vercel

---

## 📊 Suivi et Analytics

### Vercel Analytics (optionnel)

1. Allez dans **"Settings"** → **"Analytics"**
2. Activez Vercel Analytics (gratuit pour les projets personnels)
3. Obtenez des statistiques sur vos visiteurs

---

## 🔐 Sécurité

### Fichiers sensibles

⚠️ **Important** : Ne commitez JAMAIS :
- Clés API
- Mots de passe
- Fichiers `.env` avec des secrets
- Informations personnelles sensibles

Utilisez les **Environment Variables** de Vercel pour les secrets.

---

## 📱 Test sur mobile

Après le déploiement, testez votre site sur mobile :
- Vérifiez que le design est responsive
- Testez le menu hamburger
- Vérifiez que toutes les sections sont accessibles

---

## 🎉 Félicitations !

Votre portfolio est maintenant en ligne sur Vercel ! 

### Votre URL sera :
- **Production** : `https://mon-portfolio.vercel.app`
- **Prévisualisation** : `https://mon-portfolio-git-main.vercel.app` (pour chaque branche)

### Prochaines étapes :

1. ✅ Partagez votre URL avec votre réseau
2. ✅ Ajoutez-la à votre CV et LinkedIn
3. ✅ Configurez un domaine personnalisé (optionnel)
4. ✅ Continuez à améliorer votre portfolio

---

## 📚 Ressources utiles

- [Documentation Vercel](https://vercel.com/docs)
- [Guide GitHub](https://docs.github.com)
- [Support Vercel](https://vercel.com/support)

---

## 💡 Astuces

1. **Déploiements de prévisualisation** : Chaque pull request crée automatiquement une URL de prévisualisation
2. **Rollback** : Vous pouvez revenir à une version précédente depuis l'onglet "Deployments"
3. **Performance** : Vercel optimise automatiquement votre site (CDN, compression, etc.)
4. **HTTPS** : Activé automatiquement et gratuit

---

**Bon déploiement ! 🚀**


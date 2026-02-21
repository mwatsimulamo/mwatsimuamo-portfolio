# Portfolio Professionnel

Portfolio professionnel moderne et responsive créé avec HTML, CSS et JavaScript vanilla. Prêt pour le déploiement sur GitHub Pages.

## 🚀 Fonctionnalités

- ✅ **Design moderne et responsive** - S'adapte à tous les écrans
- ✅ **Navigation fluide** - Menu hamburger pour mobile, scroll smooth
- ✅ **Chargement dynamique** - Projets et articles chargés depuis des fichiers JSON
- ✅ **Section Cardano** - Mise en avant spéciale pour les projets blockchain
- ✅ **Formulaire de contact** - Prêt pour intégration avec un service d'email
- ✅ **Aperçu CV** - Affichage et téléchargement du CV en PDF
- ✅ **Optimisé SEO** - Meta tags et structure sémantique

## 📁 Structure du Projet

```
mon-portfolio/
├── index.html          # Page principale
├── style.css           # Styles CSS
├── script.js           # Logique JavaScript
├── projects.json       # Données des projets
├── articles.json       # Données des articles
├── package.json        # Configuration npm (pour serveur local)
├── server.js           # Serveur HTTP simple (optionnel)
├── README.md           # Documentation
├── LICENSE             # Licence MIT
├── .gitignore          # Fichiers à ignorer
└── assets/
    ├── images/
    │   ├── profile.jpg          # Photo de profil (optionnel)
    │   └── projects/            # Images des projets
    └── cv/
        └── cv.pdf               # CV en PDF
```

## 🛠️ Installation et Configuration

### 1. Cloner le repository

```bash
git clone https://github.com/votre-compte/mon-portfolio.git
cd mon-portfolio
```

### 2. Lancer le serveur local (optionnel mais recommandé)

Pour tester le portfolio en local avec un serveur HTTP (nécessaire pour charger les fichiers JSON) :

**Option A : Avec Node.js (recommandé)**
```bash
npm run dev
# ou
npm start
```
Puis ouvrez votre navigateur sur : `http://localhost:3000`

**Option B : Avec Python (si Node.js n'est pas installé)**
```bash
# Python 3
python -m http.server 3000

# Python 2
python -m SimpleHTTPServer 3000
```

**Option C : Ouvrir directement dans le navigateur**
Vous pouvez aussi ouvrir `index.html` directement, mais certaines fonctionnalités (chargement JSON) peuvent ne pas fonctionner à cause des restrictions CORS.

### 3. Personnaliser le contenu

#### Modifier les informations personnelles dans `index.html` :
- Nom et titre professionnel (section Hero)
- Description à propos (section À propos)
- Liens sociaux (section Contact)

#### Ajouter vos projets dans `projects.json` :
```json
{
  "title": "Nom du projet",
  "description": "Description du projet",
  "image": "assets/images/projects/nom-image.jpg",
  "technologies": ["React", "Node.js", "Cardano"],
  "github": "https://github.com/votre-compte/projet",
  "demo": "https://demo.com",
  "cardano": true  // true si c'est un projet Cardano
}
```

#### Ajouter vos articles dans `articles.json` :
```json
{
  "title": "Titre de l'article",
  "description": "Description de l'article",
  "link": "https://lien-vers-article.com",
  "date": "2024-01-15"
}
```

#### Ajouter vos fichiers :
- Photo de profil : `assets/images/profile.jpg`
- Images des projets : `assets/images/projects/`
- CV PDF : `assets/cv/cv.pdf`

### 3. Personnaliser les couleurs (optionnel)

Modifiez les variables CSS dans `style.css` :
```css
:root {
    --primary-color: #6366f1;
    --secondary-color: #8b5cf6;
    /* ... autres couleurs ... */
}
```

## 📤 Déploiement

### Option 1 : Vercel (Recommandé) ⭐

Pour un déploiement rapide et professionnel, consultez le guide complet :
👉 **[GUIDE_DEPLOIEMENT_VERCEL.md](GUIDE_DEPLOIEMENT_VERCEL.md)**

**Avantages de Vercel :**
- ✅ Déploiement automatique depuis GitHub
- ✅ HTTPS gratuit
- ✅ CDN global pour des performances optimales
- ✅ Prévisualisations pour chaque commit
- ✅ Analytics intégré
- ✅ Domaine personnalisé gratuit

### Option 2 : GitHub Pages

### Méthode 1 : Via l'interface GitHub

1. Créez un nouveau repository sur GitHub
2. Uploadez tous les fichiers du projet
3. Allez dans **Settings** > **Pages**
4. Sélectionnez la branche `main` (ou `master`)
5. Cliquez sur **Save**
6. Votre portfolio sera disponible à : `https://votre-username.github.io/mon-portfolio/`

### Méthode 2 : Via Git en ligne de commande

```bash
# Initialiser Git (si pas déjà fait)
git init

# Ajouter tous les fichiers
git add .

# Faire le premier commit
git commit -m "Initial commit - Portfolio professionnel"

# Ajouter le remote GitHub
git remote add origin https://github.com/votre-username/mon-portfolio.git

# Pousser vers GitHub
git branch -M main
git push -u origin main
```

Ensuite, activez GitHub Pages dans les paramètres du repository.

## 🔧 Configuration du Formulaire de Contact

Le formulaire de contact est actuellement configuré pour afficher un message de succès. Pour un vrai envoi d'email, vous pouvez :

### Option 1 : Utiliser EmailJS (gratuit)

1. Créez un compte sur [EmailJS](https://www.emailjs.com/)
2. Configurez un service email
3. Créez un template
4. Modifiez `script.js` dans la fonction `handleContactFormSubmit` :

```javascript
// Ajouter EmailJS SDK dans index.html
// <script src="https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js"></script>

emailjs.send('YOUR_SERVICE_ID', 'YOUR_TEMPLATE_ID', {
    from_name: data.name,
    from_email: data.email,
    subject: data.subject,
    message: data.message
}, 'YOUR_PUBLIC_KEY')
.then(() => {
    // Succès
}, (error) => {
    // Erreur
});
```

### Option 2 : Utiliser Formspree (gratuit)

1. Créez un compte sur [Formspree](https://formspree.io/)
2. Créez un nouveau formulaire
3. Modifiez l'attribut `action` du formulaire dans `index.html` :

```html
<form class="contact-form" id="contactForm" action="https://formspree.io/f/YOUR_FORM_ID" method="POST">
```

### Option 3 : Backend personnalisé

Créez votre propre endpoint API pour gérer l'envoi d'emails.

## 🎨 Personnalisation Avancée

### Ajouter de nouvelles sections

1. Ajoutez la section HTML dans `index.html`
2. Ajoutez les styles dans `style.css`
3. Ajoutez la logique JavaScript si nécessaire dans `script.js`

### Modifier le thème

Les couleurs principales sont définies dans les variables CSS. Modifiez-les pour créer votre propre thème.

### Ajouter des animations

Le fichier CSS contient déjà quelques animations. Vous pouvez en ajouter d'autres dans la section `@keyframes`.

## 📱 Compatibilité

- ✅ Chrome/Edge (dernières versions)
- ✅ Firefox (dernières versions)
- ✅ Safari (dernières versions)
- ✅ Mobile (iOS Safari, Chrome Mobile)

## 📝 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou une pull request.

## 📧 Contact

Pour toute question, contactez-moi via :
- Email : votre.email@example.com
- LinkedIn : [votre-profil](https://linkedin.com/in/votre-profil)
- GitHub : [@votre-compte](https://github.com/votre-compte)

---

Développé avec ❤️ et passion pour le développement web et la blockchain.

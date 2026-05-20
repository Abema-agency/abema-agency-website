# Configuration n8n — Blog Auto-Publish

## Informations pour le nœud GitHub dans n8n

- **Repo owner** : Abema-agency
- **Repo name** : abema-agency-website
- **Branch** : master
- **Dossier blog** : `blog/`
- **Extension** : `.html`
- **Format nom de fichier** : `YYYY-MM-DD-slug.html`

---

## Frontmatter obligatoire

Chaque article commence par un commentaire HTML frontmatter (pas de Markdown, le site est HTML statique) :

```html
<!DOCTYPE html>
<!--
FRONTMATTER N8N (métadonnées article auto-généré)
---
title: "[TITRE DE L'ARTICLE]"
date: "YYYY-MM-DD"
slug: "[slug-kebab-case]"
description: "[Meta description 150-160 car.]"
category: "[agents-ia | artisans-tpe | outils-tech | actualite]"
readTime: "[X min]"
---
-->
<html lang="fr">
```

---

## Structure HTML obligatoire d'un article

L'article doit être un fichier HTML complet reprenant le design du site.
Voir le template complet dans : `blog/article-test-auto.html`

Éléments indispensables :
- `<meta name="robots" content="index, follow">` (mettre `noindex` uniquement pour les tests)
- `<link rel="canonical" href="https://www.abemaagency.com/blog/[SLUG].html">`
- `<script type="application/ld+json">` avec schema Article complet
- Classe `.prose` sur le div de contenu
- Au moins 2 blocs `.cta-block` dans le corps de l'article
- Section FAQ en bas avec schema FAQPage JSON-LD
- Section "À lire aussi" avec 2 liens vers des articles existants

---

## Format du body de l'API GitHub pour créer un article

```
POST https://api.github.com/repos/Abema-agency/abema-agency-website/contents/blog/[FILENAME]

Headers :
  Authorization: Bearer [GITHUB_TOKEN]
  Accept: application/vnd.github+json
  X-GitHub-Api-Version: 2022-11-28

Body (JSON) :
{
  "message": "blog: [TITRE] — auto-publish [DATE]",
  "content": "[CONTENU HTML ENCODÉ EN BASE64]",
  "branch": "master"
}
```

**Important** : le `content` doit être le fichier HTML complet encodé en Base64.
En n8n, utiliser le nœud **Code** avec :
```javascript
return [{ json: {
  ...item,
  content: Buffer.from(item.html_content, 'utf8').toString('base64')
}}];
```

---

## Mise à jour de blog/index.html

**Le listing /blog/ est statique** — chaque nouvel article doit être ajouté dans `blog/index.html`.

Le workflow N8N doit donc faire **2 appels API GitHub** :

### Appel 1 — Créer le fichier article
```
POST /contents/blog/[FILENAME]
```

### Appel 2 — Mettre à jour blog/index.html
```
PUT /contents/blog/index.html
```
Nécessite de d'abord GET le SHA du fichier actuel, puis injecter la nouvelle carte `<article>` dans le div `#articles-grid` avant la fermeture `</div>`.

**Template de carte à injecter** (juste avant `<!-- Article 1 -->`) :
```html
<!-- Article [DATE]-[SLUG] -->
<article class="article-card visible flex-col rounded-2xl overflow-hidden card-hover" data-category="[CATEGORY]" style="background:rgba(240,235,224,0.03);border:1px solid rgba(240,235,224,0.08)">
  <div class="h-44 flex items-center justify-center text-6xl" style="background:linear-gradient(135deg,rgba(245,158,11,0.15) 0%,rgba(245,158,11,0.04) 100%)">&#129504;</div>
  <div class="p-6 flex flex-col flex-1">
    <div class="flex items-center gap-2 mb-4">
      <span class="font-body text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded-full" style="background:rgba(245,158,11,0.12);color:#FCD34D">[CATEGORY_LABEL]</span>
      <span class="font-body text-xs text-clay">[READ_TIME]</span>
    </div>
    <h2 class="font-display font-black text-cream text-xl leading-tight mb-3 flex-1">
      <a href="/blog/[FILENAME]" class="hover:text-primary transition-colors">[TITRE]</a>
    </h2>
    <p class="font-body text-sm text-stone leading-relaxed mb-5">[DESCRIPTION]</p>
    <div class="flex items-center justify-between mt-auto pt-4" style="border-top:1px solid rgba(240,235,224,0.07)">
      <div class="flex items-center gap-2">
        <div class="w-7 h-7 rounded-full flex items-center justify-center font-display font-black text-xs shrink-0" style="background:rgba(245,158,11,0.15);color:#F59E0B">AA</div>
        <span class="font-body text-xs text-clay">Abdallah — [DATE_FR]</span>
      </div>
      <a href="/blog/[FILENAME]" class="font-body text-xs font-bold hover:text-primary transition-colors" style="color:#FCD34D">Lire →</a>
    </div>
  </div>
</article>
```

**Mapping catégories** (valeur `data-category` attendue par le filtre JS) :
| Valeur frontmatter | `data-category` HTML | Label affiché |
|---|---|---|
| `agents-ia` | `agents-ia` | Agents IA |
| `artisans-tpe` | `artisans-tpe` | Artisans & TPE |
| `outils-tech` | `outils-tech` | Outils & Tech |
| `actualite` | `agents-ia` | Agents IA (fallback) |

---

## Test du webhook n8n

URL du webhook blog → LinkedIn :
```
https://n8n.abemaagency.com/webhook/blog-to-linkedin
```

Body à envoyer après publication :
```json
{
  "title": "[TITRE DE L'ARTICLE]",
  "description": "[META DESCRIPTION]",
  "slug": "[SLUG]",
  "url": "https://www.abemaagency.com/blog/[FILENAME]"
}
```

---

## Variables d'environnement nécessaires dans n8n

| Variable | Valeur |
|---|---|
| `GITHUB_TOKEN` | Token PAT GitHub (scope `repo`) |
| `ANTHROPIC_API_KEY` | Clé API Anthropic |

**Modèle Claude recommandé** : `claude-sonnet-4-6` (équilibre qualité/coût/vitesse)

---

## Checklist validation pipeline

- [ ] Article créé dans `blog/YYYY-MM-DD-slug.html`
- [ ] Fichier encodé Base64 correct (pas de troncature)
- [ ] Commit message : `blog: [titre] — auto-publish YYYY-MM-DD`
- [ ] `blog/index.html` mis à jour avec la nouvelle carte
- [ ] Vercel redéploie automatiquement (visible dans le dashboard Vercel)
- [ ] URL `https://www.abemaagency.com/blog/[SLUG].html` accessible
- [ ] Article visible dans `/blog/` (carte dans la grille)
- [ ] Webhook LinkedIn déclenché après publication

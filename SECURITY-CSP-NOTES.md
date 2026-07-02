# Note interne — CSP `'unsafe-inline'` (script-src / style-src)

## Pourquoi ce fichier existe et pas un commentaire dans `vercel.json`

`vercel.json` est du JSON strict : Vercel refuse le déploiement si le fichier contient des
commentaires JSONC (`//` ou `/* */`), avec l'erreur `Invalid vercel.json file provided`.
Il n'y a pas non plus de garantie que Vercel ignore silencieusement une clé JSON inconnue
ajoutée comme "faux commentaire" (le schéma de validation vercel.json est strict sur
certaines combinaisons de clés — cf. erreurs connues type `builds[0] should NOT have
additional property`). Documenter la raison de `'unsafe-inline'` directement dans
`vercel.json` risquait donc de casser le déploiement pour éviter un risque XSS —
contradictoire avec la consigne "n'y touche pas plutôt que de risquer de casser le
site en production". D'où ce fichier séparé (versionné dans git, exclu du déploiement
via `.vercelignore`, cf. Tâche 1).

## Inventaire du inline (audit du 2026-07-02)

| Fichier | `<script>` inline (sans `src`) | attributs `on*=` (onclick/onsubmit/onfocus/onblur/onchange) | attributs `style="..."` | blocs `<style>` |
|---|---|---|---|---|
| index.html | 9 | 49 | 255 | 2 |
| site-internet-tpe.html | 3 | 14 | 70 | 1 |
| secteurs/agent-immobilier.html | 4 | 5 | 64 | 1 |
| secteurs/arras.html | 3 | 9 | 73 | 1 |
| secteurs/artisan.html | 4 | 5 | 65 | 1 |
| secteurs/bethune.html | 3 | 9 | 71 | 1 |
| secteurs/coach-consultant.html | 4 | 5 | 64 | 1 |
| secteurs/commercant.html | 4 | 5 | 64 | 1 |
| secteurs/lens.html | 3 | 9 | 71 | 1 |
| **Total** | **37** | **110** | **797** | **9** |

`chatbot-widget.js` (actuellement désactivé, non chargé sur aucune page — cf.
`<!-- <script src="chatbot-widget.js" defer></script> -->` dans index.html) utilise
`innerHTML` à 3 endroits (rendu de contenu, pas d'injection de `<script>` ni `eval`/
`new Function`) : sans impact CSP `script-src` en l'état, à revérifier si le widget
est un jour réactivé.

## Conclusion

~800 attributs `style=""` et ~150 constructions `script`/`on*=` inline répartis sur 9
pages HTML. Une externalisation complète en une seule passe representerait un risque de
régression trop élevé pour ce correctif de sécurité (styles perdus, handlers cassés,
site public affecté). Un nonce CSP par requête est impossible ici : le site est 100%
statique, servi sans backend capable de générer un nonce à chaque requête.

**Décision : `'unsafe-inline'` reste sur `script-src` et `style-src` dans
`Content-Security-Policy` (vercel.json) jusqu'à un chantier dédié d'externalisation
progressive (fichiers `.js`/`.css` séparés, remplacement des `on*=` par
`addEventListener`), page par page, testé individuellement.**

## Chantier futur (si priorisé)

Ordre suggéré, du plus simple/risque le plus faible au plus complexe :
1. Externaliser les 37 blocs `<script>` inline vers des fichiers `.js` partagés
   (nav scroll, toggle mobile, FAQ, tracking UTM, submitForm — logique déjà dupliquée
   telle quelle sur chaque page, donc factorisable en un seul fichier partagé en même
   temps).
2. Remplacer les ~110 attributs `on*=` par `addEventListener` dans ces mêmes fichiers.
3. Retirer `'unsafe-inline'` de `script-src` uniquement (garder sur `style-src` dans
   un premier temps) et retester chaque page.
4. Extraire les ~800 `style="..."` vers des classes CSS (chantier le plus long, le
   design du site étant actuellement fait à 90% en style inline Tailwind + valeurs
   arbitraires) avant de pouvoir retirer `'unsafe-inline'` de `style-src`.

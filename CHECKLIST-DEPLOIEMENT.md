# Checklist déploiement — Fix chatbot + form + LinkedIn tracking

## Avant deploy

- [ ] **n8n — webhook chatbot-abema**
  - [ ] Headers CORS dans `Respond to Webhook` (cf `n8n-config.md`)
  - [ ] Réponse au format `{ response, sessionId, leadComplet }`
  - [ ] Préflight OPTIONS géré (Nginx ou 2e webhook OPTIONS)
- [ ] **n8n — webhook lead-qualification**
  - [ ] Header `Access-Control-Allow-Origin: https://www.abemaagency.com`
  - [ ] Switch `Routage Channel` placé AVANT le scoring BANT
  - [ ] Branche `linkedin` : tag CRM source=linkedin + séquence email LinkedIn
- [ ] **DNS** : `n8n.abemaagency.com` résout bien
- [ ] **Vercel** : `vercel.json` autorise `connect-src https://n8n.abemaagency.com`

## Deploy

- [ ] `git add -A && git commit -m "fix: chatbot retry/timeout + form BANT/UTM/channel"`
- [ ] `git push origin master` → Vercel build auto

## Après deploy — tests prod

1. [ ] Aller sur `https://www.abemaagency.com?utm_source=linkedin&utm_medium=social&utm_campaign=test`
2. [ ] Ouvrir la console (F12), coller le contenu de `test-webhooks.js`
3. [ ] Vérifier 3 ✓ verts :
   - [ ] Chatbot : status 200, contrat `{response, sessionId, leadComplet}` respecté
   - [ ] Form : status 200, header CORS présent
   - [ ] OPTIONS : status 200/204, headers CORS exposés
4. [ ] Test manuel chatbot : envoyer un message → réponse bot affichée
5. [ ] Test manuel form : remplir + submit → écran "Merci !" affiché
6. [ ] Vérifier dans n8n que les exécutions arrivent avec `channel=linkedin`
7. [ ] Vérifier dans le CRM que le lead arrive avec tag `source=linkedin`

## Rollback si KO

- `git revert <hash>` puis `git push` → Vercel redeploie l'ancienne version
- Le webhook `chatbot-abema` peut être désactivé côté n8n sans casser le site (le widget affiche juste "Une erreur est survenue")

## Suivi LinkedIn (J+7)

- [ ] Vérifier dans n8n combien d'exécutions avec `channel=linkedin`
- [ ] Vérifier le taux de complétion BANT par channel
- [ ] Comparer LinkedIn vs direct sur le funnel form

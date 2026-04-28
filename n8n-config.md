# Config n8n — Architecture ABEMA

## Architecture (3 workflows indépendants)

```
                         ┌────────────────────────────┐
   formulaire site  ───► │  Qualification Lead BANT   │  (autonome)
                         │  /webhook/lead-qualification│
                         └────────────────────────────┘
                                      ▲
                                      │ Execute Workflow
                                      │
   campagne LinkedIn ───►  ┌──────────────────────────┐
                           │  LinkedIn Prospection    │  (channel=linkedin)
                           │ /webhook/linkedin-prospection
                           └──────────────────────────┘

   chatbot site     ───►  ┌──────────────────────────┐
                          │  Chatbot                 │  (autonome)
                          │  /webhook/chatbot-abema  │
                          └──────────────────────────┘
```

Le workflow **BANT reste pur** : il qualifie n'importe quel lead, peu importe la source. Les workflows spécialisés (LinkedIn aujourd'hui, autres demain) **l'appellent via Execute Workflow** pour réutiliser la logique de scoring, puis font leurs actions propres (CRM tags, Slack, séquences mail).

---

## 1. Workflow Chatbot — `chatbot-abema`

Fichier prêt à importer : [n8n-workflow-chatbot.json](n8n-workflow-chatbot.json)

Pipeline :
```
Webhook (POST)   → Extraction Message → Génération réponse (LLM) → Reponse Webhook
Webhook (OPTIONS) → Respond OPTIONS 204
```

**À adapter** : remplacer le nœud `Génération réponse (à remplacer)` par l'appel LLM réel. Sortie attendue : `{ reply, sessionId, leadComplet, lead }`.

---

## 2. Workflow Qualification Lead BANT — `lead-qualification`

Fichier prêt à importer : [n8n-workflow-lead-qualification.json](n8n-workflow-lead-qualification.json)

Pipeline (autonome, agnostique au channel) :
```
Webhook (POST)    → Qualification BANT → Reponse Webhook
Webhook (OPTIONS) → Respond OPTIONS 204
```

Le nœud `Qualification BANT` accepte deux formats d'entrée :
- via webhook : `$json.body.{champs}`
- via Execute Workflow : `$json.{champs}` direct

Il calcule `bant_score` et `qualified` et inclut le `score_bonus` éventuellement passé par un workflow appelant.

**À brancher après** `Qualification BANT` (avant Reponse Webhook) : ton CRM + email J0/J3/J7 du skill email-automation.

---

## 3. Workflow LinkedIn Prospection — `linkedin-prospection`

Fichier prêt à importer : [n8n-workflow-linkedin-prospection.json](n8n-workflow-linkedin-prospection.json)

Pipeline (séparé, appelle BANT) :
```
Webhook (POST)    → Filtre channel=linkedin ─┬─► Tag LinkedIn (+priorité haute, score_bonus +20)
                                             │      │
                                             │      ▼
                                             │   Execute Workflow → BANT
                                             │      │
                                             │      ▼
                                             │   Actions LinkedIn (CRM + Slack)
                                             │      │
                                             │      ▼
                                             │   Reponse Webhook LinkedIn
                                             │
                                             └─► Rejet non-LinkedIn (400)
Webhook (OPTIONS) → Respond OPTIONS 204
```

### Lier au workflow BANT

1. Ouvrir le workflow BANT dans n8n → copier l'ID dans l'URL (`/workflow/<ID>`)
2. Dans `Execute Workflow BANT`, coller cet ID dans le champ `Workflow ID` (ou définir la variable d'env `WORKFLOW_ID_BANT`)
3. `waitForSubWorkflow: true` → la réponse BANT (`bant_score`, `qualified`) revient au workflow LinkedIn pour les actions suivantes.

### Source du trafic LinkedIn

Deux options :

**A. Côté site web** — quand `channel=linkedin`, le formulaire/chatbot poste sur `/linkedin-prospection` au lieu de `/lead-qualification`. À implémenter dans `submitForm` :
```js
const url = (t.channel === 'linkedin')
  ? 'https://n8n.abemaagency.com/webhook/linkedin-prospection'
  : window.ABEMA_CONFIG.n8n.leadWebhook;
```

**B. Côté n8n** — laisser le site poster toujours sur `/lead-qualification`, et créer un 4e workflow "Router channel" qui forwarde via `Execute Workflow` vers BANT ou LinkedIn. Plus simple côté front, plus de hops côté n8n.

**Recommandation** : option A pour l'instant (1 hop, payload exposé clairement, debug facile).

---

## 4. CORS — récapitulatif

Tous les nœuds `Respond to Webhook` (succès et OPTIONS) des 3 workflows incluent :
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: POST, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type`

Préflight OPTIONS géré par un **2e nœud Webhook dédié** (`httpMethod: OPTIONS`) sur le même path qui répond directement 204.

---

## 5. Payload de référence

```json
{
  "prenom": "", "nom": "", "email": "", "telephone": "",
  "entreprise": "", "activite": "",
  "budget": "100-300", "besoin": "...", "urgence": "<1mois",
  "source": "formulaire-contact",
  "channel": "linkedin|website|paid|referral|direct",
  "utm_source": "linkedin", "utm_medium": "social", "utm_campaign": "...",
  "utm_content": "", "utm_term": "",
  "referrer": "", "landing_url": "", "page_url": "",
  "timestamp": "2026-04-27T10:00:00.000Z"
}
```

# Graph Report - .  (2026-04-20)

## Corpus Check
- Corpus is ~33,015 words - fits in a single context window. You may not need a graph.

## Summary
- 50 nodes · 58 edges · 9 communities detected
- Extraction: 76% EXTRACTED · 24% INFERRED · 0% AMBIGUOUS · INFERRED: 14 edges (avg confidence: 0.8)
- Token cost: 12,500 input · 2,800 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Legal & Founder Identity|Legal & Founder Identity]]
- [[_COMMUNITY_Client Success & Pricing|Client Success & Pricing]]
- [[_COMMUNITY_Services & Method|Services & Method]]
- [[_COMMUNITY_Brand & Tech Stack|Brand & Tech Stack]]
- [[_COMMUNITY_Visual Brand Assets|Visual Brand Assets]]
- [[_COMMUNITY_Founder Portrait & Branding|Founder Portrait & Branding]]
- [[_COMMUNITY_Lead Capture & RGPD|Lead Capture & RGPD]]
- [[_COMMUNITY_Hero Experience|Hero Experience]]
- [[_COMMUNITY_FAQ|FAQ]]

## God Nodes (most connected - your core abstractions)
1. `Politique de Confidentialité Page` - 7 edges
2. `ABEMA AGENCY` - 6 edges
3. `Services Section` - 6 edges
4. `Service: Agent IA personnalisé` - 5 edges
5. `Mentions Légales Page` - 5 edges
6. `Abema Agency Logo` - 5 edges
7. `Offer: Croissance (197€/mois)` - 4 edges
8. `Abema Agency` - 4 edges
9. `Abdallah Ait Essaghir (Founder)` - 3 edges
10. `Pricing Offers Section` - 3 edges

## Surprising Connections (you probably didn't know these)
- `N8N Lead Qualification Webhook` --semantically_similar_to--> `N8N Data Processor (Europe-hosted)`  [INFERRED] [semantically similar]
  index.html → politique-confidentialite.html
- `Footer` --references--> `Mentions Légales Page`  [EXTRACTED]
  index.html → mentions-legales.html
- `Footer` --references--> `Politique de Confidentialité Page`  [EXTRACTED]
  index.html → politique-confidentialite.html
- `Politique de Confidentialité Page` --references--> `Vercel Inc. (Hosting Provider)`  [EXTRACTED]
  politique-confidentialite.html → mentions-legales.html
- `RGPD Compliance Framework` --conceptually_related_to--> `French Law Jurisdiction`  [INFERRED]
  politique-confidentialite.html → mentions-legales.html

## Hyperedges (group relationships)
- **Lead Capture & Qualification Flow** — index_contact_form, index_n8n_webhook, politique_conf_n8n [EXTRACTED 0.95]
- **Legal & Compliance Cluster** — mentions_legales_page, politique_conf_page, politique_conf_rgpd, mentions_droit_francais [EXTRACTED 0.92]
- **Services to Pricing Offer Alignment** — index_services_section, index_offres_section, index_cas_clients_section [INFERRED 0.80]

## Communities

### Community 0 - "Legal & Founder Identity"
Cohesion: 0.27
Nodes (10): Abdallah Ait Essaghir (Founder), Footer, French Law Jurisdiction, Mentions Légales Page, Intellectual Property Clause, Vercel Inc. (Hosting Provider), CNIL (French Data Protection Authority), Data Retention: 36 months max (+2 more)

### Community 1 - "Client Success & Pricing"
Cohesion: 0.33
Nodes (9): Case Studies Section, Case Study: Karim B. (Agent immobilier), Case Study: Sandra M. (Coach), Case Study: Thomas R. (Artisan plombier), Offer: Croissance (197€/mois), Offer: Essentiel (79€/mois), Offer: Sur-mesure (249€/mois), Pricing Offers Section (+1 more)

### Community 2 - "Services & Method"
Cohesion: 0.29
Nodes (7): Méthode Section (4-step process), Service: Audit & stratégie IA, Service: Automatisation de processus, Service: Chatbot vente & SAV, Service: Génération de documents, Service: Marketing automatisé, Services Section

### Community 3 - "Brand & Tech Stack"
Cohesion: 0.33
Nodes (6): ABEMA AGENCY, Google Fonts (Bricolage Grotesque + Figtree), Schema.org ProfessionalService Structured Data, Tailwind CSS (CDN), Target Audience: TPE (Très Petites Entreprises), WhatsApp Contact Channel

### Community 4 - "Visual Brand Assets"
Cohesion: 0.53
Nodes (6): Abema Agency Logo, Abema Agency, Gold on Dark Color Scheme, Premium / Luxury Brand Identity, Crescent Moon Shape, AA Monogram

### Community 5 - "Founder Portrait & Branding"
Cohesion: 0.6
Nodes (5): Abema Agency, Abema Agency Logo, Abema Agency Founder, Abema Agency Brand Identity - Gold on Dark, Professional Portrait Photo

### Community 6 - "Lead Capture & RGPD"
Cohesion: 0.5
Nodes (4): Contact / Audit Form, N8N Lead Qualification Webhook, Personal Data Collected (contact form), N8N Data Processor (Europe-hosted)

### Community 7 - "Hero Experience"
Cohesion: 1.0
Nodes (2): Gold Particle Constellation Canvas (Hero), Hero Section

### Community 8 - "FAQ"
Cohesion: 1.0
Nodes (1): FAQ Section

## Knowledge Gaps
- **14 isolated node(s):** `Hero Section`, `Méthode Section (4-step process)`, `FAQ Section`, `Gold Particle Constellation Canvas (Hero)`, `Tailwind CSS (CDN)` (+9 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Hero Experience`** (2 nodes): `Gold Particle Constellation Canvas (Hero)`, `Hero Section`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `FAQ`** (1 nodes): `FAQ Section`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ABEMA AGENCY` connect `Brand & Tech Stack` to `Legal & Founder Identity`?**
  _High betweenness centrality (0.304) - this node is a cross-community bridge._
- **Why does `Abdallah Ait Essaghir (Founder)` connect `Legal & Founder Identity` to `Brand & Tech Stack`?**
  _High betweenness centrality (0.247) - this node is a cross-community bridge._
- **Why does `Service: Agent IA personnalisé` connect `Client Success & Pricing` to `Services & Method`, `Brand & Tech Stack`?**
  _High betweenness centrality (0.239) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `Service: Agent IA personnalisé` (e.g. with `Target Audience: TPE (Très Petites Entreprises)` and `Offer: Essentiel (79€/mois)`) actually correct?**
  _`Service: Agent IA personnalisé` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Hero Section`, `Méthode Section (4-step process)`, `FAQ Section` to the rest of the system?**
  _14 weakly-connected nodes found - possible documentation gaps or missing edges._
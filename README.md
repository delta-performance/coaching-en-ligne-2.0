# DELTA Performance 2.0

Application web statique (HTML/JS + Firebase) : espace coach/admin, espace client et tunnel de réservation public.

## Lancer l'application

- **En ligne** : GitHub Pages publie la branche `main` → https://delta-performance.github.io/coaching-en-ligne-2.0/
- **En local (navigateur)** : depuis le dossier du projet, `python3 -m http.server 8000` puis ouvrir http://localhost:8000
- **Application Mac/PC (Electron)** : `npm install` puis `npm start` (`npm run dist` pour générer l'installeur)

## Tunnel de réservation

- Page publique : `tunnel.html` → https://delta-performance.github.io/coaching-en-ligne-2.0/tunnel.html
- Gestion : panneau coach → **CRM & RDV** → onglet **Tunnel** (ouverture/fermeture, créneaux, jours fermés, textes, email de notification) et onglet **Rendez-vous** (confirmer / annuler / supprimer ; annuler libère le créneau).
- Notification email : clé gratuite [Web3Forms](https://web3forms.com) à coller dans l'onglet Tunnel.
- Données Firestore (`apps/delta-perf-v2/…`) : `settings/tunnel`, `tunnel_slots/{date}_{heure}`, `prospects`, `appointments`.

### Règles Firestore à ajouter (une seule fois)

Console Firebase → Firestore Database → Règles : coller le contenu de `firestore-tunnel.rules` à l'intérieur du bloc `match /databases/{database}/documents { … }`, à côté des règles existantes, puis **Publier**.

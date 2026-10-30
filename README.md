# Gemini-Server-Steve

Serveur REST Node.js/Express pour centraliser les appels Google Gemini sans intégrer la clé Gemini dans les APK Android.

## Routes
- `GET /` : nom et routes principales.
- `GET /health` : état de santé (ne révèle pas les secrets).
- `POST /v1/generate` : génération Gemini, protégée par un jeton Bearer.

## Variables d'environnement
- `GEMINI_API_KEY` : clé API obtenue dans Google AI Studio.
- `SERVER_API_TOKEN` : secret long utilisé par les clients autorisés.
- `GEMINI_MODEL` : modèle Gemini (par défaut `gemini-2.5-flash`).
- `PORT` : port fourni par l'hébergeur.

## Déploiement Render
1. Crée un dépôt GitHub et pousse ces fichiers à sa racine.
2. Dans Render, crée un Web Service depuis ce dépôt (ou utilise le Blueprint `render.yaml`).
3. Ajoute `GEMINI_API_KEY` et `SERVER_API_TOKEN` dans Environment.
4. Déploie puis vérifie `https://TON-SERVICE.onrender.com/health`.

## Test
Remplace l'URL et le jeton ci-dessous :

```sh
curl -X POST "https://TON-SERVICE.onrender.com/v1/generate" \
  -H "Authorization: Bearer TON_SERVER_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Écris trois suggestions de messages amicaux."}'
```

Réponse :
```json
{"text":"...","model":"gemini-2.5-flash"}
```

## Important
- Ne mets jamais la clé Gemini dans le code Android, GitHub, ni dans une capture d'écran.
- Un jeton partagé dans un APK peut être extrait : pour une application distribuée au public, ajoute des comptes utilisateurs, des quotas et une limitation de débit par utilisateur avant la mise en production.
- Le plan gratuit de l'hébergeur et les quotas Gemini peuvent changer.

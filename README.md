# CRM (Anime.js) — Ready-to-run

This folder contains a **client** (React + Vite + TypeScript + Anime.js effects) and a **server** (Express, in-memory).
No database required. You can also point the client at your own server on port **4000**.

## Quick start

### 1) Start the server
```
cd server
npm i
npm run dev
```
Server runs at **http://localhost:4000**.

### 2) Start the client
Open a new terminal:
```
cd client
npm i
npm run dev
```
Then open the URL Vite prints, typically **http://localhost:5173**.

## What’s included
- Animated UI via **Anime.js** (loaded dynamically) with a **CSS fallback** when Anime isn’t available.
- Obvious animations: header slide, section fade/slide, row cascade, new-row flash highlight.
- APIs implemented by the server:
  - `GET /accounts`, `POST /accounts`
  - `GET /leads`, `POST /leads`, `POST /leads/:id/convert`
  - `GET /opps`, `POST /opps`

If you want to use your existing backend instead, just stop this server and run yours on port **4000** — the client will work the same.

# quiniela-web

Frontend de MatchPick — plataforma de quinielas deportivas para el Mundial 2026.

## Stack

- **Next.js 15** App Router
- **TypeScript**
- **TailwindCSS** + **shadcn/ui**
- **Framer Motion** — animaciones
- **next-themes** — dark mode

## Setup local

```bash
# 1. Instalar dependencias
npm install

# 2. Variables de entorno
cp .env.local.example .env.local
# Edita .env.local con tu URL del API

# 3. Iniciar servidor de desarrollo
npm run dev
```

La app corre en http://localhost:3000

## Variables de entorno

| Variable | Descripcion | Default |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | URL del backend Laravel | `http://localhost:8000/api` |
| `NEXT_PUBLIC_APP_URL` | URL del frontend | `http://localhost:3000` |

## Estructura

```
app/
├── (auth)/              # Login, Register — sin sidebar
├── (dashboard)/         # Paginas protegidas — con sidebar
│   ├── page.tsx         # Mis Quinielas
│   └── quinielas/[slug]/
├── auth/callback/       # Callback OAuth Google
└── invitaciones/[token]/

components/
├── ui/                  # shadcn/ui
├── quiniela-card.tsx
├── standings-table.tsx
├── match-card.tsx
└── prediction-form.tsx

lib/
├── api.ts               # Fetch wrapper con Bearer token
├── auth.ts
└── utils.ts

types/index.ts           # Todos los tipos TypeScript
```

## Paginas principales

| Ruta | Descripcion |
|---|---|
| `/login` | Inicio de sesion (email + Google) |
| `/register` | Registro de cuenta |
| `/` | Dashboard — Mis quinielas |
| `/quinielas/nueva` | Crear quiniela |
| `/quinielas/[slug]` | Detalle: posiciones, predicciones, participantes |
| `/invitaciones/[token]` | Unirse a quiniela por invitacion |

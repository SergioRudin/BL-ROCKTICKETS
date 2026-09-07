# RockTickets

Proyecto full stack de ticketera para conciertos rock/metal.

## Stack
- Frontend: React + Vite + React Router
- Backend: Node.js + Express + MongoDB (Mongoose)
- Extras: QR local, carrito, selección de asientos, panel admin, dashboard básico

## Frontend
```bash
cd frontend
npm install
npm run dev
```

## Backend
```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

## Variables de entorno backend
- `PORT=5000`
- `MONGODB_URI=mongodb://127.0.0.1:27017/rocktickets`
- `ADMIN_TOKEN=admin-rock`

## Rutas API principales
- `GET /api/events`
- `GET /api/events/:slug`
- `POST /api/events` (requiere header `x-admin-token`)
- `GET /api/dashboard/summary`
- `POST /api/orders/checkout`

## Nota
El frontend trae datos demo para funcionar aunque el backend no esté levantado. Para conectar el backend, cambia `src/utils/api.js` si hace falta.

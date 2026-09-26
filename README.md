# Aegis

Runtime governance for AI agents. Built for **JEVATHON** (TypeSafe × The AI Collective).

The app lives in [`aegis/`](aegis/). Full notes are in [`aegis/README.md`](aegis/README.md).

## Docker

From `aegis/`:

```bash
cd aegis
cp .env.example .env
docker compose up --build
```

On PowerShell:

```powershell
cd aegis
Copy-Item .env.example .env
docker compose up --build
```

Open [http://localhost:3001](http://localhost:3001).

`.env` is optional. Every key can be empty; the demo still runs, and a missing `TYPESAFE_API_KEY` uses the mock judge. Stop a local `npm run dev` first if it is already bound to port 3001.

```bash
docker compose ps
docker compose logs -f
docker compose restart
docker compose down
docker compose down -v
```

`docker compose down` keeps the `aegis-data` ledger volume. `docker compose down -v` deletes it.

The image is `aegis-loan-agent:latest`. The service is `loan-agent`. `GET /api/health` is the container health check.

## Local dev

```bash
cd aegis
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3001](http://localhost:3001). Next reads `.env.local`. Compose reads `.env`.

# My Diary

A calm, paper-textured journaling app for daily practice. Land on today's page
and log, in one glance:

- **Practice** — morning meditation, cleaning, sitting (with trainer), group
  meditation
- **Body** — sleep (bedtime / wake / duration / quality), gym (body parts +
  duration + intensity), activity (running / swimming / badminton / walking /
  cycling / yoga / tennis / pickleball — with duration + distance + intensity)
- **Reflection** — a free-form journal

Everything autosaves. A monthly calendar on the right colours each day by how
much you've logged. Works on desktop web, iPad, and phone (installable as a
PWA).

Design inherited from [Heart_speaks](https://github.com/vaibhavd030/Heart_speaks);
domain model from [My-Tele-PA](https://github.com/vaibhavd030/My-Tele-PA).

## Stack

- **Frontend**: Next.js 16 · React 19 · TypeScript · Tailwind v4
- **Backend**: FastAPI · Pydantic v2 · SQLAlchemy async · Postgres · Alembic
- **Auth**: JWT + bcrypt
- **Storage**: one row per entry — `(user_id, entry_date, type, data_jsonb)`

## Quick start

```bash
# 1. Start Postgres
docker compose up -d

# 2. Backend
cd backend
uv sync                          # or: pip install -e ".[dev]"
cp .env.example .env             # edit JWT_SECRET
uv run alembic upgrade head
uv run uvicorn my_diary.api.main:app --reload

# 3. Frontend (in another terminal)
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```

Open http://localhost:3000.

## Push to GitHub

```bash
# Create an empty repo at https://github.com/new — name it My_Diary, no README
cd my_diary
git remote add origin git@github.com:vaibhavd030/My_Diary.git
git push -u origin main
```

## Entry types

| type               | payload fields                                                          |
|--------------------|-------------------------------------------------------------------------|
| `meditation`       | datetime_logged, duration_minutes, place, felt, notes                   |
| `cleaning`         | datetime_logged, duration_minutes, notes                                |
| `sitting`          | datetime_logged, duration_minutes, took_from, notes                     |
| `group_meditation` | datetime_logged, duration_minutes, place, notes                         |
| `sleep`            | bedtime, wake_time, duration_hours, quality (1–10), notes               |
| `gym`              | duration_minutes, body_parts (multi-select), intensity (1–10), notes    |
| `activity`         | activity_type, duration_minutes, distance_km, intensity (1–10), notes   |
| `journal_note`     | body                                                                    |

`body_parts` values: full_body, chest, biceps, triceps, shoulders, back, abs,
lower_body, upper_body, stretching.
`activity_type` values: run, walk, swim, cycle, badminton, tennis, pickleball,
yoga, other.

## Design tokens (from Heart_speaks)

paper `#F5F1E6` · ink `#3E3E3E` · gold accent `#C5A065` · gold vibrant `#D4AF37`
· gold faint `#F0E4C7` · bronze `#8C6D3F` · sage `#A3B18A` · border cream
`#E6DECE`.

Fonts: Pinyon Script (logo), Playfair Display (dates/headings), Crimson Text
(journal body), Geist Sans (UI).

## Calendar colour key

richness = distinct entry types logged that day.

| richness | fill                                    |
|----------|-----------------------------------------|
| 0        | paper                                   |
| 1        | faint gold `#F0E4C7`                    |
| 2–3      | gold `#D4AF37`                          |
| 4–5      | bronze `#8C6D3F`                        |
| 6+       | bronze with sage-green ring `#A3B18A`   |

Today = solid outline; future days disabled.

## Tests

```bash
cd backend
uv run pytest -q
```

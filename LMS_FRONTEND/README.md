# Learnly LMS frontend

React 18 + Vite + Material UI 5 + Recharts. Every screen reads from and writes to the Spring Boot backend; there is no example data.

## Run it

1. Start the backend (default `http://localhost:8080`).
2. In this folder:
   ```
   npm install
   npm run dev
   ```
3. Open http://localhost:5173 and log in. The first admin comes from the backend's `application.properties`
   (`admin@lms.com` / `Admin@123` by default). Students and teachers can register themselves.

To use a different backend address, copy `.env.example` to `.env` and change `VITE_API_URL`.
The backend only accepts requests from `http://localhost:5173` unless you change `app.cors.allowed-origins`.

**Demo data (optional):** with the backend running on an empty database, run `python3 seed_demo.py` (from the backend's
`tests` folder). It creates teachers, students, courses, quizzes, assignments and reviews, so every page has something to show.

## Build for production

```
npm run build
```
The site is written to `dist/`. Serve it with any static web server that sends unknown paths to `index.html`
(the app uses browser routing, for example `/student/quizzes`).

## Folders

- `src/api/client.js`: axios setup (base URL, token, 401 handling), error messages, file links and uploads.
- `src/auth/`: login state (`AuthContext`) and route guards per role.
- `src/components/layout/`: the top bar, menus per role and the notification bell.
- `src/components/ui/`: shared building blocks (page header, stat cards, panels, charts style, upload box, status chips).
- `src/pages/auth`, `common`, `student`, `teacher`, `admin`: one file per page.
- `src/theme.js`: colors, fonts and component styles (light and dark mode).

The Frontend Guide explains every page and the API calls it makes.

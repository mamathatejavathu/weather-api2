# Weather Dashboard

A responsive, dark editorial weather dashboard with a server-side WeatherAPI proxy and raw/formatted JSON inspector. Built with HTML, CSS, vanilla JavaScript, and a Node.js Vercel Function.

## Requirements

- Node.js 20+
- A WeatherAPI.com API key
- Vercel CLI for local serverless development and deployment

## Run locally

1. Create a `.env` file in the project root (never commit it):

   ```sh
   cp .env.example .env
   ```

2. Replace the placeholder with your WeatherAPI key:

   ```dotenv
   WEATHERAPI_KEY=your_real_key_here
   ```

3. Install the Vercel CLI if needed and run:

   ```sh
   npm install --global vercel
   vercel dev
   ```

4. Open the local URL printed by Vercel. The app loads New Delhi on startup; use the chips or search for another city.

> Opening `index.html` directly is not sufficient: `/api/weather` must run through the Vercel development server.

## Fixing Vercel's `unused_function` configuration error

The weather handler is located at `api/weather.js` in the same project root as `vercel.json` and `package.json`. `vercel.json` intentionally does not define a `functions` glob: the default Vercel Node.js function settings are sufficient, and removing the unnecessary glob avoids a pattern mismatch. The frontend calls `/api/weather?city=...`.

In Vercel Project Settings, make sure **Root Directory** points to the folder containing `vercel.json`, `package.json`, and `api/weather.js`. If the repository contains this project inside a subfolder, select that subfolder as the Root Directory.

## Deploy to Vercel

1. Push this folder to a private or public Git repository (do not commit `.env`).
2. In Vercel, create a project and import the repository, or run `vercel` in this directory.
3. In **Project Settings → Environment Variables**, add `WEATHERAPI_KEY` for Preview and Production (and Development if desired).
4. Deploy with `vercel --prod` or trigger a production deployment in the dashboard.
5. Verify the deployed URL, then test an ordinary city, an unknown city, and the JSON inspector.

This environment does not have an authenticated Vercel deployment connection, so a live deployment must be initiated from your Vercel account. No live URL is claimed here.

## Features

- Ten one-click city chips plus free-form city search and Enter submission.
- Current conditions, local time, Celsius temperature, condition icon, feels-like temperature, humidity, wind, visibility, UV, and cloud cover.
- Deterministic, reusable mood engine in `mood.js`, with documented priority order in `moodFor()`.
- Raw response body and formatted syntax-highlighted JSON with clipboard copy.
- Server-side API key only; request validation, timeout, upstream status/body forwarding, and best-effort per-instance throttling.
- Responsive layout, visible keyboard focus, live status announcements, and reduced-motion support.

## API behavior

`GET /api/weather?city=Patna`

- Missing or invalid city: `400`
- Non-GET request: `405`
- Rate limit: `429`
- Missing server environment key: `503`
- Upstream response: upstream status and body are forwarded without reconstructing the JSON.
- Upstream timeout: `504`; upstream network failure: `502`

The in-memory rate limit is best-effort per serverless instance; for stronger abuse prevention, configure rate limiting at a WAF/edge layer. The proxy intentionally does not log the API key or URL.

## Mood rule priority

1. `temp_c >= 38` → **Scorching**
2. `temp_c <= 5` → **Freezing**
3. `humidity >= 80 && temp_c >= 28` → **Muggy**
4. `wind_kph >= 30` → **Windy**
5. `20 <= temp_c <= 30 && humidity <= 60 && wind_kph <= 20` → **Pleasant**
6. `15 <= temp_c <= 30 && humidity <= 75 && wind_kph <= 30` → **Comfortable**
7. Otherwise → **Mixed**

Earlier rules take precedence when more than one condition matches.

## Tests

Run `npm test` to execute mood-rule unit tests. The tests do not require an API key or network access.

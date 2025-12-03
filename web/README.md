# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Analytics (evt.js)

This app ships with a tiny analytics helper at `src/lib/evt.js` that safely no-ops in development and only sends events in production when enabled via environment variables.

- Set in your `.env.production` (or deployment env vars):
	- `VITE_ANALYTICS_ENABLED=true`
	- `VITE_GTAG_ID=G-XXXXXXXX` (optional, for Google Analytics 4)
	- `VITE_ANALYTICS_AUTO_INIT=true` (optional, auto-loads gtag.js)

Initialization happens in `src/main.jsx` with `initAnalytics()`. Page views are tracked in `src/App.jsx` on route changes. Use it in components as:

```js
import { track } from '@/lib/evt';

function ExampleButton() {
	return <button onClick={() => track('example_click', { label: 'foo' })}>Click</button>;
}
```

Migration framework

Place migration files in this folder. Each migration should export an async `up({ mongoose })` function
and optionally a `down({ mongoose })` function. Files are executed in filename sort order and recorded
in the `migrations` collection to prevent re-running.

Run migrations from the `server` folder using:

```bash
npm run migrate
```

# Trae Preflight

This folder is prepared for `wangxt-954-1`.

Use `.env` for stable local ports and compose project identity:

- APP_PORT: 18254
- API_PORT: 19254
- WEB_PORT: 20254
- DB_PORT: 21254
- REDIS_PORT: 22254

Smoke entry:

```bash
bash scripts/smoke.sh
```

The preflight files are environment scaffolding only. The generated business
project can replace or extend them when needed.

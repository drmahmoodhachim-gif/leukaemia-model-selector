# Leukaemia Model Selector

CSRG-25-14 tool for choosing leukaemia cell lines by SCFA transport / oxidation, HDACi response, pathogen-product sensing, redox, and AHR / bile-acid axes.

- **Live site:** https://leukaemia-model-selector.netlify.app
- **Code:** https://github.com/drmahmoodhachim-gif/leukaemia-model-selector
- **Data:** Supabase table `public.leukemia_model_lines` (115 lines, public `SELECT` only)

## Local

```bash
cp .env.example .env
# fill VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

The UI loads from Supabase and falls back to `src/data/lines.json` if the table is empty.

## Stack

Vite + React, Netlify static publish (`dist`), Supabase Postgres with RLS select-only for `anon`.

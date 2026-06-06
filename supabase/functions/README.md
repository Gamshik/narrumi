# Supabase Edge Functions

Production AI calls are routed through these functions:

- `generate-episode`
- `submit-interaction`

Required server secrets:

```text
OPENROUTER_API_KEY=...
OPENROUTER_MODEL=openai/gpt-4o-mini
```

The mobile app must be configured with public Expo variables:

```text
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

`explain-grammar` is intentionally not implemented yet.

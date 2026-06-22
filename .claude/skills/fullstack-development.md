---
name: fullstack-development
description: Best practices for full-stack development with Next.js, TypeScript, Supabase, and modern tooling.
---

# Full-Stack Development Best Practices

## Architecture Principles
- **Server-first**: Use React Server Components by default
- **Feature modules**: Group by domain not by type
- **Thin API routes**: Business logic in service layer
- **Type safety end-to-end**: Generate Supabase types, Zod schemas at boundaries

## Security Checklist
- All API routes: validate auth token before processing
- RLS on every Supabase table
- Never expose service role key to client
- Validate + sanitize all user inputs with Zod
- Rate limit API routes (especially AI endpoints)
- Audit logs for sensitive operations

## Testing
- Unit: Vitest for utils, validations, services
- Integration: Vitest + Supabase local for DB logic
- E2E: Playwright for critical user flows

## CI/CD (GitHub Actions)
```yaml
on: [push, pull_request]
jobs:
  test:
    - npm ci
    - npm run lint
    - npm run type-check
    - npm run test
  deploy:
    - needs: test
    - vercel deploy --prod
```

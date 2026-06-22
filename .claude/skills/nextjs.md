---
name: nextjs
description: Next.js 15 App Router patterns, conventions, and best practices for production applications.
---

# Next.js 15 Best Practices

## App Router Conventions
- `page.tsx` — routable page (RSC by default)
- `layout.tsx` — shared UI wrapper
- `loading.tsx` — Suspense fallback
- `error.tsx` — error boundary (`"use client"` required)
- `route.ts` — API route handler

## Server vs Client Components
```
Default: Server Component (async, can fetch, cannot use hooks/events)
"use client": Client Component (can use useState, useEffect, event handlers)
```

## Server Actions
```ts
"use server";
export async function createItem(formData: FormData) {
  const session = await getServerSession();
  const validated = schema.parse(Object.fromEntries(formData));
  const { data, error } = await supabase.from('items').insert(validated);
  revalidatePath('/items');
}
```

## Route Groups
- `(auth)` — auth pages with centered layout
- `(dashboard)` — protected pages with sidebar layout
- `(public)` — public marketing pages

## Streaming AI Responses
```ts
export async function POST(req: Request) {
  const stream = new ReadableStream({ ... });
  return new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } });
}
```

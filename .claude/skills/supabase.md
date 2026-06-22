---
name: supabase
description: Supabase patterns for auth, database, storage, realtime, and RLS in Next.js applications.
---

# Supabase Best Practices

## Client Setup (Next.js + SSR)
```ts
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr';
export const createClient = () =>
  createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
export const createClient = async () => {
  const cookieStore = await cookies();
  return createServerClient(url, key, { cookies: { getAll: () => cookieStore.getAll(), setAll: (cs) => cs.forEach(...) } });
};
```

## RLS
```sql
create policy "own rows" on profiles for all using (auth.uid() = id);
create policy "admins only" on admin_data for all using (
  (select role from profiles where id = auth.uid()) = 'admin'
);
```

## Key Patterns
- Always check `error` before using `data`
- Service role key only on server
- Use `.throwOnError()` for server actions
- Enable RLS on every table

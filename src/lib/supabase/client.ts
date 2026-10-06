'use client';
import { createBrowserClient } from '@supabase/ssr';
import { DB_SCHEMA } from '@/lib/lang';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    // Bản tiếng Trung đọc ghi trong schema riêng, không đụng dữ liệu bản tiếng Anh
    { db: { schema: DB_SCHEMA } }
  );
}

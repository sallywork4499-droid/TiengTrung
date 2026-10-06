'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { APP_LANG, L } from '@/lib/lang';
import type { Difficulty } from '@/lib/types';

type BackupCard = {
  vi_text: string;
  en_text: string;
  reading?: string | null;
  difficulty: Difficulty;
  times_seen?: number;
  times_correct?: number;
};
type BackupPage = { title: string; created_at?: string; cards: BackupCard[] };
type BackupFile = {
  app: string;
  lang: string;
  version: number;
  exported_at: string;
  profile?: { total_points?: number; current_streak?: number; longest_streak?: number };
  pages: BackupPage[];
};

const LEVELS: Difficulty[] = ['phrase', 'sentence', 'paragraph'];

/**
 * Tải toàn bộ đoạn và câu về máy dưới dạng một file JSON, và nạp lại được.
 * Điểm với streak cũng ghi vào file để xem lại, nhưng khi nạp thì không
 * khôi phục, tránh chuyện tự cộng điểm cho mình.
 */
export default function Backup() {
  const [busy, setBusy] = useState<'none' | 'export' | 'import'>('none');
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function exportData() {
    setBusy('export');
    setError(null);
    setNote(null);
    try {
      const supabase = createClient();
      const [{ data: pages }, { data: cards }, { data: profile }] = await Promise.all([
        supabase.from('pages').select('id,title,created_at').order('created_at'),
        supabase
          .from('cards')
          .select('page_id,vi_text,en_text,reading,difficulty,times_seen,times_correct')
          .order('created_at'),
        supabase.from('profiles').select('total_points,current_streak,longest_streak').single(),
      ]);

      const byPage = new Map<string, BackupCard[]>();
      for (const c of cards ?? []) {
        const list = byPage.get(c.page_id) ?? [];
        list.push({
          vi_text: c.vi_text,
          en_text: c.en_text,
          reading: c.reading ?? null,
          difficulty: c.difficulty,
          times_seen: c.times_seen,
          times_correct: c.times_correct,
        });
        byPage.set(c.page_id, list);
      }

      const out: BackupFile = {
        app: L.appName,
        lang: APP_LANG,
        version: 1,
        exported_at: new Date().toISOString(),
        profile: profile ?? undefined,
        pages: (pages ?? []).map((p) => ({
          title: p.title,
          created_at: p.created_at,
          cards: byPage.get(p.id) ?? [],
        })),
      };

      const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `verso-${APP_LANG}-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);

      const n = out.pages.reduce((s, p) => s + p.cards.length, 0);
      setNote(`Đã tải về ${out.pages.length} đoạn, ${n} mục.`);
    } catch {
      setError('Không tải được bản sao lưu. Thử lại sau.');
    } finally {
      setBusy('none');
    }
  }

  async function importData(file: File) {
    setBusy('import');
    setError(null);
    setNote(null);
    try {
      const data = JSON.parse(await file.text()) as BackupFile;

      if (!Array.isArray(data.pages)) throw new Error('shape');
      if (data.lang && data.lang !== APP_LANG) {
        setError(
          `File này là bản sao lưu của app ${data.lang === 'zh' ? 'tiếng Trung' : 'tiếng Anh'}, không nạp vào đây được.`
        );
        setBusy('none');
        return;
      }

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('auth');

      // Đoạn trùng tên thì nạp vào chính đoạn đó, khỏi tạo bản sao
      const { data: current } = await supabase.from('pages').select('id,title');
      const existing = new Map((current ?? []).map((p) => [p.title, p.id as string]));

      let addedPages = 0;
      let addedCards = 0;

      for (const page of data.pages) {
        if (!page?.title || !Array.isArray(page.cards)) continue;

        let pageId: string | undefined = existing.get(page.title);
        if (!pageId) {
          const { data: created } = await supabase
            .from('pages')
            .insert({ user_id: user.id, title: page.title })
            .select('id')
            .single();
          if (!created) continue;
          pageId = String(created.id);
          existing.set(page.title, pageId);
          addedPages++;
        }

        if (!pageId) continue;

        // Bỏ những câu đã có trong đoạn đó, tránh nạp trùng khi chạy lại
        const { data: have } = await supabase.from('cards').select('vi_text').eq('page_id', pageId);
        const seen = new Set((have ?? []).map((c) => c.vi_text.trim().toLowerCase()));

        const rows = page.cards
          .filter(
            (c) =>
              c?.vi_text?.trim() &&
              c?.en_text?.trim() &&
              LEVELS.includes(c.difficulty) &&
              !seen.has(c.vi_text.trim().toLowerCase())
          )
          .map((c) => ({
            page_id: pageId,
            user_id: user.id,
            vi_text: c.vi_text.trim(),
            en_text: c.en_text.trim(),
            reading: c.reading?.trim() || null,
            difficulty: c.difficulty,
          }));

        if (rows.length) {
          const { error: insErr } = await supabase.from('cards').insert(rows);
          if (!insErr) addedCards += rows.length;
        }
      }

      setNote(
        addedCards === 0 && addedPages === 0
          ? 'File hợp lệ nhưng mọi thứ trong đó đã có sẵn, không thêm gì.'
          : `Đã nạp thêm ${addedPages} đoạn mới và ${addedCards} mục.`
      );
      router.refresh();
    } catch {
      setError('File không đọc được. Phải là file JSON do chính app này tải về.');
    } finally {
      setBusy('none');
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <div>
      <div className="flex gap-2">
        <button
          onClick={exportData}
          disabled={busy !== 'none'}
          className="flex-1 rounded-2xl bg-card py-3 text-sm font-semibold text-ink shadow-card disabled:opacity-40"
        >
          {busy === 'export' ? 'Đang tải…' : 'Tải bản sao lưu'}
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={busy !== 'none'}
          className="flex-1 rounded-2xl bg-card py-3 text-sm font-semibold text-ink shadow-card disabled:opacity-40"
        >
          {busy === 'import' ? 'Đang nạp…' : 'Nạp lại từ file'}
        </button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) importData(f);
        }}
        className="hidden"
      />

      {note && <p className="mt-2 text-xs leading-relaxed text-brandDeep">{note}</p>}
      {error && <p className="mt-2 text-xs leading-relaxed text-rose">{error}</p>}
      <p className="mt-2 text-xs leading-relaxed text-muted">
        File chứa toàn bộ đoạn và câu của bạn. Nạp lại thì đoạn trùng tên gộp vào nhau và câu trùng
        bị bỏ qua, nên chạy nhiều lần cũng không sinh bản sao. Điểm và streak không khôi phục.
      </p>
    </div>
  );
}

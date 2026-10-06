'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { DIFFICULTY_LABEL } from '@/lib/scoring';
import { parseGlossary, type LevelChoice } from '@/lib/glossary';
import { L } from '@/lib/lang';
import type { Difficulty, Pair } from '@/lib/types';

type Row = Pair & { duplicate?: boolean; keep: boolean };
type Step = 'pick' | 'review' | 'saving';
/** Hai cách nạp, đều chạy ngay trên máy, không gọi model nào. */
type Source = 'list' | 'text';

const ORDER: Difficulty[] = ['phrase', 'sentence', 'paragraph'];

const LEVELS: { value: LevelChoice; label: string }[] = [
  { value: 'phrase', label: 'Cụm từ' },
  { value: 'sentence', label: 'Câu' },
  { value: 'paragraph', label: 'Đoạn' },
  { value: 'auto', label: 'Tự đoán' },
];

export default function Ingest() {
  const [step, setStep] = useState<Step>('pick');
  const [source, setSource] = useState<Source>('list');

  // Nạp bằng danh sách từ
  const [txtList, setTxtList] = useState('');
  const [level, setLevel] = useState<LevelChoice>('phrase');
  const [unparsed, setUnparsed] = useState<string[]>([]);

  // Nạp bằng một đoạn
  const [txtEn, setTxtEn] = useState('');
  const [txtVi, setTxtVi] = useState('');
  const [txtReading, setTxtReading] = useState('');

  const [title, setTitle] = useState('');
  const [target, setTarget] = useState<string>('new');
  const [existing, setExisting] = useState<{ id: string; title: string; created_at: string }[]>([]);
  const [practiceNow, setPracticeNow] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    createClient()
      .from('pages')
      .select('id,title,created_at')
      .order('created_at', { ascending: false })
      .then(({ data }) => setExisting(data ?? []));
  }, []);

  const ready =
    source === 'list' ? txtList.trim().length > 2 : Boolean(txtEn.trim() && txtVi.trim());

  /** Tách ngay trên máy: tức thì, không cần mạng, không tốn gì. */
  function prepare() {
    if (!ready) return;
    setError(null);
    setUnparsed([]);

    if (source === 'list') {
      const { pairs, unparsed: left } = parseGlossary(txtList, level);
      if (pairs.length === 0) {
        setError(
          'Không tách được dòng nào. Mỗi dòng cần có dấu ngăn giữa hai vế, ví dụ dấu gạch ngang hoặc hai chấm.'
        );
        return;
      }
      const noun =
        level === 'auto' ? 'mục' : level === 'phrase' ? 'từ' : DIFFICULTY_LABEL[level].toLowerCase();
      setTitle(`Danh sách ${pairs.length} ${noun}`);
      setRows(pairs.map((p) => ({ ...p, keep: true })));
      setUnparsed(left);
    } else {
      const vi = txtVi.trim();
      setTitle(vi.length > 44 ? vi.slice(0, 44).replace(/\s\S*$/, '') + '…' : vi);
      setRows([
        {
          vi,
          en: txtEn.trim(),
          reading: txtReading.trim() || null,
          difficulty: 'paragraph',
          keep: true,
        },
      ]);
    }
    setStep('review');
  }

  async function save() {
    setStep('saving');
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    let pageId = target;
    if (target === 'new') {
      const { data: page, error: pageErr } = await supabase
        .from('pages')
        .insert({ user_id: user.id, title: title.trim() || 'Đoạn mới' })
        .select()
        .single();
      if (pageErr || !page) {
        setError('Không tạo được đoạn mới');
        setStep('review');
        return;
      }
      pageId = page.id;
    }

    const keep = rows.filter((r) => r.keep);
    const { error: cardErr } = await supabase.from('cards').insert(
      keep.map((r) => ({
        page_id: pageId,
        user_id: user.id,
        vi_text: r.vi.trim(),
        en_text: r.en.trim(),
        reading: r.reading?.trim() || null,
        difficulty: r.difficulty,
      }))
    );

    if (cardErr) {
      setError('Không lưu được các mục');
      setStep('review');
      return;
    }

    // Luyện ngay: chỉ bật đúng đoạn này, tắt các đoạn khác cho khỏi lẫn
    if (practiceNow) {
      await Promise.all([
        supabase.from('pages').update({ is_default: true }).eq('id', pageId),
        supabase
          .from('pages')
          .update({ is_default: false })
          .eq('user_id', user.id)
          .neq('id', pageId),
      ]);
    }

    router.push('/');
    router.refresh();
  }

  /* ---------- bước nhập ---------- */
  if (step === 'pick') {
    return (
      <main className="mx-auto min-h-[100dvh] max-w-md px-4 pb-16 pt-4">
        <Link href="/library" className="text-sm text-muted hover:text-ink">
          ← Thư viện
        </Link>
        <h1 className="mt-6 text-3xl font-bold">Nạp tài liệu</h1>

        <div className="mt-6 flex gap-1 rounded-2xl bg-sand p-1">
          {(['list', 'text'] as Source[]).map((m) => (
            <button
              key={m}
              onClick={() => {
                setSource(m);
                setError(null);
              }}
              aria-pressed={source === m}
              className={`flex-1 rounded-xl py-2 text-sm font-semibold transition-colors ${
                source === m ? 'bg-card text-brand shadow-card' : 'text-muted hover:text-ink'
              }`}
            >
              {m === 'list' ? 'Danh sách' : 'Một đoạn'}
            </button>
          ))}
        </div>

        {source === 'list' ? (
          <div className="mt-6 space-y-3">
            <p className="text-sm leading-relaxed text-muted">
              Mỗi dòng một mục. Ngăn cách bằng gạch ngang, hai chấm, dấu bằng hay dấu tab đều được.
              {L.showReading && ' Thêm vế thứ ba nếu muốn lưu phiên âm.'}
            </p>
            <Field
              label="Danh sách"
              value={txtList}
              onChange={setTxtList}
              placeholder={L.listPlaceholder}
              rows={9}
            />

            <div>
              <p className="mb-2 text-xs font-semibold text-muted">Nạp thành</p>
              <div className="flex gap-1 rounded-2xl bg-sand p-1">
                {LEVELS.map((l) => (
                  <button
                    key={l.value}
                    onClick={() => setLevel(l.value)}
                    aria-pressed={level === l.value}
                    className={`flex-1 rounded-xl py-2 text-sm font-semibold transition-colors ${
                      level === l.value ? 'bg-card text-brand shadow-card' : 'text-muted hover:text-ink'
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted">
                {level === 'auto'
                  ? 'Dòng ngắn tính là cụm từ, dòng dài hoặc có dấu chấm tính là câu.'
                  : `Mọi dòng vào mức ${DIFFICULTY_LABEL[level as Difficulty].toLowerCase()}. Vẫn sửa lại từng dòng được ở bước duyệt.`}
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            <p className="text-sm leading-relaxed text-muted">
              Dán một đoạn và bản dịch của nó. Lưu thành đúng một mục ở mức Đoạn.
            </p>
            <Field
              label={`Bản ${L.target} gốc`}
              value={txtEn}
              onChange={setTxtEn}
              placeholder={L.sourcePlaceholder}
            />
            <Field
              label="Bản dịch tiếng Việt"
              value={txtVi}
              onChange={setTxtVi}
              placeholder={L.viPlaceholder}
            />
            {L.showReading && (
              <Field
                label={`${L.readingLabel} (không bắt buộc)`}
                value={txtReading}
                onChange={setTxtReading}
                placeholder="zhèngfǔ yīnggāi shíshī gèng yángé de guīdìng."
                rows={3}
              />
            )}
          </div>
        )}

        {error && <p className="mt-4 text-sm text-rose">{error}</p>}

        <button
          onClick={prepare}
          disabled={!ready}
          className="mt-6 w-full rounded-2xl bg-brand py-3.5 font-semibold text-onBrand shadow-brand disabled:opacity-30 disabled:shadow-none"
        >
          Xem trước
        </button>

        <p className="mt-4 text-xs leading-relaxed text-muted">
          Mọi thứ xử lý ngay trên máy, không gửi đi đâu và không cần mạng.
        </p>
      </main>
    );
  }

  /* ---------- bước duyệt ---------- */
  const kept = rows.filter((r) => r.keep).length;

  return (
    <main className="mx-auto min-h-[100dvh] max-w-2xl px-4 pb-32 pt-4">
      <h1 className="text-3xl font-bold">Duyệt lại</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Sửa chỗ nào lệch, bỏ chọn mục không cần, rồi lưu.
      </p>

      <div className="mt-6 rounded-2xl bg-card p-4 shadow-card">
        <label className="text-xs font-semibold text-muted" htmlFor="target">
          Lưu vào
        </label>
        <select
          id="target"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          className="mt-1.5 w-full rounded-xl bg-sand px-3 py-2.5 font-semibold focus:outline-none focus:ring-2 focus:ring-brand/60"
        >
          <option value="new">＋ Đoạn mới</option>
          {existing.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>

        {target === 'new' ? (
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Tên đoạn, ví dụ: Đô thị hoá – đoạn 2"
            className="mt-2 w-full rounded-xl bg-sand px-3 py-2.5 placeholder:text-muted/70 focus:outline-none focus:ring-2 focus:ring-brand/60"
          />
        ) : (
          <p className="mt-2 text-xs leading-relaxed text-muted">
            Các mục dưới đây sẽ gắn vào đoạn đã chọn, cùng với những gì đoạn đó đang có.
          </p>
        )}
      </div>

      <ul className="mt-4 space-y-3">
        {rows.map((row, i) => (
          <li
            key={i}
            className={`rounded-2xl bg-card p-3 shadow-card ${row.keep ? '' : 'opacity-50'}`}
          >
            <div className="mb-2 flex items-center gap-3 text-xs">
              <button
                onClick={() => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, keep: !r.keep } : r)))}
                className={`h-4 w-4 shrink-0 rounded border ${
                  row.keep ? 'border-brand bg-brand' : 'border-line'
                }`}
                aria-label={row.keep ? 'Bỏ mục này' : 'Giữ mục này'}
              />
              <select
                value={row.difficulty}
                onChange={(e) =>
                  setRows((rs) =>
                    rs.map((r, j) => (j === i ? { ...r, difficulty: e.target.value as Difficulty } : r))
                  )
                }
                className="rounded bg-sand px-2 py-1 text-muted focus:outline-none"
              >
                {ORDER.map((d) => (
                  <option key={d} value={d}>
                    {DIFFICULTY_LABEL[d]}
                  </option>
                ))}
              </select>
            </div>

            <textarea
              value={row.vi}
              onChange={(e) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, vi: e.target.value } : r)))}
              rows={2}
              className="w-full resize-none bg-transparent text-sm focus:outline-none"
            />
            <textarea
              value={row.en}
              onChange={(e) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, en: e.target.value } : r)))}
              rows={2}
              className="mt-1 w-full resize-none border-t border-line bg-transparent pt-2 text-sm text-muted focus:outline-none"
            />
            {L.showReading && (
              <input
                value={row.reading ?? ''}
                onChange={(e) =>
                  setRows((rs) => rs.map((r, j) => (j === i ? { ...r, reading: e.target.value } : r)))
                }
                placeholder={`${L.readingLabel}, không bắt buộc`}
                className="mt-1 w-full border-t border-line bg-transparent pt-2 text-sm text-lilacText placeholder:text-muted/60 focus:outline-none"
              />
            )}
          </li>
        ))}
      </ul>

      {unparsed.length > 0 && (
        <div className="mt-4 rounded-2xl bg-card p-4 shadow-card">
          <p className="text-sm font-semibold text-brandDeep">
            {unparsed.length} dòng không tách được, đã bỏ qua
          </p>
          <ul className="mt-2 space-y-1">
            {unparsed.slice(0, 5).map((u, i) => (
              <li key={i} className="truncate text-xs text-muted">
                {u}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs leading-relaxed text-muted">
            Thường là dòng tiêu đề, hoặc thiếu dấu ngăn giữa hai vế.
          </p>
        </div>
      )}

      <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl bg-card p-4 shadow-card">
        <input
          type="checkbox"
          checked={practiceNow}
          onChange={(e) => setPracticeNow(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-brand"
        />
        <span className="text-sm font-semibold leading-relaxed">
          Luyện đoạn này ngay
          <span className="mt-0.5 block text-xs font-normal text-muted">
            Lưu xong vào thẳng màn hình luyện, chỉ với đoạn này.
          </span>
        </span>
      </label>

      {error && <p className="mt-4 text-sm text-rose">{error}</p>}

      <div className="fixed inset-x-0 bottom-0 border-t border-line bg-page/95 p-4 backdrop-blur">
        <div className="mx-auto flex max-w-2xl gap-2">
          <button
            onClick={() => setStep('pick')}
            className="rounded-2xl bg-card px-5 py-3.5 font-semibold text-muted shadow-card"
          >
            Quay lại
          </button>
          <button
            onClick={save}
            disabled={kept === 0 || step === 'saving'}
            className="flex-1 rounded-2xl bg-brand py-3.5 font-semibold text-onBrand shadow-brand disabled:opacity-30 disabled:shadow-none"
          >
            {step === 'saving' ? 'Đang lưu…' : `Lưu ${kept} mục`}
          </button>
        </div>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  rows = 5,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  rows?: number;
}) {
  return (
    <label className="block rounded-2xl bg-card p-4 shadow-card focus-within:ring-2 focus-within:ring-brand/60">
      <span className="text-xs font-semibold text-muted">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="mt-2 w-full resize-none bg-transparent leading-relaxed text-ink placeholder:text-muted/60 focus:outline-none"
      />
    </label>
  );
}

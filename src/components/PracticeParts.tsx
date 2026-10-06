'use client';

/*
 * Các khối phụ của màn hình luyện. Tách ra từ Practice.tsx ở v2.8
 * để file chính chỉ còn phần điều khiển vòng lặp.
 */
import Link from 'next/link';
import { badgeLabel } from '@/lib/scoring';
import Mascot from '@/components/Mascot';
import GoalRing from '@/components/GoalRing';
import { L } from '@/lib/lang';
import type { Card } from '@/lib/types';

export function StatusBar({
  streak,
  points,
  gained,
  done,
  doneToday,
  goal,
  onNavigate,
}: {
  streak: number;
  points: number;
  gained: number | null;
  done: number;
  doneToday: number;
  goal: number;
  onNavigate: (e: React.MouseEvent<HTMLAnchorElement>, to: string) => void;
}) {
  return (
    <header className="flex items-center justify-between px-4 pt-3 text-sm">
      <div className="flex items-center gap-3">
        <GoalRing done={doneToday} goal={goal} />
        <span className="text-brand">🔥 {streak}</span>
        <span className="relative text-muted">
          {points.toLocaleString('vi-VN')}
          {gained !== null && (
            <span className="reveal absolute -right-1 -top-4 text-brand">+{gained}</span>
          )}
        </span>
        {done > 0 && <span className="text-muted/70">{done} câu phiên này</span>}
      </div>
      <nav className="flex gap-4 text-muted">
        <Link href="/library" onClick={(e) => onNavigate(e, '/library')} className="hover:text-ink">
          Thư viện
        </Link>
        <Link href="/dashboard" onClick={(e) => onNavigate(e, '/dashboard')} className="hover:text-ink">
          Tiến độ
        </Link>
      </nav>
    </header>
  );
}

export function Review({
  card,
  answer,
  onCorrect,
  onWrong,
  onRetry,
  busy,
}: {
  card: Card;
  answer: string;
  onCorrect: () => void;
  onWrong: () => void;
  onRetry: () => void;
  busy: boolean;
}) {
  return (
    <div className="reveal space-y-3">
      <div className="rounded-2xl bg-card p-4 shadow-card">
        <p className="mb-1 text-xs text-muted">Bạn viết</p>
        <p className="leading-relaxed text-muted">{answer}</p>
      </div>

      <div className="rounded-2xl border border-lilac/30 bg-lilacSoft p-4">
        <p className="mb-1 text-xs text-lilacText">{L.originalLabel}</p>
        <p className="leading-relaxed text-ink">{card.en_text}</p>
        {L.showReading && card.reading && (
          <p className="mt-2 border-t border-lilac/25 pt-2 text-sm leading-relaxed text-lilacText">
            {card.reading}
          </p>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={onWrong}
          disabled={busy}
          className="flex-1 rounded-2xl bg-card py-3 text-muted shadow-card hover:text-rose disabled:opacity-40"
        >
          Chưa đúng
        </button>
        <button
          onClick={onCorrect}
          disabled={busy}
          className="flex-1 rounded-2xl bg-brand py-3 font-semibold text-onBrand shadow-brand disabled:opacity-40"
        >
          Đúng rồi
        </button>
      </div>

      <button onClick={onRetry} className="w-full py-1 text-sm text-muted hover:text-ink">
        Sửa lại câu này
      </button>
    </div>
  );
}

export function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-center px-8 text-center leading-relaxed text-muted">
      {children}
    </div>
  );
}

export function FixSheet({
  vi,
  en,
  onVi,
  onEn,
  onSave,
  onDrop,
  onClose,
}: {
  vi: string;
  en: string;
  onVi: (v: string) => void;
  onEn: (v: string) => void;
  onSave: () => void;
  onDrop: () => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-x-0 z-20 flex items-end justify-center bg-ink/40 p-3"
      style={{ top: 'var(--app-top, 0px)', height: 'var(--app-h, 100dvh)' }}
    >
      <div className="reveal max-h-full w-full max-w-md overflow-y-auto rounded-3xl bg-card p-5 shadow-lift">
        <p className="font-bold">Sửa câu này</p>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          Hay gặp với câu tách từ ảnh: chữ đọc sai, hoặc ghép nhầm cặp.
        </p>

        <label className="mt-4 block text-xs font-semibold text-muted">Tiếng Việt</label>
        <textarea
          value={vi}
          onChange={(e) => onVi(e.target.value)}
          rows={3}
          className="mt-1 w-full resize-none rounded-2xl bg-sand p-3 leading-relaxed focus:outline-none focus:ring-2 focus:ring-brand/60"
        />

        <label className="mt-3 block text-xs font-semibold text-muted">Tiếng Anh gốc</label>
        <textarea
          value={en}
          onChange={(e) => onEn(e.target.value)}
          rows={3}
          className="mt-1 w-full resize-none rounded-2xl bg-sand p-3 leading-relaxed focus:outline-none focus:ring-2 focus:ring-brand/60"
        />

        <div className="mt-4 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-2xl bg-sand py-3 font-semibold text-muted"
          >
            Thôi
          </button>
          <button
            onClick={onSave}
            disabled={!vi.trim() || !en.trim()}
            className="flex-1 rounded-2xl bg-brand py-3 font-semibold text-onBrand shadow-brand disabled:opacity-35"
          >
            Lưu
          </button>
        </div>
        <button
          onClick={onDrop}
          className="mt-3 w-full py-1 text-sm font-semibold text-rose"
        >
          Xoá hẳn câu này
        </button>
      </div>
    </div>
  );
}

export function GoalToast({ goal }: { goal: number }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 flex justify-center px-4">
      <div className="pop flex items-center gap-3 rounded-2xl bg-card px-5 py-3 shadow-lift">
        <Mascot size={36} mood="cheer" />
        <div>
          <p className="text-sm font-bold text-brandDeep">Xong mục tiêu hôm nay</p>
          <p className="text-xs text-muted">{goal} câu. Làm thêm vẫn tính điểm.</p>
        </div>
      </div>
    </div>
  );
}

export function BadgeToast({ badgeKey }: { badgeKey: string }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 flex justify-center px-4">
      <div className="reveal rounded-2xl border border-brand/40 bg-sand px-5 py-3 text-center">
        <p className="text-sm text-brand">Đạt mốc {badgeLabel(badgeKey)}</p>
      </div>
    </div>
  );
}

/**
 * Dải mỏng thay cho toàn bộ phần đầu khi bàn phím đang mở.
 * Chỉ giữ những gì cần liếc mắt: tiến độ và tên đoạn; hai nút thu thành biểu tượng.
 * Mục đích duy nhất là nhường chỗ cho đoạn văn.
 */
export function SlimBar({
  doneCount,
  total,
  passage,
  onPeek,
  onIssue,
}: {
  doneCount: number;
  total: number;
  passage: string;
  onPeek: (() => void) | null;
  onIssue: () => void;
}) {
  return (
    <div className="flex h-7 flex-none items-center gap-2 px-4 text-xs text-muted">
      {total > 0 && (
        <span className="font-extrabold text-brandDeep">
          {doneCount}/{total}
        </span>
      )}
      <span className="min-w-0 truncate">{passage}</span>
      <span className="ml-auto flex flex-none gap-1.5">
        {onPeek && (
          <button
            onClick={onPeek}
            aria-label="Xem lại cả đoạn"
            className="rounded-full bg-card px-2.5 py-0.5 text-xs font-extrabold text-brandDeep shadow-card"
          >
            ⤢ Đoạn
          </button>
        )}
        <button
          onClick={onIssue}
          aria-label="Câu này có vấn đề"
          className="rounded-full bg-card px-2.5 py-0.5 text-xs font-extrabold text-muted shadow-card"
        >
          ⚠
        </button>
      </span>
    </div>
  );
}

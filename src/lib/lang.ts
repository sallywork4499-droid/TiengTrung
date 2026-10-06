/**
 * Mọi khác biệt giữa bản tiếng Anh và bản tiếng Trung gom hết vào đây.
 * Cùng một mã nguồn, chọn bản nào là do biến môi trường NEXT_PUBLIC_APP_LANG.
 */

export type AppLang = 'en' | 'zh';

export const APP_LANG: AppLang =
  (process.env.NEXT_PUBLIC_APP_LANG as AppLang) === 'zh' ? 'zh' : 'en';

/** Schema chứa dữ liệu. Bản tiếng Trung dùng schema riêng, tách hẳn khỏi public. */
export const DB_SCHEMA = process.env.NEXT_PUBLIC_DB_SCHEMA?.trim() || 'public';

type LangConfig = {
  /** Tên app hiện trên màn hình đăng nhập và dưới icon */
  appName: string;
  tagline: string;
  /** Tên ngôn ngữ đích, dùng trong nhãn và câu nhắc */
  target: string;
  /** Chữ gợi ý trong ô viết */
  answerPlaceholder: string;
  /** Nhãn khối bản gốc ở màn hình đối chiếu */
  originalLabel: string;
  /** Có hiện phiên âm kèm bản gốc không */
  showReading: boolean;
  readingLabel: string;
  /** Ví dụ trong ô dán danh sách từ */
  listPlaceholder: string;
  /** Ví dụ trong hai ô dán đoạn văn */
  sourcePlaceholder: string;
  viPlaceholder: string;
  /** Có cần nạp phông chữ Hán không */
  needsHanFont: boolean;
};

const CONFIG: Record<AppLang, LangConfig> = {
  en: {
    appName: 'Verso',
    tagline: 'Dịch ngược Việt sang Anh trên chính tài liệu bạn đang học.',
    target: 'tiếng Anh',
    answerPlaceholder: 'Viết lại bằng tiếng Anh…',
    originalLabel: 'Bản gốc',
    showReading: false,
    readingLabel: '',
    listPlaceholder:
      'curb emissions — hạn chế khí thải\nfall behind: tụt lại phía sau\nThe government should act now. = Chính phủ nên hành động ngay.',
    sourcePlaceholder: 'The government should impose stricter regulations…',
    viPlaceholder: 'Chính phủ nên áp dụng các quy định chặt chẽ hơn…',
    needsHanFont: false,
  },
  zh: {
    appName: 'Verso 中文',
    tagline: 'Dịch ngược Việt sang Trung trên chính tài liệu bạn đang học.',
    target: 'tiếng Trung',
    answerPlaceholder: 'Gõ pinyin có dấu thanh, ví dụ wǒ shì…',
    originalLabel: 'Bản gốc',
    showReading: true,
    readingLabel: 'Pinyin',
    listPlaceholder:
      '提高 — nâng cao — tígāo\n落后 — tụt lại phía sau — luòhòu\n我们应该马上行动。— Chúng ta nên hành động ngay. — wǒmen yīnggāi mǎshàng xíngdòng.',
    sourcePlaceholder: '政府应该实施更严格的规定…',
    viPlaceholder: 'Chính phủ nên áp dụng các quy định chặt chẽ hơn…',
    needsHanFont: true,
  },
};

export const L = CONFIG[APP_LANG];

/** Có chữ Hán trong chuỗi không. Dùng để nhận ra vế tiếng Trung. */
export function hasHan(text: string): boolean {
  return /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/.test(text);
}

/**
 * Chữ Hán đặc hơn chữ Latin nhiều: một trăm chữ Hán dài bằng chừng hai trăm
 * rưỡi ký tự tiếng Anh. Nên quy đổi về cùng thước đo trước khi chọn cỡ chữ.
 */
export function visualLength(text: string): number {
  const t = text.trim();
  if (APP_LANG !== 'zh') return t.length;
  let n = 0;
  for (const ch of Array.from(t)) n += hasHan(ch) ? 2.5 : 1;
  return Math.round(n);
}

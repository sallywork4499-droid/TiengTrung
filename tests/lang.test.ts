/** Phần nhận biết chữ Hán và quy đổi độ dài, dùng cho bản tiếng Trung. */
const HAN = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/;
const hasHan = (t: string) => HAN.test(t);
const visualLength = (t: string, zh: boolean) => {
  const s = t.trim();
  if (!zh) return s.length;
  let n = 0;
  for (const ch of Array.from(s)) n += hasHan(ch) ? 2.5 : 1;
  return Math.round(n);
};

let fails = 0;
const check = (n: string, ok: boolean, d = '') => {
  console.log(`${ok ? '  ok  ' : ' LỖI '} ${n}${d ? ' — ' + d : ''}`);
  if (!ok) fails++;
};

console.log('\n── Nhận biết chữ Hán ──');
check('Câu tiếng Trung', hasHan('我是越南人'));
check('Chữ Hán lẫn dấu câu', hasHan('政府应该实施更严格的规定。'));
check('Tiếng Việt có dấu thì không', !hasHan('Tôi là người Việt Nam'));
check('Tiếng Anh thì không', !hasHan('I am Vietnamese'));
check('Pinyin có dấu thanh cũng không', !hasHan('wǒ shì yuènánrén'));
check('Chuỗi rỗng', !hasHan(''));

console.log('\n── Tách cặp dựa vào chữ Hán ──');
const viSide = (s: string, zh: boolean) => (zh ? !hasHan(s) : /[àáảãạăằắđêôơư]/i.test(s));
check('Vế Hán không phải tiếng Việt', !viSide('提高', true));
check('Vế Việt nhận ra đúng', viSide('nâng cao', true));
check('Dán ngược chiều vẫn nhận ra', viSide('nâng cao', true) && !viSide('提高', true));
const sameSide = (a: string, b: string) => hasHan(a) === hasHan(b);
check('Hai vế cùng tiếng Trung thì bỏ', sameSide('提高', '改善'));
check('Hai vế cùng tiếng Việt thì bỏ', sameSide('nâng cao', 'cải thiện'));
check('Một Hán một Việt thì nhận', !sameSide('提高', 'nâng cao'));

console.log('\n── Quy đổi độ dài để chọn cỡ chữ ──');
const han20 = '我是越南人我是越南人我是越南人我是越南人';
check('20 chữ Hán tính như 50 ký tự Latin', visualLength(han20, true) === 50, String(visualLength(han20, true)));
check('Bản tiếng Anh thì đếm như cũ', visualLength(han20, false) === 20);
check('Chữ Hán lẫn chữ Latin', visualLength('我是 ABC', true) === 9, String(visualLength('我是 ABC', true)));
check('Đoạn Hán dài quy ra cỡ chữ nhỏ', visualLength(han20.repeat(8), true) > 300);

console.log(`\n${fails === 0 ? 'Tất cả đều đạt.' : `${fails} chỗ sai.`}\n`);
process.exit(fails === 0 ? 0 : 1);

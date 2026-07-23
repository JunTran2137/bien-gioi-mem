// @ts-check
// Card set for the "Mô tả & Đoán thẻ" (Describe & Guess) game.
//
// Each card maps to a PHYSICAL card that the organisers print with the card
// NAME as plain text. When a group holds a card up to their phone camera, the
// phone runs in-browser OCR (Tesseract.js) and fuzzy-matches the recognised
// text to a card here via matchCardByText (accent-insensitive, tolerant of OCR
// slips). `markerId` is kept only as a stable numeric id used across the socket
// protocol and scoring — it is no longer a printed ArUco marker.
//
// All 8 groups receive the SAME deck, so any group can hold up any card to
// guess which one another group is describing.

/**
 * @typedef {Object} DescribeCard
 * @property {string} id
 * @property {number} markerId   Stable numeric id (legacy field name; no longer an ArUco marker)
 * @property {string} name       Card name (the "answer") — printed on the physical card
 * @property {string} category
 * @property {string} hint       Short reference so scribes describe accurately
 */

/** @type {DescribeCard[]} */
const describeCards = [
  { id: 'c01', markerId: 1,  name: 'Biên giới mềm',                  category: 'khái niệm', hint: 'Đường biên không có trên bản đồ — vẽ bằng đồng tiền, dòng vốn và công nghệ, không bằng hàng rào.' },
  { id: 'c02', markerId: 2,  name: 'Biên giới kinh tế',              category: 'khái niệm', hint: 'Cường quốc "vẽ lại" lãnh thổ bằng tầm với của đồng tiền — rộng gấp nhiều lần biên giới thật.' },
  { id: 'c03', markerId: 3,  name: 'Chủ nghĩa thực dân cũ',          category: 'khái niệm', hint: 'Cắm cờ, đóng quân, cai trị trực tiếp — kiểu thống trị bằng súng đã tan rã giữa thế kỷ XX.' },
  { id: 'c04', markerId: 4,  name: 'Xuất khẩu tư bản',               category: 'cơ chế',    hint: 'Rót vốn, viện trợ, cho vay hào phóng — miếng mồi ngọt giăng ra để giăng bẫy lệ thuộc.' },
  { id: 'c05', markerId: 5,  name: 'Lệ thuộc về vốn',               category: 'cơ chế',    hint: 'Vốn vay, viện trợ, đầu tư kèm điều kiện — nước nghèo bị buộc chặt về tài chính, khó thoát.' },
  { id: 'c06', markerId: 6,  name: 'Lệ thuộc về công nghệ',         category: 'cơ chế',    hint: 'Ai giữ con chip và bí quyết thì cầm chuôi dao — nước khác mãi chỉ được phần lắp ráp, gia công.' },
  { id: 'c07', markerId: 7,  name: 'Lệ thuộc về chính trị',         category: 'cơ chế',    hint: 'Nắm dạ dày rồi nắm cái đầu — kinh tế bị siết đến đâu, chính sách nghe lời đến đó.' },
  { id: 'c08', markerId: 8,  name: 'Tập đoàn tư bản độc quyền',     category: 'khái niệm', hint: 'Ông chủ giấu mặt của cuộc chơi — mượn cả bộ máy nhà nước để mở đường cho lợi nhuận.' },
  { id: 'c09', markerId: 9,  name: '"Sân sau"',                       category: 'khái niệm', hint: 'Một nước bị biến thành cái sân riêng: nói gì nghe nấy, hết quyền tự quyết định.' },
  { id: 'c10', markerId: 10, name: '"Bãi thải công nghiệp"',         category: 'hệ quả',    hint: 'Nơi hứng máy móc lỗi thời và khói bụi ô nhiễm mà cường quốc muốn tống khỏi sân nhà mình.' },
  { id: 'c11', markerId: 11, name: 'Xâm lăng văn hóa',               category: 'hệ quả',    hint: 'Không cần một viên đạn — phim, nhạc, thần tượng ngoại từ từ bào mòn bản sắc dân tộc.' },
  { id: 'c12', markerId: 12, name: 'Gia tăng khoảng cách giàu nghèo', category: 'hệ quả',   hint: 'Kẻ mạnh giàu vọt lên, nước nghèo mãi tụt lại — khoảng cách ngày càng khoét sâu.' },
  { id: 'c13', markerId: 13, name: 'Chi phối chính trị',            category: 'mục tiêu',  hint: 'Mục tiêu cuối cùng: từ lệ thuộc kinh tế tiến tới điều khiển chính sách và quyền lực nhà nước.' },
  { id: 'c14', markerId: 14, name: 'Chiến tranh thương mại',         category: 'thế kỷ XXI', hint: 'Bắn nhau bằng thuế quan và lệnh cấm vận thay cho đại bác — chiến trường của thế kỷ XXI.' },
  { id: 'c15', markerId: 15, name: 'Xung đột sắc tộc, tôn giáo',    category: 'thế kỷ XXI', hint: 'Mâu thuẫn nội bộ bị cường quốc đứng sau giật dây để duy trì và mở rộng ảnh hưởng.' },
  { id: 'c16', markerId: 16, name: 'Chủ nghĩa thực dân mới',         category: 'phân tích',  hint: 'Thống trị không cần chiếm một tấc đất — chỉ cần nắm túi tiền và công nghệ của nước khác.' },
];

/** @type {Record<number, DescribeCard>} */
const byMarker = {};
/** @type {Record<string, DescribeCard>} */
const byId = {};
for (const c of describeCards) {
  byMarker[c.markerId] = c;
  byId[c.id] = c;
}

/** @param {number} markerId */
function cardByMarker(markerId) {
  return byMarker[markerId] || null;
}
/** @param {string} id */
function cardById(id) {
  return byId[id] || null;
}

/* ------------------------- text (OCR) matching ---------------------------- */
// The physical cards are now printed with the card NAME as plain text instead
// of an ArUco marker. The phone runs OCR on the frame and we fuzzy-match the
// recognised text against these names. OCR frequently drops or mangles Vietnamese
// diacritics, so we compare on an accent-stripped, punctuation-free form and use
// token-level fuzzy matching that tolerates 1-char OCR slips.

/** Strip Vietnamese diacritics + punctuation, lowercase, collapse whitespace.
 * @param {string} s */
function normalizeText(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // combining diacritics
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ') // drop quotes, punctuation, symbols
    .replace(/\s+/g, ' ')
    .trim();
}

/** Levenshtein edit distance (small strings, iterative DP).
 * @param {string} a @param {string} b */
function editDistance(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = new Array(n + 1);
  let cur = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    cur[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    const tmp = prev; prev = cur; cur = tmp;
  }
  return prev[n];
}

/** True if two normalized tokens are "the same word" allowing OCR slips.
 * Short words (≤3 chars) must match exactly — a 1-char slack there is enough to
 * confuse distinct words ("cũ"/"chủ", "mới"/"nói"), which corrupts matching.
 * @param {string} a @param {string} b */
function tokenMatches(a, b) {
  if (a === b) return true;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen <= 3) return false;               // short words: exact only
  if (a.length >= 4 && b.length >= 4 && (a.includes(b) || b.includes(a))) return true;
  const tol = maxLen >= 6 ? 2 : 1;             // longer words tolerate more slips
  return editDistance(a, b) <= tol;
}

/** Does `needle` appear (fuzzily) as a contiguous run inside `hay`?
 * Handles OCR that glues a name into one blob or splits it oddly. Slides a
 * window over `hay` and allows ~20% character errors.
 * @param {string} hay @param {string} needle */
function fuzzyContains(hay, needle) {
  if (!needle || needle.length < 5) return false;
  if (hay.includes(needle)) return true;
  const nl = needle.length;
  const tol = Math.max(1, Math.floor(nl * 0.2));
  if (hay.length < nl - tol) return false;
  for (let w = nl - tol; w <= nl + tol; w++) {
    if (w <= 0) continue;
    for (let i = 0; i + w <= hay.length; i++) {
      if (editDistance(hay.substr(i, w), needle) <= tol) return true;
    }
  }
  return false;
}

// Precompute normalized token lists + a spaceless "joined" form for each card.
const _cardNorm = describeCards.map((c) => {
  const norm = normalizeText(c.name);
  return {
    card: c,
    tokens: norm.split(' ').filter(Boolean),
    joined: norm.replace(/\s+/g, '')
  };
});

/**
 * Fuzzy-match arbitrary OCR text to the best-fitting card.
 *
 * Scoring is weighted token recall — each card word contributes in proportion
 * to its length, so short filler words ("về", "và") can't carry a match while
 * the distinctive long words ("chính trị", "công nghệ") dominate. A spaceless
 * fuzzy-substring check catches OCR that glues or fragments the name. The best
 * card is only returned when it (a) clears the threshold and (b) beats the
 * runner-up by a clear margin, so ambiguous reads (two cards sharing a word)
 * yield no guess instead of a wrong one.
 *
 * @param {string} ocrText
 * @param {number} [minScore] confidence 0..1 the winner must reach
 * @returns {DescribeCard | null}
 */
function matchCardByText(ocrText, minScore = 0.5) {
  const norm = normalizeText(ocrText);
  if (!norm) return null;
  const textTokens = norm.split(' ').filter(Boolean);
  if (!textTokens.length) return null;
  const textJoined = norm.replace(/\s+/g, '');

  let best = null;
  let bestScore = 0;
  let secondScore = 0;

  for (const { card, tokens, joined } of _cardNorm) {
    if (!tokens.length) continue;

    // Weighted token recall — long, distinctive words count for more.
    let matchedWeight = 0;
    let totalWeight = 0;
    for (const nt of tokens) {
      totalWeight += nt.length;
      if (textTokens.some((tt) => tokenMatches(tt, nt))) matchedWeight += nt.length;
    }
    let score = totalWeight ? matchedWeight / totalWeight : 0;

    // Glued/fragmented-read fallback: the whole name found as a fuzzy run.
    if (score < 0.999 && joined.length >= 6 && fuzzyContains(textJoined, joined)) {
      score = Math.max(score, 0.92);
    }

    if (score > bestScore) { secondScore = bestScore; bestScore = score; best = card; }
    else if (score > secondScore) { secondScore = score; }
  }

  // A full exact read (every card word matched) is trusted outright. Otherwise
  // the winner must clear the floor AND clearly beat the runner-up, so a read
  // that fits two similar cards (e.g. "…thực dân cũ" vs "…thực dân mới") with
  // the distinguishing word missing yields no guess rather than a wrong one.
  if (bestScore >= 0.999) return best;
  if (bestScore >= minScore && bestScore - secondScore >= 0.2) return best;
  return null;
}

module.exports = { describeCards, cardByMarker, cardById, matchCardByText, normalizeText };

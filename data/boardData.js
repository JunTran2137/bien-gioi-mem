// @ts-check
/**
 * Monopoly-style board for the "Đại Sứ Tri Thức" board game.
 * A 24-tile square loop (6 tiles per side, corners at 0/6/12/18).
 *
 * Tile types:
 *  - 'start'    : Ô xuất phát (Go). Đi qua/đáp xuống được cộng điểm.
 *  - 'question' : Ô câu hỏi thưởng — cộng thêm điểm.
 *  - 'bonus'    : Cộng điểm (value).
 *  - 'penalty'  : Trừ điểm (value, không xuống dưới 0).
 *  - 'lucky'    : Rút một lá Vận May (chance card).
 *  - 'skip'     : Mất lượt kế tiếp.
 *  - 'move'     : Đi thêm `move` ô (âm = lùi).
 *
 * @typedef {Object} BoardTile
 * @property {number} index
 * @property {'start'|'question'|'bonus'|'penalty'|'lucky'|'skip'|'move'} type
 * @property {string} label
 * @property {number} [value]   // điểm cho bonus/penalty
 * @property {number} [move]    // số ô cho tile 'move'
 */

/** @type {BoardTile[]} */
const boardTiles = [
  { index: 0,  type: 'start',    label: 'Xuất phát' },
  { index: 1,  type: 'question', label: 'Câu hỏi thưởng' },
  { index: 2,  type: 'bonus',    label: 'Ký FTA mới', value: 60 },
  { index: 3,  type: 'lucky',    label: 'Vận May' },
  { index: 4,  type: 'penalty',  label: 'Rào cản thuế quan', value: 50 },
  { index: 5,  type: 'question', label: 'Câu hỏi thưởng' },
  { index: 6,  type: 'move',     label: 'Hành lang kinh tế', move: 2 },
  { index: 7,  type: 'bonus',    label: 'Vốn FDI đổ vào', value: 80 },
  { index: 8,  type: 'question', label: 'Câu hỏi thưởng' },
  { index: 9,  type: 'lucky',    label: 'Vận May' },
  { index: 10, type: 'penalty',  label: 'Đứt gãy chuỗi cung ứng', value: 60 },
  { index: 11, type: 'question', label: 'Câu hỏi thưởng' },
  { index: 12, type: 'skip',     label: 'Hải quan kiểm tra' },
  { index: 13, type: 'bonus',    label: 'Xuất siêu kỷ lục', value: 90 },
  { index: 14, type: 'question', label: 'Câu hỏi thưởng' },
  { index: 15, type: 'lucky',    label: 'Vận May' },
  { index: 16, type: 'penalty',  label: 'Kiện chống bán phá giá', value: 70 },
  { index: 17, type: 'question', label: 'Câu hỏi thưởng' },
  { index: 18, type: 'move',     label: 'Chuyến tàu RCEP', move: -2 },
  { index: 19, type: 'bonus',    label: 'Chuyển giao công nghệ', value: 100 },
  { index: 20, type: 'question', label: 'Câu hỏi thưởng' },
  { index: 21, type: 'lucky',    label: 'Vận May' },
  { index: 22, type: 'penalty',  label: 'Biến động tỷ giá', value: 40 },
  { index: 23, type: 'question', label: 'Câu hỏi thưởng' },
  { index: 24, type: 'bonus',    label: 'Du lịch phục hồi', value: 70 },
  { index: 25, type: 'lucky',    label: 'Vận May' },
  { index: 26, type: 'question', label: 'Câu hỏi thưởng' },
  { index: 27, type: 'penalty',  label: 'Cấm vận công nghệ', value: 80 },
  { index: 28, type: 'move',     label: 'Cao tốc Bắc - Nam', move: 2 },
  { index: 29, type: 'question', label: 'Câu hỏi thưởng' },
  { index: 30, type: 'bonus',    label: 'Nâng hạng thị trường', value: 110 },
  { index: 31, type: 'lucky',    label: 'Vận May' }
];

/** Điểm thưởng khi đi qua hoặc đáp xuống ô Xuất phát. */
const GO_BONUS = 100;
/** Điểm thưởng khi đáp xuống ô câu hỏi (sau khi đã trả lời đúng để được đi). */
const QUESTION_TILE_BONUS = 50;

/**
 * Lá "Vận May" — rút ngẫu nhiên khi đáp xuống ô lucky.
 * @typedef {Object} ChanceCard
 * @property {string} text
 * @property {{points?:number, move?:number, skip?:boolean}} effect
 */

/** @type {ChanceCard[]} */
const chanceCards = [
  { text: 'Đàm phán thương mại thành công! +80 điểm', effect: { points: 80 } },
  { text: 'Thu hút đại bàng công nghệ! +120 điểm', effect: { points: 120 } },
  { text: 'Nâng hạng tín nhiệm quốc gia! +60 điểm', effect: { points: 60 } },
  { text: 'Khủng hoảng năng lượng toàn cầu. -60 điểm', effect: { points: -60 } },
  { text: 'Lạm phát nhập khẩu tăng cao. -40 điểm', effect: { points: -40 } },
  { text: 'Hiệp định mở cửa thị trường — tiến nhanh 3 ô!', effect: { move: 3 } },
  { text: 'Vướng thủ tục hành chính — lùi 2 ô.', effect: { move: -2 } },
  { text: 'Bị điều tra phòng vệ thương mại — mất lượt!', effect: { skip: true } },
  { text: 'Ngoại giao cây tre phát huy hiệu quả! +100 điểm', effect: { points: 100 } },
  { text: 'Đầu tư hạ tầng số hiệu quả! +50 điểm', effect: { points: 50 } }
];

const BOARD_SIZE = boardTiles.length;

function getTile(index) {
  return boardTiles[((index % BOARD_SIZE) + BOARD_SIZE) % BOARD_SIZE];
}

module.exports = {
  boardTiles,
  chanceCards,
  BOARD_SIZE,
  GO_BONUS,
  QUESTION_TILE_BONUS,
  getTile
};

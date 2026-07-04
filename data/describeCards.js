// @ts-check
// Card set for the "Mô tả & Đoán thẻ" (Describe & Guess) game.
//
// Each card maps to a PHYSICAL card that the organisers print with an ArUco
// marker (dictionary "ARUCO" / "Original ArUco", same as the board game). The
// printed marker id === `markerId` here, so when a group holds a card up to
// their phone camera the detector returns the id and we can look up the card.
//
// All 8 groups receive the SAME deck, so any group can hold up any card to
// guess which one another group is describing.

/**
 * @typedef {Object} DescribeCard
 * @property {string} id
 * @property {number} markerId   ArUco marker printed on the physical card
 * @property {string} name       Card name (the "answer")
 * @property {string} category
 * @property {string} hint       Short reference so scribes describe accurately
 */

/** @type {DescribeCard[]} */
const describeCards = [
  { id: 'c01', markerId: 1, name: 'Biên giới mềm', category: 'khái niệm', hint: 'Ranh giới vô hình về kinh tế, công nghệ, văn hóa, pháp lý.' },
  { id: 'c02', markerId: 2, name: 'Biên giới cứng', category: 'khái niệm', hint: 'Ranh giới lãnh thổ, vùng trời, vùng biển bảo vệ bằng quân sự.' },
  { id: 'c03', markerId: 3, name: 'WTO', category: 'tổ chức', hint: 'Tổ chức Thương mại Thế giới, VN là thành viên thứ 150 (2007).' },
  { id: 'c04', markerId: 4, name: 'ASEAN', category: 'tổ chức', hint: 'Hiệp hội các Quốc gia Đông Nam Á, VN gia nhập 1995.' },
  { id: 'c05', markerId: 5, name: 'RCEP', category: 'hiệp định', hint: 'Đối tác Kinh tế Toàn diện Khu vực, ASEAN + 5 nước, hiệu lực 2022.' },
  { id: 'c06', markerId: 6, name: 'CPTPP', category: 'hiệp định', hint: '11 nước Thái Bình Dương, hiệu lực với VN từ 2019.' },
  { id: 'c07', markerId: 7, name: 'EVFTA', category: 'hiệp định', hint: 'FTA Việt Nam - EU, hiệu lực 1/8/2020.' },
  { id: 'c08', markerId: 8, name: 'APEC', category: 'tổ chức', hint: 'Diễn đàn Hợp tác Kinh tế châu Á - Thái Bình Dương, VN gia nhập 1998.' },
  { id: 'c09', markerId: 9, name: 'IMF', category: 'tổ chức', hint: 'Quỹ Tiền tệ Quốc tế, lập 1944 tại Bretton Woods.' },
  { id: 'c10', markerId: 10, name: 'GVC — Chuỗi giá trị toàn cầu', category: 'khái niệm', hint: 'Sản xuất phân tán qua nhiều quốc gia, mỗi nước một khâu.' },
  { id: 'c11', markerId: 11, name: 'Toàn cầu hóa 3.0', category: 'khái niệm', hint: 'Friedman: lấy cá nhân làm trung tâm nhờ Internet.' },
  { id: 'c12', markerId: 12, name: 'Interdependence — Phụ thuộc lẫn nhau', category: 'phân tích', hint: 'Lý thuyết Keohane & Nye (1977).' },
  { id: 'c13', markerId: 13, name: 'Đổi Mới 1986', category: 'sự kiện', hint: 'Đại hội VI khởi xướng kinh tế thị trường định hướng XHCN.' },
  { id: 'c14', markerId: 14, name: 'Chủ quyền số', category: 'khái niệm', hint: 'Kiểm soát dữ liệu công dân, hạ tầng số, quy tắc số.' },
  { id: 'c15', markerId: 15, name: 'FDI', category: 'khái niệm', hint: 'Đầu tư trực tiếp nước ngoài, VN thu hút 20-25 tỷ USD/năm.' },
  { id: 'c16', markerId: 16, name: 'FTA', category: 'khái niệm', hint: 'Hiệp định Thương mại Tự do, VN đã ký 17+.' },
  { id: 'c17', markerId: 17, name: 'Bẫy hội nhập', category: 'phân tích', hint: 'Mở cửa quá nhanh khiến nội lực yếu, phụ thuộc nước ngoài.' },
  { id: 'c18', markerId: 18, name: 'Ngoại giao cây tre', category: 'phân tích', hint: 'Gốc vững, thân chắc, cành lá uyển chuyển.' },
  { id: 'c19', markerId: 19, name: 'AEC — Cộng đồng Kinh tế ASEAN', category: 'hiệp định', hint: 'Ra mắt 31/12/2015, thị trường và sản xuất chung.' },
  { id: 'c20', markerId: 20, name: 'Soft Power — Sức mạnh mềm', category: 'khái niệm', hint: 'Joseph Nye 1990: ảnh hưởng bằng văn hóa, giá trị.' },
  { id: 'c21', markerId: 21, name: 'Keohane & Nye', category: 'phân tích', hint: 'Hai học giả phát triển lý thuyết Complex Interdependence.' },
  { id: 'c22', markerId: 22, name: 'Chính sách "Bốn không"', category: 'phân tích', hint: 'Không liên minh, không căn cứ, không chống nước thứ ba, không dùng vũ lực trước.' },
  { id: 'c23', markerId: 23, name: 'Đối tác Chiến lược Toàn diện', category: 'sự kiện', hint: 'Mức quan hệ ngoại giao cao nhất của VN.' },
  { id: 'c24', markerId: 24, name: 'Xâm thực văn hóa', category: 'phân tích', hint: 'K-pop, TikTok, lối sống ngoại lai lấn át bản sắc.' }
];

/** @type {Record<number, DescribeCard>} */
const byMarker = {};
/** @type {Record<string, DescribeCard>} */
const byId = {};
for (const c of describeCards) {
  byMarker[c.markerId] = c;
  byId[c.id] = c;
}

function cardByMarker(markerId) {
  return byMarker[markerId] || null;
}
function cardById(id) {
  return byId[id] || null;
}

module.exports = { describeCards, cardByMarker, cardById };

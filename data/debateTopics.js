// @ts-check
/**
 * @typedef {Object} DebateTopic
 * @property {string} id
 * @property {string} title
 * @property {'ủng hộ'|'phản đối'} side
 * @property {string} context
 * @property {string[]} argumentStarters
 */

/** @type {DebateTopic[]} */
const debateTopics = [
  {
    id: 'dt01',
    title: 'Việt Nam nên từ bỏ tiền đồng, gia nhập khối tiền tệ chung ASEAN',
    side: 'ủng hộ',
    context: 'Đồng tiền chung loại bỏ rủi ro tỷ giá, thúc đẩy thương mại nội khối, nhưng đánh đổi chính sách tiền tệ độc lập.',
    argumentStarters: [
      'Hãy nhìn vào EU — đồng EUR đã giúp...',
      'Chi phí giao dịch xuyên biên giới sẽ giảm khi...',
      'Dự trữ ngoại hối VN hiện tại đủ để...'
    ]
  },
  {
    id: 'dt02',
    title: 'TikTok, Facebook, YouTube nên bị chặn ở Việt Nam để bảo vệ văn hóa và chủ quyền số',
    side: 'ủng hộ',
    context: 'Các nền tảng nước ngoài thu thập dữ liệu người dùng VN, kiểm soát dòng thông tin, và lan truyền văn hóa phương Tây — nhưng cũng là nguồn thu nhập và kết nối của hàng triệu người.',
    argumentStarters: [
      'Trung Quốc với Great Firewall đã chứng minh...',
      'Dữ liệu người dùng VN đang nằm trên server tại...',
      'Doanh nghiệp nội địa như Zalo có thể...'
    ]
  },
  {
    id: 'dt03',
    title: 'Người nước ngoài nên được phép sở hữu đất đai vĩnh viễn ở Việt Nam như người Việt',
    side: 'ủng hộ',
    context: 'Thu hút FDI và chuyên gia nước ngoài, nhưng đặt ra câu hỏi về chủ quyền lãnh thổ và giá nhà tăng cao đẩy người dân ra khỏi đô thị.',
    argumentStarters: [
      'Singapore và Thái Lan đã thu hút hàng tỷ USD nhờ...',
      'Hạn chế sở hữu đang khiến VN mất cơ hội...',
      'Cần nhìn vào tỷ lệ đất do người nước ngoài nắm ở...'
    ]
  },
  {
    id: 'dt04',
    title: 'Tiếng Anh nên trở thành ngôn ngữ dạy học chính thức bên cạnh tiếng Việt từ lớp 1',
    side: 'ủng hộ',
    context: 'Nâng sức cạnh tranh toàn cầu và thu hút FDI công nghệ cao, nhưng đe dọa bản sắc văn hóa và tạo bất bình đẳng giáo dục.',
    argumentStarters: [
      'Singapore dùng song ngữ và hiện đứng top...',
      'Kỹ sư VN mất cơ hội vì rào cản ngôn ngữ khi...',
      'Philippines với tiếng Anh đã thu hút BPO...'
    ]
  },
  {
    id: 'dt05',
    title: "Việt Nam nên liên minh chiến lược công khai với Mỹ, từ bỏ chính sách 'bốn không'",
    side: 'ủng hộ',
    context: "'Bốn không' giúp VN cân bằng — nhưng có bảo vệ được Biển Đông không?",
    argumentStarters: [
      'Biển Đông đang bị lấn chiếm trong khi...',
      'Ukraine đã trả giá đắt vì không có liên minh khi...',
      'Quan hệ VN-Mỹ hiện đã ở mức Đối tác Chiến lược Toàn diện, bước tiếp theo...'
    ]
  },
  {
    id: 'dt06',
    title: 'Việt Nam nên mở cửa hoàn toàn thị trường lao động cho công dân ASEAN không cần visa',
    side: 'ủng hộ',
    context: 'Lấp đầy thiếu hụt lao động tay nghề cao, nhưng cạnh tranh với lao động nội địa và gây áp lực hạ lương trong một số ngành.',
    argumentStarters: [
      'EU đã chứng minh tự do lao động tạo ra...',
      'Ngành công nghệ VN đang thiếu 500,000 kỹ sư...',
      'ASEAN Economic Community đã cam kết nhưng VN...'
    ]
  },
  {
    id: 'dt07',
    title: 'Chính phủ nên ưu tiên thu hút FDI thay vì hỗ trợ doanh nghiệp nội địa trong 10 năm tới',
    side: 'ủng hộ',
    context: 'FDI mang công nghệ, việc làm, xuất khẩu — nhưng lợi nhuận chảy ra nước ngoài và doanh nghiệp nội địa bị "chèn ép" ngay trên sân nhà.',
    argumentStarters: [
      'Samsung, Intel, LG đã tạo ra hàng triệu việc làm...',
      'Hàn Quốc và Đài Loan đã dùng FDI để chuyển giao công nghệ...',
      'Doanh nghiệp nội địa VN hiện chỉ đóng góp X% xuất khẩu...'
    ]
  },
  {
    id: 'dt08',
    title: 'Việt Nam nên ra khỏi ASEAN và tìm mô hình hội nhập độc lập riêng như Thụy Sĩ',
    side: 'ủng hộ',
    context: 'ASEAN bị chỉ trích là thiếu hiệu lực, bị chi phối bởi các nước lớn và nguyên tắc đồng thuận làm tê liệt quyết sách — trong khi Thụy Sĩ không trong EU nhưng vẫn thịnh vượng.',
    argumentStarters: [
      'ASEAN đã thất bại trong việc giải quyết tranh chấp Biển Đông khi...',
      'Thụy Sĩ với GDP/người hơn 90,000 USD không cần...',
      'VN đang bị ràng buộc bởi nguyên tắc đồng thuận ASEAN trong vụ...'
    ]
  }
];

module.exports = { debateTopics };

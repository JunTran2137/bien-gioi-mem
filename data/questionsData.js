// @ts-check
/**
 * @typedef {Object} Question
 * @property {string} id
 * @property {string} category
 * @property {1|2|3} difficulty
 * @property {string} question
 * @property {[string,string,string,string]} options
 * @property {0|1|2|3} correct
 * @property {string} explanation
 * @property {string=} hint
 */

/** @type {Question[]} */
const questionsData = [
  {
    id: 'q01', category: 'hiệp_định', difficulty: 1,
    question: 'Hiệp định EVFTA được Việt Nam ký kết với đối tác nào?',
    options: ['ASEAN', 'Liên minh Châu Âu (EU)', 'Hoa Kỳ', 'Trung Quốc'],
    correct: 1,
    explanation: 'EVFTA (EU – Vietnam Free Trade Agreement) là hiệp định thương mại tự do thế hệ mới giữa Việt Nam và Liên minh Châu Âu, ký năm 2019 và có hiệu lực từ 1/8/2020.',
    hint: 'Đối tác này có 27 quốc gia thành viên.'
  },
  {
    id: 'q02', category: 'sự_kiện', difficulty: 1,
    question: 'Việt Nam chính thức gia nhập WTO vào năm nào?',
    options: ['2001', '2005', '2007', '2010'],
    correct: 2,
    explanation: 'Việt Nam trở thành thành viên thứ 150 của WTO vào ngày 11/1/2007 sau 11 năm đàm phán.',
    hint: 'Cùng năm Apple ra mắt iPhone đầu tiên.'
  },
  {
    id: 'q03', category: 'sự_kiện', difficulty: 1,
    question: 'Việt Nam gia nhập ASEAN vào năm nào?',
    options: ['1986', '1992', '1995', '1997'],
    correct: 2,
    explanation: 'Việt Nam là thành viên thứ 7 của ASEAN, gia nhập ngày 28/7/1995.',
    hint: 'Cùng năm Mỹ-Việt bình thường hóa quan hệ ngoại giao.'
  },
  {
    id: 'q04', category: 'khái_niệm', difficulty: 2,
    question: '"Biên giới mềm" KHÔNG bao gồm chiều nào sau đây?',
    options: ['Kinh tế', 'Công nghệ', 'Quân sự lãnh thổ', 'Văn hóa'],
    correct: 2,
    explanation: 'Biên giới mềm là khái niệm phi truyền thống về kinh tế, công nghệ, văn hóa, pháp lý — khác với biên giới cứng (quân sự, lãnh thổ).',
    hint: 'Biên giới mềm được phân biệt với biên giới cứng.'
  },
  {
    id: 'q05', category: 'tổ_chức', difficulty: 1,
    question: 'WTO là viết tắt của tổ chức nào?',
    options: ['World Tourism Organization', 'World Trade Organization', 'World Treaty Organization', 'World Tax Organization'],
    correct: 1,
    explanation: 'WTO – Tổ chức Thương mại Thế giới, kế tục GATT, có trụ sở tại Geneva, Thụy Sĩ.',
    hint: 'Tổ chức về thương mại quốc tế.'
  },
  {
    id: 'q06', category: 'hiệp_định', difficulty: 2,
    question: 'CPTPP gồm bao nhiêu quốc gia thành viên (tính cả Việt Nam, không tính các nước đã gia nhập sau 2023)?',
    options: ['9', '11', '12', '15'],
    correct: 1,
    explanation: 'CPTPP có 11 thành viên ban đầu: Australia, Brunei, Canada, Chile, Nhật Bản, Malaysia, Mexico, New Zealand, Peru, Singapore, Việt Nam.',
    hint: 'Trừ Mỹ ra khỏi TPP cũ thì còn bao nhiêu?'
  },
  {
    id: 'q07', category: 'hiệp_định', difficulty: 2,
    question: 'RCEP là hiệp định khu vực do tổ chức nào chủ trì?',
    options: ['EU', 'APEC', 'ASEAN', 'WTO'],
    correct: 2,
    explanation: 'RCEP (Regional Comprehensive Economic Partnership) do ASEAN chủ trì, ký 2020, có hiệu lực 2022, gồm ASEAN + 5 đối tác (TQ, Nhật, Hàn, Úc, NZ).',
    hint: 'Khối khu vực Đông Nam Á.'
  },
  {
    id: 'q08', category: 'sự_kiện', difficulty: 1,
    question: 'Chính sách Đổi Mới ở Việt Nam bắt đầu từ năm nào?',
    options: ['1975', '1986', '1992', '2000'],
    correct: 1,
    explanation: 'Đại hội VI Đảng Cộng sản Việt Nam tháng 12/1986 chính thức khởi xướng đường lối Đổi Mới.',
    hint: 'Cuối thập niên 80.'
  },
  {
    id: 'q09', category: 'phân_tích', difficulty: 3,
    question: 'Lý thuyết "Interdependence" (Sự phụ thuộc lẫn nhau) do hai học giả nào phát triển?',
    options: ['Marx & Engels', 'Keohane & Nye', 'Smith & Ricardo', 'Huntington & Fukuyama'],
    correct: 1,
    explanation: 'Robert Keohane và Joseph Nye phát triển lý thuyết Complex Interdependence trong thập niên 1970, là nền tảng của nghiên cứu hội nhập quốc tế hiện đại.',
    hint: 'Hai học giả người Mỹ.'
  },
  {
    id: 'q10', category: 'khái_niệm', difficulty: 2,
    question: 'GVC là viết tắt của khái niệm gì?',
    options: ['Global Value Chain', 'Global Virtual Currency', 'General Value Counter', 'Global Vertical Cooperation'],
    correct: 0,
    explanation: 'GVC – Chuỗi Giá trị Toàn cầu, mô tả các giai đoạn sản xuất phân tán qua nhiều quốc gia.',
    hint: 'Liên quan đến sản xuất đa quốc gia.'
  },
  {
    id: 'q11', category: 'tổ_chức', difficulty: 1,
    question: 'IMF là tổ chức chuyên về lĩnh vực gì?',
    options: ['Y tế', 'Tiền tệ và tài chính', 'Giáo dục', 'Môi trường'],
    correct: 1,
    explanation: 'IMF – Quỹ Tiền tệ Quốc tế, hỗ trợ ổn định tỷ giá và cứu trợ khủng hoảng tài chính.',
    hint: 'Cứu trợ khủng hoảng tài chính.'
  },
  {
    id: 'q12', category: 'tổ_chức', difficulty: 1,
    question: 'APEC là diễn đàn hợp tác kinh tế của khu vực nào?',
    options: ['Châu Âu', 'Châu Phi', 'Châu Á – Thái Bình Dương', 'Châu Mỹ Latinh'],
    correct: 2,
    explanation: 'APEC – Diễn đàn Hợp tác Kinh tế châu Á – Thái Bình Dương, có 21 nền kinh tế thành viên.',
    hint: 'Hai bờ Thái Bình Dương.'
  },
  {
    id: 'q13', category: 'phân_tích', difficulty: 3,
    question: 'Chiến lược "ngoại giao cây tre" của Việt Nam có đặc điểm cốt lõi nào?',
    options: ['Cứng rắn, không nhượng bộ', 'Liên minh chặt với một cường quốc', 'Mềm dẻo, đa phương hóa, không gãy gốc', 'Trung lập tuyệt đối'],
    correct: 2,
    explanation: 'Ngoại giao cây tre: gốc vững (độc lập, tự chủ), thân chắc (lợi ích quốc gia), cành lá uyển chuyển (đa phương hóa, đa dạng hóa quan hệ).',
    hint: 'Cây tre có gốc rễ chắc, thân dẻo dai.'
  },
  {
    id: 'q14', category: 'hiệp_định', difficulty: 2,
    question: 'Hiệp định nào có hiệu lực với Việt Nam vào năm 2020?',
    options: ['CPTPP', 'EVFTA', 'RCEP', 'AEC'],
    correct: 1,
    explanation: 'EVFTA có hiệu lực 1/8/2020. CPTPP có hiệu lực với VN từ 14/1/2019, RCEP từ 1/1/2022.',
    hint: 'Đối tác là EU.'
  },
  {
    id: 'q15', category: 'sự_kiện', difficulty: 2,
    question: 'Cộng đồng Kinh tế ASEAN (AEC) chính thức thành lập năm nào?',
    options: ['2007', '2010', '2015', '2020'],
    correct: 2,
    explanation: 'AEC chính thức ra mắt ngày 31/12/2015, hướng tới thị trường và cơ sở sản xuất chung.',
    hint: 'Cuối thập niên 2010.'
  },
  {
    id: 'q16', category: 'phân_tích', difficulty: 3,
    question: '"Bẫy hội nhập" mô tả hiện tượng gì?',
    options: ['Quốc gia bị cô lập do từ chối hội nhập', 'Mở cửa quá nhanh làm yếu nội lực, phụ thuộc bên ngoài', 'Hội nhập rồi rút lui', 'Cấm vận thương mại'],
    correct: 1,
    explanation: 'Bẫy hội nhập: quốc gia mở cửa quá nhanh khiến doanh nghiệp nội địa không kịp thích ứng, công nghệ lõi và chuỗi cung ứng bị phụ thuộc nước ngoài.',
    hint: 'Liên quan đến rủi ro mở cửa.'
  },
  {
    id: 'q17', category: 'khái_niệm', difficulty: 2,
    question: '"Chủ quyền số" của một quốc gia chủ yếu liên quan đến điều gì?',
    options: ['Số lượng máy tính', 'Quyền kiểm soát dữ liệu và hạ tầng số trong nước', 'Số người dùng Internet', 'Tốc độ mạng'],
    correct: 1,
    explanation: 'Chủ quyền số: khả năng quốc gia kiểm soát dữ liệu công dân, hạ tầng số, và quy tắc số trong lãnh thổ mình.',
    hint: 'Quyền kiểm soát.'
  },
  {
    id: 'q18', category: 'khái_niệm', difficulty: 1,
    question: 'FDI là viết tắt của khái niệm gì?',
    options: ['Foreign Domestic Investment', 'Foreign Direct Investment', 'Federal Development Index', 'Forex Daily Index'],
    correct: 1,
    explanation: 'FDI – Đầu tư trực tiếp nước ngoài, là dòng vốn doanh nghiệp nước ngoài đầu tư trực tiếp vào quốc gia khác.',
    hint: 'Đầu tư từ doanh nghiệp nước ngoài.'
  },
  {
    id: 'q19', category: 'khái_niệm', difficulty: 1,
    question: 'FTA là viết tắt của khái niệm gì?',
    options: ['Foreign Trade Agency', 'Federal Trade Act', 'Free Trade Agreement', 'Final Tariff Adjustment'],
    correct: 2,
    explanation: 'FTA – Hiệp định Thương mại Tự do, giảm hoặc xóa thuế quan giữa các bên ký kết.',
    hint: 'Hiệp định giảm thuế.'
  },
  {
    id: 'q20', category: 'sự_kiện', difficulty: 2,
    question: 'Tính đến 2024, Việt Nam đã ký bao nhiêu FTA?',
    options: ['7', '12', '17+', '25'],
    correct: 2,
    explanation: 'Việt Nam đã ký kết hơn 17 FTA song phương và đa phương, bao gồm CPTPP, EVFTA, RCEP, UKVFTA…',
    hint: 'Hơn một tá.'
  },
  {
    id: 'q21', category: 'phân_tích', difficulty: 3,
    question: 'Việt Nam thực hiện chính sách "Bốn không" trong quốc phòng, "Bốn không" KHÔNG bao gồm điều nào?',
    options: ['Không liên minh quân sự', 'Không cho nước ngoài đặt căn cứ', 'Không dùng vũ lực trước', 'Không buôn bán vũ khí'],
    correct: 3,
    explanation: 'Bốn không: không liên minh quân sự; không cho nước ngoài đặt căn cứ quân sự; không liên kết với nước này để chống nước kia; không dùng vũ lực hoặc đe dọa dùng vũ lực trước.',
    hint: 'Liên quan đến chính sách quân sự, không phải thương mại vũ khí.'
  },
  {
    id: 'q22', category: 'tổ_chức', difficulty: 2,
    question: 'Tổ chức nào sau đây thuộc nhóm Bretton Woods?',
    options: ['ASEAN', 'WTO', 'IMF và Ngân hàng Thế giới (WB)', 'APEC'],
    correct: 2,
    explanation: 'IMF và World Bank được lập 1944 tại hội nghị Bretton Woods. WTO ra đời sau (1995) từ GATT.',
    hint: 'Hai tổ chức tài chính lập sau Thế chiến II.'
  },
  {
    id: 'q23', category: 'phân_tích', difficulty: 3,
    question: 'Tăng trưởng GDP trung bình của Việt Nam giai đoạn 1990-2020 vào khoảng:',
    options: ['3-4%', '6-7%', '9-10%', '12-15%'],
    correct: 1,
    explanation: 'Việt Nam đạt mức tăng trưởng GDP trung bình khoảng 6.5-7%/năm trong 3 thập kỷ Đổi Mới, thuộc nhóm cao nhất thế giới.',
    hint: 'Cao hơn mức trung bình thế giới (~3%).'
  },
  {
    id: 'q24', category: 'khái_niệm', difficulty: 2,
    question: 'Toàn cầu hóa 3.0 (theo Thomas Friedman) khác Toàn cầu hóa 2.0 ở điểm chính nào?',
    options: ['Quốc gia làm trung tâm', 'Công ty đa quốc gia làm trung tâm', 'Cá nhân làm trung tâm, nhờ công nghệ số', 'Quân sự làm trung tâm'],
    correct: 2,
    explanation: 'Toàn cầu hóa 3.0 lấy cá nhân làm trung tâm: cá nhân có thể cạnh tranh và hợp tác toàn cầu nhờ Internet, AI, nền tảng số.',
    hint: 'Internet trao quyền cho cá nhân.'
  },
  {
    id: 'q25', category: 'tổ_chức', difficulty: 1,
    question: 'G20 là nhóm gồm bao nhiêu nền kinh tế lớn nhất thế giới?',
    options: ['10', '15', '20', '30'],
    correct: 2,
    explanation: 'G20 gồm 19 quốc gia + EU, chiếm khoảng 80% GDP và 75% thương mại toàn cầu.',
    hint: 'Tên gọi nói rõ con số.'
  },
  {
    id: 'q26', category: 'hiệp_định', difficulty: 2,
    question: 'USMCA là hiệp định thay thế cho hiệp định nào?',
    options: ['NAFTA', 'TPP', 'CPTPP', 'GATT'],
    correct: 0,
    explanation: 'USMCA (United States – Mexico – Canada Agreement) ký 2018, có hiệu lực 2020, thay thế NAFTA (1994).',
    hint: 'Hiệp định Bắc Mỹ cũ.'
  },
  {
    id: 'q27', category: 'sự_kiện', difficulty: 2,
    question: 'Năm nào VN-Mỹ chính thức nâng cấp quan hệ lên "Đối tác Chiến lược Toàn diện"?',
    options: ['2013', '2015', '2020', '2023'],
    correct: 3,
    explanation: 'Tháng 9/2023, nhân chuyến thăm của Tổng thống Mỹ Joe Biden, quan hệ Việt – Mỹ được nâng cấp lên mức cao nhất: Đối tác Chiến lược Toàn diện.',
    hint: 'Gần đây.'
  },
  {
    id: 'q28', category: 'phân_tích', difficulty: 3,
    question: 'Đâu KHÔNG phải là rủi ro chính của việc phụ thuộc chuỗi cung ứng nước ngoài?',
    options: ['Bị gián đoạn khi khủng hoảng', 'Mất quyền định giá', 'Tăng năng suất lao động nội địa', 'Lộ bí mật công nghệ'],
    correct: 2,
    explanation: 'Phụ thuộc chuỗi cung ứng nước ngoài gây các rủi ro tiêu cực; tăng năng suất lao động nội địa lại là tác động tích cực có điều kiện.',
    hint: 'Tìm phương án mang ý tích cực.'
  },
  {
    id: 'q29', category: 'khái_niệm', difficulty: 2,
    question: 'Sức mạnh mềm (Soft Power) khác sức mạnh cứng (Hard Power) ở chỗ:',
    options: ['Dùng quân sự thay vì kinh tế', 'Dùng sức hút văn hóa, giá trị thay vì cưỡng bức', 'Dùng tiền tệ thay vì hàng hóa', 'Dùng công nghệ thay vì lao động'],
    correct: 1,
    explanation: 'Soft Power (Joseph Nye, 1990): khả năng ảnh hưởng người khác thông qua sức hấp dẫn về văn hóa, giá trị, chính sách — khác Hard Power dùng quân sự/kinh tế ép buộc.',
    hint: 'Hấp dẫn thay vì ép buộc.'
  },
  {
    id: 'q30', category: 'sự_kiện', difficulty: 2,
    question: 'Việt Nam đảm nhiệm vai trò Chủ tịch ASEAN lần gần đây nhất vào năm nào?',
    options: ['2010', '2018', '2020', '2023'],
    correct: 2,
    explanation: 'Việt Nam giữ chức Chủ tịch ASEAN năm 2020 với chủ đề "Gắn kết và Chủ động thích ứng", chèo lái khối qua đại dịch COVID-19.',
    hint: 'Năm có đại dịch COVID-19.'
  },
  {
    id: 'q31', category: 'phân_tích', difficulty: 3,
    question: 'Yếu tố nào giúp Việt Nam giảm phụ thuộc công nghệ lõi nhập khẩu?',
    options: ['Tăng nhập khẩu thiết bị từ TQ', 'Đầu tư R&D, đào tạo kỹ sư bán dẫn nội địa', 'Giảm thuế nhập khẩu chip', 'Cấm sản xuất chip trong nước'],
    correct: 1,
    explanation: 'Phát triển nội lực qua R&D, đào tạo kỹ sư công nghệ cao (đặc biệt bán dẫn, AI) là con đường bền vững để tự chủ công nghệ.',
    hint: 'Đầu tư nội lực dài hạn.'
  },
  {
    id: 'q32', category: 'tổ_chức', difficulty: 2,
    question: 'WB (World Bank) tập trung vào mục tiêu chính nào?',
    options: ['Giảm nghèo và phát triển', 'Ổn định tỷ giá', 'Đàm phán thuế quan', 'Hòa giải tranh chấp lãnh thổ'],
    correct: 0,
    explanation: 'Ngân hàng Thế giới (WB) cho vay ưu đãi để hỗ trợ các nước đang phát triển giảm nghèo, đầu tư hạ tầng, y tế, giáo dục.',
    hint: 'Khác với IMF (ổn định tỷ giá).'
  },
  {
    id: 'q33', category: 'phân_tích', difficulty: 3,
    question: 'Trong cạnh tranh Mỹ-Trung, vị thế của Việt Nam được mô tả phù hợp nhất là:',
    options: ['Đứng hẳn về phía Mỹ', 'Đứng hẳn về phía Trung Quốc', 'Cân bằng, đa phương hóa, không chọn phe', 'Trung lập tuyệt đối, đóng cửa'],
    correct: 2,
    explanation: 'Việt Nam theo đuổi chính sách đối ngoại đa phương hóa, đa dạng hóa, không chọn phe trong cạnh tranh Mỹ-Trung — tận dụng cơ hội từ cả hai bên.',
    hint: 'Liên quan đến "ngoại giao cây tre".'
  },
  {
    id: 'q34', category: 'hiệp_định', difficulty: 2,
    question: 'UKVFTA là hiệp định giữa Việt Nam và:',
    options: ['Ukraine', 'Vương quốc Anh', 'Uruguay', 'United Arab Emirates'],
    correct: 1,
    explanation: 'UKVFTA – Hiệp định thương mại tự do Việt Nam – Vương quốc Anh, ký 12/2020 sau khi Anh rời EU, có hiệu lực 5/2021.',
    hint: 'Sau Brexit.'
  },
  {
    id: 'q35', category: 'khái_niệm', difficulty: 3,
    question: '"Khu vực hóa" (Regionalization) khác "Toàn cầu hóa" (Globalization) ở điểm nào?',
    options: ['Quy mô địa lý hẹp hơn, ưu tiên liên kết nội khối', 'Xảy ra trước toàn cầu hóa', 'Chỉ về văn hóa', 'Không cần hiệp định'],
    correct: 0,
    explanation: 'Khu vực hóa là quá trình hội nhập sâu trong phạm vi địa lý nhất định (EU, ASEAN, USMCA), thường được xem như "bước đệm" hoặc "phản ứng" với toàn cầu hóa.',
    hint: 'Phạm vi địa lý.'
  },
  {
    id: 'q36', category: 'phân_tích', difficulty: 3,
    question: 'Đâu là biểu hiện rõ nhất của "biên giới mềm" trong đời sống số?',
    options: ['Hàng rào thuế quan tại cửa khẩu', 'Dữ liệu cá nhân người Việt lưu trên server nước ngoài', 'Quân đội biên phòng', 'Visa điện tử'],
    correct: 1,
    explanation: 'Biên giới mềm số: dữ liệu công dân, quyền kiểm soát thuật toán, nội dung số — không thấy bằng mắt nhưng tác động trực tiếp đến chủ quyền.',
    hint: 'Không thấy bằng mắt nhưng có thật.'
  },
  {
    id: 'q37', category: 'sự_kiện', difficulty: 2,
    question: 'Việt Nam là thành viên không thường trực của Hội đồng Bảo an LHQ nhiệm kỳ gần nhất là:',
    options: ['2008-2009', '2014-2015', '2020-2021', '2024-2025'],
    correct: 2,
    explanation: 'VN giữ ghế Ủy viên không thường trực HĐBA LHQ nhiệm kỳ 2020-2021 (lần thứ hai, lần đầu là 2008-2009), với số phiếu kỷ lục 192/193.',
    hint: 'Trùng nhiệm kỳ Chủ tịch ASEAN gần đây.'
  },
  {
    id: 'q38', category: 'khái_niệm', difficulty: 2,
    question: 'Trong chuỗi giá trị toàn cầu, Việt Nam hiện chủ yếu đảm nhận khâu nào?',
    options: ['R&D và thiết kế', 'Gia công lắp ráp', 'Phân phối toàn cầu', 'Sở hữu thương hiệu'],
    correct: 1,
    explanation: 'Việt Nam chủ yếu nằm ở khâu gia công – lắp ráp (giá trị gia tăng thấp). Mục tiêu chiến lược là tiến lên các khâu cao hơn (thiết kế, thương hiệu, R&D).',
    hint: 'Khâu có giá trị gia tăng thấp nhất.'
  },
  {
    id: 'q39', category: 'tổ_chức', difficulty: 2,
    question: 'Tổ chức nào ban hành Mục tiêu Phát triển Bền vững (SDGs) 2030?',
    options: ['WTO', 'IMF', 'Liên Hợp Quốc (UN)', 'WB'],
    correct: 2,
    explanation: 'SDGs 2030 – 17 Mục tiêu Phát triển Bền vững – được Đại hội đồng LHQ thông qua tháng 9/2015.',
    hint: 'Tổ chức có 193 thành viên.'
  },
  {
    id: 'q40', category: 'phân_tích', difficulty: 3,
    question: 'Theo bạn, để hội nhập tốt mà vẫn độc lập tự chủ, ưu tiên hàng đầu nên là gì?',
    options: ['Đóng cửa giảm phụ thuộc', 'Mở cửa hoàn toàn không điều kiện', 'Nâng cao nội lực + chọn lọc hội nhập + đa phương hóa', 'Liên minh chặt với một cường quốc'],
    correct: 2,
    explanation: 'Cân bằng: nâng cao nội lực (doanh nghiệp, công nghệ, văn hóa) làm nền, chọn lọc hội nhập theo lợi ích quốc gia, đa phương hóa để không phụ thuộc một đối tác.',
    hint: 'Chiến lược cân bằng, đa chiều.'
  },
  {
    id: 'q41', category: 'sự_kiện', difficulty: 1,
    question: 'Việt Nam là thành viên thứ bao nhiêu của WTO?',
    options: ['148', '149', '150', '151'],
    correct: 2,
    explanation: 'Việt Nam là thành viên thứ 150 của WTO, gia nhập ngày 11/1/2007.',
    hint: 'Một con số tròn.'
  },
  {
    id: 'q42', category: 'tổ_chức', difficulty: 2,
    question: 'Hiệp hội ASEAN hiện có bao nhiêu quốc gia thành viên chính thức?',
    options: ['8', '9', '10', '11'],
    correct: 2,
    explanation: 'ASEAN hiện có 10 thành viên: Brunei, Campuchia, Indonesia, Lào, Malaysia, Myanmar, Philippines, Singapore, Thái Lan, Việt Nam. Đông Timor đang trong tiến trình gia nhập.',
    hint: 'Tròn 10.'
  }
];

module.exports = { questionsData };

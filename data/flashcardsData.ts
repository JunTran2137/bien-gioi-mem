export type FlashCardCategory = 'khái_niệm' | 'tổ_chức' | 'hiệp_định' | 'sự_kiện' | 'phân_tích';

export interface FlashCardData {
  id: string;
  front: string;
  back: string;
  category: FlashCardCategory;
  difficulty: 1 | 2 | 3;
}

export const flashcardsData: FlashCardData[] = [
  { id: 'fc01', front: 'Biên giới mềm', back: 'Ranh giới vô hình về kinh tế, công nghệ, văn hóa, pháp lý — quyền lực không thực thi bằng vũ lực mà bằng dòng vốn, dữ liệu, tiêu chuẩn và ảnh hưởng văn hóa.', category: 'khái_niệm', difficulty: 1 },
  { id: 'fc02', front: 'Biên giới cứng', back: 'Ranh giới truyền thống về lãnh thổ, vùng trời, vùng biển — được bảo vệ bằng quân sự, hải quan, biên phòng.', category: 'khái_niệm', difficulty: 1 },
  { id: 'fc03', front: 'WTO', back: 'World Trade Organization — Tổ chức Thương mại Thế giới, lập 1995, trụ sở Geneva. Việt Nam là thành viên thứ 150 (2007).', category: 'tổ_chức', difficulty: 1 },
  { id: 'fc04', front: 'ASEAN', back: 'Association of Southeast Asian Nations — Hiệp hội các Quốc gia Đông Nam Á, lập 1967, hiện có 10 thành viên. Việt Nam gia nhập 1995.', category: 'tổ_chức', difficulty: 1 },
  { id: 'fc05', front: 'RCEP', back: 'Regional Comprehensive Economic Partnership — Hiệp định Đối tác Kinh tế Toàn diện Khu vực, do ASEAN chủ trì, ký 2020, hiệu lực 2022. Gồm ASEAN + Trung Quốc, Nhật, Hàn, Úc, NZ.', category: 'hiệp_định', difficulty: 2 },
  { id: 'fc06', front: 'CPTPP', back: 'Comprehensive and Progressive Agreement for Trans-Pacific Partnership — 11 nước Thái Bình Dương, ký 2018, hiệu lực với VN từ 14/1/2019.', category: 'hiệp_định', difficulty: 2 },
  { id: 'fc07', front: 'EVFTA', back: 'EU – Vietnam Free Trade Agreement — Hiệp định thương mại tự do VN-EU, hiệu lực 1/8/2020. Cắt giảm hơn 99% dòng thuế trong vòng 10 năm.', category: 'hiệp_định', difficulty: 2 },
  { id: 'fc08', front: 'APEC', back: 'Asia-Pacific Economic Cooperation — Diễn đàn Hợp tác Kinh tế châu Á – Thái Bình Dương, 21 nền kinh tế thành viên. Việt Nam gia nhập 1998.', category: 'tổ_chức', difficulty: 1 },
  { id: 'fc09', front: 'IMF', back: 'International Monetary Fund — Quỹ Tiền tệ Quốc tế, lập 1944 (Bretton Woods), hỗ trợ ổn định tỷ giá và cứu trợ khủng hoảng tài chính.', category: 'tổ_chức', difficulty: 1 },
  { id: 'fc10', front: 'GVC', back: 'Global Value Chain — Chuỗi Giá trị Toàn cầu. Quá trình sản xuất một sản phẩm được phân tán qua nhiều quốc gia, mỗi nước đảm nhận một khâu.', category: 'khái_niệm', difficulty: 2 },
  { id: 'fc11', front: 'Toàn cầu hóa 3.0', back: 'Theo Thomas Friedman: lấy cá nhân làm trung tâm, nhờ Internet và công nghệ số. Khác với 2.0 (công ty đa quốc gia) và 1.0 (quốc gia).', category: 'khái_niệm', difficulty: 3 },
  { id: 'fc12', front: 'Interdependence', back: 'Lý thuyết Phụ thuộc lẫn nhau của Keohane & Nye (1977). Quốc gia trong thế giới hiện đại không thể đứng một mình — vừa cơ hội vừa rủi ro.', category: 'phân_tích', difficulty: 3 },
  { id: 'fc13', front: 'Đổi Mới 1986', back: 'Đại hội VI Đảng CSVN tháng 12/1986 khởi xướng đường lối Đổi Mới: chuyển từ kinh tế kế hoạch hóa sang kinh tế thị trường định hướng XHCN.', category: 'sự_kiện', difficulty: 1 },
  { id: 'fc14', front: 'Chủ quyền số', back: 'Khả năng quốc gia kiểm soát dữ liệu công dân, hạ tầng số, quy tắc số trong lãnh thổ mình. Vấn đề ngày càng cấp thiết khi dữ liệu nằm trên server nước ngoài.', category: 'khái_niệm', difficulty: 2 },
  { id: 'fc15', front: 'FDI', back: 'Foreign Direct Investment — Đầu tư trực tiếp nước ngoài. VN thu hút trung bình 20-25 tỷ USD/năm, là động lực tăng trưởng quan trọng nhưng cũng tạo phụ thuộc.', category: 'khái_niệm', difficulty: 1 },
  { id: 'fc16', front: 'FTA', back: 'Free Trade Agreement — Hiệp định Thương mại Tự do, cắt giảm hoặc xóa thuế quan giữa các bên. Việt Nam đã ký 17+ FTA.', category: 'khái_niệm', difficulty: 1 },
  { id: 'fc17', front: 'Bẫy hội nhập', back: 'Hiện tượng mở cửa quá nhanh khiến doanh nghiệp nội địa không kịp thích ứng, bị "chèn ép" bởi FDI và phụ thuộc công nghệ + chuỗi cung ứng nước ngoài.', category: 'phân_tích', difficulty: 3 },
  { id: 'fc18', front: 'Ngoại giao cây tre', back: 'Chiến lược của VN: gốc vững (độc lập, tự chủ), thân chắc (lợi ích quốc gia), cành lá uyển chuyển (đa phương hóa, đa dạng hóa quan hệ).', category: 'phân_tích', difficulty: 3 },
  { id: 'fc19', front: 'AEC', back: 'ASEAN Economic Community — Cộng đồng Kinh tế ASEAN, ra mắt 31/12/2015. Hướng tới thị trường và cơ sở sản xuất chung trong khu vực.', category: 'hiệp_định', difficulty: 2 },
  { id: 'fc20', front: 'USMCA', back: 'United States – Mexico – Canada Agreement — ký 2018, có hiệu lực 2020, thay thế NAFTA (1994). Hiệp định thương mại Bắc Mỹ.', category: 'hiệp_định', difficulty: 2 },
  { id: 'fc21', front: 'Keohane & Nye', back: 'Robert Keohane và Joseph Nye — hai học giả Mỹ phát triển lý thuyết Complex Interdependence (1977) và khái niệm Soft Power (Nye, 1990).', category: 'phân_tích', difficulty: 3 },
  { id: 'fc22', front: 'GDP Việt Nam 2023', back: 'Khoảng 430 tỷ USD (danh nghĩa), tăng trưởng 5.05%. Top 35 nền kinh tế lớn nhất thế giới, top 20 nền kinh tế xuất khẩu lớn nhất.', category: 'sự_kiện', difficulty: 2 },
  { id: 'fc23', front: 'EVFTA — Năm hiệu lực', back: '1/8/2020 — Hiệp định thương mại tự do VN-EU chính thức có hiệu lực. Loại bỏ ~99% dòng thuế trong vòng 10 năm.', category: 'sự_kiện', difficulty: 2 },
  { id: 'fc24', front: 'Số thành viên WTO', back: '164 quốc gia/vùng lãnh thổ (tính đến 2024). Chiếm hơn 98% thương mại toàn cầu. Việt Nam là thành viên thứ 150.', category: 'tổ_chức', difficulty: 2 },
  { id: 'fc25', front: 'Số FTA Việt Nam đã ký', back: 'Hơn 17 FTA song phương và đa phương. Việt Nam là một trong những nước có mạng lưới FTA rộng nhất ASEAN.', category: 'sự_kiện', difficulty: 2 },
  { id: 'fc26', front: 'Năm VN gia nhập ASEAN', back: 'Ngày 28/7/1995 — Việt Nam là thành viên thứ 7 của ASEAN. Cùng năm với việc bình thường hóa quan hệ Việt – Mỹ.', category: 'sự_kiện', difficulty: 1 },
  { id: 'fc27', front: 'Soft Power', back: 'Sức mạnh mềm (Joseph Nye, 1990) — khả năng ảnh hưởng quốc tế thông qua văn hóa, giá trị, chính sách hấp dẫn — khác Hard Power dùng quân sự/kinh tế ép buộc.', category: 'khái_niệm', difficulty: 2 },
  { id: 'fc28', front: 'Chính sách "Bốn không"', back: 'Quốc phòng VN: (1) Không liên minh quân sự; (2) Không cho nước ngoài đặt căn cứ; (3) Không liên kết để chống nước thứ ba; (4) Không dùng vũ lực trước.', category: 'phân_tích', difficulty: 3 },
  { id: 'fc29', front: 'UKVFTA', back: 'United Kingdom – Vietnam Free Trade Agreement — ký 12/2020, hiệu lực 5/2021. Tiếp tục các ưu đãi của EVFTA sau khi Anh rời EU.', category: 'hiệp_định', difficulty: 2 },
  { id: 'fc30', front: 'Đối tác Chiến lược Toàn diện', back: 'Mức quan hệ ngoại giao cao nhất của Việt Nam. Tính đến 2024, VN có 7 đối tác CSP: Trung Quốc, Nga, Ấn Độ, Hàn Quốc, Mỹ, Nhật Bản, Úc.', category: 'sự_kiện', difficulty: 3 }
];

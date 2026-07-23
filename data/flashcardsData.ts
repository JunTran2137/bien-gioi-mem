export type FlashCardCategory = 'khái_niệm' | 'tổ_chức' | 'hiệp_định' | 'sự_kiện' | 'phân_tích';

export interface FlashCardData {
  id: string;
  front: string;
  back: string;
  category: FlashCardCategory;
  difficulty: 1 | 2 | 3;
}

export const flashcardsData: FlashCardData[] = [
  { id: 'fc01', front: 'Chiến lược "biên giới mềm" là gì?', back: 'Chiến lược các cường quốc tư bản bành trướng "biên giới kinh tế" vượt ra ngoài biên giới địa lý, dùng sức mạnh kinh tế và công nghệ (không phải quân sự) để xác lập quyền lực và biến các quốc gia khác thành "sân sau".', category: 'khái_niệm', difficulty: 1 },
  { id: 'fc02', front: 'Bối cảnh ra đời của chiến lược biên giới mềm', back: 'Nửa cuối thế kỷ XX: chủ nghĩa thực dân cũ sụp đổ hoàn toàn, chủ nghĩa thực dân mới suy yếu. Các cường quốc tư bản không thể duy trì thống trị bằng chiếm hữu lãnh thổ nên chuyển sang chiến lược biên giới mềm.', category: 'sự_kiện', difficulty: 1 },
  { id: 'fc03', front: 'Chủ nghĩa thực dân cũ', back: 'Hình thức thống trị thông qua chiếm hữu lãnh thổ trực tiếp. Sụp đổ hoàn toàn vào nửa cuối thế kỷ XX — buộc các cường quốc tư bản phải tìm chiến lược thống trị mới là "biên giới mềm".', category: 'khái_niệm', difficulty: 1 },
  { id: 'fc04', front: 'Chủ nghĩa thực dân mới', back: 'Hình thức thống trị gián tiếp sau khi thực dân cũ sụp đổ. Suy yếu dần, buộc các cường quốc tư bản phát triển chiến lược "biên giới mềm" tinh vi hơn.', category: 'khái_niệm', difficulty: 2 },
  { id: 'fc05', front: 'Biên giới kinh tế vs Biên giới địa lý', back: 'Biên giới địa lý: phạm vi lãnh thổ quốc gia. Biên giới kinh tế: phạm vi ảnh hưởng kinh tế, tài chính, công nghệ của một cường quốc — có thể rộng hơn biên giới địa lý rất nhiều.', category: 'khái_niệm', difficulty: 1 },
  { id: 'fc06', front: 'Bản chất của chiến lược biên giới mềm', back: 'Bành trướng biên giới kinh tế rộng hơn biên giới địa lý; dùng sức mạnh kinh tế và công nghệ thay vì quân sự để biến các quốc gia khác thành "sân sau" hoặc khu vực chịu ảnh hưởng.', category: 'phân_tích', difficulty: 2 },
  { id: 'fc07', front: 'Lệ thuộc về vốn', back: 'Thông qua xuất khẩu tư bản, viện trợ kinh tế, hoặc các khoản vay kèm điều kiện, các cường quốc khiến các nước kém phát triển rơi vào lệ thuộc tài chính.', category: 'khái_niệm', difficulty: 2 },
  { id: 'fc08', front: 'Lệ thuộc về công nghệ', back: 'Nắm giữ bí mật công nghệ và quy trình sản xuất hiện đại để chi phối nền sản xuất của nước nhận đầu tư, buộc các nước này phụ thuộc vào trình độ kỹ thuật của cường quốc.', category: 'khái_niệm', difficulty: 2 },
  { id: 'fc09', front: 'Lệ thuộc về chính trị', back: 'Từ sự lệ thuộc sâu sắc về kinh tế (vốn và công nghệ), các cường quốc tư bản dần đi đến việc chi phối và ràng buộc về mặt chính trị đối với quốc gia bị phụ thuộc.', category: 'khái_niệm', difficulty: 2 },
  { id: 'fc10', front: 'Xuất khẩu tư bản', back: 'Hành động các cường quốc đưa vốn ra nước ngoài dưới dạng đầu tư, viện trợ kinh tế, hoặc khoản vay có điều kiện — công cụ chủ chốt tạo ra sự lệ thuộc về vốn cho các nước kém phát triển.', category: 'khái_niệm', difficulty: 2 },
  { id: 'fc11', front: 'Tập đoàn tư bản độc quyền', back: 'Lực lượng hậu thuẫn quyết định cho chiến lược biên giới mềm. Sử dụng sức mạnh nhà nước để bành trướng biên giới kinh tế nhằm tìm nguồn nguyên liệu, thị trường và nơi đầu tư có lợi nhất.', category: 'khái_niệm', difficulty: 2 },
  { id: 'fc12', front: '"Sân sau" trong chiến lược biên giới mềm', back: 'Các quốc gia bị biến thành khu vực chịu ảnh hưởng, bị điều khiển về chính sách và mất dần tự chủ kinh tế — đích đến của quá trình bành trướng biên giới kinh tế.', category: 'khái_niệm', difficulty: 1 },
  { id: 'fc13', front: '"Bãi thải công nghiệp"', back: 'Hệ quả của biên giới mềm: các nước bị chi phối dễ trở thành nơi tiếp nhận công nghệ lạc hậu và thấp từ cường quốc, gây ô nhiễm môi trường nghiêm trọng.', category: 'phân_tích', difficulty: 2 },
  { id: 'fc14', front: 'Cạn kiệt tài nguyên và hủy hoại môi trường', back: 'Hệ quả tất yếu khi các nước bị chi phối tập trung vào khai thác tài nguyên và sử dụng nhiều sức lao động giá trị thấp — nguồn lực cạn kiệt, môi trường bị hủy hoại.', category: 'phân_tích', difficulty: 2 },
  { id: 'fc15', front: 'Xâm lăng văn hóa', back: 'Nguy cơ bản sắc dân tộc và văn hóa truyền thống bị xói mòn trước sự "xâm lăng" của văn hóa nước ngoài — đi đôi với hội nhập kinh tế và biên giới mềm.', category: 'khái_niệm', difficulty: 2 },
  { id: 'fc16', front: 'Gia tăng khoảng cách giàu nghèo', back: 'Hệ quả của biên giới mềm: sự phân cực giữa các quốc gia ngày càng cao — nhóm nhỏ cường quốc giàu lên nhanh, các nước chậm phát triển chìm trong đói nghèo và bất bình đẳng sâu sắc.', category: 'phân_tích', difficulty: 2 },
  { id: 'fc17', front: 'Mục tiêu chi phối chính trị', back: 'Mục tiêu cuối cùng của chiến lược biên giới mềm: đưa các nước kém phát triển từ lệ thuộc kinh tế tiến đến lệ thuộc chính trị vào các cường quốc tư bản.', category: 'phân_tích', difficulty: 2 },
  { id: 'fc18', front: 'Chiến tranh thương mại trong thế kỷ XXI', back: 'Hình thức mới của "biên giới mềm": thay thế phân chia lãnh thổ, các cường quốc cạnh tranh ảnh hưởng qua chiến tranh thương mại và điều khiển xung đột sắc tộc, tôn giáo.', category: 'sự_kiện', difficulty: 2 },
  { id: 'fc19', front: 'Liên minh kinh tế khu vực (EU, NAFTA)', back: 'Một phần của quá trình sắp xếp lại trật tự và phạm vi ảnh hưởng kinh tế toàn cầu — biểu hiện của chiến lược biên giới mềm trong thế kỷ XXI.', category: 'tổ_chức', difficulty: 2 },
  { id: 'fc20', front: 'FTA trong bối cảnh biên giới mềm', back: 'Hiệp định Thương mại Tự do — một công cụ của chiến lược biên giới mềm, sắp xếp lại trật tự ảnh hưởng kinh tế toàn cầu mà không cần dùng vũ lực.', category: 'hiệp_định', difficulty: 2 },
  { id: 'fc21', front: 'Ba cơ chế lệ thuộc trong chiến lược biên giới mềm', back: '(1) Lệ thuộc vốn: qua xuất khẩu tư bản, viện trợ, vay có điều kiện. (2) Lệ thuộc công nghệ: nắm giữ bí mật kỹ thuật. (3) Lệ thuộc chính trị: từ kinh tế tiến sang chi phối quyền lực nhà nước.', category: 'phân_tích', difficulty: 3 },
  { id: 'fc22', front: 'Ngấm ngầm và công khai — hai hình thức biểu hiện', back: 'Ngấm ngầm: qua hiệp định kinh tế, dự án đầu tư, mạng lưới tài chính phức tạp. Công khai: qua liên minh kinh tế, chính trị hoặc thỏa thuận viện trợ quân sự.', category: 'phân_tích', difficulty: 2 },
  { id: 'fc23', front: 'Biên giới mềm là phương thức thực dân mới', back: 'Biên giới mềm là phương thức thực hiện chủ nghĩa thực dân mới: quyền lực đo bằng khả năng chi phối nguồn lực kinh tế của nước khác — xác lập thống trị chính trị không qua chiến tranh xâm lược.', category: 'phân_tích', difficulty: 3 },
  { id: 'fc24', front: '"Biên giới mềm" là ranh giới của điều gì?', back: 'Không phải ranh giới địa lý mà là ranh giới của sự ảnh hưởng kinh tế, tài chính và công nghệ — phương thức thực hiện lợi ích các tập đoàn độc quyền và cường quốc tư bản trong giai đoạn hiện đại.', category: 'phân_tích', difficulty: 3 },
];

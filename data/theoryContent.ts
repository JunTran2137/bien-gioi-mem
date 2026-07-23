export interface TheorySection {
  id: string;
  number: string;
  title: string;
  intro?: string;
  paragraphs: string[];
  callout?: { kind: 'quote' | 'didyouknow' | 'warning'; text: string };
  bullets?: { title: string; body: string }[];
  timeline?: { year: string; label: string; detail: string }[];
  fta?: { name: string; year: string; partner: string }[];
  zDepth: 'far' | 'mid' | 'near' | 'front';
}

export const theoryContent: TheorySection[] = [
  {
    id: 'sec-1',
    number: '01',
    title: 'Bối cảnh ra đời của chiến lược "biên giới mềm"',
    intro: 'Khi chủ nghĩa thực dân cũ sụp đổ, cường quốc tư bản tìm ra vũ khí mới.',
    paragraphs: [
      `Vào nửa cuối thế kỷ XX, thế giới chứng kiến sự sụp đổ hoàn toàn của chủ nghĩa thực dân cũ và sự suy yếu của chủ nghĩa thực dân mới. Trước tình hình đó, các cường quốc tư bản không còn có thể duy trì sự thống trị thông qua việc chiếm hữu lãnh thổ trực tiếp như trước.
      
Để tiếp tục tranh giành phạm vi ảnh hưởng và bảo vệ lợi ích của các tập đoàn độc quyền, các quốc gia này đã chuyển sang sử dụng những hình thức cạnh tranh và thống trị mới, trong đó nổi bật là việc thực hiện "chiến lược biên giới mềm".`
    ],
    zDepth: 'near'
  },
  {
    id: 'sec-2',
    number: '02',
    title: 'Bản chất của "biên giới mềm"',
    intro: 'Kinh tế thay thế súng đạn — nhưng bản chất thống trị không thay đổi.',
    paragraphs: [
      `Bản chất của chiến lược này là việc các cường quốc tư bản ra sức bành trướng "biên giới kinh tế" của mình sao cho rộng hơn rất nhiều so với biên giới địa lý (biên giới quốc gia thông thường).

Thay vì sử dụng sức mạnh quân sự để xâm chiếm đất đai, họ sử dụng sức mạnh kinh tế và công nghệ để xác lập quyền lực của mình trên phạm vi toàn cầu, biến các quốc gia khác thành "sân sau" hoặc khu vực chịu ảnh hưởng của mình.`    ],
    callout: {
      kind: 'quote',
      text: '"Biên giới mềm" không phải là ranh giới trên bản đồ địa lý mà là ranh giới của sự ảnh hưởng kinh tế, tài chính và công nghệ.'
    },
    zDepth: 'mid'
  },
  {
    id: 'sec-3',
    number: '03',
    title: 'Mục tiêu của chiến lược "biên giới mềm"',
    intro: 'Từ lệ thuộc kinh tế đến chi phối chính trị — đó là lộ trình đã định.',
    paragraphs: [
      `Mục tiêu cuối cùng của chiến lược "biên giới mềm" là:
- Chi phối chính trị: Đưa các nước kém phát triển đi từ sự lệ thuộc về kinh tế đến sự lệ thuộc về chính trị vào các cường quốc tư bản.
- Bảo vệ lợi ích độc quyền: Đứng sau các hoạt động bành trướng này luôn là vai trò và lợi ích của các tập đoàn tư bản độc quyền.`    ],
    callout: {
      kind: 'didyouknow',
      text: 'Mục tiêu của chiến lược biên giới mềm gồm hai trụ cột: chi phối chính trị và bảo vệ lợi ích độc quyền của các tập đoàn tư bản.'
    },
    zDepth: 'front'
  },
  {
    id: 'sec-4',
    number: '04',
    title: 'Cơ chế và cách thức thực hiện',
    intro: 'Ba tầng lệ thuộc: vốn → công nghệ → chính trị.',
    paragraphs: [
      `Chiến lược "biên giới mềm" được vận hành thông qua việc tạo ra sự ràng buộc chặt chẽ từ phía các nước kém phát triển đối với các cường quốc tư bản:
1. Lệ thuộc về vốn
2. Lệ thuộc về công nghệ
3. Lệ thuộc về chính trị`
    ],
    bullets: [
      {
        title: 'Lệ thuộc về vốn',
        body: 'Thông qua việc xuất khẩu tư bản, viện trợ kinh tế, hoặc các khoản vay kèm theo điều kiện, các cường quốc khiến các nước kém phát triển rơi vào tình trạng lệ thuộc về tài chính.'
      },
      {
        title: 'Lệ thuộc về công nghệ',
        body: 'Việc nắm giữ các bí mật công nghệ và quy trình sản xuất hiện đại cho phép các cường quốc chi phối nền sản xuất của các nước nhận đầu tư, buộc các nước này phải phụ thuộc vào trình độ kỹ thuật của họ.'
      },
      {
        title: 'Lệ thuộc về chính trị',
        body: 'Từ sự lệ thuộc sâu sắc về kinh tế (vốn và công nghệ), các cường quốc tư bản dần đi đến việc chi phối và ràng buộc về mặt chính trị đối với các quốc gia này.'
      }
    ],
    callout: {
      kind: 'warning',
      text: 'Ba tầng lệ thuộc tạo thành chuỗi dây chuyền: một khi bị mắc vào tầng đầu (vốn), các nước kém phát triển rất khó thoát khỏi tầng tiếp theo (công nghệ → chính trị).'
    },
    zDepth: 'near'
  },
  {
    id: 'sec-5',
    number: '05',
    title: 'Vai trò của các tập đoàn độc quyền',
    intro: 'Ai thực sự được hưởng lợi — và ai phải trả giá?',
    paragraphs: [
      `Đứng đằng sau và hậu thuẫn cho các hoạt động xác lập "biên giới mềm" của các quốc gia tư bản luôn có vai trò quyết định của các tập đoàn tư bản độc quyền.

Các tập đoàn này sử dụng sức mạnh nhà nước để dọn đường cho việc bành trướng biên giới kinh tế nhằm tìm kiếm nguồn nguyên liệu, thị trường tiêu thụ và nơi đầu tư có lợi nhất trên phạm vi toàn thế giới.`    ],
    bullets: [
      {
        title: 'Lệ thuộc và mất tự chủ quốc gia',
        body: 'Các nước kém phát triển dễ rơi vào tình trạng bị điều khiển về mặt chính sách và mất dần khả năng tự chủ kinh tế.'
      },
      {
        title: 'Trở thành "bãi thải công nghiệp"',
        body: 'Các nước bị chi phối dễ trở thành nơi tiếp nhận công nghệ thấp và "bãi thải công nghiệp" của cường quốc.'
      },
      {
        title: 'Cạn kiệt tài nguyên và hủy hoại môi trường',
        body: 'Nguồn tài nguyên thiên nhiên bị cạn kiệt và môi trường bị hủy hoại ở mức độ cao do thiên hướng tập trung vào các ngành khai thác tài nguyên và sử dụng nhiều sức lao động giá trị thấp.'
      },
      {
        title: 'Gia tăng khoảng cách giàu nghèo và bất bình đẳng xã hội',
        body: 'Sự phân cực giữa các quốc gia ngày càng cao; một nhóm nhỏ cường quốc giàu lên nhanh chóng trong khi các nước chậm phát triển vẫn chìm trong đói nghèo, kéo theo sự bất bình đẳng xã hội ngày càng sâu sắc giữa các quốc gia.'
      },
      {
        title: 'Xâm lăng văn hóa',
        body: 'Đi đôi với hội nhập kinh tế và biên giới mềm là nguy cơ bản sắc dân tộc và văn hóa truyền thống bị xói mòn trước sự "xâm lăng" của văn hóa nước ngoài.'
      }
    ],
    zDepth: 'mid'
  },
  {
    id: 'sec-6',
    number: '06',
    title: 'Hệ quả của "biên giới mềm"',
    intro: 'Chiến tranh lạnh kết thúc — nhưng tranh giành "biên giới mềm" vẫn tiếp diễn.',
    paragraphs: [
      `Việc thực hiện chiến lược biên giới mềm của các cường quốc để lại những hệ lụy sâu sắc cho các quốc gia đang phát triển và các nước bị chi phối:
- Lệ thuộc và mất tự chủ quốc gia:
- Trở thành "bãi thải công nghiệp" và nơi tiếp nhận công nghệ thấp.
- Cạn kiệt tài nguyên và hủy hoại môi trường:
- Gia tăng khoảng cách giàu nghèo và bất bình đẳng xã hội:
- Xâm lăng văn hóa
`    ],
    callout: {
      kind: 'quote',
      text: '"Biên giới mềm" không phải là ranh giới trên bản đồ địa lý mà là ranh giới của sự ảnh hưởng kinh tế, tài chính và công nghệ — phương thức thực hiện chủ nghĩa thực dân mới, xác lập thống trị chính trị không qua chiến tranh xâm lược.'
    },
    zDepth: 'front'
  }
];

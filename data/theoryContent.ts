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
    title: 'Khái niệm "Biên giới mềm"',
    intro: 'Biên giới quốc gia không còn chỉ là đường vẽ trên bản đồ.',
    paragraphs: [
      'Trong thế kỷ XXI, bên cạnh biên giới cứng truyền thống (lãnh thổ, vùng trời, vùng biển), các quốc gia còn phải đối mặt với một loại biên giới mới — biên giới mềm. Đó là ranh giới vô hình về kinh tế, công nghệ, văn hóa và pháp lý, nơi quyền lực không được thực thi bằng vũ lực mà bằng dòng vốn, dữ liệu, tiêu chuẩn và ảnh hưởng văn hóa.',
      'Biên giới mềm có bốn chiều cạnh chính: (1) Kinh tế — chuỗi cung ứng, FDI, dòng vốn; (2) Công nghệ — chuẩn kỹ thuật, hạ tầng số, AI; (3) Văn hóa — phim ảnh, mạng xã hội, lối sống; (4) Pháp lý — luật chơi quốc tế, tiêu chuẩn ESG, luật dữ liệu.'
    ],
    callout: {
      kind: 'quote',
      text: 'Biên giới mềm không thay thế biên giới cứng — nó là lớp mới chồng lên, phức tạp hơn, khó thấy hơn, và đôi khi nguy hiểm hơn.'
    },
    zDepth: 'near'
  },
  {
    id: 'sec-2',
    number: '02',
    title: 'Hội nhập kinh tế quốc tế',
    intro: 'Từ toàn cầu hóa 1.0 đến 3.0 — thế giới ngày càng phụ thuộc lẫn nhau.',
    paragraphs: [
      'Toàn cầu hóa 3.0 (Thomas Friedman) lấy cá nhân làm trung tâm: nhờ Internet, AI và các nền tảng số, một kỹ sư ở Hà Nội có thể cạnh tranh trực tiếp với kỹ sư ở Silicon Valley. Chuỗi giá trị toàn cầu (GVC) phân tán sản xuất qua hàng chục quốc gia — một chiếc iPhone hội tụ linh kiện từ 43 nước.',
      'Lý thuyết Phụ thuộc lẫn nhau (Interdependence) của Robert Keohane và Joseph Nye chỉ ra: trong thế giới hiện đại, không quốc gia nào có thể đứng một mình. Phụ thuộc lẫn nhau vừa mở ra cơ hội (thương mại, công nghệ, tri thức) vừa tạo điểm yếu (gián đoạn chuỗi cung ứng, áp lực từ đối tác lớn).',
      'Các định chế đa phương như WTO, IMF, WB, G20, APEC đặt ra luật chơi chung. Bên cạnh đó, xu hướng khu vực hóa cũng mạnh mẽ: ASEAN, EU, RCEP, USMCA là các khối kinh tế lớn định hình thương mại toàn cầu.'
    ],
    callout: {
      kind: 'didyouknow',
      text: 'Một chiếc iPhone hiện đại có linh kiện từ hơn 40 quốc gia — biểu tượng kinh điển của chuỗi giá trị toàn cầu.'
    },
    zDepth: 'mid'
  },
  {
    id: 'sec-3',
    number: '03',
    title: 'Việt Nam trong bức tranh hội nhập',
    intro: 'Từ Đổi Mới 1986 đến RCEP 2022 — gần 4 thập kỷ mở cửa.',
    paragraphs: [
      'Sau Đại hội VI (1986), Việt Nam chuyển từ kinh tế kế hoạch hóa sang kinh tế thị trường định hướng XHCN. Mỗi cột mốc hội nhập đều mở ra một cánh cửa mới: ASEAN 1995, BTA Việt-Mỹ 2001, WTO 2007, AEC 2015, CPTPP 2019, EVFTA 2020, RCEP 2022.',
      'Thành tựu là không thể phủ nhận: GDP tăng hơn 40 lần kể từ 1986, FDI duy trì 20-25 tỷ USD/năm, kim ngạch xuất khẩu vượt 370 tỷ USD (2023), Việt Nam lọt top 20 nền kinh tế xuất khẩu lớn nhất thế giới.',
      'Song thực trạng cho thấy nhiều điểm yếu: phụ thuộc nặng vào nguyên liệu và linh kiện nhập khẩu (đặc biệt từ Trung Quốc), công nghệ lõi vẫn phải mua, doanh nghiệp nội địa chủ yếu nằm ở khâu gia công lắp ráp — giá trị gia tăng thấp.'
    ],
    timeline: [
      { year: '1986', label: 'Đổi Mới', detail: 'Đại hội VI khởi xướng đường lối Đổi Mới' },
      { year: '1995', label: 'ASEAN', detail: 'Thành viên thứ 7 của ASEAN' },
      { year: '2001', label: 'BTA Mỹ', detail: 'Hiệp định Thương mại song phương VN-Mỹ' },
      { year: '2007', label: 'WTO', detail: 'Thành viên thứ 150 của Tổ chức Thương mại Thế giới' },
      { year: '2015', label: 'AEC', detail: 'Cộng đồng Kinh tế ASEAN ra đời' },
      { year: '2019', label: 'CPTPP', detail: 'Hiệp định Đối tác Toàn diện và Tiến bộ Xuyên Thái Bình Dương' },
      { year: '2020', label: 'EVFTA', detail: 'Hiệp định thương mại với Liên minh Châu Âu' },
      { year: '2022', label: 'RCEP', detail: 'Hiệp định Đối tác Kinh tế Toàn diện Khu vực' },
      { year: '2023', label: 'CSP Mỹ', detail: 'Đối tác Chiến lược Toàn diện với Hoa Kỳ' }
    ],
    fta: [
      { name: 'AFTA', year: '1996', partner: 'ASEAN' },
      { name: 'WTO', year: '2007', partner: 'Toàn cầu' },
      { name: 'CPTPP', year: '2019', partner: '10 nước Thái Bình Dương' },
      { name: 'EVFTA', year: '2020', partner: 'EU 27 nước' },
      { name: 'UKVFTA', year: '2021', partner: 'Vương quốc Anh' },
      { name: 'RCEP', year: '2022', partner: 'ASEAN+5' }
    ],
    zDepth: 'front'
  },
  {
    id: 'sec-4',
    number: '04',
    title: 'Thách thức và Nghịch lý',
    intro: 'Hội nhập không phải con đường một chiều — luôn có những cái giá phải trả.',
    paragraphs: [
      'Bốn thách thức lớn nhất mà Việt Nam đang đối mặt phản ánh đầy đủ bản chất hai mặt của hội nhập sâu.'
    ],
    bullets: [
      {
        title: '4.1 Bẫy hội nhập',
        body: 'Mở cửa quá nhanh khiến doanh nghiệp nội địa không kịp thích ứng. Nhiều ngành bị "FDI chèn ép" ngay trên sân nhà — bán lẻ, điện tử tiêu dùng, ô tô đều có dấu hiệu này.'
      },
      {
        title: '4.2 Căng thẳng Mỹ-Trung',
        body: 'Việt Nam ở vị trí địa chiến lược nhạy cảm. Vừa là đối tác lớn của TQ (nhập siêu hàng năm 50+ tỷ USD), vừa là đối tác chiến lược toàn diện của Mỹ. Phải đi dây tinh tế.'
      },
      {
        title: '4.3 Chủ quyền số',
        body: 'Dữ liệu của gần 100 triệu người Việt nằm trên server Google, Meta, TikTok tại Singapore, Mỹ, Ireland. Quy định pháp lý VN khó với tới được.'
      },
      {
        title: '4.4 Văn hóa bị xâm thực',
        body: 'K-pop, K-drama, TikTok content, lối sống tiêu dùng phương Tây thâm nhập mạnh mẽ. Giới trẻ thuộc lời nhạc Hàn nhanh hơn ca dao Việt.'
      }
    ],
    callout: {
      kind: 'warning',
      text: 'Hội nhập càng sâu, chủ quyền càng cần được định nghĩa lại — không chỉ là lãnh thổ, mà còn là quyền tự quyết kinh tế, công nghệ, văn hóa.'
    },
    zDepth: 'near'
  },
  {
    id: 'sec-5',
    number: '05',
    title: 'Giải pháp — Hội nhập bằng bản lĩnh',
    intro: 'Năm trụ cột chiến lược để Việt Nam vừa hội nhập tốt, vừa giữ vững độc lập, tự chủ.',
    paragraphs: [
      'Câu trả lời không nằm ở việc đóng cửa hay mở cửa toàn bộ — mà ở khả năng chọn lọc, nâng cao nội lực và xây dựng vị thế trong luật chơi quốc tế.'
    ],
    bullets: [
      {
        title: '5.1 Chiến lược "Tre Việt Nam"',
        body: 'Gốc vững (độc lập, tự chủ), thân chắc (lợi ích quốc gia), cành lá uyển chuyển (đa phương hóa, đa dạng hóa). Không chọn phe, không liên minh, nhưng có lập trường rõ ràng.'
      },
      {
        title: '5.2 Tự chủ công nghệ',
        body: 'Đầu tư R&D, đào tạo kỹ sư bán dẫn (Việt Nam đặt mục tiêu 50.000 kỹ sư đến 2030), phát triển AI nội địa, xây dựng hệ sinh thái số "Make in Vietnam".'
      },
      {
        title: '5.3 Nâng cao nội lực doanh nghiệp',
        body: 'Hỗ trợ doanh nghiệp nội địa tham gia chuỗi giá trị toàn cầu ở khâu cao hơn (thiết kế, thương hiệu, R&D) thay vì chỉ gia công.'
      },
      {
        title: '5.4 Bảo vệ và xuất khẩu văn hóa',
        body: 'Phát triển tiếng Việt trên nền tảng số, đầu tư công nghiệp văn hóa (phim, âm nhạc, ẩm thực), xây dựng thương hiệu quốc gia Việt Nam trên thế giới.'
      },
      {
        title: '5.5 Thể chế pháp lý',
        body: 'Hoàn thiện Luật An ninh mạng, Luật Bảo vệ Dữ liệu cá nhân, tham gia tích cực xây dựng luật chơi quốc tế (chuẩn ESG, thuế tối thiểu toàn cầu, AI Act).'
      }
    ],
    zDepth: 'mid'
  },
  {
    id: 'sec-6',
    number: '06',
    title: 'Kết luận',
    paragraphs: [
      'Biên giới mềm không phải kẻ thù của chủ quyền. Nó là một thực tế mới — đòi hỏi tư duy mới, thể chế mới và bản lĩnh mới.',
      'Việt Nam đã chọn con đường hội nhập, và đường lùi đã đóng. Vấn đề không còn là "hội nhập hay không" mà là "hội nhập như thế nào" — bằng bản lĩnh, bằng nội lực, bằng trí tuệ — chứ không phải bằng phụ thuộc.'
    ],
    callout: {
      kind: 'quote',
      text: 'Hội nhập bằng bản lĩnh, không phải bằng phụ thuộc.'
    },
    zDepth: 'front'
  }
];

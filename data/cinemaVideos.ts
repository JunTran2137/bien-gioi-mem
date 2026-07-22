/**
 * Cinema video catalogue.
 *
 * Place the corresponding MP4 files under /public/videos/:
 *   /public/videos/video1.mp4
 *   /public/videos/video2.mp4
 *   /public/videos/video3.mp4
 *
 * Alternatively, set type:'youtube' and provide a YouTube video ID as `src`.
 */

export interface CinemaVideo {
  id: string;
  title: string;
  subtitle: string;
  duration: string;
  description: string;
  /** Hex colour for the poster card background */
  posterColor: string;
  /** Text colour on the poster card */
  posterTextColor: string;
  /** Emoji / icon shown on poster */
  icon: string;
  /** For type 'local': path under /public, e.g. '/videos/video1.mp4'.
   *  For type 'youtube': the YouTube video ID (11-char code). */
  src: string;
  type: 'local' | 'youtube';
}

export const cinemaVideos: CinemaVideo[] = [
  {
    id: 'v1',
    title: 'Việt Nam – 35 Năm Đổi Mới',
    subtitle: 'Hành trình từ bao cấp đến hội nhập',
    duration: '25 phút',
    description:
      'Nhìn lại quá trình Đổi Mới 1986 và hành trình Việt Nam vươn ra thế giới — từ một nền kinh tế bao cấp đến top 20 quốc gia xuất khẩu toàn cầu.',
    posterColor: '#1A6B4A',
    posterTextColor: '#FFFFFF',
    icon: '🌱',
    src: '/videos/video1.mp4',
    type: 'local',
  },
  {
    id: 'v2',
    title: 'EVFTA – Cánh Cửa Châu Âu',
    subtitle: 'Hiệp định thương mại tự do Việt Nam – EU',
    duration: '18 phút',
    description:
      'Phân tích cơ hội và thách thức khi Việt Nam ký kết Hiệp định EVFTA với Liên minh Châu Âu — dệt may, thuỷ sản, công nghệ và những rào cản phi thuế quan.',
    posterColor: '#1A4A8B',
    posterTextColor: '#FFFFFF',
    icon: '🤝',
    src: '/videos/video2.mp4',
    type: 'local',
  },
  {
    id: 'v3',
    title: 'Biên Giới Mềm & Chủ Quyền Số',
    subtitle: 'Việt Nam trong kỷ nguyên số hoá',
    duration: '22 phút',
    description:
      'Khái niệm biên giới mềm trong lĩnh vực công nghệ và dữ liệu: dữ liệu người dùng, nền tảng nước ngoài, và chiến lược chủ quyền số của Việt Nam trước sức ép của Big Tech.',
    posterColor: '#8B2800',
    posterTextColor: '#FFFFFF',
    icon: '🔐',
    src: '/videos/video3.mp4',
    type: 'local',
  },
];

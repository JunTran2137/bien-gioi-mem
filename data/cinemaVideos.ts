/**
 * Cinema video catalogue.
 *
 * Place the corresponding MP4 files under /public/videos/:
 *   /public/videos/mv-mln.mp4
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
  /** For type 'local': path under /public, e.g. '/videos/mv-mln.mp4'.
   *  For type 'youtube': the YouTube video ID (11-char code). */
  src: string;
  type: 'local' | 'youtube';
}

export const cinemaVideos: CinemaVideo[] = [
  {
    id: 'v1',
    title: 'Hành Trình Của Chiếc Điện Thoại',
    subtitle: 'MV chủ đề môn học',
    duration: 'MV',
    description:
      'Việt Nam trong bối cảnh hội nhập kinh tế quốc tế: cơ hội, thách thức và bài toán giữ vững độc lập, tự chủ trước khái niệm “biên giới mềm”.',
    posterColor: '#1A6B4A',
    posterTextColor: '#FFFFFF',
    icon: '🌏',
    src: '/videos/mv-mln.mp4',
    type: 'local',
  },
];

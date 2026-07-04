'use client';

import { Text } from '@react-three/drei';
import type { ComponentProps } from 'react';

const FONT_REGULAR = '/fonts/BeVietnamPro-Regular.ttf';
const FONT_BOLD = '/fonts/BeVietnamPro-Bold.ttf';

type Props = ComponentProps<typeof Text> & { bold?: boolean };

/** drei <Text> wrapper that uses Be Vietnam Pro for proper Vietnamese rendering. */
export function VnText({ bold, font, ...rest }: Props) {
  return <Text font={font || (bold ? FONT_BOLD : FONT_REGULAR)} {...rest} />;
}

export interface DescribeCard {
  id: string;
  markerId: number;
  name: string;
  category: string;
  hint: string;
}

export const describeCards: DescribeCard[];
export function cardByMarker(markerId: number): DescribeCard | null;
export function cardById(id: string): DescribeCard | null;
export function matchCardByText(ocrText: string, minScore?: number): DescribeCard | null;
export function normalizeText(s: string): string;

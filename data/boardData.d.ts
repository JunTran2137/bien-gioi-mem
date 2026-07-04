export interface BoardTile {
  index: number;
  type: 'start' | 'question' | 'bonus' | 'penalty' | 'lucky' | 'skip' | 'move';
  label: string;
  value?: number;
  move?: number;
}

export interface ChanceCard {
  text: string;
  effect: { points?: number; move?: number; skip?: boolean };
}

export const boardTiles: BoardTile[];
export const chanceCards: ChanceCard[];
export const BOARD_SIZE: number;
export const GO_BONUS: number;
export const QUESTION_TILE_BONUS: number;
export function getTile(index: number): BoardTile;

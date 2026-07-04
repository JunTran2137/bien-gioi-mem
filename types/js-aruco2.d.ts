declare module 'js-aruco2' {
  export interface ArucoMarker {
    id: number;
    corners: { x: number; y: number }[];
  }
  export interface ArucoDetectorConfig {
    dictionaryName?: string;
    maxHammingDistance?: number;
  }
  export class Detector {
    constructor(config?: ArucoDetectorConfig);
    detect(image: ImageData | { width: number; height: number; data: Uint8ClampedArray }): ArucoMarker[];
    detectImage(width: number, height: number, data: Uint8ClampedArray): ArucoMarker[];
  }
  export const AR: {
    Detector: typeof Detector;
    DICTIONARIES: Record<string, unknown>;
  };
  const _default: { AR: typeof AR };
  export default _default;
}

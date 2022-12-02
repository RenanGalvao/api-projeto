import {
  FullscreenControlOptions,
  GestureHandling,
  InfoWindowOptions,
  LatLngLiteral,
  Map,
  MapRestriction,
  MapTypeControlOptions,
  MapTypeId,
  MapTypeStyle,
  MarkerOptions,
  PanControlOptions,
  RotateControlOptions,
  ScaleControlOptions,
  StreetViewControlOptions,
  StreetViewPanorama,
  StrokePosition,
  ZoomControlOptions,
} from './../types/index';

export class MapOptions {
  backgroundColor?: string;
  center?: LatLngLiteral;
  clickableIcons?: boolean;
  controlSize?: number;
  disableDefaultUI?: boolean;
  disableDoubleClickZoom?: boolean;
  draggableCursor?: string;
  draggingCursor?: string;
  fullscreenControl?: string;
  fullscreenControlOptions?: FullscreenControlOptions;
  gestureHandling?: GestureHandling;
  heading?: number;
  isFractionalZoomEnabled?: boolean;
  keyboardShortcuts?: boolean;
  mapId?: string;
  mapTypeControl?: boolean;
  mapTypeControlOptions?: MapTypeControlOptions;
  mapTypeId?: MapTypeId | string;
  maxZoom?: number;
  minZoom?: number;
  noClear?: boolean;
  panControl?: boolean;
  panControlOptions?: PanControlOptions;
  restriction?: MapRestriction;
  rotateControl?: boolean;
  rotateControlOptions?: RotateControlOptions;
  scaleControl?: boolean;
  scaleControlOptions?: ScaleControlOptions;
  scrollwheel?: boolean;
  streetView?: StreetViewPanorama;
  streetViewControl?: boolean;
  streetViewControlOptions?: StreetViewControlOptions;
  styles?: MapTypeStyle;
  tilt?: number;
  zoom?: number;
  zoomControl?: boolean;
  zoomControlOptions?: ZoomControlOptions;
}

export class PolygonOptions {
  clickable?: boolean;
  draggable?: boolean;
  editable?: boolean;
  fillColor?: string;
  fillOpacity?: number;
  geodesic?: boolean;
  map?: Map;
  paths?: LatLngLiteral[][];
  strokeColor?: string;
  strokeOpacity?: number;
  strokePosition?: StrokePosition;
  strokeWeight?: number;
  visible?: boolean;
  zIndex?: number;
}

export class CollectionPoints {
  marker: MarkerOptions;
  infoWindow: InfoWindowOptions;
}

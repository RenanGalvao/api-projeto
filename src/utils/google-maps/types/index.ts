export type LatLngLiteral = {
  lat: number;
  lng: number;
};

export type GestureHandling = 'cooperative' | 'greedy' | 'none' | 'auto';

export type ControlPosition =
  | 'BOTTOM_CENTER'
  | 'BOTTOM_LEFT'
  | 'BOTTOM_RIGHT'
  | 'LEFT_BOTTOM'
  | 'LEFT_CENTER'
  | 'LEFT_TOP'
  | 'RIGHT_BOTTOM'
  | 'RIGHT_CENTER'
  | 'RIGHT_TOP'
  | 'TOP_CENTER'
  | 'TOP_LEFT'
  | 'TOP_RIGHT';

export type FullscreenControlOptions = {
  position: ControlPosition;
};

export type MapTypeId = 'HYBRID' | 'ROADMAP' | 'SATELLITE' | 'TERRAIN';

export type MapTypeControlStyle =
  | 'DEFAULT'
  | 'DROPDOWN_MENU'
  | 'HORIZONTAL_BAR';

export type MapTypeControlOptions = {
  mapTypeIds?: MapTypeId[] | string[];
  position?: ControlPosition;
  style?: MapTypeControlStyle;
};

export type PanControlOptions = {
  position?: ControlPosition;
};

export type LatLngBoundsLiteral = {
  east: number;
  north: number;
  south: number;
  west: number;
};

export type MapRestriction = {
  latLngBounds: LatLngBoundsLiteral;
  strictBounds?: boolean;
};

export type RotateControlOptions = {
  position?: ControlPosition;
};

export type ScaleControlStyle = 'DEFAULT';

export type ScaleControlOptions = {
  style?: ScaleControlStyle;
};

export type StreetViewPanorama = {
  // maybe
};

export type StreetViewControlOptions = {
  position?: ControlPosition;
};

export type ElementType =
  | 'all'
  | 'geometry'
  | 'geometry.fill'
  | 'geometry.stroke'
  | 'labels'
  | 'labels.icon'
  | 'labels.text'
  | 'labels.text.fill'
  | 'labels.text.stroke';

export type FeatureType =
  | 'all'
  | 'administrative'
  | 'administrative.country'
  | 'administrative.land_parcel'
  | 'administrative.locality'
  | 'administrative.neighborhood'
  | 'administrative.province'
  | 'landscape'
  | 'landscape.man_made'
  | 'landscape.natural'
  | 'landscape.natural.landcover'
  | 'landscape.natural.terrain'
  | 'poi'
  | 'poi.attraction'
  | 'poi.business'
  | 'poi.goverment'
  | 'poi.medical'
  | 'poi.park'
  | 'poi.place_of_worship'
  | 'poi.school'
  | 'poi.sports_complex'
  | 'road'
  | 'road.arterial'
  | 'road.highway'
  | 'road.highway.controlled_access'
  | 'road.local'
  | 'transit'
  | 'transit.line'
  | 'transit.station'
  | 'transit.station.airport'
  | 'transit.station.bus'
  | 'transit.station.rail'
  | 'water';

export type MapTypeStyle = {
  stylers: any[];
  elementType?: ElementType;
  featureType?: FeatureType;
};

export type ZoomControlOptions = {
  position?: ControlPosition;
};

export type MapOptions = {
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
};

export type SymbolPath =
  | 'BACKWARD_CLOSED_ARROW'
  | 'BACKWARD_OPEN_ARROW'
  | 'CIRCLE'
  | 'FORWARD_CLOSED_ARROW'
  | 'FORWARD_OPEN_ARROW';

export type Point = {
  x: number;
  y: number;
};

export type Symbol = {
  path: SymbolPath | string;
  anchor?: Point;
  fillColor?: string;
  fillOpacity?: number;
  labelOrigin?: Point;
  rotation?: number;
  scale?: number;
  strokeColor?: string;
  strokeOpacity?: number;
  strokeWeight?: number;
};

export type IconSequence = {
  fixedRotation?: boolean;
  icon?: symbol;
  offset?: string;
  repeat?: string;
};

export type StrokePosition = 'CENTER' | 'INSIDE' | 'OUTSIDE';

export type MapType = {
  maxZoom: number;
  minZoom: number;
  radius: number;
  tileSize: Size;
  alt?: string;
  name?: string;
  projection?: any;
};

export type Map = {
  controls: HTMLElement[];
  data: any;
  mapTypes: any;
  overlayMapTypes?: MapType[];
};

export type PolygonOptions = {
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
};

export type Animation = 'BOUNCE' | 'DROP';

export type Size = {
  height: number;
  width: number;
};

export type Icon = {
  url: string;
  anchor?: Point;
  labelOrigin?: Point;
  origin?: Point;
  scaledSize?: Size;
  size?: Size;
};

export type MarkerLabel = {
  text: string;
  className?: string;
  color?: string;
  fontFamily?: string;
  fontSize?: string;
  fontWeight?: string;
};

export type MarkerShape = {
  coords: number[];
  type: 'circle' | 'poly' | 'rect';
};

export type MarkerOptions = {
  anchorPoint?: Point;
  animation?: Animation;
  clickable?: boolean;
  crossOnDrag?: boolean;
  cursor?: string;
  draggable?: boolean;
  icon?: string | Icon | symbol;
  label?: string | MarkerLabel;
  map?: Map;
  opacity?: number;
  optimized?: boolean;
  position?: LatLngLiteral;
  shape?: MarkerShape;
  title?: string;
  visible?: boolean;
  zIndex?: number;
};

export type InfoWindowOptions = {
  ariaLabel?: string;
  content?: string | Element | Text;
  disableAutoPan?: boolean;
  maxWidth?: number;
  minWidth?: number;
  pixelOffset?: Size;
  position?: LatLngLiteral;
  zIndex?: number;
};

export type CollectionPoints = {
  marker: MarkerOptions;
  infoWindow: InfoWindowOptions;
}

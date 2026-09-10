export type FacilityType =
  | "PROD"
  | "PIPE"
  | "STOR"
  | "LNGEXPORT"
  | "BBGPG"
  | "BBLARGE"
  | "BDIST"
  | "COMPRESSOR"
  | string;

export interface FlowRow {
  gasDate: Date;
  gasDateKey: string;
  facilityName: string;
  facilityId: string;
  facilityType: FacilityType;
  demand: number;
  supply: number;
  transferIn: number;
  transferOut: number;
  heldInStorage: number | null;
  cushionGasStorage: number | null;
  state: string;
  locationName: string;
  locationId: string;
  lastUpdated: string;
}

export interface FacilityRow {
  facilityName: string;
  facilityShortName: string;
  facilityId: string;
  facilityType: FacilityType;
  facilityTypeDescription: string;
  operatingState: string;
  operatingStateDate: string;
  operatorName: string;
  operatorId: string;
  operatorChangeDate: string;
  lastUpdated: string;
}

export interface JoinedFlowRow extends FlowRow {
  operatorName: string;
  facilityShortName: string;
  registerName: string;
  operatingState: string;
  displayName: string;
}

export type OperatorGroup = "qgc" | "santosCsg" | "originAplng" | "beetaloo" | "other";

export interface SeriesPoint {
  date: string;
  dateKey: string;
  [series: string]: string | number;
}

export interface SeriesDef {
  key: string;
  label: string;
  color: string;
}

export enum AppErrorCode {
  MEASUREMENT_CODE_FACE_UNDETECTED_ERROR = 80001,
}

export enum InfoType {
  NONE,
  INSTRUCTION,
  SUCCESS,
}

export interface InfoData {
  type: InfoType;
  message?: string;
}

export enum VideoReadyState {
  HAVE_ENOUGH_DATA = 4,
}

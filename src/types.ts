export type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
export type Severity = 'BREAKING' | 'WARNING' | 'INFO';
export type ParamLocation = 'path' | 'query' | 'body' | 'header';
export type Source = 'make' | 'n8n' | 'openapi';

export interface Param {
  name: string;
  location: ParamLocation;
  required: boolean;
}

export interface Visibility {
  public: boolean;
  approved: boolean;
  archived: boolean;
  deprecated: boolean;
}

export interface ApiCall {
  source: Source;
  operationName: string;
  method: Method;
  pathTemplate: string;
  params: Param[];
  authMethod?: string;
  visibility?: Visibility;
  label?: string;
}

export type DriftKind =
  | 'endpoint_removed'
  | 'missing_required_param'
  | 'unknown_param'
  | 'method_mismatch'
  | 'auth_mismatch'
  | 'unparseable';

export interface Drift {
  severity: Severity;
  kind: DriftKind;
  nodeCall: ApiCall;
  specMatch?: ApiCall;
  message: string;
}

export interface ScanResult {
  platform: 'make' | 'n8n';
  target: string;
  version: string;
  scanned: ApiCall[];
  spec: ApiCall[];
  drifts: Drift[];
  warnings: string[];
}

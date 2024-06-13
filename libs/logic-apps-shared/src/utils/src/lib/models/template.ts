export type SkuType = 'standard' | 'consumption';
export type WorkflowKindType = 'stateful' | 'stateless';
export type ConnectorRuntimeType = 'inapp' | 'shared';

export interface Manifest {
  title: string;
  description: string;
  skus: SkuType[];
  kinds: WorkflowKindType[];
  tags: Record<string, string>;
  artifacts: Artifact[];
  images: Record<string, string>;
  prerequisites?: string;
  parameters: Parameter[];
  connections: Record<string, Connection>;
}

export interface Artifact {
  type: string;
  file: string;
}
export interface Parameter {
  name: string;
  type: string;
  default?: string;
  description: string;
  required?: boolean;
  displayName: string;
  allowedValues?: { value: any; displayName: string }[];
}

export interface ParameterDefinition extends Parameter {
  value?: any;
}

export interface Connection {
  id: string;
  kind?: ConnectorRuntimeType;
}

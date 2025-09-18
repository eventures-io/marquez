import type { Field, Run, Tag } from './api'
import type { Nullable } from './Nullable'

export enum NodeType {
  JOB = 'JOB',
  DATASET = 'DATASET'
}

export enum EventType {
  START = 'START',
  COMPLETE = 'COMPLETE',
  FAIL = 'FAIL',
  ABORT = 'ABORT'
}

export enum JobType {
  BATCH = 'BATCH',
  STREAM = 'STREAM',
  SERVICE = 'SERVICE'
}

export enum DatasetType {
  DB_TABLE = 'DB_TABLE',
  STREAM = 'STREAM'
}

export type BatchOrStream = 'BATCH' | 'STREAM' | 'SERVICE'
export type DbTableOrStream = 'DB_TABLE' | 'STREAM'

export interface LineageDataset {
  id: { namespace: string; name: string }
  type: DatasetType
  name: string
  physicalName: string
  createdAt: string
  updatedAt: string
  namespace: string
  sourceName: string
  fields: Field[]
  facets: object
  tags: Tag[]
  lastModifiedAt: string
  description: string
}

export interface LineageJob {
  id: { namespace: string; name: string }
  type: JobType
  name: string
  createdAt: string
  updatedAt: string
  namespace: string
  inputs: { namespace: string; name: string }[]
  outputs: { namespace: string; name: string }[]
  location: string
  description: string
  simpleName: string
  latestRun: Nullable<Run>
  parentJobName: Nullable<string>
  parentJobUuid: Nullable<string>
  tags?: Tag[]
  transformationCode?: string
  sourceCodeLocation?: string
  sourceCode?: string
  sql?: string
  ownership?: string
}

export interface LineageEdge {
  origin: string
  destination: string
}

export interface LineageNode {
  id: string
  type: NodeType
  data: LineageDataset | LineageJob
  inEdges: LineageEdge[]
  outEdges: LineageEdge[]
}

export interface MqNode {
  data: LineageDataset | LineageJob
}


export interface OpenLineageEvent {
  eventType: EventType;
  eventTime: string;
  producer: string;
  schemaURL: string;
  job: {
    namespace: string;
    name: string;
    facets?: {
      documentation?: {
        _producer: string;
        _schemaURL: string;
        description: string;
      };
    };
  };
  run: {
    runId: string;
    facets?: Record<string, any>;
  };
  inputs?: Array<{
    namespace: string;
    name: string;
    facets?: {
      schema?: {
        _producer: string;
        _schemaURL: string;
        fields: Array<{ name: string; type: string }>;
      };
      documentation?: {
        _producer: string;
        _schemaURL: string;
        description: string;
      };
    };
  }>;
  outputs?: Array<{
    namespace: string;
    name: string;
    facets?: {
      schema?: {
        _producer: string;
        _schemaURL: string;
        fields: Array<{ name: string; type: string }>;
      };
      documentation?: {
        _producer: string;
        _schemaURL: string;
        description: string;
      };
    };
  }>;
}
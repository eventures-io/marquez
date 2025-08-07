// @ts-nocheck
import { LineageGraph } from '../../types/api';

export const sampleLineageData: LineageGraph = {
  graph: [
    {
      id: 'dataset_raw_customers',
      type: 'DATASET',
      data: {
        id: { namespace: 'example', name: 'raw_customers' },
        type: 'DB_TABLE',
        name: 'raw_customers',
        physicalName: 'public.raw_customers',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-15T10:00:00Z',
        namespace: 'example',
        sourceName: 'postgresql',
        fields: [
          { name: 'id', type: 'INTEGER', tags: [] },
          { name: 'name', type: 'VARCHAR', tags: [] },
          { name: 'email', type: 'VARCHAR', tags: [] },
        ],
        facets: {},
        tags: [],
        lastModifiedAt: '2024-01-15T10:00:00Z',
        description: 'Raw customer data from CRM system',
      },
      inEdges: [],
      outEdges: [
        {
          origin: 'dataset_raw_customers',
          destination: 'job_transform_customers',
        },
      ],
    },
    {
      id: 'job_transform_customers',
      type: 'JOB',
      data: {
        id: { namespace: 'example', name: 'transform_customers' },
        type: 'BATCH',
        name: 'transform_customers',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-15T10:00:00Z',
        namespace: 'example',
        inputs: [{ namespace: 'example', name: 'raw_customers' }],
        outputs: [{ namespace: 'example', name: 'cleaned_customers' }],
        location: 'sql/transform_customers.sql',
        description: 'Clean and standardize customer data',
        simpleName: 'Transform Customers',
        latestRun: null,
        parentJobName: null,
        parentJobUuid: null,
      },
      inEdges: [
        {
          origin: 'dataset_raw_customers',
          destination: 'job_transform_customers',
        },
      ],
      outEdges: [
        {
          origin: 'job_transform_customers',
          destination: 'dataset_cleaned_customers',
        },
      ],
    },
    {
      id: 'dataset_cleaned_customers',
      type: 'DATASET',
      data: {
        id: { namespace: 'example', name: 'cleaned_customers' },
        type: 'DB_TABLE',
        name: 'cleaned_customers',
        physicalName: 'public.cleaned_customers',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-15T10:00:00Z',
        namespace: 'example',
        sourceName: 'postgresql',
        fields: [
          { name: 'customer_id', type: 'INTEGER', tags: [] },
          { name: 'full_name', type: 'VARCHAR', tags: [] },
          { name: 'email_address', type: 'VARCHAR', tags: [] },
          { name: 'created_date', type: 'TIMESTAMP', tags: [] },
        ],
        facets: {},
        tags: [],
        lastModifiedAt: '2024-01-15T10:00:00Z',
        description: 'Cleaned and standardized customer data',
      },
      inEdges: [
        {
          origin: 'job_transform_customers',
          destination: 'dataset_cleaned_customers',
        },
      ],
      outEdges: [
        {
          origin: 'dataset_cleaned_customers',
          destination: 'job_customer_analytics',
        },
      ],
    },
    {
      id: 'job_customer_analytics',
      type: 'JOB',
      data: {
        id: { namespace: 'example', name: 'customer_analytics' },
        type: 'BATCH',
        name: 'customer_analytics',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-15T10:00:00Z',
        namespace: 'example',
        inputs: [{ namespace: 'example', name: 'cleaned_customers' }],
        outputs: [{ namespace: 'example', name: 'customer_metrics' }],
        location: 'sql/customer_analytics.sql',
        description: 'Generate customer analytics and metrics',
        simpleName: 'Customer Analytics',
        latestRun: null,
        parentJobName: null,
        parentJobUuid: null,
      },
      inEdges: [
        {
          origin: 'dataset_cleaned_customers',
          destination: 'job_customer_analytics',
        },
      ],
      outEdges: [
        {
          origin: 'job_customer_analytics',
          destination: 'dataset_customer_metrics',
        },
      ],
    },
    {
      id: 'dataset_customer_metrics',
      type: 'DATASET',
      data: {
        id: { namespace: 'example', name: 'customer_metrics' },
        type: 'DB_TABLE',
        name: 'customer_metrics',
        physicalName: 'public.customer_metrics',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-15T10:00:00Z',
        namespace: 'example',
        sourceName: 'postgresql',
        fields: [
          { name: 'customer_id', type: 'INTEGER', tags: [] },
          { name: 'total_orders', type: 'INTEGER', tags: [] },
          { name: 'total_spend', type: 'DECIMAL', tags: [] },
          { name: 'avg_order_value', type: 'DECIMAL', tags: [] },
          { name: 'last_order_date', type: 'DATE', tags: [] },
        ],
        facets: {},
        tags: [],
        lastModifiedAt: '2024-01-15T10:00:00Z',
        description: 'Customer analytics and metrics',
      },
      inEdges: [
        {
          origin: 'job_customer_analytics',
          destination: 'dataset_customer_metrics',
        },
      ],
      outEdges: [],
    },
  ],
};
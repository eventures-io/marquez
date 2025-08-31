-- SPDX-License-Identifier: Apache-2.0
-- Marquez Complete Database Schema
-- This script creates the complete Marquez database schema representing the final state
-- after all Flyway migrations (V1-V74 + repeatable migrations) have been applied.

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE dataset_name AS (
    namespace_name VARCHAR(255),
    name VARCHAR(255)
);

-- Core Tables

CREATE TABLE namespaces (
    uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    current_owner_name VARCHAR(255),
    is_hidden BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE owners (
    uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    name VARCHAR(255) UNIQUE NOT NULL
);

CREATE TABLE namespace_ownerships (
    uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at TIMESTAMPTZ,
    namespace_uuid UUID REFERENCES namespaces(uuid) ON DELETE CASCADE,
    owner_uuid UUID REFERENCES owners(uuid) ON DELETE CASCADE,
    UNIQUE (namespace_uuid, owner_uuid)
);

CREATE TABLE sources (
    uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    name VARCHAR(255) UNIQUE NOT NULL,
    connection_url VARCHAR(2048) NOT NULL,
    description TEXT,
    UNIQUE (name, connection_url)
);

CREATE TABLE datasets (
    uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    namespace_uuid UUID REFERENCES namespaces(uuid) ON DELETE CASCADE,
    namespace_name VARCHAR(255) NOT NULL,
    source_uuid UUID REFERENCES sources(uuid) ON DELETE CASCADE,
    source_name VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    physical_name VARCHAR(255) NOT NULL,
    description TEXT,
    current_version_uuid UUID,
    last_modified_at TIMESTAMPTZ,
    is_hidden BOOLEAN NOT NULL DEFAULT false,
    UNIQUE (namespace_name, name)
);

CREATE TABLE dataset_fields (
    uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    dataset_uuid UUID REFERENCES datasets(uuid) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    UNIQUE (dataset_uuid, name)
);

CREATE TABLE tags (
    uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT
);

CREATE TABLE datasets_tag_mapping (
    dataset_uuid UUID REFERENCES datasets(uuid) ON DELETE CASCADE,
    tag_uuid UUID REFERENCES tags(uuid) ON DELETE CASCADE,
    tagged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (tag_uuid, dataset_uuid)
);

CREATE TABLE dataset_fields_tag_mapping (
    dataset_field_uuid UUID REFERENCES dataset_fields(uuid) ON DELETE CASCADE,
    tag_uuid UUID REFERENCES tags(uuid) ON DELETE CASCADE,
    tagged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (tag_uuid, dataset_field_uuid)
);

CREATE TABLE dataset_versions (
    uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    dataset_uuid UUID REFERENCES datasets(uuid) ON DELETE CASCADE,
    version UUID NOT NULL,
    run_uuid UUID,
    schema_version_uuid UUID,
    operation VARCHAR(64),
    UNIQUE (dataset_uuid, version)
);

CREATE TABLE dataset_schema_versions (
    uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    dataset_uuid UUID REFERENCES datasets(uuid) ON DELETE CASCADE,
    schema_version UUID NOT NULL,
    schema_json JSONB NOT NULL,
    UNIQUE (dataset_uuid, schema_version)
);

CREATE TABLE dataset_schema_versions_field_mapping (
    dataset_schema_version_uuid UUID REFERENCES dataset_schema_versions(uuid) ON DELETE CASCADE,
    dataset_field_uuid UUID REFERENCES dataset_fields(uuid) ON DELETE CASCADE,
    PRIMARY KEY (dataset_schema_version_uuid, dataset_field_uuid)
);

CREATE TABLE dataset_symlinks (
    uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    namespace_name VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    dataset_uuid UUID REFERENCES datasets(uuid) ON DELETE CASCADE,
    is_primary BOOLEAN NOT NULL DEFAULT false,
    UNIQUE (namespace_name, name)
);

CREATE TABLE stream_versions (
    dataset_version_uuid UUID REFERENCES dataset_versions(uuid) ON DELETE CASCADE,
    schema_location VARCHAR(255) UNIQUE NOT NULL
);

CREATE TABLE jobs (
    uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    namespace_uuid UUID REFERENCES namespaces(uuid) ON DELETE CASCADE,
    namespace_name VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    current_version_uuid UUID,
    current_location TEXT,
    current_inputs JSONB,
    current_outputs JSONB,
    current_run_uuid UUID,
    symlink_target_uuid UUID REFERENCES jobs(uuid),
    parent_job_uuid UUID REFERENCES jobs(uuid),
    is_hidden BOOLEAN NOT NULL DEFAULT false,
    UNIQUE (namespace_name, name)
);

CREATE TABLE jobs_fqn (
    job_uuid UUID REFERENCES jobs(uuid) ON DELETE CASCADE,
    fqn TEXT NOT NULL,
    PRIMARY KEY (job_uuid, fqn)
);

CREATE TABLE job_versions (
    uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    job_uuid UUID REFERENCES jobs(uuid) ON DELETE CASCADE,
    job_name VARCHAR(255) NOT NULL,
    namespace_name VARCHAR(255) NOT NULL,
    version UUID NOT NULL,
    location TEXT,
    latest_run_uuid UUID,
    UNIQUE (job_uuid, version)
);

CREATE TABLE job_versions_io_mapping (
    job_version_uuid UUID REFERENCES job_versions(uuid) ON DELETE CASCADE,
    dataset_uuid UUID REFERENCES datasets(uuid) ON DELETE CASCADE,
    io_type VARCHAR(64) NOT NULL,
    job_uuid UUID REFERENCES jobs(uuid) ON DELETE CASCADE,
    PRIMARY KEY (job_version_uuid, dataset_uuid, io_type)
);

CREATE TABLE jobs_tag_mapping (
    job_uuid UUID REFERENCES jobs(uuid) ON DELETE CASCADE,
    tag_uuid UUID REFERENCES tags(uuid) ON DELETE CASCADE,
    tagged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (tag_uuid, job_uuid)
);

CREATE TABLE run_args (
    uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    args JSONB NOT NULL,
    checksum VARCHAR(255) UNIQUE NOT NULL
);

CREATE TABLE runs (
    uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    job_version_uuid UUID REFERENCES job_versions(uuid) ON DELETE CASCADE,
    job_uuid UUID REFERENCES jobs(uuid) ON DELETE CASCADE,
    run_args_uuid UUID REFERENCES run_args(uuid),
    nominal_start_time TIMESTAMPTZ,
    nominal_end_time TIMESTAMPTZ,
    current_run_state VARCHAR(64),
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    external_id VARCHAR(255),
    parent_run_uuid UUID REFERENCES runs(uuid)
);

CREATE TABLE run_states (
    uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transitioned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    run_uuid UUID REFERENCES runs(uuid) ON DELETE CASCADE,
    state VARCHAR(64) NOT NULL
);

CREATE TABLE runs_input_mapping (
    run_uuid UUID REFERENCES runs(uuid) ON DELETE CASCADE,
    dataset_version_uuid UUID REFERENCES dataset_versions(uuid) ON DELETE CASCADE,
    PRIMARY KEY (run_uuid, dataset_version_uuid)
);

CREATE TABLE lineage_events (
    event_time TIMESTAMPTZ NOT NULL,
    event JSONB NOT NULL,
    event_type TEXT,
    run_id TEXT,
    job_name TEXT,
    job_namespace TEXT,
    producer TEXT,
    PRIMARY KEY (event_time, event)
);

CREATE TABLE column_lineage (
    uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    input_field_uuid UUID REFERENCES dataset_fields(uuid) ON DELETE CASCADE,
    output_dataset_field_uuid UUID REFERENCES dataset_fields(uuid) ON DELETE CASCADE,
    output_dataset_version_uuid UUID REFERENCES dataset_versions(uuid) ON DELETE CASCADE,
    UNIQUE (input_field_uuid, output_dataset_field_uuid, output_dataset_version_uuid)
);

-- Facet Tables

CREATE TABLE dataset_facets (
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    dataset_uuid UUID REFERENCES datasets(uuid) ON DELETE CASCADE,
    dataset_version_uuid UUID REFERENCES dataset_versions(uuid) ON DELETE CASCADE,
    run_uuid UUID REFERENCES runs(uuid) ON DELETE CASCADE,
    lineage_event_time TIMESTAMPTZ NOT NULL,
    lineage_event_type VARCHAR(64),
    type VARCHAR(64) NOT NULL,
    name VARCHAR(255) NOT NULL,
    facet JSONB NOT NULL
);

CREATE TABLE job_facets (
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    job_uuid UUID REFERENCES jobs(uuid) ON DELETE CASCADE,
    job_version_uuid UUID REFERENCES job_versions(uuid) ON DELETE CASCADE,
    run_uuid UUID REFERENCES runs(uuid) ON DELETE CASCADE,
    lineage_event_time TIMESTAMPTZ NOT NULL,
    lineage_event_type VARCHAR(64) NOT NULL,
    type VARCHAR(64) NOT NULL,
    name VARCHAR(255) NOT NULL,
    facet JSONB NOT NULL
);

CREATE TABLE run_facets (
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    run_uuid UUID REFERENCES runs(uuid) ON DELETE CASCADE,
    lineage_event_time TIMESTAMPTZ NOT NULL,
    lineage_event_type VARCHAR(64) NOT NULL,
    type VARCHAR(64) NOT NULL,
    name VARCHAR(255) NOT NULL,
    facet JSONB NOT NULL
);

CREATE TABLE facet_migration_lock (
    id INTEGER PRIMARY KEY,
    locked_at TIMESTAMPTZ NOT NULL
);

-- Update foreign key constraints
ALTER TABLE datasets ADD CONSTRAINT datasets_current_version_uuid_fkey 
    FOREIGN KEY (current_version_uuid) REFERENCES dataset_versions(uuid);

ALTER TABLE jobs ADD CONSTRAINT jobs_current_version_uuid_fkey 
    FOREIGN KEY (current_version_uuid) REFERENCES job_versions(uuid);

ALTER TABLE jobs ADD CONSTRAINT jobs_current_run_uuid_fkey 
    FOREIGN KEY (current_run_uuid) REFERENCES runs(uuid);

ALTER TABLE job_versions ADD CONSTRAINT job_versions_latest_run_uuid_fkey 
    FOREIGN KEY (latest_run_uuid) REFERENCES runs(uuid);

ALTER TABLE dataset_versions ADD CONSTRAINT dataset_versions_run_uuid_fkey 
    FOREIGN KEY (run_uuid) REFERENCES runs(uuid);

ALTER TABLE dataset_versions ADD CONSTRAINT dataset_versions_schema_version_uuid_fkey 
    FOREIGN KEY (schema_version_uuid) REFERENCES dataset_schema_versions(uuid);

-- Indexes for Performance

CREATE INDEX namespaces_name_index ON namespaces(name);
CREATE INDEX sources_name_index ON sources(name);
CREATE INDEX datasets_namespace_name_index ON datasets(namespace_name);
CREATE INDEX datasets_source_name_index ON datasets(source_name);
CREATE INDEX datasets_namespace_source_name_index ON datasets(namespace_name, source_name, name);
CREATE INDEX dataset_versions_dataset_uuid_index ON dataset_versions(dataset_uuid);
CREATE INDEX dataset_fields_dataset_uuid_index ON dataset_fields(dataset_uuid);
CREATE INDEX dataset_fields_name_index ON dataset_fields(name);
CREATE INDEX dataset_symlinks_dataset_uuid_index ON dataset_symlinks(dataset_uuid);

CREATE INDEX jobs_namespace_name_index ON jobs(namespace_name);
CREATE INDEX jobs_name_index ON jobs(name);
CREATE UNIQUE INDEX unique_jobs_fqn_name ON jobs(namespace_name, name) WHERE parent_job_uuid IS NULL;
CREATE INDEX job_versions_job_uuid_index ON job_versions(job_uuid);
CREATE INDEX jobs_fqn_job_uuid_index ON jobs_fqn(job_uuid);
CREATE INDEX jobs_fqn_fqn_index ON jobs_fqn(fqn);

CREATE INDEX runs_created_at_index ON runs(created_at);
CREATE INDEX runs_nominal_time_index ON runs(nominal_start_time, nominal_end_time);
CREATE INDEX run_states_run_uuid_index ON run_states(run_uuid);
CREATE INDEX run_states_transitioned_at_index ON run_states(transitioned_at);
CREATE INDEX runs_parent_run_uuid_index ON runs(parent_run_uuid);

CREATE INDEX lineage_events_run_id_index ON lineage_events(run_id);
CREATE INDEX lineage_events_job_name_index ON lineage_events(job_name);
CREATE INDEX lineage_events_created_at_index ON lineage_events(event_time);

CREATE INDEX column_lineage_input_field_uuid_index ON column_lineage(input_field_uuid);
CREATE INDEX column_lineage_output_dataset_field_uuid_index ON column_lineage(output_dataset_field_uuid);
CREATE INDEX column_lineage_output_dataset_version_uuid_index ON column_lineage(output_dataset_version_uuid);

CREATE INDEX dataset_facets_dataset_uuid_index ON dataset_facets(dataset_uuid);
CREATE INDEX dataset_facets_dataset_version_uuid_index ON dataset_facets(dataset_version_uuid);
CREATE INDEX dataset_facets_run_uuid_index ON dataset_facets(run_uuid);
CREATE INDEX dataset_facets_lineage_event_time_index ON dataset_facets(lineage_event_time);

CREATE INDEX job_facets_job_uuid_index ON job_facets(job_uuid);
CREATE INDEX job_facets_job_version_uuid_index ON job_facets(job_version_uuid);
CREATE INDEX job_facets_run_uuid_index ON job_facets(run_uuid);
CREATE INDEX job_facets_lineage_event_time_index ON job_facets(lineage_event_time);

CREATE INDEX run_facets_run_uuid_index ON run_facets(run_uuid);
CREATE INDEX run_facets_lineage_event_time_index ON run_facets(lineage_event_time);

-- Function for maintaining job FQN table
CREATE OR REPLACE FUNCTION rewrite_jobs_fqn_table() RETURNS void AS $$
BEGIN
    DELETE FROM jobs_fqn;
    
    WITH RECURSIVE job_hierarchy AS (
        -- Base case: jobs without parents
        SELECT 
            uuid,
            namespace_name,
            name,
            name as fqn,
            parent_job_uuid,
            0 as level
        FROM jobs 
        WHERE parent_job_uuid IS NULL
        
        UNION ALL
        
        -- Recursive case: jobs with parents
        SELECT 
            j.uuid,
            j.namespace_name,
            j.name,
            jh.fqn || '.' || j.name as fqn,
            j.parent_job_uuid,
            jh.level + 1
        FROM jobs j
        JOIN job_hierarchy jh ON j.parent_job_uuid = jh.uuid
        WHERE jh.level < 10  -- Prevent infinite recursion
    )
    INSERT INTO jobs_fqn (job_uuid, fqn)
    SELECT uuid, fqn FROM job_hierarchy;
END;
$$ LANGUAGE plpgsql;

-- Trigger function for maintaining job FQN
CREATE OR REPLACE FUNCTION write_run_job_uuid() RETURNS trigger AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        NEW.job_uuid := (SELECT job_uuid FROM job_versions WHERE uuid = NEW.job_version_uuid);
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        NEW.job_uuid := (SELECT job_uuid FROM job_versions WHERE uuid = NEW.job_version_uuid);
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER write_run_job_uuid_trigger
    BEFORE INSERT OR UPDATE ON runs
    FOR EACH ROW EXECUTE FUNCTION write_run_job_uuid();

-- Views

CREATE OR REPLACE VIEW datasets_view AS
SELECT 
    d.uuid,
    d.type,
    d.created_at,
    d.updated_at,
    d.namespace_uuid,
    d.namespace_name,
    d.source_uuid,
    d.source_name,
    COALESCE(ds.name, d.name) as name,
    d.physical_name,
    d.description,
    d.current_version_uuid,
    d.last_modified_at,
    d.is_hidden
FROM datasets d
LEFT JOIN dataset_symlinks ds ON d.uuid = ds.dataset_uuid AND ds.is_primary = true;

CREATE OR REPLACE VIEW jobs_view AS
WITH RECURSIVE job_hierarchy AS (
    SELECT 
        uuid,
        type,
        created_at,
        updated_at,
        namespace_uuid,
        namespace_name,
        name,
        description,
        current_version_uuid,
        current_location,
        current_inputs,
        current_outputs,
        current_run_uuid,
        symlink_target_uuid,
        parent_job_uuid,
        is_hidden,
        name as simple_name,
        name as fqn,
        0 as level
    FROM jobs 
    WHERE parent_job_uuid IS NULL
    
    UNION ALL
    
    SELECT 
        j.uuid,
        j.type,
        j.created_at,
        j.updated_at,
        j.namespace_uuid,
        j.namespace_name,
        j.name,
        j.description,
        j.current_version_uuid,
        j.current_location,
        j.current_inputs,
        j.current_outputs,
        j.current_run_uuid,
        j.symlink_target_uuid,
        j.parent_job_uuid,
        j.is_hidden,
        j.name as simple_name,
        jh.fqn || '.' || j.name as fqn,
        jh.level + 1
    FROM jobs j
    JOIN job_hierarchy jh ON j.parent_job_uuid = jh.uuid
    WHERE jh.level < 10
)
SELECT * FROM job_hierarchy;

CREATE OR REPLACE VIEW runs_view AS
SELECT 
    r.uuid,
    r.created_at,
    r.updated_at,
    r.job_version_uuid,
    r.job_uuid,
    r.run_args_uuid,
    r.nominal_start_time,
    r.nominal_end_time,
    r.current_run_state,
    r.started_at,
    r.ended_at,
    r.external_id,
    r.parent_run_uuid,
    jv.job_name,
    jv.namespace_name
FROM runs r
JOIN job_versions jv ON r.job_version_uuid = jv.uuid;

-- Materialized Views for Metrics

CREATE MATERIALIZED VIEW lineage_events_by_type_hourly_view AS
SELECT 
    DATE_TRUNC('hour', event_time) as hour,
    event_type,
    COUNT(*) as event_count
FROM lineage_events 
WHERE event_time >= NOW() - INTERVAL '7 days'
GROUP BY DATE_TRUNC('hour', event_time), event_type
ORDER BY hour DESC;

CREATE MATERIALIZED VIEW lineage_events_by_type_daily_view AS
SELECT 
    DATE_TRUNC('day', event_time) as day,
    event_type,
    COUNT(*) as event_count
FROM lineage_events 
WHERE event_time >= NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', event_time), event_type
ORDER BY day DESC;

-- Create indexes on materialized views
CREATE INDEX lineage_events_by_type_hourly_view_hour_index 
    ON lineage_events_by_type_hourly_view(hour);
CREATE INDEX lineage_events_by_type_hourly_view_event_type_index 
    ON lineage_events_by_type_hourly_view(event_type);

CREATE INDEX lineage_events_by_type_daily_view_day_index 
    ON lineage_events_by_type_daily_view(day);
CREATE INDEX lineage_events_by_type_daily_view_event_type_index 
    ON lineage_events_by_type_daily_view(event_type);

-- Initialize the jobs_fqn table
SELECT rewrite_jobs_fqn_table();

-- Comments for key tables
COMMENT ON TABLE namespaces IS 'Logical grouping of datasets and jobs';
COMMENT ON TABLE datasets IS 'Dataset metadata with denormalized namespace and source information';
COMMENT ON TABLE jobs IS 'Job definitions with hierarchical support via parent_job_uuid';
COMMENT ON TABLE lineage_events IS 'Raw OpenLineage events stored as JSONB';
COMMENT ON TABLE column_lineage IS 'Column-level lineage relationships between dataset fields';
COMMENT ON TABLE dataset_facets IS 'Extensible dataset metadata using OpenLineage facets';
COMMENT ON TABLE job_facets IS 'Extensible job metadata using OpenLineage facets';
COMMENT ON TABLE run_facets IS 'Extensible run metadata using OpenLineage facets';

-- Insert default tags
INSERT INTO tags (name, description) VALUES 
    ('PII', 'Personally identifiable information'),
    ('SENSITIVE', 'Contains sensitive information')
ON CONFLICT (name) DO NOTHING;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Marquez database schema created successfully!';
    RAISE NOTICE 'Schema includes % tables with full indexing and constraints', 
        (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public');
END $$;
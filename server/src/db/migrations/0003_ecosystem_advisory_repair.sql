ALTER TABLE "fields" ADD COLUMN IF NOT EXISTS "irrigation_method" text;
ALTER TABLE "fields" ADD COLUMN IF NOT EXISTS "farming_method" text;

CREATE TABLE IF NOT EXISTS "zones" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "field_id" uuid NOT NULL,
  "name" text NOT NULL,
  "area" numeric(12,2),
  "area_unit" text,
  "coarse_centroid_lat" real,
  "coarse_centroid_lng" real,
  "current_condition" text,
  "status" text DEFAULT 'active' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'zones_field_id_fields_id_fk'
  ) THEN
    ALTER TABLE "zones" ADD CONSTRAINT "zones_field_id_fields_id_fk"
      FOREIGN KEY ("field_id") REFERENCES "public"."fields"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;

ALTER TABLE "crop_cycles" ADD COLUMN IF NOT EXISTS "zone_id" uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'crop_cycles_zone_id_zones_id_fk'
  ) THEN
    ALTER TABLE "crop_cycles" ADD CONSTRAINT "crop_cycles_zone_id_zones_id_fk"
      FOREIGN KEY ("zone_id") REFERENCES "public"."zones"("id") ON DELETE set null ON UPDATE no action;
  END IF;
END $$;

ALTER TABLE "disease_detections" ADD COLUMN IF NOT EXISTS "zone_id" uuid;
ALTER TABLE "disease_detections" ADD COLUMN IF NOT EXISTS "image_quality" jsonb;
ALTER TABLE "disease_detections" ADD COLUMN IF NOT EXISTS "diagnoses" jsonb;
ALTER TABLE "disease_detections" ADD COLUMN IF NOT EXISTS "affected_area_percent" real;
ALTER TABLE "disease_detections" ADD COLUMN IF NOT EXISTS "severity_source" text;
ALTER TABLE "disease_detections" ADD COLUMN IF NOT EXISTS "spread_risk" text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'disease_detections_zone_id_zones_id_fk'
  ) THEN
    ALTER TABLE "disease_detections" ADD CONSTRAINT "disease_detections_zone_id_zones_id_fk"
      FOREIGN KEY ("zone_id") REFERENCES "public"."zones"("id") ON DELETE set null ON UPDATE no action;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "field_observations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "field_id" uuid NOT NULL,
  "zone_id" uuid,
  "advisory_run_id" uuid,
  "image_reference" text,
  "affected_area_percent" real,
  "severity" text,
  "severity_source" text NOT NULL,
  "farmer_action" text,
  "outcome" text,
  "note" text,
  "observed_at" timestamp DEFAULT now() NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'field_observations_field_id_fields_id_fk'
  ) THEN
    ALTER TABLE "field_observations" ADD CONSTRAINT "field_observations_field_id_fields_id_fk"
      FOREIGN KEY ("field_id") REFERENCES "public"."fields"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'field_observations_zone_id_zones_id_fk'
  ) THEN
    ALTER TABLE "field_observations" ADD CONSTRAINT "field_observations_zone_id_zones_id_fk"
      FOREIGN KEY ("zone_id") REFERENCES "public"."zones"("id") ON DELETE set null ON UPDATE no action;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'field_observations_advisory_run_id_advisory_runs_id_fk'
  ) THEN
    ALTER TABLE "field_observations" ADD CONSTRAINT "field_observations_advisory_run_id_advisory_runs_id_fk"
      FOREIGN KEY ("advisory_run_id") REFERENCES "public"."advisory_runs"("id") ON DELETE set null ON UPDATE no action;
  END IF;
END $$;

CREATE TABLE "field_observations" (
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
--> statement-breakpoint
CREATE TABLE "zones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"field_id" uuid NOT NULL,
	"name" text NOT NULL,
	"area" numeric(12, 2),
	"area_unit" text,
	"coarse_centroid_lat" real,
	"coarse_centroid_lng" real,
	"current_condition" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "crop_cycles" ADD COLUMN "zone_id" uuid;--> statement-breakpoint
ALTER TABLE "disease_detections" ADD COLUMN "zone_id" uuid;--> statement-breakpoint
ALTER TABLE "disease_detections" ADD COLUMN "image_quality" jsonb;--> statement-breakpoint
ALTER TABLE "disease_detections" ADD COLUMN "diagnoses" jsonb;--> statement-breakpoint
ALTER TABLE "disease_detections" ADD COLUMN "affected_area_percent" real;--> statement-breakpoint
ALTER TABLE "disease_detections" ADD COLUMN "severity_source" text;--> statement-breakpoint
ALTER TABLE "disease_detections" ADD COLUMN "spread_risk" text;--> statement-breakpoint
ALTER TABLE "fields" ADD COLUMN "irrigation_method" text;--> statement-breakpoint
ALTER TABLE "fields" ADD COLUMN "farming_method" text;--> statement-breakpoint
ALTER TABLE "field_observations" ADD CONSTRAINT "field_observations_field_id_fields_id_fk" FOREIGN KEY ("field_id") REFERENCES "public"."fields"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "field_observations" ADD CONSTRAINT "field_observations_zone_id_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."zones"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "field_observations" ADD CONSTRAINT "field_observations_advisory_run_id_advisory_runs_id_fk" FOREIGN KEY ("advisory_run_id") REFERENCES "public"."advisory_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zones" ADD CONSTRAINT "zones_field_id_fields_id_fk" FOREIGN KEY ("field_id") REFERENCES "public"."fields"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crop_cycles" ADD CONSTRAINT "crop_cycles_zone_id_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."zones"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disease_detections" ADD CONSTRAINT "disease_detections_zone_id_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."zones"("id") ON DELETE set null ON UPDATE no action;
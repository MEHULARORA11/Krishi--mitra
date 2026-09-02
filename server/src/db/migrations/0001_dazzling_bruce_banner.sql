CREATE TABLE "advisory_action_status" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"advisory_run_id" uuid NOT NULL,
	"action_id" uuid NOT NULL,
	"status" text NOT NULL,
	"occurred_at" timestamp DEFAULT now() NOT NULL,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "advisory_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"detection_id" uuid NOT NULL,
	"weather_snapshot_id" uuid,
	"rules_version" text NOT NULL,
	"prompt_version" text,
	"model" text,
	"status" text NOT NULL,
	"structured_result" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crop_cycles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"field_id" uuid NOT NULL,
	"crop_id" uuid NOT NULL,
	"variety" text,
	"season" text NOT NULL,
	"sowing_date" timestamp,
	"stage" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crops" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"canonical_name" text NOT NULL,
	"local_names" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"category" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "crops_canonical_name_unique" UNIQUE("canonical_name")
);
--> statement-breakpoint
CREATE TABLE "disease_detections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"field_id" uuid NOT NULL,
	"image_reference" text,
	"image_hash" text,
	"model_version" text NOT NULL,
	"relevance_score" numeric(4, 3),
	"predicted_class" text NOT NULL,
	"crop_name" text,
	"disease_name" text,
	"confidence" numeric(4, 3),
	"uncertainty_result" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "farms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"farmer_id" uuid NOT NULL,
	"name" text NOT NULL,
	"village" text,
	"state" text NOT NULL,
	"district" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fields" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"farm_id" uuid NOT NULL,
	"name" text NOT NULL,
	"area" numeric(12, 2) NOT NULL,
	"area_unit" text NOT NULL,
	"coarse_centroid_lat" real,
	"coarse_centroid_lng" real,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "future_crop_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"field_id" uuid NOT NULL,
	"source_advisory_id" uuid NOT NULL,
	"status" text NOT NULL,
	"candidate_crops" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"rationale" text,
	"rules_version" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gov_schemes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"state" text DEFAULT 'Central' NOT NULL,
	"eligibility_rules" text NOT NULL,
	"required_documents" jsonb,
	"official_link" text NOT NULL,
	"description" text NOT NULL,
	"category" text,
	"last_verified_date" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "market_prices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"crop" text NOT NULL,
	"variety" text,
	"state" text NOT NULL,
	"district" text NOT NULL,
	"mandi" text NOT NULL,
	"modal_price" real NOT NULL,
	"min_price" real,
	"max_price" real,
	"arrival_qty" real,
	"price_date" text NOT NULL,
	"fetched_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ndvi_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"farmer_id" uuid,
	"polygon_geojson" jsonb,
	"centroid_lat" real NOT NULL,
	"centroid_lng" real NOT NULL,
	"ndvi_value" real NOT NULL,
	"cloud_cover" real,
	"capture_date" text NOT NULL,
	"tile_source" text,
	"fetched_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "soil_tests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"field_id" uuid NOT NULL,
	"sampled_at" timestamp NOT NULL,
	"ph" numeric(4, 2),
	"nitrogen" numeric(10, 2),
	"phosphorus" numeric(10, 2),
	"potassium" numeric(10, 2),
	"organic_carbon" numeric(5, 2),
	"summary" text,
	"source" text NOT NULL,
	"source_freshness" text DEFAULT 'unknown' NOT NULL,
	"attachment_ref" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "treatment_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reviewed_action_id" text NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"active_ingredient" text,
	"action_text" text NOT NULL,
	"source" text NOT NULL,
	"jurisdiction" text NOT NULL,
	"review_date" timestamp NOT NULL,
	"demo_scope" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "treatment_actions_reviewed_action_id_unique" UNIQUE("reviewed_action_id")
);
--> statement-breakpoint
CREATE TABLE "treatment_constraints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"action_id" uuid NOT NULL,
	"crop_id" uuid,
	"disease" text NOT NULL,
	"stage" text,
	"prohibited_co_crops" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"min_ph" numeric(4, 2),
	"max_ph" numeric(4, 2),
	"min_organic_carbon" numeric(5, 2),
	"max_rain_probability" real,
	"max_wind_speed" real,
	"waiting_interval_hours" integer,
	"severity" text,
	"source" text NOT NULL,
	"source_freshness" text DEFAULT 'reviewed' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "voice_interactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"farmer_id" uuid,
	"transcript" text NOT NULL,
	"language_code" text NOT NULL,
	"detected_intent" text,
	"response_text" text,
	"field_context" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "weather_cache" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"city" text NOT NULL,
	"temperature" real NOT NULL,
	"humidity" real NOT NULL,
	"rainfall_probability" real,
	"wind_speed" real NOT NULL,
	"weather_condition" text NOT NULL,
	"forecast_json" jsonb,
	"forecast_timestamp" timestamp,
	"fetched_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "weather_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"field_id" uuid,
	"city" text NOT NULL,
	"source" text NOT NULL,
	"source_freshness" text NOT NULL,
	"observed_at" timestamp,
	"fetched_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	"rain_probability" real,
	"humidity" real,
	"wind_speed" real,
	"temperature" real,
	"payload" jsonb
);
--> statement-breakpoint
ALTER TABLE "advisory_action_status" ADD CONSTRAINT "advisory_action_status_advisory_run_id_advisory_runs_id_fk" FOREIGN KEY ("advisory_run_id") REFERENCES "public"."advisory_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advisory_action_status" ADD CONSTRAINT "advisory_action_status_action_id_treatment_actions_id_fk" FOREIGN KEY ("action_id") REFERENCES "public"."treatment_actions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advisory_runs" ADD CONSTRAINT "advisory_runs_detection_id_disease_detections_id_fk" FOREIGN KEY ("detection_id") REFERENCES "public"."disease_detections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advisory_runs" ADD CONSTRAINT "advisory_runs_weather_snapshot_id_weather_snapshots_id_fk" FOREIGN KEY ("weather_snapshot_id") REFERENCES "public"."weather_snapshots"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crop_cycles" ADD CONSTRAINT "crop_cycles_field_id_fields_id_fk" FOREIGN KEY ("field_id") REFERENCES "public"."fields"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crop_cycles" ADD CONSTRAINT "crop_cycles_crop_id_crops_id_fk" FOREIGN KEY ("crop_id") REFERENCES "public"."crops"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disease_detections" ADD CONSTRAINT "disease_detections_field_id_fields_id_fk" FOREIGN KEY ("field_id") REFERENCES "public"."fields"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "farms" ADD CONSTRAINT "farms_farmer_id_farmers_id_fk" FOREIGN KEY ("farmer_id") REFERENCES "public"."farmers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fields" ADD CONSTRAINT "fields_farm_id_farms_id_fk" FOREIGN KEY ("farm_id") REFERENCES "public"."farms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "future_crop_plans" ADD CONSTRAINT "future_crop_plans_field_id_fields_id_fk" FOREIGN KEY ("field_id") REFERENCES "public"."fields"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "future_crop_plans" ADD CONSTRAINT "future_crop_plans_source_advisory_id_advisory_runs_id_fk" FOREIGN KEY ("source_advisory_id") REFERENCES "public"."advisory_runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ndvi_snapshots" ADD CONSTRAINT "ndvi_snapshots_farmer_id_farmers_id_fk" FOREIGN KEY ("farmer_id") REFERENCES "public"."farmers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "soil_tests" ADD CONSTRAINT "soil_tests_field_id_fields_id_fk" FOREIGN KEY ("field_id") REFERENCES "public"."fields"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treatment_constraints" ADD CONSTRAINT "treatment_constraints_action_id_treatment_actions_id_fk" FOREIGN KEY ("action_id") REFERENCES "public"."treatment_actions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treatment_constraints" ADD CONSTRAINT "treatment_constraints_crop_id_crops_id_fk" FOREIGN KEY ("crop_id") REFERENCES "public"."crops"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice_interactions" ADD CONSTRAINT "voice_interactions_farmer_id_farmers_id_fk" FOREIGN KEY ("farmer_id") REFERENCES "public"."farmers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weather_snapshots" ADD CONSTRAINT "weather_snapshots_field_id_fields_id_fk" FOREIGN KEY ("field_id") REFERENCES "public"."fields"("id") ON DELETE set null ON UPDATE no action;
CREATE TABLE "analysis_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"farmer_id" uuid,
	"crop" text NOT NULL,
	"disease" text NOT NULL,
	"confidence" numeric(5, 2) NOT NULL,
	"severity" text NOT NULL,
	"advisory_short" text,
	"advisory_detail" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"farmer_id" uuid,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"language" text DEFAULT 'en' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "farmers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_user_id" text NOT NULL,
	"name" text,
	"email" text NOT NULL,
	"preferred_language" text DEFAULT 'en' NOT NULL,
	"state" text,
	"district" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "farmers_clerk_user_id_unique" UNIQUE("clerk_user_id"),
	CONSTRAINT "farmers_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "analysis_history" ADD CONSTRAINT "analysis_history_farmer_id_farmers_id_fk" FOREIGN KEY ("farmer_id") REFERENCES "public"."farmers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_farmer_id_farmers_id_fk" FOREIGN KEY ("farmer_id") REFERENCES "public"."farmers"("id") ON DELETE cascade ON UPDATE no action;
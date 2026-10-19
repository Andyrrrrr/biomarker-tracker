CREATE TYPE "public"."comparator" AS ENUM('<', '<=', '>', '>=');--> statement-breakpoint
CREATE TYPE "public"."report_source" AS ENUM('quest', 'insidetracker', 'function', 'manual');--> statement-breakpoint
CREATE TYPE "public"."result_type" AS ENUM('numeric', 'qualitative');--> statement-breakpoint
CREATE TABLE "biomarker_aliases" (
	"id" serial PRIMARY KEY NOT NULL,
	"biomarker_id" integer NOT NULL,
	"alias" text NOT NULL,
	"source" "report_source"
);
--> statement-breakpoint
ALTER TABLE "biomarker_aliases" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "biomarker_categories" (
	"biomarker_id" integer NOT NULL,
	"category_id" integer NOT NULL,
	CONSTRAINT "biomarker_categories_biomarker_id_category_id_pk" PRIMARY KEY("biomarker_id","category_id")
);
--> statement-breakpoint
ALTER TABLE "biomarker_categories" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "biomarkers" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"short_name" text,
	"description" text,
	"result_type" "result_type" DEFAULT 'numeric' NOT NULL,
	"unit" text,
	"range_low" double precision,
	"range_high" double precision,
	"optimal_enabled" boolean DEFAULT false NOT NULL,
	"optimal_low" double precision,
	"optimal_high" double precision,
	"normal_values" text[],
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "biomarkers_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "biomarkers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"icon" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "categories" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"source" "report_source" NOT NULL,
	"external_id" text NOT NULL,
	"lab" text,
	"collected_on" date NOT NULL,
	"collected_time" text,
	"ordering_account" text,
	"fasting" boolean,
	"source_file" text,
	"notes" text,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "reports" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "results" (
	"id" serial PRIMARY KEY NOT NULL,
	"report_id" integer NOT NULL,
	"biomarker_id" integer NOT NULL,
	"value_numeric" double precision,
	"comparator" "comparator",
	"value_text" text,
	"reported_value" text NOT NULL,
	"reported_unit" text,
	"lab_range_text" text,
	"lab_range_low" double precision,
	"lab_range_high" double precision,
	"lab_flag" text,
	"is_calculated" boolean DEFAULT false NOT NULL,
	"raw_name" text NOT NULL,
	"notes" text
);
--> statement-breakpoint
ALTER TABLE "results" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "biomarker_aliases" ADD CONSTRAINT "biomarker_aliases_biomarker_id_biomarkers_id_fk" FOREIGN KEY ("biomarker_id") REFERENCES "public"."biomarkers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biomarker_categories" ADD CONSTRAINT "biomarker_categories_biomarker_id_biomarkers_id_fk" FOREIGN KEY ("biomarker_id") REFERENCES "public"."biomarkers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biomarker_categories" ADD CONSTRAINT "biomarker_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "results" ADD CONSTRAINT "results_report_id_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "results" ADD CONSTRAINT "results_biomarker_id_biomarkers_id_fk" FOREIGN KEY ("biomarker_id") REFERENCES "public"."biomarkers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "biomarker_aliases_any_source" ON "biomarker_aliases" USING btree ("alias") WHERE "biomarker_aliases"."source" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "biomarker_aliases_per_source" ON "biomarker_aliases" USING btree ("alias","source") WHERE "biomarker_aliases"."source" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "reports_source_external_id_index" ON "reports" USING btree ("source","external_id");--> statement-breakpoint
CREATE INDEX "reports_collected_on_index" ON "reports" USING btree ("collected_on");--> statement-breakpoint
CREATE UNIQUE INDEX "results_report_id_biomarker_id_index" ON "results" USING btree ("report_id","biomarker_id");--> statement-breakpoint
CREATE INDEX "results_biomarker_id_index" ON "results" USING btree ("biomarker_id");
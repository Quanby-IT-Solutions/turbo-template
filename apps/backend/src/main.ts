// Import order is load-bearing and must not be reordered or auto-sorted:
//  1. dotenv/config  — populates process.env, which step 2 reads.
//  2. @/instrument   — Sentry.init() must run BEFORE the libraries it patches
//                      (http, express, pg) are imported by AppModule.
//  3. @/telemetry    — the OpenTelemetry provider and instrumentations. After
//                      step 2 because it plugs into Sentry's client; before
//                      AppModule for the same reason as step 2.
//  4. reflect-metadata — Nest's decorator metadata, needed before bootstrap.
import "dotenv/config"
import "@/instrument"
import "@/telemetry"
import "reflect-metadata"

import { bootstrap } from "@/bootstrap"

void bootstrap()

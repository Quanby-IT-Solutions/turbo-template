// Import order is load-bearing and must not be reordered or auto-sorted:
//  1. dotenv/config  — populates process.env, which step 2 reads.
//  2. @/instrument   — Sentry.init() must run BEFORE the libraries it patches
//                      (http, express, pg) are imported by AppModule.
//  3. reflect-metadata — Nest's decorator metadata, needed before bootstrap.
import "dotenv/config"
import "@/instrument"
import "reflect-metadata"

import { bootstrap } from "@/bootstrap"

void bootstrap()

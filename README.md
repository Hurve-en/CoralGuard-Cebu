# CoralGuard-Cebu
SDG 14 — Life Below Water


## The Problem (Real & Local)
Cebu is surrounded by coral reefs — Moalboal, Malapascua, Mactan — but illegal fishing, tourism damage, and climate change are killing them. Local fisherfolk and LGUs have no easy way to monitor reef health in real-time. By the time damage is reported, it's too late.

## The Solution

A web app where:

-Divers / community members upload underwater photos
-AI analyzes the image → detects coral bleaching, damage level, reef health score
-Shows a live map of Cebu's reef health across locations
-Sends alerts to LGUs when a reef is in danger
-Recommends actions (restrict fishing, call BFAR, etc.)

## TechStack

# Frontend 
React.js — building the UI (free)
Tailwind CSS — beautiful styling (free)
Leaflet.js — interactive map of Cebu reefs (free)

# Backend
Node.js + Express — server logic (free)
Supabase — free database + hosting 

# Maps
OpenStreetMap + Leaflet — 100% free map of Cebu

## Local Setup

1. Copy `coralguard/.env.example` to `coralguard/.env` and fill real keys.
2. In Supabase SQL editor, run `coralguard/SUPABASE_SETUP.sql`.
3. Install and run:
   - `cd coralguard`
   - `npm install`
   - `npm run dev`


## How Ai works

User uploads photo
        ↓
Gemini AI analyzes it
        ↓
Returns: "Coral is 35% bleached. 
         Recommend: Alert BFAR, 
         restrict fishing for 3 months"
        ↓
Map updates + LGU gets notified

## Overview Recent Reports Data Flow

`/` (Overview) now uses this source priority:

1. CoralGuard report records from Supabase (`reef_reports`) or local fallback storage.
2. If there are no stored reports, it fetches real Cebu marine observations from Open-Meteo Marine API:
   - Provider: Open-Meteo
   - Endpoint: `https://marine-api.open-meteo.com/v1/marine`
   - Variable used: `sea_surface_temperature`
   - Cebu sites: Moalboal, Pescador, Malapascua, Mactan, Camotes, Olango, Bantayan

Update frequency:
- Open-Meteo marine model outputs update upstream multiple times per day depending on the source model.

Backend/processing flow:
- Frontend fetches latest 24h SST per Cebu site.
- App derives a thermal-stress status (`Healthy`, `At Risk`, `Critical`) and displays it as a recent signal/report.
- If external fetch fails, local fallback dataset is shown with explicit source label.

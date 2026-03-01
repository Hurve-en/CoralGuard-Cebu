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

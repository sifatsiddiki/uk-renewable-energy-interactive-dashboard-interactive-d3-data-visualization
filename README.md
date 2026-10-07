# uk-renewable-energy-interactive-dashboard-interactive-d3-data-visualization
A client-side interactive data visualization dashboard mapping UK renewable energy trends (1990–2023) built with D3.v7, featuring synchronized cross-filtering, multi-chart state isolation, and offline zero-network execution hooks.
# UK Renewable Energy Interactive Dashboard (D3.v7 Implementation)

This repository contains the client-side data engine, user interface layouts, modular scripts, and structural design documentation compiled for the **Interactive Data Visualisation (ENUIC)** core computer science module framework.

##  Project Overview
The core objective of this application is to build a serverless, client-side **Interactive Data Visualisation Dashboard** mapping United Kingdom energy consumption trends from renewable and waste sources between 1990 and 2023. Deployed utilizing raw datasets from the Office for National Statistics (ONS), the system provides seamless multidirectional cross-filtering and synchronized data highlighting across multiple charts completely offline.

---

##  Technical Architecture & Data Processing

The application removes backend API dependencies by caching and tokenizing CSV string data natively inside browser memory loops, ensuring optimized rendering parameters without local CORS network boundary blocks:

* **In-Memory Data Hub (`js/data.js`):** Holds ONS source data structures compiled directly into raw global variables (`RAW_TABLE1`, `RAW_TABLE2`, `RAW_TABLE3`) using template literal string arrays.
* **Tokenization Pipeline (`js/main.js`):** Invokes native `d3.csvParse()` wrappers upon application loading sequences to parse dataset rows instantly into active JSON data streams.
* **State Coordination Logic (`js/state.js`):** Manages real-time variable caches (such as active year selections and focused source categories) to enforce transactional state updates across separate graphic canvas containers.

###  Dataset Layouts Processed
1. **Table 1c (Consumption by Source):** Groups multi-layered fuel vectors into six uniform categories: `Hydro`, `Wind_Wave_Tidal`, `Solar_PV`, `Landfill_Gas`, `Sewage_Gas`, and aggregated `Bioenergy` calculations (measured in Million Tonnes of Oil Equivalent - Mtoe).
2. **Table 1a (Consumption by Sector):** Maps raw Standard Industrial Classification (SIC 2007 codes) boundaries directly into standard business vectors (`Agriculture`, `Manufacturing`, `Energy_Supply`, `Other_Industry`, `Services`).
3. ** longitudinal Percentage Mix:** Traces longitudinal renewable market penetration changes directly against total UK primary fuel consumption totals.

---

##  Chart Layers & Interactive Synchronization

The rendering layout isolates visual charts into dedicated modular scripts (`js/charts.js`), linked together by central event listeners to ensure real-time cross-highlighting actions:

* **8-Directional Vector Line Chart:** Deploys continuous coordinate timeline vectors tracking energy sources. Click triggers isolate specialized source paths while mouse hover bindings map contextual tooltips.
* **Temporal Bar Configurations:** Computes vertical volume parameters charting Sector Use and Energy Percentage Share profiles. Clicking individual bars updates global state variables to lock focus on that selected calendar year.
* **Proportional Donut Component:** Generates dynamic arc slices mapping the exact energy mixture matrix belonging to the active year selection.
* **Global Control Filters:** Houses native HTML drop-down element containers linked with a hard reset handle to recalculate and refresh dashboard views instantly.

---

##  Project Workspace Structure
* **`index.html`** - Core DOM canvas layout container.
* **`css/style.css`** - Custom stylesheet layouts and chart sizing mechanics.
* **`js/main.js`** - Central bootstrapping initialization script.
* **`js/state.js`** - Dynamic synchronization tracker state machine.
* **`js/charts.js`** - Modular D3.v7 code definitions for rendering bars, paths, and donuts.
* **`js/data.js`** - Embedded source ONS data literal blocks.
* **`js/d3.v7.min.js`** - Packaged D3 runtime dependency engine.
* **`report/Design_Report.pdf`** - Technical brief outlining evaluation parameters, chart rationale, and application mockups.

---
*Disclaimer: Stored strictly for professional display, computational geometry review, and academic record tracking benchmarks.*

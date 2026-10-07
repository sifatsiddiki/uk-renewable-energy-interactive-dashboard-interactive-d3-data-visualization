/**
 * data.js
 * ---------------------------------------------------------------
 * Embedded CSV datasets and shared constants for the dashboard.
 *
 * WHY EMBEDDED?
 * CSVs are embedded as JavaScript strings so the dashboard runs
 * from a plain file system (file:// URLs) without needing a web
 * server. The stand-alone CSV files inside /data/ are exact copies
 * of the same data and are kept for reference and auditability.
 *
 * SOURCE
 * Office for National Statistics, "Energy use: renewable and waste
 * sources", dataset 1990 to 2023, released 5 June 2025.
 * All values in Mtoe (million tonnes of oil equivalent).
 *
 * NOTES
 * - [low] values in the source workbook are treated as 0.000.
 * - "Bioenergy" in the source-side view groups biogas, biomass
 *   wastes, animal and plant biomass, wood in all forms, charcoal,
 *   and liquid biofuels (bioethanol, biodiesel, SAF), plus a
 *   cross-boundary adjustment. Geothermal (a negligible
 *   contributor) is folded into the Bioenergy residual here for
 *   simplicity.
 * - The sector data is grouped from the 22 SIC-2007 rows into
 *   five higher-level sectors for chart readability.
 * - The sector view uses a different scope from the source-side
 *   view, so the two totals are not directly comparable in the
 *   same year. The dashboard treats the sector chart as a
 *   supporting context panel for that reason.
 * - Share values are reported to one decimal place by ONS.
 * ---------------------------------------------------------------
 */

'use strict';

/* ---- Table 1: renewable sources over time (Mtoe) ---- */
const RAW_TABLE1 = `Year,Hydro,Wind_Wave_Tidal,Solar_PV,Landfill_Gas,Sewage_Gas,Bioenergy,Total
1990,0.448,0.001,0.000,0.080,0.138,1.063,1.730
1991,0.398,0.001,0.000,0.105,0.151,1.061,1.716
1992,0.467,0.003,0.000,0.155,0.151,1.124,1.900
1993,0.370,0.019,0.000,0.162,0.158,1.394,2.103
1994,0.438,0.030,0.000,0.188,0.170,1.635,2.461
1995,0.416,0.034,0.000,0.199,0.193,1.682,2.524
1996,0.292,0.042,0.000,0.249,0.193,1.689,2.465
1997,0.378,0.057,0.000,0.317,0.192,1.527,2.471
1998,0.440,0.075,0.000,0.402,0.181,1.556,2.654
1999,0.459,0.073,0.000,0.572,0.189,1.563,2.856
2000,0.437,0.081,0.000,0.731,0.169,1.464,2.882
2001,0.348,0.083,0.000,0.836,0.168,1.570,3.005
2002,0.412,0.108,0.000,0.892,0.174,1.697,3.283
2003,0.278,0.111,0.000,1.088,0.165,1.877,3.519
2004,0.418,0.166,0.000,1.327,0.177,2.053,4.141
2005,0.423,0.250,0.001,1.421,0.206,2.719,5.020
2006,0.395,0.363,0.001,1.465,0.190,2.976,5.390
2007,0.437,0.453,0.001,1.547,0.211,2.791,5.440
2008,0.442,0.612,0.001,1.554,0.230,3.515,6.354
2009,0.450,0.798,0.002,1.626,0.249,3.770,6.895
2010,0.309,0.884,0.003,1.725,0.295,4.438,7.654
2011,0.489,1.373,0.021,1.758,0.319,4.554,8.514
2012,0.457,1.707,0.116,1.722,0.306,4.874,9.182
2013,0.400,2.442,0.173,1.711,0.320,5.815,10.861
2014,0.510,2.748,0.349,1.664,0.343,7.092,12.706
2015,0.540,3.463,0.648,1.612,0.366,8.539,15.168
2016,0.460,3.195,0.894,1.556,0.387,9.152,15.644
2017,0.506,4.268,0.985,1.419,0.398,9.860,17.436
2018,0.468,4.893,1.089,1.298,0.407,11.502,19.657
2019,0.510,5.489,1.068,0.879,0.323,12.486,20.755
2020,0.591,6.502,1.079,0.849,0.327,12.914,22.262
2021,0.466,5.582,1.043,0.805,0.326,13.507,21.729
2022,0.487,6.925,1.147,0.754,0.316,13.319,22.948
2023,0.476,7.077,1.194,0.729,0.306,13.328,23.110`;

/* ---- Table 2: renewable use by sector (Mtoe) ---- */
const RAW_TABLE2 = `Year,Energy_Supply,Manufacturing,Other_Industry,Services,Agriculture,Total
1990,0.284,0.122,0.434,0.069,0.077,0.986
1991,0.305,0.102,0.444,0.061,0.077,0.989
1992,0.401,0.115,0.427,0.072,0.078,1.093
1993,0.494,0.335,0.363,0.064,0.077,1.333
1994,0.624,0.566,0.316,0.076,0.077,1.659
1995,0.655,0.607,0.314,0.077,0.077,1.730
1996,0.686,0.586,0.303,0.057,0.075,1.707
1997,0.822,0.613,0.095,0.080,0.077,1.687
1998,1.007,0.565,0.090,0.090,0.078,1.830
1999,1.267,0.504,0.092,0.091,0.078,2.032
2000,1.448,0.351,0.088,0.095,0.078,2.060
2001,1.664,0.306,0.089,0.081,0.077,2.217
2002,1.727,0.427,0.117,0.097,0.078,2.446
2003,1.932,0.511,0.114,0.084,0.077,2.718
2004,2.223,0.636,0.156,0.117,0.079,3.211
2005,2.894,0.654,0.183,0.144,0.079,3.954
2006,2.928,0.759,0.208,0.225,0.082,4.202
2007,3.074,0.552,0.197,0.308,0.085,4.216
2008,3.379,0.733,0.259,0.530,0.096,4.997
2009,3.588,0.719,0.269,0.616,0.099,5.291
2010,3.820,0.902,0.307,0.632,0.122,5.783
2011,4.121,1.117,0.372,0.722,0.115,6.447
2012,4.408,1.145,0.403,0.710,0.150,6.816
2013,5.012,1.441,0.514,0.883,0.185,8.035
2014,5.847,1.851,0.669,1.058,0.224,9.649
2015,7.024,2.311,0.868,1.169,0.331,11.703
2016,7.186,2.403,0.950,1.178,0.411,12.128
2017,7.290,2.882,1.226,1.442,0.491,13.331
2018,8.024,3.307,1.401,1.760,0.536,15.028
2019,8.338,3.462,1.404,1.964,0.547,15.715
2020,8.577,3.933,1.506,2.026,0.568,16.610
2021,8.765,3.683,1.632,1.853,0.557,16.490
2022,8.127,4.169,1.815,2.306,0.538,16.955
2023,7.969,4.057,1.777,2.527,0.538,16.868`;

/* ---- Table 3: renewables share of total UK energy (%) ---- */
const RAW_TABLE3 = `Year,Renewable_Mtoe,Total_Energy_Mtoe,Renewables_Pct
1990,1.730,225.741,0.8
1991,1.716,231.263,0.7
1992,1.900,228.706,0.8
1993,2.103,231.619,0.9
1994,2.461,230.765,1.1
1995,2.524,230.895,1.1
1996,2.465,243.313,1.0
1997,2.471,240.599,1.0
1998,2.654,246.157,1.1
1999,2.856,245.784,1.2
2000,2.882,247.782,1.2
2001,3.005,252.601,1.2
2002,3.283,244.865,1.3
2003,3.519,247.942,1.4
2004,4.141,249.190,1.7
2005,5.020,249.989,2.0
2006,5.390,243.960,2.2
2007,5.440,239.183,2.3
2008,6.354,235.456,2.7
2009,6.895,221.136,3.1
2010,7.654,228.209,3.4
2011,8.514,214.661,4.0
2012,9.182,216.800,4.2
2013,10.861,215.296,5.0
2014,12.706,202.981,6.3
2015,15.168,203.094,7.5
2016,15.644,200.733,7.8
2017,17.436,196.758,8.9
2018,19.657,197.130,10.0
2019,20.755,190.446,10.9
2020,22.262,171.168,13.0
2021,21.729,174.197,12.5
2022,22.948,171.870,13.4
2023,23.110,164.843,14.0`;

/* ---- Parsed tables ---- */
const TABLE1 = d3.csvParse(RAW_TABLE1, d3.autoType);
const TABLE2 = d3.csvParse(RAW_TABLE2, d3.autoType);
const TABLE3 = d3.csvParse(RAW_TABLE3, d3.autoType);

/* ---- Constants: source and sector keys, labels, colours ---- */
const SRC_KEYS = [
  'Bioenergy', 'Wind_Wave_Tidal', 'Solar_PV',
  'Landfill_Gas', 'Hydro', 'Sewage_Gas'
];

const SRC_LBL = {
  Hydro:           'Hydro',
  Wind_Wave_Tidal: 'Wind, Wave & Tidal',
  Solar_PV:        'Solar PV',
  Landfill_Gas:    'Landfill Gas',
  Sewage_Gas:      'Sewage Gas',
  Bioenergy:       'Bioenergy'
};

/* Shorter labels used when tile space is tight (treemap small tiles). */
const SRC_SHORT = {
  Hydro:           'Hydro',
  Wind_Wave_Tidal: 'Wind',
  Solar_PV:        'Solar',
  Landfill_Gas:    'Landfill',
  Sewage_Gas:      'Sewage',
  Bioenergy:       'Bioenergy'
};

const SEC_KEYS = ['Energy_Supply', 'Manufacturing', 'Other_Industry', 'Services', 'Agriculture'];
const SEC_LBL  = {
  Energy_Supply:  'Energy Supply (SIC D)',
  Manufacturing:  'Manufacturing (SIC C)',
  Other_Industry: 'Other Industry (SIC B+E+F)',
  Services:       'Services (SIC G-M)',
  Agriculture:    'Agriculture (SIC A)'
};

/* Colour-blind-aware palette. Bioenergy green (dominant source),
   wind blue (second dominant), solar amber for intuitive mapping. */
const SRC_COLORS = {
  Bioenergy:       '#2e7d32',
  Wind_Wave_Tidal: '#1565c0',
  Solar_PV:        '#f9a825',
  Landfill_Gas:    '#6d4c41',
  Hydro:           '#0097a7',
  Sewage_Gas:      '#7b1fa2'
};

const SEC_COLORS = {
  Energy_Supply:  '#003c57',
  Manufacturing:  '#e65100',
  Other_Industry: '#2e7d32',
  Services:       '#6a1b9a',
  Agriculture:    '#f57f17'
};

function COLOR(key) {
  return SRC_COLORS[key] || SEC_COLORS[key] || '#999';
}

/* ---- Derived constants ---- */
const FIRST_YEAR = TABLE1[0].Year;
const LAST_YEAR  = TABLE1[TABLE1.length - 1].Year;

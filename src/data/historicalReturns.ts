export interface HistoricalSequencePreset {
  id: string;
  name: string;
  yearsRange: string;
  description: string;
  avgStockReturn: number;
  avgBondReturn: number;
  avgInflation: number;
  // Year-by-year array of { stockReturn: %, bondReturn: %, inflationRate: % }
  data: Array<{ year: number; stock: number; bond: number; inflation: number }>;
}

export const HISTORICAL_PRESETS: HistoricalSequencePreset[] = [
  {
    id: 'stagflation_1970s',
    name: '1970s Stagflation & Volatility',
    yearsRange: '1969 – 1982',
    description: 'High inflation spikes (up to 13.5%) paired with volatile stock market returns. Tests portfolio inflation resistance.',
    avgStockReturn: 6.8,
    avgBondReturn: 6.2,
    avgInflation: 7.8,
    data: [
      { year: 1969, stock: -8.5, bond: -5.1, inflation: 5.5 },
      { year: 1970, stock: 4.0, bond: 16.8, inflation: 5.7 },
      { year: 1971, stock: 14.3, bond: 9.8, inflation: 4.4 },
      { year: 1972, stock: 18.9, bond: 2.8, inflation: 3.2 },
      { year: 1973, stock: -14.7, bond: 3.7, inflation: 6.2 },
      { year: 1974, stock: -26.5, bond: 4.4, inflation: 11.0 },
      { year: 1975, stock: 37.2, bond: 9.2, inflation: 9.1 },
      { year: 1976, stock: 23.8, bond: 15.6, inflation: 5.8 },
      { year: 1977, stock: -7.2, bond: 1.3, inflation: 6.5 },
      { year: 1978, stock: 6.5, bond: -1.2, inflation: 7.6 },
      { year: 1979, stock: 18.4, bond: 0.7, inflation: 11.3 },
      { year: 1980, stock: 32.4, bond: -3.0, inflation: 13.5 },
      { year: 1981, stock: -4.9, bond: 8.2, inflation: 10.3 },
      { year: 1982, stock: 21.5, bond: 32.8, inflation: 6.2 },
    ]
  },
  {
    id: 'dotcom_2000s',
    name: '2000s "Lost Decade" (Dot-Com + 2008 Crash)',
    yearsRange: '2000 – 2011',
    description: 'Severe sequence-of-returns risk: two major market crashes (-45% tech burst, -37% GFC) within 8 years.',
    avgStockReturn: 1.4,
    avgBondReturn: 6.4,
    avgInflation: 2.5,
    data: [
      { year: 2000, stock: -9.1, bond: 11.6, inflation: 3.4 },
      { year: 2001, stock: -11.9, bond: 8.4, inflation: 2.8 },
      { year: 2002, stock: -22.1, bond: 15.1, inflation: 1.6 },
      { year: 2003, stock: 28.7, bond: 0.4, inflation: 2.3 },
      { year: 2004, stock: 10.9, bond: 4.5, inflation: 2.7 },
      { year: 2005, stock: 4.9, bond: 2.9, inflation: 3.4 },
      { year: 2006, stock: 15.8, bond: 2.0, inflation: 3.2 },
      { year: 2007, stock: 5.5, bond: 10.2, inflation: 2.8 },
      { year: 2008, stock: -37.0, bond: 20.1, inflation: 3.8 },
      { year: 2009, stock: 26.5, bond: -11.1, inflation: -0.4 },
      { year: 2010, stock: 15.1, bond: 8.5, inflation: 1.6 },
      { year: 2011, stock: 2.1, bond: 16.0, inflation: 3.2 },
    ]
  },
  {
    id: 'bull_1990s',
    name: '1990s Tech Boom & Low Inflation',
    yearsRange: '1990 – 1999',
    description: 'Exceptional equity expansion with low, stable inflation. Outstanding wealth creation period.',
    avgStockReturn: 18.2,
    avgBondReturn: 7.7,
    avgInflation: 3.0,
    data: [
      { year: 1990, stock: -3.1, bond: 9.0, inflation: 5.4 },
      { year: 1991, stock: 30.5, bond: 15.0, inflation: 4.2 },
      { year: 1992, stock: 7.6, bond: 9.4, inflation: 3.0 },
      { year: 1993, stock: 10.1, bond: 14.2, inflation: 3.0 },
      { year: 1994, stock: 1.3, bond: -8.0, inflation: 2.6 },
      { year: 1995, stock: 37.6, bond: 23.5, inflation: 2.8 },
      { year: 1996, stock: 23.0, bond: 1.4, inflation: 2.9 },
      { year: 1997, stock: 33.4, bond: 9.9, inflation: 2.3 },
      { year: 1998, stock: 28.6, bond: 14.9, inflation: 1.6 },
      { year: 1999, stock: 21.0, bond: -8.3, inflation: 2.2 },
    ]
  },
  {
    id: 'recent_2020s',
    name: '2020s Pandemic & Inflation Spike',
    yearsRange: '2020 – 2024',
    description: 'Pandemic stimulus rally (+18%), 2022 rate hike crash (-18%), followed by AI market rebound.',
    avgStockReturn: 12.5,
    avgBondReturn: -1.5,
    avgInflation: 4.1,
    data: [
      { year: 2020, stock: 18.4, bond: 11.3, inflation: 1.4 },
      { year: 2021, stock: 28.7, bond: -1.5, inflation: 7.0 },
      { year: 2022, stock: -18.1, bond: -13.0, inflation: 6.5 },
      { year: 2023, stock: 26.3, bond: 5.5, inflation: 3.4 },
      { year: 2024, stock: 15.0, bond: 2.0, inflation: 2.9 },
    ]
  }
];

// Long-Term Historical Asset Class Parameters (1928 - 2024) for Stochastic Monte Carlo
export const MONTE_CARLO_STATS = {
  stock: { mean: 0.098, stdev: 0.165 },
  bond: { mean: 0.048, stdev: 0.065 },
  cash: { mean: 0.025, stdev: 0.018 },
  inflation: { mean: 0.031, stdev: 0.022 },
};

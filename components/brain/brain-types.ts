export type BrainStats = {
  totalEntries: number;
  factsCount: number;
  episodesCount: number;
  averageConfidence: number;
};

export type BrainSettings = {
  ingestionEnabled: boolean;
  ingestionIntervalMinutes: number;
  reinforcementEnabled: boolean;
  reinforcementIntervalHours: number;
  lastIngestionRun: Date | null;
  lastReinforcementRun: Date | null;
};

export type BrainEntry = {
  id: string;
  type: string;
  category: string;
  summary: string;
  confidence: number;
  reinforcementCount: number;
  createdAt: Date;
  tags: string[] | null;
};

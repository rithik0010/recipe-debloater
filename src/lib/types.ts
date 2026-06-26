export interface Ingredient {
  item: string;
  amount: string;
  unit: string;
  notes?: string;
}

export interface Instruction {
  step: number;
  text: string;
  tip?: string;
}

export interface Recipe {
  id?: string;
  title: string;
  description?: string;
  ingredients: Ingredient[];
  instructions: Instruction[];
  prep_time?: number;
  cook_time?: number;
  total_time?: number;
  servings?: number;
  cuisine?: string;
  diet?: string[];
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  tags?: string[];
  image_url?: string;
  source_url: string;
  source_platform?: 'youtube' | 'website' | 'other';
  video_duration?: number;
  created_at?: string;
  user_id?: string;
}

export interface ExtractionResult {
  success: boolean;
  recipe?: Recipe;
  fromCache?: boolean;
  error?: string;
}

export type UrlType = 'youtube' | 'video' | 'website';

export interface Provider {
  name: string;
  url: string;
  key: string | undefined;
  model: string;
  dailyLimit: number;
}

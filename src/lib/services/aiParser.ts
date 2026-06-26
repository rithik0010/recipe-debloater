import { Recipe } from '@/lib/types';
import { callFreeLLM } from './aiRouter';

const RECIPE_SYSTEM_PROMPT = `You are a recipe extraction specialist. Your ONLY job is to extract the clean recipe from the provided content and return it as strict JSON. 

Rules:
1. Remove ALL non-recipe content: introductions, life stories, ads, sponsorships, "like and subscribe", product recommendations, affiliate links, FAQ sections, nutritional rants.
2. Keep ONLY: recipe title, ingredients (with exact amounts and units), step-by-step instructions, times, servings, cuisine type.
3. Standardize units (tbsp, tsp, cups, oz, lbs, ml, g, kg).
4. If an amount is vague (e.g., "a handful"), make a reasonable estimate and note it.
5. Return ONLY valid JSON. No markdown. No explanation. No code block.`;

const RECIPE_JSON_SCHEMA = `{
  "title": "string — the recipe name",
  "description": "string — 1-2 sentence description (optional)",
  "ingredients": [
    { "item": "string", "amount": "string", "unit": "string", "notes": "string (optional)" }
  ],
  "instructions": [
    { "step": number, "text": "string — clear instruction", "tip": "string (optional)" }
  ],
  "prep_time": number (minutes, or null),
  "cook_time": number (minutes, or null),
  "total_time": number (minutes, or null),
  "servings": number (or null),
  "cuisine": "string (e.g. Italian, Mexican, etc.)",
  "difficulty": "Easy" | "Medium" | "Hard",
  "diet": ["Vegetarian", "Vegan", "Gluten-Free", "Dairy-Free", "Keto", "Paleo"] (only include applicable tags),
  "tags": ["string"] (3-5 relevant search tags)
}`;

export async function parseRecipeFromText(
  content: string,
  sourceType: 'website' | 'video',
  title?: string
): Promise<Recipe> {
  const prompt = `Extract the recipe from this ${sourceType === 'video' ? 'video transcript' : 'website content'}.

${title ? `SOURCE TITLE: ${title}\n\n` : ''}CONTENT:
${content.slice(0, 12000)}

Return ONLY this JSON schema (no other text):
${RECIPE_JSON_SCHEMA}`;

  const responseText = await callFreeLLM(RECIPE_SYSTEM_PROMPT, prompt);

  // Extract JSON from response (handle cases where model adds markdown fences)
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('AI returned non-JSON response');
  }

  let recipe: Partial<Recipe>;
  try {
    recipe = JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error('Failed to parse AI JSON response');
  }

  // Validate required fields
  if (!recipe.title || !recipe.ingredients || !recipe.instructions) {
    throw new Error('AI response missing required recipe fields (title, ingredients, instructions)');
  }

  // Ensure ingredients and instructions are arrays
  if (!Array.isArray(recipe.ingredients) || recipe.ingredients.length === 0) {
    throw new Error('No ingredients found in recipe');
  }
  if (!Array.isArray(recipe.instructions) || recipe.instructions.length === 0) {
    throw new Error('No instructions found in recipe');
  }

  return recipe as Recipe;
}

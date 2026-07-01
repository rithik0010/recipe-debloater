// popup.js — Chrome Extension Popup Logic

const API_BASE = 'https://recipe-debloater.vercel.app'; // change to localhost:3000 for dev

// ─── DOM References ───────────────────────────────────────────────────────────
const currentUrlEl = document.getElementById('current-url');
const urlIconEl    = document.getElementById('url-icon');
const extractBtn   = document.getElementById('extract-btn');
const btnIcon      = document.getElementById('btn-icon');
const btnText      = document.getElementById('btn-text');
const statusArea   = document.getElementById('status-area');
const statusContent = document.getElementById('status-content');
const recipePreview = document.getElementById('recipe-preview');
const recipeTitleEl = document.getElementById('recipe-title');
const recipeMetaEl  = document.getElementById('recipe-meta');
const ingredientsList = document.getElementById('ingredients-list');
const stepsList    = document.getElementById('steps-list');
const openFullBtn  = document.getElementById('open-full');
const openDashboard = document.getElementById('open-dashboard');

let currentUrl = '';

// ─── Init ─────────────────────────────────────────────────────────────────────
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const tab = tabs[0];
  currentUrl = tab?.url || '';

  if (currentUrlEl) {
    currentUrlEl.textContent = currentUrl || 'Unknown page';
  }

  // Detect URL type for icon
  if (urlIconEl) {
    if (currentUrl.includes('youtube.com') || currentUrl.includes('youtu.be')) {
      urlIconEl.textContent = '▶️';
    } else if (currentUrl.includes('tiktok.com')) {
      urlIconEl.textContent = '🎵';
    } else if (currentUrl.startsWith('http')) {
      urlIconEl.textContent = '🌐';
    }
  }

  // Enable button only for valid HTTP URLs
  if (extractBtn && currentUrl.startsWith('http')) {
    extractBtn.removeAttribute('disabled');
  }
});

// ─── Open Dashboard ───────────────────────────────────────────────────────────
openDashboard?.addEventListener('click', () => {
  chrome.tabs.create({ url: `${API_BASE}/dashboard` });
  window.close();
});

// ─── Extract Button ───────────────────────────────────────────────────────────
extractBtn?.addEventListener('click', async () => {
  if (!currentUrl) return;
  setLoading(true);
  hideRecipe();
  showStatus('loading', '🤖 Extracting recipe...');

  // Check cache in chrome.storage
  const cached = await getCachedRecipe(currentUrl);
  if (cached) {
    setLoading(false);
    showStatus('success', '⚡ From cache!');
    displayRecipe(cached);
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/extract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: currentUrl }),
    });

    const data = await res.json();

    if (!data.success || !data.recipe) {
      throw new Error(data.error || 'Extraction failed');
    }

    setLoading(false);
    showStatus('success', `✅ Recipe extracted!${data.fromCache ? ' (cached)' : ''}`);
    displayRecipe(data.recipe);
    await cacheRecipe(currentUrl, data.recipe);

  } catch (err) {
    setLoading(false);
    const msg = err instanceof Error ? err.message : 'Something went wrong';
    showStatus('error', `⚠️ ${msg}`);
  }
});

// ─── UI Helpers ───────────────────────────────────────────────────────────────

function setLoading(loading) {
  if (!extractBtn || !btnIcon || !btnText) return;
  extractBtn.disabled = loading;

  if (loading) {
    btnIcon.outerHTML = '<div class="spinner" id="btn-icon"></div>';
    btnText.textContent = 'Extracting...';
  } else {
    const spinner = document.querySelector('.spinner');
    if (spinner) spinner.outerHTML = '<span id="btn-icon">✨</span>';
    btnText.textContent = 'De-Bloat Recipe';
  }
}

function showStatus(type, message) {
  if (!statusArea || !statusContent) return;
  statusArea.classList.remove('hidden');
  statusContent.className = `status-${type}`;
  statusContent.textContent = message;
}

function hideRecipe() {
  recipePreview?.classList.add('hidden');
}

function displayRecipe(recipe) {
  if (!recipePreview || !recipeTitleEl || !recipeMetaEl || !ingredientsList || !stepsList) return;

  recipeTitleEl.textContent = recipe.title;

  // Meta row
  const meta = [];
  if (recipe.total_time) meta.push(`⏱ ${formatTime(recipe.total_time)}`);
  if (recipe.servings) meta.push(`👤 ${recipe.servings} servings`);
  if (recipe.cuisine) meta.push(`🌍 ${recipe.cuisine}`);
  reMetaEl.textContent = meta.join('  ·  ');

  // Open full link
  if (openFullBtn) {
    const id = recipe.id;
    openFullBtn.href = id ? `${API_BASE}/recipe/${id}` : `${API_BASE}/dashboard`;
  }

  // Ingredients (max 8 in popup)
  ingredientsList.innerHTML = '';
  recipe.ingredients.slice(0, 8).forEach((ing) => {
    const li = document.createElement('li');
    li.textContent = `${ing.amount} ${ing.unit} ${ing.item}`;
    ingredientsList.appendChild(li);
  });
  if (recipe.ingredients.length > 8) {
    const li = document.createElement('li');
    li.textContent = `+ ${recipe.ingredients.length - 8} more...`;
    li.style.color = '#475569';
    ingredientsList.appendChild(li);
  }

  // Steps (max 4 in popup)
  stepsList.innerHTML = '';
  recipe.instructions.slice(0, 4).forEach((inst) => {
    const li = document.createElement('li');
    li.textContent = inst.text;
    stepsList.appendChild(li);
  });
  if (recipe.instructions.length > 4) {
    const li = document.createElement('li');
    li.textContent = `+ ${recipe.instructions.length - 4} more steps...`;
    li.style.color = '#475569';
    stepsList.appendChild(li);
  }

  recipePreview.classList.remove('hidden');
}

function formatTime(minutes) {
  if (!minutes) return null;
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// Fix typo
const reMetaEl = document.getElementById('recipe-meta');

// ─── Local Cache (chrome.storage.local) ──────────────────────────────────────
async function getCachedRecipe(url) {
  return new Promise((resolve) => {
    const key = `recipe:${url}`;
    chrome.storage.local.get(key, (result) => {
      const item = result[key];
      if (!item) return resolve(null);
      // 7-day TTL
      if (Date.now() - item.timestamp > 7 * 24 * 60 * 60 * 1000) {
        chrome.storage.local.remove(key);
        return resolve(null);
      }
      resolve(item.recipe);
    });
  });
}

async function cacheRecipe(url, recipe) {
  return new Promise((resolve) => {
    const key = `recipe:${url}`;
    chrome.storage.local.set({ [key]: { recipe, timestamp: Date.now() } }, resolve);
  });
}

// content.js — Injects floating "De-Bloat Recipe" button on recipe pages

(function () {
  'use strict';

  // Don't inject twice
  if (document.getElementById('rdb-btn')) return;

  const API_BASE = 'https://recipe-debloater.vercel.app';

  // ─── Create floating button ─────────────────────────────────────────────
  const btn = document.createElement('button');
  btn.id = 'rdb-btn';
  btn.innerHTML = '🍳 De-Bloat Recipe';
  btn.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 999999;
    background: linear-gradient(135deg, #f97316, #ef4444);
    color: white;
    border: none;
    border-radius: 50px;
    padding: 14px 22px;
    font-size: 14px;
    font-weight: 700;
    font-family: system-ui, -apple-system, sans-serif;
    cursor: pointer;
    box-shadow: 0 6px 30px rgba(249, 115, 22, 0.4);
    display: flex;
    align-items: center;
    gap: 8px;
    transition: all 0.2s;
    letter-spacing: -0.01em;
  `;

  btn.addEventListener('mouseover', () => {
    btn.style.transform = 'translateY(-2px)';
    btn.style.boxShadow = '0 10px 40px rgba(249, 115, 22, 0.5)';
  });
  btn.addEventListener('mouseout', () => {
    btn.style.transform = '';
    btn.style.boxShadow = '0 6px 30px rgba(249, 115, 22, 0.4)';
  });

  // ─── Create overlay modal ────────────────────────────────────────────────
  const overlay = document.createElement('div');
  overlay.id = 'rdb-overlay';
  overlay.style.cssText = `
    display: none;
    position: fixed;
    inset: 0;
    z-index: 9999999;
    background: rgba(0,0,0,0.8);
    backdrop-filter: blur(8px);
    align-items: center;
    justify-content: center;
    padding: 20px;
  `;

  const modal = document.createElement('div');
  modal.style.cssText = `
    background: #0d1420;
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 20px;
    width: 100%;
    max-width: 700px;
    max-height: 90vh;
    overflow-y: auto;
    padding: 32px;
    position: relative;
    box-shadow: 0 25px 60px rgba(0,0,0,0.8);
  `;

  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '✕';
  closeBtn.style.cssText = `
    position: absolute;
    top: 16px;
    right: 16px;
    background: rgba(255,255,255,0.08);
    border: none;
    border-radius: 8px;
    color: #94a3b8;
    font-size: 16px;
    cursor: pointer;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
  `;
  closeBtn.addEventListener('click', closeModal);

  const modalContent = document.createElement('div');
  modalContent.id = 'rdb-modal-content';

  modal.appendChild(closeBtn);
  modal.appendChild(modalContent);
  overlay.appendChild(modal);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

  document.body.appendChild(btn);
  document.body.appendChild(overlay);

  // ─── Button click handler ────────────────────────────────────────────────
  btn.addEventListener('click', async () => {
    showModal();
    setModalContent(loadingHTML());

    const url = window.location.href;

    try {
      const res = await fetch(`${API_BASE}/api/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const data = await res.json();

      if (!data.success || !data.recipe) {
        setModalContent(errorHTML(data.error || 'Extraction failed'));
        return;
      }

      setModalContent(recipeHTML(data.recipe));
    } catch (err) {
      setModalContent(errorHTML(err.message || 'Network error'));
    }
  });

  // ─── Modal helpers ───────────────────────────────────────────────────────
  function showModal() {
    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    overlay.style.display = 'none';
    document.body.style.overflow = '';
  }

  function setModalContent(html) {
    modalContent.innerHTML = html;
  }

  // ─── HTML templates ──────────────────────────────────────────────────────
  function loadingHTML() {
    return `
      <div style="text-align:center; padding: 60px 20px; color: #94a3b8;">
        <div style="font-size: 40px; margin-bottom: 16px;">🤖</div>
        <h3 style="font-size: 18px; font-weight: 700; color: #f1f5f9; margin-bottom: 8px;">
          Extracting Recipe...
        </h3>
        <p style="font-size: 14px;">AI is stripping ads and fluff. Just a moment.</p>
        <div style="margin-top: 20px; width: 40px; height: 40px; border: 3px solid rgba(255,255,255,0.1);
             border-top-color: #f97316; border-radius: 50%; animation: rdb-spin 0.8s linear infinite;
             margin: 20px auto 0;"></div>
      </div>
      <style>@keyframes rdb-spin { to { transform: rotate(360deg); } }</style>
    `;
  }

  function errorHTML(message) {
    return `
      <div style="text-align:center; padding: 40px 20px; color: #f87171;">
        <div style="font-size: 40px; margin-bottom: 16px;">⚠️</div>
        <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 12px; color: #f1f5f9;">Extraction Failed</h3>
        <p style="font-size: 14px; color: #94a3b8;">${message}</p>
        <a href="${API_BASE}/dashboard" target="_blank"
           style="display: inline-block; margin-top: 20px; padding: 10px 24px;
                  background: linear-gradient(135deg, #f97316, #ef4444);
                  color: white; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 13px;">
          Try in Dashboard →
        </a>
      </div>
    `;
  }

  function recipeHTML(recipe) {
    const totalTime = recipe.total_time || (recipe.prep_time || 0) + (recipe.cook_time || 0);
    const formatTime = (m) => {
      if (!m) return null;
      if (m < 60) return `${m}m`;
      const h = Math.floor(m / 60);
      const min = m % 60;
      return min > 0 ? `${h}h ${min}m` : `${h}h`;
    };

    return `
      <div style="color: #f1f5f9; font-family: system-ui, sans-serif;">
        <div style="background: linear-gradient(135deg, #f97316, #ef4444); height: 3px; border-radius: 2px; margin-bottom: 24px;"></div>
        <h2 style="font-size: clamp(1.2rem, 3vw, 1.6rem); font-weight: 800; margin-bottom: 16px; line-height: 1.3;">
          ${recipe.title}
        </h2>
        ${recipe.description ? `<p style="color:#94a3b8; font-size:14px; margin-bottom:16px; line-height:1.6;">${recipe.description}</p>` : ''}

        <div style="display:flex; gap:16px; flex-wrap:wrap; font-size:13px; color:#64748b; margin-bottom:20px;">
          ${totalTime ? `<span>⏱ ${formatTime(totalTime)}</span>` : ''}
          ${recipe.servings ? `<span>👤 ${recipe.servings} servings</span>` : ''}
          ${recipe.cuisine ? `<span>🌍 ${recipe.cuisine}</span>` : ''}
          ${recipe.difficulty ? `<span>📊 ${recipe.difficulty}</span>` : ''}
        </div>

        <div style="display:grid; grid-template-columns: 1fr 2fr; gap:20px;">
          <div>
            <h3 style="font-size:13px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.06em; margin-bottom:12px;">
              🧂 Ingredients
            </h3>
            <ul style="list-style:none;">
              ${recipe.ingredients.map(i => `
                <li style="display:flex; gap:6px; font-size:13px; color:#94a3b8; padding: 5px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
                  <span style="color:#f97316; flex-shrink:0;">•</span>
                  <span><strong style="color:#f1f5f9;">${i.amount} ${i.unit}</strong> ${i.item}</span>
                </li>
              `).join('')}
            </ul>
          </div>

          <div>
            <h3 style="font-size:13px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.06em; margin-bottom:12px;">
              📋 Instructions
            </h3>
            ${recipe.instructions.map(s => `
              <div style="display:flex; gap:12px; margin-bottom:12px;">
                <div style="width:24px; height:24px; min-width:24px; background:linear-gradient(135deg,#f97316,#ef4444);
                     border-radius:50%; display:flex; align-items:center; justify-content:center;
                     font-size:11px; font-weight:700; color:white; margin-top:2px;">
                  ${s.step}
                </div>
                <p style="font-size:13px; color:#94a3b8; line-height:1.6; flex:1;">${s.text}</p>
              </div>
            `).join('')}
          </div>
        </div>

        <div style="display:flex; gap:10px; margin-top:24px; flex-wrap:wrap;">
          <a href="${API_BASE}/dashboard" target="_blank"
             style="display:inline-flex; align-items:center; gap:6px; padding:10px 20px;
                    background:linear-gradient(135deg,#f97316,#ef4444); color:white;
                    border-radius:8px; text-decoration:none; font-weight:700; font-size:13px;">
            💾 Save to Library
          </a>
          <button onclick="navigator.clipboard.writeText(${JSON.stringify(
            recipe.ingredients.map(i => `${i.amount} ${i.unit} ${i.item}`).join('\n')
          )}); this.textContent='✅ Copied!';"
            style="padding:10px 20px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1);
                   border-radius:8px; color:#f1f5f9; cursor:pointer; font-size:13px; font-weight:600;">
            📋 Copy Ingredients
          </button>
        </div>
      </div>
    `;
  }
})();

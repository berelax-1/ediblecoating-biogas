/* app.js — logika interaksi dan simulasi
   Pastikan file ini bernama persis "app.js" dan ada di folder yang sama dengan index.html
*/
(function () {
  // --- Tab navigation ---
  const navBtns = document.querySelectorAll('.nav-btn');
  const panels = document.querySelectorAll('[data-panel]');
  function switchTab(tab) {
    navBtns.forEach(b => {
      const isActive = b.dataset.tab === tab;
      b.classList.toggle('active', isActive);
      b.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
    panels.forEach(p => {
      p.hidden = p.id !== 'panel-' + tab;
    });
    // focus first input in opened panel
    const panel = document.getElementById('panel-' + tab);
    if (panel) {
      const first = panel.querySelector('input,select,button,textarea');
      if (first) setTimeout(() => first.focus(), 80);
    }
  }
  navBtns.forEach(b => b.addEventListener('click', () => switchTab(b.dataset.tab)));
  switchTab('edu');

  // --- Stepper ---
  const stepBtns = document.querySelectorAll('.step-btn');
  const stepPanels = document.querySelectorAll('.step-panel');
  stepBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const step = btn.dataset.step;
      stepBtns.forEach(b => b.classList.toggle('active', b === btn));
      stepPanels.forEach(p => p.hidden = p.dataset.step !== step);
    });
  });

  // --- Spray simulation ---
  const processLog = document.getElementById('processLog');
  const hasilArea = document.getElementById('hasilArea');
  const startProcessBtn = document.getElementById('startProcess');

  function simulateProcess(data) {
    // basic deterministic heuristic simulation
    const density = 1; // g/mL
    const vol = Number(data.volume) || 0;
    const solidsPerItem_g = vol * density * (Number(data.konc) / 100);
    const methodFactor = { spray: 0.9, dip: 1.0, brush: 0.7 }[data.method] || 0.8;
    const coatingFactor = { pektin: 0.9, kitosan: 1.05, wax: 1.1 }[data.coating] || 1.0;
    const baseShelf = { apel: 14, pisang: 7, tomat: 10, keju: 21 }[data.objek] || 7;
    const extension = Math.max(0, Math.round(baseShelf * (0.1 + 0.9 * methodFactor * coatingFactor * (Number(data.konc) / 100))));
    return {
      objek: data.objek,
      coating: data.coating,
      volume_mL: vol,
      solids_g: Math.round(solidsPerItem_g * 100) / 100,
      est_extension_days: extension,
      note: `Metode ${data.method}, konsentrasi ${data.konc}% → estimasi +${extension} hari`
    };
  }

  startProcessBtn.addEventListener('click', () => {
    const payload = {
      objek: document.getElementById('objek').value,
      coating: document.getElementById('coating').value,
      konc: document.getElementById('konc').value,
      volume: document.getElementById('volume').value,
      method: document.getElementById('method').value
    };
    const res = simulateProcess(payload);
    processLog.innerHTML = `
      <strong>Hasil simulasi:</strong><br>
      Objek: ${res.objek}<br>
      Coating: ${res.coating}<br>
      Volume per item: ${res.volume_mL} mL<br>
      Solids deposit: ${res.solids_g} g<br>
      Estimasi perpanjangan umur simpan: ${res.est_extension_days} hari
      <div style="margin-top:8px; font-size:13px; color:#475569">Catatan: angka perkiraan, butuh uji lab.</div>
    `;
    hasilArea.innerHTML = `<h3>Ringkasan</h3><pre>${JSON.stringify(res, null, 2)}</pre>`;
    window.lastSimulation = { time: new Date().toISOString(), data: res };
    // switch to hasil tab so user sees results
    document.querySelector('.nav-btn[data-tab="hasil"]').click();
  });

  // --- Biogas estimator ---
  const biogasResult = document.getElementById('biogasResult');
  const calcBiogasBtn = document.getElementById('calcBiogas');

  function estimateBiogas(type, kg) {
    const yieldMap = { food: 0.3, manure: 0.25, green: 0.18 };
    const vsMap = { food: 0.9, manure: 0.8, green: 0.6 };
    const yieldPerKg = yieldMap[type] || 0.2;
    const vs = vsMap[type] || 0.7;
    const totalVS = Number(kg) * vs;
    const methane = Math.round(totalVS * yieldPerKg * 100) / 100;
    const biogas = Math.round((methane / 0.6) * 100) / 100;
    const energy = Math.round(methane * 10 * 100) / 100; // approx kWh
    return { totalVS, methane, biogas, energy };
  }

  calcBiogasBtn.addEventListener('click', () => {
    const type = document.getElementById('wasteType').value;
    const kg = Number(document.getElementById('wasteKg').value) || 0;
    const days = Number(document.getElementById('retention').value) || 0;
    const res = estimateBiogas(type, kg);
    biogasResult.innerHTML = `
      <strong>Estimasi Biogas</strong><br>
      Input: ${kg} kg (${Math.round(res.totalVS * 100) / 100} kg VS)<br>
      Metana (CH₄) ≈ <strong>${res.methane} m³</strong><br>
      Total biogas ≈ <strong>${res.biogas} m³</strong><br>
      Energi teoretis ≈ <strong>${res.energy} kWh</strong>
      <div style="margin-top:8px; font-size:13px; color:#475569">Catatan: perkiraan kasar; hasil nyata tergantung suhu, pH, desain reaktor.</div>
    `;
    window.lastBiogas = { time: new Date().toISOString(), data: { type, kg, days, ...res } };
    // switch to biogas tab so user sees results
    document.querySelector('.nav-btn[data-tab="biogas"]').click();
  });

  // --- Export / Clear ---
  document.getElementById('exportBtn').addEventListener('click', () => {
    const payload = { simulation: window.lastSimulation || null, biogas: window.lastBiogas || null };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ediblecoating_biogas_result.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  document.getElementById('clearBtn').addEventListener('click', () => {
    processLog.innerHTML = 'Belum ada proses.';
    hasilArea.innerHTML = 'Hasil simulasi akan muncul di sini.';
    biogasResult.innerHTML = 'Belum dihitung.';
    window.lastSimulation = null;
    window.lastBiogas = null;
    // go back to edukasi
    document.querySelector('.nav-btn[data-tab="edu"]').click();
  });

  // --- Keyboard shortcuts (1..5) ---
  document.addEventListener('keydown', (e) => {
    if (e.key === '1') document.querySelector('.nav-btn[data-tab="edu"]').click();
    if (e.key === '2') document.querySelector('.nav-btn[data-tab="step"]').click();
    if (e.key === '3') document.querySelector('.nav-btn[data-tab="proc"]').click();
    if (e.key === '4') document.querySelector('.nav-btn[data-tab="hasil"]').click();
    if (e.key === '5') document.querySelector('.nav-btn[data-tab="biogas"]').click();
  });

})();

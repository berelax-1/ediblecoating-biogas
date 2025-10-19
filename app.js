// app.js — interaksi UI & logika simulasi
(function(){
  // ---------- Tab navigation ----------
  const navBtns = document.querySelectorAll('.nav-btn');
  const panels = document.querySelectorAll('[data-panel]');
  function switchTab(tab){
    navBtns.forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    panels.forEach(p => p.hidden = p.id !== 'panel-' + tab);
    // autofocus improvement: focus first input in panel if exists
    const panel = document.getElementById('panel-' + tab);
    if(panel){
      const autofocusEl = panel.querySelector('input,select,textarea,button');
      if(autofocusEl) setTimeout(()=>autofocusEl.focus(), 80);
    }
  }
  navBtns.forEach(b => b.addEventListener('click', ()=> switchTab(b.dataset.tab)));
  // initial
  switchTab('edu');

  // ---------- Stepper ----------
  const stepBtns = document.querySelectorAll('.step-btn');
  const stepPanels = document.querySelectorAll('.step-panel');
  stepBtns.forEach(btn=>{
    btn.addEventListener('click', ()=>{
      stepBtns.forEach(b=>b.classList.toggle('active', b===btn));
      stepPanels.forEach(p=> p.hidden = p.dataset.step !== btn.dataset.step);
    });
  });

  // ---------- Spray simulation ----------
  const sprayForm = document.getElementById('sprayForm');
  const processLog = document.getElementById('processLog');
  const hasilArea = document.getElementById('hasilArea');

  function simulateProcess(data){
    // deterministic simple sim
    const density = 1; // g/mL
    const vol = Number(data.volume);
    const massPerItem_g = vol * density;
    const conc = Number(data.konc)/100;
    const solidsPerItem_g = massPerItem_g * conc;
    const methodFactor = {spray:0.9, dip:1.0, brush:0.7}[data.method] || 0.8;
    const coatingFactor = {pektin:0.9, kitosan:1.05, wax:1.1}[data.coating] || 1.0;
    const baseShelf = {apel:14, pisang:7, tomat:10, keju:21}[data.objek] || 7;
    const extension = Math.max(0, Math.round(baseShelf * (0.1 + 0.9 * methodFactor * coatingFactor * conc)));
    return {
      objek: data.objek,
      coating: data.coating,
      volume_mL: vol,
      solids_g: Math.round(solidsPerItem_g * 100) / 100,
      est_extension_days: extension,
      note: `Metode ${data.method}, konsentrasi ${data.konc}% → estimasi +${extension} hari`
    };
  }

  document.getElementById('startProcess').addEventListener('click', ()=>{
    const payload = {
      objek: document.getElementById('objek').value,
      coating: document.getElementById('coating').value,
      konc: document.getElementById('konc').value,
      volume: document.getElementById('volume').value,
      method: document.getElementById('method').value
    };
    const res = simulateProcess(payload);
    const html = `
      <strong>Hasil simulasi:</strong><br>
      Objek: ${res.objek}<br>
      Coating: ${res.coating}<br>
      Volume per item: ${res.volume_mL} mL<br>
      Solids deposit: ${res.solids_g} g<br>
      Estimasi perpanjangan umur simpan: ${res.est_extension_days} hari
      <div style="margin-top:8px; font-size:13px; color:#475569">Catatan: angka perkiraan, butuh uji lab.</div>
    `;
    processLog.innerHTML = html;
    hasilArea.innerHTML = `<h4>Ringkasan</h4><pre>${JSON.stringify(res, null, 2)}</pre>`;
    window.lastSimulation = {time: new Date().toISOString(), data: res};
    // otomatis switch ke tab hasil
    document.querySelector('.nav-btn[data-tab="hasil"]').click();
  });

  // ---------- Biogas estimator ----------
  const biogasForm = document.getElementById('biogasForm');
  const biogasResult = document.getElementById('biogasResult');

  function estimateBiogas(type, kg, days){
    const yieldMap = {food:0.3, manure:0.25, green:0.18};
    const vsMap = {food:0.9, manure:0.8, green:0.6};
    const yieldPerKg = yieldMap[type] || 0.2;
    const vs = vsMap[type] || 0.7;
    const totalVS = kg * vs;
    const methane = Math.round(totalVS * yieldPerKg * 100) / 100;
    const biogas = Math.round((methane / 0.6) * 100) / 100;
    const energy = Math.round(methane * 10 * 100) / 100; // approx kWh
    return {type, kg, days, totalVS, methane, biogas, energy};
  }

  document.getElementById('calcBiogas').addEventListener('click', ()=>{
    const type = document.getElementById('wasteType').value;
    const kg = Number(document.getElementById('wasteKg').value);
    const days = Number(document.getElementById('retention').value);
    const res = estimateBiogas(type, kg, days);
    biogasResult.innerHTML = `
      <strong>Estimasi Biogas</strong><br>
      Input: ${res.kg} kg (${Math.round(res.totalVS*100)/100} kg VS)<br>
      Metana (CH₄) ≈ <strong>${res.methane} m³</strong><br>
      Total biogas ≈ <strong>${res.biogas} m³</strong><br>
      Energi teoretis ≈ <strong>${res.energy} kWh</strong>
      <div style="margin-top:8px; font-size:13px; color:#475569">Catatan: perkiraan kasar; hasil nyata tergantung suhu, pH, desain reaktor.</div>
    `;
    window.lastBiogas = {time: new Date().toISOString(), data: res};
    // switch to biogas tab
    document.querySelector('.nav-btn[data-tab="biogas"]').click();
  });

  // ---------- Export / Clear ----------
  document.getElementById('exportBtn').addEventListener('click', ()=>{
    const payload = {simulation: window.lastSimulation || null, biogas: window.lastBiogas || null};
    const blob = new Blob([JSON.stringify(payload, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'ediblecoating_biogas_result.json';
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  });

  document.getElementById('clearBtn').addEventListener('click', ()=>{
    processLog.innerHTML = 'Belum ada proses.'; hasilArea.innerHTML = 'Hasil simulasi akan muncul di sini.'; biogasResult.innerHTML = 'Belum dihitung.';
    window.lastSimulation = null; window.lastBiogas = null;
  });

  // ---------- small UX: keyboard shortcuts ----------
  document.addEventListener('keydown', (e)=>{
    if(e.key === '1') document.querySelector('.nav-btn[data-tab="edu"]').click();
    if(e.key === '2') document.querySelector('.nav-btn[data-tab="step"]').click();
    if(e.key === '3') document.querySelector('.nav-btn[data-tab="proc"]').click();
    if(e.key === '4') document.querySelector('.nav-btn[data-tab="hasil"]').click();
    if(e.key === '5') document.querySelector('.nav-btn[data-tab="biogas"]').click();
  });

  // Accessibility: ensure forms can be typed even if JS hiccup
  // (No-op; inputs are standard HTML elements)
})();

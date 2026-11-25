(() => {
  const $ = s => document.querySelector(s);
  const KEY = 'lakshmi1998:v2';
  const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const FULL = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  // tpl[weekday] = recurring sections; extra[date] = one-off tasks; done[date][id] = true
  let state = null;
  try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.tpl && s.shlokas) state = s; } catch (_) {}
  if (!state) {
    state = { tpl: {}, extra: {}, done: {}, shlokas: [] };
    state.tpl[1] = window.MONDAY.map(([title, en, time, items]) => ({
      id: uid(), title, en, time, items: items.map(text => ({ id: uid(), text }))
    }));
    state.shlokas = window.SHLOKAS.map(s => ({ id: uid(), ...s }));
    save();
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (_) {} }

  const iso = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const parse = s => { const [y,m,d] = s.split('-').map(Number); return new Date(y, m-1, d); };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

  let lastToday = iso(new Date());
  let selected = lastToday;
  let editingId = null;
  let dlgMode = null; // shloka id or null for new
  let openShloka = null;

  const secsFor = k => state.tpl[parse(k).getDay()] || [];
  function counts(k) {
    const done = state.done[k] || {};
    const ids = [];
    secsFor(k).forEach(s => s.items.forEach(i => ids.push(i.id)));
    (state.extra[k] || []).forEach(i => ids.push(i.id));
    const d = ids.filter(id => done[id]).length;
    return { total: ids.length, done: d, pct: ids.length ? Math.round(d * 100 / ids.length) : 0 };
  }

  function renderTabs() {
    const sel = parse(selected);
    const start = addDays(sel, -sel.getDay());
    $('#tabs').innerHTML = '';
    for (let i = 0; i < 7; i++) {
      const d = addDays(start, i), k = iso(d), c = counts(k);
      const b = document.createElement('button');
      b.className = 'tab' + (k === selected ? ' sel' : '') + (k === lastToday ? ' today' : '');
      b.innerHTML = `<small>${DAYS[i]}</small><b>${d.getDate()}</b><em>${c.total ? c.pct + '%' : '–'}</em>`;
      b.onclick = () => go(k);
      $('#tabs').appendChild(b);
    }
  }

  function renderHead() {
    const d = parse(selected);
    $('#dayTitle').textContent = `${FULL[d.getDay()]}, ${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`;
    $('#todayBadge').hidden = selected !== lastToday;
    const c = counts(selected);
    $('#barFill').style.width = c.pct + '%';
    $('#pct').textContent = c.total ? `${c.pct}% task completed (${c.done}/${c.total})` : 'No tasks yet for this day';
    const wd = FULL[d.getDay()];
    const opts = [`<option value="once">Only on ${d.getDate()} ${MON[d.getMonth()]}</option>`];
    secsFor(selected).forEach(s => opts.push(`<option value="${s.id}">Every ${wd} · ${esc(s.en || s.title)}</option>`));
    opts.push(`<option value="new">Every ${wd} · new "My tasks" list</option>`);
    const keep = $('#addTo').value;
    $('#addTo').innerHTML = opts.join('');
    if ([...$('#addTo').options].some(o => o.value === keep)) $('#addTo').value = keep;
  }
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

  function row(item, onDelete, onSaved) {
    const done = (state.done[selected] ||= {});
    const li = document.createElement('li');
    li.className = 'item' + (done[item.id] ? ' done' : '');
    const cb = document.createElement('input');
    cb.type = 'checkbox'; cb.checked = !!done[item.id];
    cb.onchange = () => { if (cb.checked) done[item.id] = true; else delete done[item.id]; save(); render(); };
    li.appendChild(cb);
    if (editingId === item.id) {
      const inp = document.createElement('input');
      inp.value = item.text; inp.maxLength = 300; inp.className = 'kn';
      const commit = () => { const v = inp.value.trim(); if (v) item.text = v; editingId = null; save(); render(); };
      inp.onkeydown = e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { editingId = null; render(); } };
      const ok = document.createElement('button');
      ok.className = 'ghost small'; ok.textContent = 'Save'; ok.onclick = commit;
      li.append(inp, ok);
      setTimeout(() => inp.focus(), 0);
    } else {
      const sp = document.createElement('span'); sp.className = 'txt kn'; sp.textContent = item.text;
      const e = document.createElement('button'); e.className = 'ib'; e.textContent = '✎'; e.title = 'Edit'; e.setAttribute('aria-label', 'Edit task');
      e.onclick = () => { editingId = item.id; render(); };
      const x = document.createElement('button'); x.className = 'ib'; x.textContent = '🗑'; x.title = 'Delete'; x.setAttribute('aria-label', 'Delete task');
      x.onclick = onDelete;
      li.append(sp, e, x);
    }
    return li;
  }

  function renderSections() {
    const box = $('#sections'); box.innerHTML = '';
    const wd = FULL[parse(selected).getDay()];
    const done = state.done[selected] || {};
    secsFor(selected).forEach(sec => {
      const card = document.createElement('section'); card.className = 'card sec';
      const n = sec.items.filter(i => done[i.id]).length;
      const h = document.createElement('div'); h.className = 'sechead';
      h.innerHTML = `<div><h3 class="kn">${esc(sec.title)}</h3><p>${esc(sec.en || '')}${sec.time ? ' · ' + esc(sec.time) : ''}</p></div><span class="cnt">${n}/${sec.items.length}</span>`;
      const ren = document.createElement('button'); ren.className = 'ib'; ren.textContent = '✎'; ren.title = 'Rename section';
      ren.onclick = () => {
        const t = prompt('Section title (Kannada or English):', sec.title); if (t && t.trim()) sec.title = t.trim();
        const e = prompt('English subtitle (optional):', sec.en || ''); if (e !== null) sec.en = e.trim();
        save(); render();
      };
      const del = document.createElement('button'); del.className = 'ib'; del.textContent = '🗑'; del.title = 'Delete section';
      del.onclick = () => {
        if (!confirm(`Delete this whole section from every ${wd}?`)) return;
        state.tpl[parse(selected).getDay()] = secsFor(selected).filter(s => s.id !== sec.id); save(); render();
      };
      h.append(ren, del);
      card.appendChild(h);
      const ul = document.createElement('ul'); ul.className = 'list';
      sec.items.forEach(it => ul.appendChild(row(it, () => {
        if (!confirm(`Remove this task from every ${wd}? (Past ticks are kept.)`)) return;
        sec.items = sec.items.filter(i => i.id !== it.id); save(); render();
      })));
      card.appendChild(ul);
      box.appendChild(card);
    });
    const extra = state.extra[selected] || [];
    if (extra.length) {
      const card = document.createElement('section'); card.className = 'card sec';
      const n = extra.filter(i => done[i.id]).length;
      card.innerHTML = `<div class="sechead"><div><h3 class="kn">ಈ ದಿನದ ಹೆಚ್ಚುವರಿ ಕೆಲಸಗಳು</h3><p>Extra tasks for this date</p></div><span class="cnt">${n}/${extra.length}</span></div>`;
      const ul = document.createElement('ul'); ul.className = 'list';
      extra.forEach(it => ul.appendChild(row(it, () => {
        state.extra[selected] = extra.filter(i => i.id !== it.id);
        if (!state.extra[selected].length) delete state.extra[selected];
        save(); render();
      })));
      card.appendChild(ul); box.appendChild(card);
    }
    if (!secsFor(selected).length && !extra.length) {
      const p = document.createElement('p'); p.className = 'muted';
      p.textContent = `Nothing planned for ${wd}s yet. Add a task above.`; box.appendChild(p);
    }
  }

  function renderShlokas() {
    const box = $('#shlokas'); box.innerHTML = '';
    if (!state.shlokas.length) { box.innerHTML = '<p class="muted">No shlokas yet. Tap "+ New shloka".</p>'; return; }
    state.shlokas.forEach((s, i) => {
      const d = document.createElement('details'); d.className = 'shl'; d.open = openShloka === s.id;
      d.ontoggle = () => { if (d.open) openShloka = s.id; else if (openShloka === s.id) openShloka = null; };
      d.innerHTML = `<summary><span class="num">${i + 1}</span><span class="kn">${esc(s.title)}</span></summary>
        <div class="body"><div class="verse kn">${esc(s.text)}</div>
        ${s.kn ? `<h4 class="kn">ಕನ್ನಡದಲ್ಲಿ ಅರ್ಥ</h4><div class="mean kn">${esc(s.kn)}</div>` : ''}
        ${s.en ? `<h4>Meaning in English</h4><div class="mean">${esc(s.en)}</div>` : ''}</div>`;
      const row = document.createElement('div'); row.className = 'row';
      const e = document.createElement('button'); e.className = 'ghost small'; e.textContent = 'Edit'; e.onclick = () => openDlg(s);
      const x = document.createElement('button'); x.className = 'ghost small danger'; x.textContent = 'Delete';
      x.onclick = () => { if (confirm('Delete this shloka?')) { state.shlokas = state.shlokas.filter(z => z.id !== s.id); save(); renderShlokas(); } };
      row.append(e, x); d.querySelector('.body').appendChild(row);
      box.appendChild(d);
    });
  }

  function render() { renderTabs(); renderHead(); renderSections(); renderShlokas(); }
  function go(k) { selected = k; editingId = null; render(); }

  $('#addForm').onsubmit = e => {
    e.preventDefault();
    const text = $('#newTask').value.trim(); if (!text) return;
    const where = $('#addTo').value;
    const item = { id: uid(), text };
    if (where === 'once') (state.extra[selected] ||= []).push(item);
    else {
      const wd = parse(selected).getDay();
      const list = (state.tpl[wd] ||= []);
      let sec = where === 'new' ? list.find(s => s.title === 'My tasks') : list.find(s => s.id === where);
      if (!sec) { sec = { id: uid(), title: 'My tasks', en: 'My tasks', time: '', items: [] }; list.push(sec); }
      sec.items.push(item);
    }
    $('#newTask').value = ''; save(); render();
  };
  $('#prevDay').onclick = () => go(iso(addDays(parse(selected), -1)));
  $('#nextDay').onclick = () => go(iso(addDays(parse(selected), 1)));
  $('#goToday').onclick = () => go(iso(new Date()));

  // Keep "today" correct even if the page stays open past midnight.
  function tick() {
    const t = iso(new Date());
    if (t !== lastToday) { const was = selected === lastToday; lastToday = t; if (was) selected = t; render(); }
  }
  setInterval(tick, 30000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });
  window.addEventListener('focus', tick);

  const dlg = $('#dlg');
  function openDlg(s) {
    dlgMode = s ? s.id : null;
    $('#dlgTitle').textContent = s ? 'Edit shloka' : 'New shloka';
    $('#fTitle').value = s ? s.title : ''; $('#fText').value = s ? s.text : '';
    $('#fKn').value = s ? s.kn || '' : ''; $('#fEn').value = s ? s.en || '' : '';
    dlg.showModal();
  }
  $('#newShloka').onclick = () => openDlg(null);
  $('#fCancel').onclick = () => dlg.close();
  $('#dlgForm').onsubmit = () => {
    const v = { title: $('#fTitle').value.trim(), text: $('#fText').value.trim(), kn: $('#fKn').value.trim(), en: $('#fEn').value.trim() };
    if (!v.title || !v.text) return;
    if (dlgMode) Object.assign(state.shlokas.find(z => z.id === dlgMode), v);
    else { const n = { id: uid(), ...v }; state.shlokas.push(n); openShloka = n.id; }
    save(); renderShlokas();
  };

  render();
})();

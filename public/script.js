(() => {
  const API = '/api';
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const tok = {
    get: () => localStorage.getItem('token'),
    set: (t) => localStorage.setItem('token', t),
    clear: () => localStorage.removeItem('token'),
  };
  let dashboardPromise = null;
  const getDashboard = async () => {
    if (!dashboardPromise) dashboardPromise = api('/dashboard');
    return dashboardPromise;
  };

  async function api(path, opts = {}) {
    const headers = { ...(opts.headers || {}) };
    if (tok.get()) headers.Authorization = `Bearer ${tok.get()}`;
    if (!(opts.body instanceof FormData) && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
    const body = opts.body && typeof opts.body === 'object' && !(opts.body instanceof FormData) ? JSON.stringify(opts.body) : opts.body;
    const res = await fetch(`${API}${path}`, { ...opts, headers, body });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 || res.status === 403) {
      if (location.pathname !== '/' && !location.pathname.endsWith('/index.html')) {
        tok.clear();
        location.href = '/';
      }
      throw new Error(data.error || 'Unauthorized');
    }
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  }

  const logout = () => { tok.clear(); location.href = '/'; };

  function applyRoleVisibility(role) {
    document.querySelectorAll('[data-role]').forEach((el) => {
      const roles = String(el.dataset.role || '').split(',').map((r) => r.trim()).filter(Boolean);
      if (!roles.length) return;
      const show = roles.includes(role) || roles.includes('all');
      el.style.display = show ? '' : 'none';
    });
  }

  async function initNav() {
    const nav = document.querySelector('.nav');
    if (!nav || !tok.get()) return;
    try {
      const d = await getDashboard();
      applyRoleVisibility(d.role);
    } catch {
      // ignore
    }
    applyNavIcons();
    updateNotificationBadge().catch(() => {});
    const logoutLink = document.getElementById('logoutLink');
    if (logoutLink) logoutLink.onclick = (e) => { e.preventDefault(); logout(); };
  }

  function iconSvg(name) {
    const base = 'stroke="currentColor" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';
    switch (name) {
      case 'home':
        return `<svg viewBox="0 0 24 24" ${base}><path d="M3 10.5 12 3l9 7.5"/><path d="M5 10.5V20h14v-9.5"/></svg>`;
      case 'classes':
        return `<svg viewBox="0 0 24 24" ${base}><rect x="3" y="5" width="18" height="12" rx="2"/><path d="M7 9h10M7 13h6"/><path d="M8 21h8"/></svg>`;
      case 'subjects':
        return `<svg viewBox="0 0 24 24" ${base}><path d="M4 6h12a2 2 0 0 1 2 2v10H6a2 2 0 0 0-2 2V6z"/><path d="M18 8h2v10a2 2 0 0 1-2 2H6"/></svg>`;
      case 'upload':
        return `<svg viewBox="0 0 24 24" ${base}><path d="M12 3v12"/><path d="m7 8 5-5 5 5"/><path d="M4 14v5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5"/></svg>`;
      case 'article':
        return `<svg viewBox="0 0 24 24" ${base}><path d="M7 4h7l3 3v13H7z"/><path d="M14 4v4h4"/><path d="M9 12h6M9 16h6"/></svg>`;
      case 'test':
        return `<svg viewBox="0 0 24 24" ${base}><path d="M6 4h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/><path d="M8.5 9.5h7M8.5 13h5"/><path d="m8.5 16 1.8 1.8 3.2-3.2"/></svg>`;
      case 'search':
        return `<svg viewBox="0 0 24 24" ${base}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>`;
      case 'bell':
        return `<svg viewBox="0 0 24 24" ${base}><path d="M6 17h12"/><path d="M8 17v-5a4 4 0 0 1 8 0v5"/><path d="M10 17a2 2 0 0 0 4 0"/></svg>`;
      case 'logout':
        return `<svg viewBox="0 0 24 24" ${base}><path d="M10 17l-4-4 4-4"/><path d="M6 13h10"/><path d="M14 7h4v10h-4"/></svg>`;
      default:
        return '';
    }
  }

  function applyNavIcons() {
    const nav = document.querySelector('.nav');
    if (!nav) return;
    nav.querySelectorAll('a').forEach((a) => {
      if (a.querySelector('.nav-label')) return;
      const href = a.getAttribute('href') || '';
      const id = a.getAttribute('id') || '';
      let icon = '';
      if (id === 'logoutLink') icon = iconSvg('logout');
      else if (href === '/dashboard.html') icon = iconSvg('home');
      else if (href === '/classes.html') icon = iconSvg('classes');
      else if (href === '/subjects.html') icon = iconSvg('subjects');
      else if (href === '/upload.html') icon = iconSvg('upload');
      else if (href === '/article-builder.html') icon = iconSvg('article');
      else if (href === '/test-builder.html') icon = iconSvg('test');
      else if (href === '/search.html') icon = iconSvg('search');
      else if (href === '/notifications.html') icon = iconSvg('bell');
      const label = a.textContent;
      a.innerHTML = `${icon ? `<span class="nav-icon" aria-hidden="true">${icon}</span>` : ''}<span class="nav-label">${label}</span>`;
    });
  }

  async function updateNotificationBadge() {
    const nav = document.querySelector('.nav');
    if (!nav || !tok.get()) return;
    const link = nav.querySelector('a[href="/notifications.html"]');
    if (!link) return;
    const items = await api('/notifications');
    const unread = items.filter((n) => !n.is_read).length;
    let badge = link.querySelector('.nav-badge');
    if (unread > 0) {
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'nav-badge';
        link.appendChild(badge);
      }
      badge.textContent = unread;
    } else if (badge) {
      badge.remove();
    }
  }

  function initMobileMenu() {
    const sidebar = document.querySelector('.sidebar');
    const header = document.querySelector('.header');
    if (!sidebar || !header) return;
    const brand = header.querySelector('.brand') || header;
    let burger = header.querySelector('.burger-btn');
    if (!burger) {
      burger = document.createElement('button');
      burger.type = 'button';
      burger.className = 'burger-btn';
      burger.setAttribute('aria-label', 'Открыть меню');
      burger.innerHTML = '<span></span><span></span><span></span>';
      const logo = brand.querySelector('.logo');
      if (logo) brand.insertBefore(burger, logo);
      else brand.prepend(burger);
    }
    let overlay = document.querySelector('.mobile-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'mobile-overlay';
      document.body.appendChild(overlay);
    }
    const openMenu = () => {
      sidebar.classList.add('open');
      document.body.classList.add('menu-open');
      burger.classList.add('open');
    };
    const closeMenu = () => {
      sidebar.classList.remove('open');
      document.body.classList.remove('menu-open');
      burger.classList.remove('open');
    };
    const toggleMenu = () => {
      if (document.body.classList.contains('menu-open')) closeMenu();
      else openMenu();
    };
    burger.addEventListener('click', toggleMenu);
    overlay.addEventListener('click', closeMenu);
    sidebar.querySelectorAll('a').forEach((a) => a.addEventListener('click', closeMenu));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeMenu();
    });
    window.addEventListener('resize', () => {
      if (window.innerWidth > 900) closeMenu();
    });
  }

  async function createTopicForSubject(subjectId, defaultName = '') {
    return await new Promise((resolve) => {
      openOverlay({
        title: 'Создание темы',
        bodyHtml: `<div class="field"><input id="topic-name-input" class="input" placeholder="Название темы" value="${esc(defaultName)}"></div>`,
        onClose: () => resolve(null),
        submitText: 'Создать',
        onSubmit: async (overlay) => {
          const name = overlay.querySelector('#topic-name-input')?.value?.trim();
          if (!name) throw new Error('Введите название темы');
          const created = await api('/topics', { method: 'POST', body: { name, subject_id: subjectId } });
          resolve(created);
        },
      });
    });
  }

  async function buildTeacherTopicPicker(container, subjectId, onChange, selectedTopicId = '') {
    if (!container) return;
    const topics = await api(`/topics/${subjectId}`);
    container.innerHTML = `
      <label class="small">Тема</label>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <select id="topic-picker" class="input" style="min-width:240px;flex:1">
          <option value="">Выберите тему</option>
          ${topics.map((t) => `<option value="${t.id}" ${String(selectedTopicId) === String(t.id) ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}
        </select>
        <button type="button" class="btn secondary" id="topic-create-btn">+ Тема</button>
      </div>
    `;
    const picker = container.querySelector('#topic-picker');
    const createBtn = container.querySelector('#topic-create-btn');
    if (picker && onChange) picker.addEventListener('change', () => onChange(picker.value));
    if (createBtn) {
      createBtn.addEventListener('click', async () => {
        try {
          const created = await createTopicForSubject(subjectId);
          if (!created) return;
          await buildTeacherTopicPicker(container, subjectId, onChange, created.id);
          if (onChange) onChange(String(created.id));
          toast('Тема создана');
        } catch (e) {
          toast(e.message, true);
        }
      });
    }
  }

  function toast(msg, err = false) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.style.background = err ? '#b91c1c' : '#4f46e5';
    t.style.display = 'block';
    setTimeout(() => (t.style.display = 'none'), 2600);
  }

  function ensureOverlay() {
    let overlay = document.getElementById('ui-overlay-modal');
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'ui-overlay-modal';
    overlay.className = 'ui-overlay hidden';
    overlay.innerHTML = `
      <div class="ui-overlay-card">
        <div class="ui-overlay-header">
          <h3 id="ui-overlay-title"></h3>
          <button type="button" id="ui-overlay-close" class="btn secondary">Закрыть</button>
        </div>
        <div id="ui-overlay-body"></div>
        <div id="ui-overlay-actions" class="ui-overlay-actions"></div>
      </div>
    `;
    document.body.appendChild(overlay);
    return overlay;
  }

  function openOverlay({ title, bodyHtml, onSubmit, onClose, submitText = 'Сохранить', hideSubmit = false }) {
    const overlay = ensureOverlay();
    const titleEl = overlay.querySelector('#ui-overlay-title');
    const bodyEl = overlay.querySelector('#ui-overlay-body');
    const actionsEl = overlay.querySelector('#ui-overlay-actions');
    const closeBtn = overlay.querySelector('#ui-overlay-close');
    titleEl.textContent = title;
    bodyEl.innerHTML = bodyHtml || '';
    actionsEl.innerHTML = '';
    closeBtn.onclick = () => {
      overlay.classList.add('hidden');
      if (onClose) onClose();
    };
    if (!hideSubmit) {
      const saveBtn = document.createElement('button');
      saveBtn.className = 'btn';
      saveBtn.textContent = submitText;
      saveBtn.onclick = async () => {
        try {
          if (onSubmit) await onSubmit(overlay);
          overlay.classList.add('hidden');
        } catch (e) {
          toast(e.message || 'Ошибка', true);
        }
      };
      actionsEl.appendChild(saveBtn);
    }
    overlay.classList.remove('hidden');
    return overlay;
  }

  function showInfo(message, title = 'Информация') {
    openOverlay({
      title,
      bodyHtml: `<p>${esc(message)}</p>`,
      hideSubmit: true,
    });
  }

  function getVideoEmbedUrl(rawUrl) {
    const url = String(rawUrl || '').trim();
    if (!url) return null;
    try {
      const u = new URL(url);
      if (u.hostname.includes('youtube.com')) {
        const id = u.searchParams.get('v');
        if (id) return `https://www.youtube.com/embed/${id}`;
      }
      if (u.hostname.includes('youtu.be')) {
        const id = u.pathname.split('/').filter(Boolean)[0];
        if (id) return `https://www.youtube.com/embed/${id}`;
      }
      if (u.hostname.includes('vimeo.com')) {
        const id = u.pathname.split('/').filter(Boolean)[0];
        if (id) return `https://player.vimeo.com/video/${id}`;
      }
      if (u.hostname.includes('rutube.ru')) {
        const id = u.pathname.split('/').filter(Boolean).pop();
        if (id) return `https://rutube.ru/play/embed/${id}`;
      }
      if (u.hostname.includes('vkvideo.ru') || u.hostname.includes('vk.com')) {
        return url;
      }
      return null;
    } catch {
      return null;
    }
  }

  async function ensurePlyr() {
    if (window.Plyr) return;
    if (!document.getElementById('plyr-css')) {
      const css = document.createElement('link');
      css.id = 'plyr-css';
      css.rel = 'stylesheet';
      css.href = 'https://cdn.jsdelivr.net/npm/plyr@3.7.8/dist/plyr.css';
      document.head.appendChild(css);
    }
    await new Promise((resolve, reject) => {
      if (window.Plyr) return resolve();
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/plyr@3.7.8/dist/plyr.polyfilled.min.js';
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Не удалось загрузить библиотеку плеера'));
      document.head.appendChild(s);
    });
  }

  async function ensurePdfjs() {
    if (window.pdfjsLib) return;
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = '/vendor/pdfjs/pdf.min.js';
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Не удалось загрузить PDF.js'));
      document.head.appendChild(s);
    });
    if (window.pdfjsLib) {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = '/vendor/pdfjs/pdf.worker.min.js';
    }
  }

  async function renderPdfViewer(root, m) {
    const url = m.file_url || '';
    if (!url) {
      root.innerHTML = `<h2>${esc(m.title)}</h2><p>Нет файла</p>`;
      return;
    }
    root.innerHTML = `
      <h2>${esc(m.title)}</h2>
      <div class="pdf-canvas-wrap"><canvas id="pdf-canvas"></canvas></div>
      <div class="pdf-toolbar">
        <button class="btn secondary" id="pdf-prev">Назад</button>
        <input class="input" id="pdf-page-input" type="number" min="1" value="1" style="max-width:90px">
        <div class="small" id="pdf-page-info">из 1</div>
        <button class="btn secondary" id="pdf-next">Вперед</button>
        <button class="btn secondary" id="pdf-zoom-out">−</button>
        <button class="btn secondary" id="pdf-zoom-in">+</button>
        <a class="btn secondary" target="_blank" rel="noopener" href="${esc(url)}">Открыть</a>
      </div>
    `;
    try {
      await ensurePdfjs();
      const pdfUrl = new URL(encodeURI(url), window.location.origin).href;
      let pdf;
      try {
        pdf = await window.pdfjsLib.getDocument({ url: pdfUrl, withCredentials: true }).promise;
      } catch (e) {
        pdf = await window.pdfjsLib.getDocument({ url: pdfUrl, withCredentials: true, disableWorker: true }).promise;
      }
      let pageNum = 1;
      let scale = 1.25;
      const canvas = root.querySelector('#pdf-canvas');
      const ctx = canvas.getContext('2d');
      const pageInfo = root.querySelector('#pdf-page-info');
      const pageInput = root.querySelector('#pdf-page-input');

      const renderPage = async () => {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale });
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: ctx, viewport }).promise;
        pageInfo.textContent = `из ${pdf.numPages}`;
        pageInput.value = String(pageNum);
      };

      root.querySelector('#pdf-prev').onclick = async () => {
        if (pageNum <= 1) return;
        pageNum -= 1;
        await renderPage();
      };
      root.querySelector('#pdf-next').onclick = async () => {
        if (pageNum >= pdf.numPages) return;
        pageNum += 1;
        await renderPage();
      };
      pageInput.onchange = async () => {
        let n = Number(pageInput.value);
        if (Number.isNaN(n)) return;
        if (n < 1) n = 1;
        if (n > pdf.numPages) n = pdf.numPages;
        pageNum = n;
        await renderPage();
      };
      pageInput.onkeydown = async (e) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        pageInput.blur();
        pageInput.onchange();
      };
      root.querySelector('#pdf-zoom-in').onclick = async () => {
        scale = Math.min(3, scale + 0.2);
        await renderPage();
      };
      root.querySelector('#pdf-zoom-out').onclick = async () => {
        scale = Math.max(0.6, scale - 0.2);
        await renderPage();
      };

      await renderPage();
    } catch (e) {
      root.innerHTML = `<h2>${esc(m.title)}</h2><div class="card"><p>${esc(e.message || 'Не удалось открыть PDF')}</p><a class="btn" target="_blank" rel="noopener" href="${esc(url)}">Открыть файл</a></div>`;
    }
  }

  async function loginInit() {
    const f = document.getElementById('login-form');
    if (!f) return;
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = f.querySelector('[name="login"]').value.trim();
      const password = f.querySelector('[name="password"]').value;
      try {
        const d = await api('/login', { method: 'POST', body: { email, password } });
        tok.set(d.token);
        location.href = '/dashboard.html';
      } catch (e2) { showInfo(e2.message || 'Ошибка входа', 'Ошибка'); }
    });
  }

  async function renderAdminTab(tab) {
    const root = $('#tab-content');
    if (!root) return;
    const [dash, users, classes, subjects] = await Promise.all([getDashboard(), api('/users'), api('/classes'), api('/subjects')]);
    const teacherNames = (s) => {
      if (Array.isArray(s.teacher_names)) return s.teacher_names.filter(Boolean).map(esc).join(', ');
      if (typeof s.teacher_names === 'string' && s.teacher_names.trim()) return esc(s.teacher_names);
      return '-';
    };

    if (tab === 'overview') {
      root.innerHTML = `<div class="admin-section"><h3>Быстрые действия</h3><div class="form-grid"><button class="btn" id="au">Добавить пользователя</button><button class="btn" id="ac">Добавить класс</button><button class="btn" id="as">Добавить предмет</button></div><p class="small" style="margin-top:12px">Пользователи: ${users.length}, классы: ${classes.length}, предметы: ${subjects.length}</p></div>`;
      $('#au').onclick = () => addUser(classes);
      $('#ac').onclick = () => addClass();
      $('#as').onclick = () => addSubject(classes, dash.teachers || []);
      return;
    }

    if (tab === 'users') {
      root.innerHTML = `<div class="admin-section"><div class="space-between"><h3>Пользователи</h3><button id="uadd" class="btn">Добавить</button></div><table class="mini-table"><thead><tr><th>ID</th><th>ФИО</th><th>Email</th><th>Роль</th><th>Класс</th><th></th></tr></thead><tbody>${users.map((u) => `<tr><td>${u.id}</td><td>${esc(u.full_name)}</td><td>${esc(u.email)}</td><td>${esc(u.role)}</td><td>${esc(u.class_name || '-')}</td><td><button class="btn secondary" data-ue="${u.id}">Изм.</button> <button class="btn secondary" data-ud="${u.id}">Удал.</button></td></tr>`).join('')}</tbody></table></div>`;
      $('#uadd').onclick = () => addUser(classes);
      root.querySelectorAll('[data-ue]').forEach((b) => (b.onclick = () => editUser(users.find((u) => u.id === Number(b.dataset.ue)), classes)));
      root.querySelectorAll('[data-ud]').forEach((b) => (b.onclick = async () => {
        if (!confirm('Удалить пользователя?')) return;
        try { await api(`/users/${b.dataset.ud}`, { method: 'DELETE' }); toast('Удалено'); renderAdminTab('users'); } catch (e) { toast(e.message, true); }
      }));
      return;
    }

    if (tab === 'classes') {
      root.innerHTML = `<div class="admin-section"><div class="space-between"><h3>Классы</h3><button id="cadd" class="btn">Добавить</button></div><table class="mini-table"><thead><tr><th>ID</th><th>Название</th><th></th></tr></thead><tbody>${classes.map((c) => `<tr><td>${c.id}</td><td>${esc(c.name)}</td><td><button class="btn secondary" data-ce="${c.id}">Изм.</button> <button class="btn secondary" data-cd="${c.id}">Удал.</button></td></tr>`).join('')}</tbody></table></div>`;
      $('#cadd').onclick = () => addClass();
      root.querySelectorAll('[data-ce]').forEach((b) => (b.onclick = () => editClass(classes.find((c) => c.id === Number(b.dataset.ce)))));
      root.querySelectorAll('[data-cd]').forEach((b) => (b.onclick = async () => {
        if (!confirm('Удалить класс?')) return;
        try { await api(`/classes/${b.dataset.cd}`, { method: 'DELETE' }); toast('Удалено'); renderAdminTab('classes'); } catch (e) { toast(e.message, true); }
      }));
      return;
    }

    root.innerHTML = `<div class="admin-section"><div class="space-between"><h3>Предметы</h3><button id="sadd" class="btn">Добавить</button></div><table class="mini-table"><thead><tr><th>ID</th><th>Название</th><th>Класс</th><th>Учителя</th><th></th></tr></thead><tbody>${subjects.map((s) => `<tr><td>${s.id}</td><td>${esc(s.name)}</td><td>${esc(s.class_name || '-')}</td><td>${teacherNames(s)}</td><td><button class="btn secondary" data-se="${s.id}">Изм.</button> <button class="btn secondary" data-sd="${s.id}">Удал.</button></td></tr>`).join('')}</tbody></table></div>`;
    $('#sadd').onclick = () => addSubject(classes, dash.teachers || []);
    root.querySelectorAll('[data-se]').forEach((b) => (b.onclick = () => editSubject(subjects.find((s) => s.id === Number(b.dataset.se)), classes, dash.teachers || [])));
    root.querySelectorAll('[data-sd]').forEach((b) => (b.onclick = async () => {
      if (!confirm('Удалить предмет?')) return;
      try { await api(`/subjects/${b.dataset.sd}`, { method: 'DELETE' }); toast('Удалено'); renderAdminTab('subjects'); } catch (e) { toast(e.message, true); }
    }));
  }

  async function renderDashboard() {
    const root = document.getElementById('dashboard-root');
    if (!root) return;
    const d = await getDashboard();
    if (d.role === 'student') {
      document.querySelectorAll('a[href="/upload.html"], a[href="/article-builder.html"], a[href="/test-builder.html"]').forEach((a) => {
        a.style.display = 'none';
      });
    }
    const nav = document.querySelector('.nav');
    if (nav && !nav.querySelector('a[href="/search.html"]')) {
      nav.insertAdjacentHTML('beforeend', '<a href="/search.html">Поиск материалов</a><a href="/notifications.html">Уведомления</a>');
    }
    root.innerHTML = `<div class="space-between"><div><h2>Панель - ${esc(d.role)}</h2><p class="small">${esc(d.name || '')}</p></div><button class="btn" id="logoutBtn">Выйти</button></div><div id="dash-body" style="margin-top:16px"></div>`;
    $('#logoutBtn').onclick = logout;
    const body = $('#dash-body');
    if (d.role === 'admin') {
      body.innerHTML = `<div class="tab-buttons"><button class="active" data-t="overview">Обзор</button><button data-t="users">Пользователи</button><button data-t="classes">Классы</button><button data-t="subjects">Предметы</button></div><div id="tab-content" style="margin-top:14px"></div>`;
      body.querySelectorAll('[data-t]').forEach((b) => (b.onclick = async () => {
        body.querySelectorAll('[data-t]').forEach((x) => x.classList.remove('active'));
        b.classList.add('active');
        await renderAdminTab(b.dataset.t);
      }));
      await renderAdminTab('overview');
      return;
    }
    if (d.role === 'teacher') {
      body.innerHTML = `<div class="admin-section"><h3>Ваши классы</h3>${(d.classes || []).length ? `<div class="card-grid">${d.classes.map((c) => `<div class="card"><h4>${esc(c.name)}</h4><div style="margin-top:10px"><a class="btn" href="/subjects.html?classId=${c.id}">Предметы класса</a></div></div>`).join('')}</div>` : '<p>Классы не назначены</p>'}</div>`;
      return;
    }
    body.innerHTML = `<div class="admin-section"><h3>Предметы вашего класса</h3>${(d.subjects || []).length ? `<div class="card-grid">${d.subjects.map((s) => `<div class="card"><h4>${esc(s.name)}</h4><p class="small">${esc(s.class_name || '')}</p><div style="margin-top:10px"><a class="btn" href="/topics.html?subjectId=${s.id}">Открыть темы</a></div></div>`).join('')}</div>` : '<p>Предметы не найдены</p>'}</div>`;
  }

  async function addUser(classes) {
    openOverlay({
      title: 'Добавить пользователя',
      bodyHtml: `
        <div class="field"><input id="u-full" class="input" placeholder="ФИО"></div>
        <div class="field"><input id="u-email" class="input" placeholder="Email"></div>
        <div class="field"><input id="u-pass" class="input" type="password" placeholder="Пароль"></div>
        <div class="field">
          <select id="u-role" class="input">
            <option value="student">Ученик</option>
            <option value="teacher">Учитель</option>
            <option value="admin">Админ</option>
          </select>
        </div>
        <div class="field" id="u-class-wrap">
          <select id="u-class" class="input">
            <option value="">Выберите класс</option>
            ${classes.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}
          </select>
        </div>
      `,
      onSubmit: async (overlay) => {
        const full_name = overlay.querySelector('#u-full').value.trim();
        const email = overlay.querySelector('#u-email').value.trim();
        const password = overlay.querySelector('#u-pass').value.trim();
        const role = overlay.querySelector('#u-role').value;
        const class_id = overlay.querySelector('#u-class').value || null;
        if (!full_name || !email || !password) throw new Error('Заполните все обязательные поля');
        if (role === 'student' && !class_id) throw new Error('Для ученика необходимо выбрать класс');
        await api('/users', { method: 'POST', body: { full_name, email, password, role, class_id } });
        toast('Пользователь добавлен');
        renderAdminTab('users');
      },
    });
    const overlay = document.getElementById('ui-overlay-modal');
    const roleSel = overlay?.querySelector('#u-role');
    const classWrap = overlay?.querySelector('#u-class-wrap');
    if (roleSel && classWrap) {
      const sync = () => { classWrap.style.display = roleSel.value === 'student' ? '' : 'none'; };
      roleSel.addEventListener('change', sync);
      sync();
    }
  }

  async function editUser(u, classes) {
    if (!u) return;
    openOverlay({
      title: 'Редактировать пользователя',
      bodyHtml: `
        <div class="field"><input id="u-full" class="input" placeholder="ФИО" value="${esc(u.full_name)}"></div>
        <div class="field"><input id="u-email" class="input" placeholder="Email" value="${esc(u.email)}"></div>
        <div class="field"><input id="u-pass" class="input" type="password" placeholder="Новый пароль (необязательно)"></div>
        <div class="field">
          <select id="u-role" class="input">
            <option value="student" ${u.role === 'student' ? 'selected' : ''}>Ученик</option>
            <option value="teacher" ${u.role === 'teacher' ? 'selected' : ''}>Учитель</option>
            <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Админ</option>
          </select>
        </div>
        <div class="field" id="u-class-wrap">
          <select id="u-class" class="input">
            <option value="">Выберите класс</option>
            ${classes.map((c) => `<option value="${c.id}" ${Number(u.class_id) === Number(c.id) ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}
          </select>
        </div>
      `,
      onSubmit: async (overlay) => {
        const full_name = overlay.querySelector('#u-full').value.trim();
        const email = overlay.querySelector('#u-email').value.trim();
        const role = overlay.querySelector('#u-role').value;
        const class_id = role === 'student' ? (overlay.querySelector('#u-class').value || null) : null;
        const password = overlay.querySelector('#u-pass').value.trim();
        if (!full_name || !email) throw new Error('ФИО и email обязательны');
        if (role === 'student' && !class_id) throw new Error('Для ученика необходимо выбрать класс');
        const body = { full_name, email, role, class_id };
        if (password) body.password = password;
        await api(`/users/${u.id}`, { method: 'PUT', body });
        toast('Пользователь обновлен');
        renderAdminTab('users');
      },
    });
    const overlay = document.getElementById('ui-overlay-modal');
    const roleSel = overlay?.querySelector('#u-role');
    const classWrap = overlay?.querySelector('#u-class-wrap');
    if (roleSel && classWrap) {
      const sync = () => { classWrap.style.display = roleSel.value === 'student' ? '' : 'none'; };
      roleSel.addEventListener('change', sync);
      sync();
    }
  }

  async function addClass() {
    openOverlay({
      title: 'Добавить класс',
      bodyHtml: `
        <div class="field"><input id="c-name" class="input" placeholder="Название класса"></div>
      `,
      onSubmit: async (overlay) => {
        const name = overlay.querySelector('#c-name').value.trim();
        if (!name) throw new Error('Введите название класса');
        await api('/classes', { method: 'POST', body: { name } });
        toast('Класс добавлен');
        renderAdminTab('classes');
      },
    });
  }

  async function editClass(c) {
    if (!c) return;
    openOverlay({
      title: 'Редактировать класс',
      bodyHtml: `
        <div class="field"><input id="c-name" class="input" placeholder="Название класса" value="${esc(c.name)}"></div>
      `,
      onSubmit: async (overlay) => {
        const name = overlay.querySelector('#c-name').value.trim();
        if (!name) throw new Error('Введите название класса');
        await api(`/classes/${c.id}`, { method: 'PUT', body: { name } });
        toast('Класс обновлен');
        renderAdminTab('classes');
      },
    });
  }

  async function addSubject(classes, teachers = []) {
    openOverlay({
      title: 'Добавить предмет',
      bodyHtml: `
        <div class="field"><input id="s-name" class="input" placeholder="Название предмета"></div>
        <div class="field">
          <select id="s-class" class="input">
            <option value="">Выберите класс</option>
            ${classes.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label class="small">Учителя предмета</label>
          <select id="s-teachers" class="input" multiple size="5">
            ${teachers.map((t) => `<option value="${t.id}">${esc(t.full_name)}</option>`).join('')}
          </select>
        </div>
      `,
      onSubmit: async (overlay) => {
        const name = overlay.querySelector('#s-name').value.trim();
        const class_id = overlay.querySelector('#s-class').value || null;
        const teacher_ids = Array.from(overlay.querySelector('#s-teachers').selectedOptions).map((o) => o.value);
        if (!name || !class_id) throw new Error('Введите название и выберите класс');
        await api('/subjects', { method: 'POST', body: { name, class_id, teacher_ids } });
        toast('Предмет добавлен');
        renderAdminTab('subjects');
      },
    });
  }

  async function editSubject(s, classes, teachers = []) {
    if (!s) return;
    const selectedIds = Array.isArray(s.teacher_ids) ? s.teacher_ids.map(String) : [];
    openOverlay({
      title: 'Редактировать предмет',
      bodyHtml: `
        <div class="field"><input id="s-name" class="input" placeholder="Название предмета" value="${esc(s.name)}"></div>
        <div class="field">
          <select id="s-class" class="input">
            ${classes.map((c) => `<option value="${c.id}" ${Number(s.class_id) === Number(c.id) ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label class="small">Учителя предмета</label>
          <select id="s-teachers" class="input" multiple size="5">
            ${teachers.map((t) => `<option value="${t.id}" ${selectedIds.includes(String(t.id)) ? 'selected' : ''}>${esc(t.full_name)}</option>`).join('')}
          </select>
        </div>
      `,
      onSubmit: async (overlay) => {
        const name = overlay.querySelector('#s-name').value.trim();
        const class_id = overlay.querySelector('#s-class').value || null;
        const teacher_ids = Array.from(overlay.querySelector('#s-teachers').selectedOptions).map((o) => o.value);
        if (!name || !class_id) throw new Error('Введите название и выберите класс');
        await api(`/subjects/${s.id}`, { method: 'PUT', body: { name, class_id, teacher_ids } });
        toast('Предмет обновлен');
        renderAdminTab('subjects');
      },
    });
  }

  async function renderClassesPage() {
    const root = $('#classes-root');
    if (!root) return;
    const cls = await api('/classes');
    root.innerHTML = `<h2>Классы</h2><div class="card-grid">${cls.map((c) => `<div class="card"><h3>${esc(c.name)}</h3><div style="margin-top:10px"><a class="btn" href="/subjects.html?classId=${c.id}">Предметы</a></div></div>`).join('')}</div>`;
  }

  async function renderSubjectsPage() {
    const root = $('#subjects-root');
    if (!root) return;
    const classId = new URLSearchParams(location.search).get('classId');
    const subs = classId ? await api(`/subjects/${classId}`) : await api('/subjects');
    const d = await getDashboard().catch(() => ({ role: '' }));
    const isTeacher = d.role === 'teacher';
    root.innerHTML = `<h2>Предметы</h2><div class="card-grid">${subs.map((s) => `
      <div class="card">
        <h3>${esc(s.name)}</h3>
        <p class="small">Класс: ${esc(s.class_name || s.class_id)}</p>
        <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">
          <a class="btn" href="/topics.html?subjectId=${s.id}">Темы</a>
          ${isTeacher ? `<button class="btn secondary" data-create-topic="${s.id}">+ Тема</button>` : ''}
          ${isTeacher ? `<a class="btn secondary" href="/upload.html?classId=${s.class_id}&subjectId=${s.id}">Загрузить</a>` : ''}
        </div>
      </div>
    `).join('')}</div>`;
    if (isTeacher) {
      root.querySelectorAll('[data-create-topic]').forEach((btn) => {
        btn.onclick = async () => {
          try {
            const subjectId = Number(btn.dataset.createTopic);
            const created = await createTopicForSubject(subjectId);
            if (created) toast(`Тема "${created.name}" создана`);
          } catch (e) {
            toast(e.message, true);
          }
        };
      });
    }
  }

  async function renderTopicsPage() {
    const root = $('#topics-root');
    if (!root) return;
    const sid = new URLSearchParams(location.search).get('subjectId');
    if (!sid) return (root.innerHTML = '<p>Не указан предмет</p>');
    const d = await getDashboard();
    const topics = await api(`/topics/${sid}`);
    const isTeacher = d.role === 'teacher';
    root.innerHTML = `<div class="space-between"><h2>Темы</h2>${isTeacher ? '<button class="btn" id="topic-add-main">+ Создать тему</button>' : ''}</div><div class="card-grid">${topics.map((t) => `<div class="card"><h3>${esc(t.name)}</h3><div style="margin-top:10px"><a class="btn" href="/material.html?topicId=${t.id}">Материалы</a></div></div>`).join('')}</div>`;
    if (isTeacher) {
      const addBtn = $('#topic-add-main');
      if (addBtn) {
        addBtn.onclick = async () => {
          try {
            const created = await createTopicForSubject(Number(sid));
            if (!created) return;
            toast('Тема создана');
            await renderTopicsPage();
          } catch (e) {
            toast(e.message, true);
          }
        };
      }
    }
  }

  async function renderMaterialsPage() {
    const root = $('#material-root');
    if (!root) return;
    const tid = new URLSearchParams(location.search).get('topicId');
    if (!tid) return (root.innerHTML = '<p>Не указана тема</p>');
    const mats = await api(`/materials/${tid}`);
    const d = await getDashboard().catch(() => ({ role: '', user_id: null }));
    const isTeacher = d.role === 'teacher';
    const map = { pdf: 'pdf', video: 'video', audio: 'audio', article: 'article', test: 'test', link: 'article', file: 'pdf' };
    root.innerHTML = `<h2>Материалы</h2><div class="card-grid">${mats.map((m) => `
      <div class="card" data-material="${m.id}">
        <h3>${esc(m.title)}</h3>
        <p class="small">Тип: ${esc(m.type)}</p>
        <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">
          <a class="btn" href="/${map[m.type] || 'pdf'}.html?id=${m.id}">Открыть</a>
          ${isTeacher && (m.can_delete || Number(m.teacher_id) === Number(d.user_id)) ? `
            ${(m.can_edit || (Number(m.teacher_id) === Number(d.user_id) && (m.type === 'article' || m.type === 'test'))) ? `<button class="btn secondary" data-edit="${m.id}" data-type="${m.type}">Редактировать</button>` : ''}
            <button class="btn secondary" data-del="${m.id}">Удалить</button>
          ` : ''}
        </div>
      </div>
    `).join('')}</div>`;

    root.querySelectorAll('[data-edit]').forEach((btn) => {
      btn.onclick = () => {
        const id = btn.dataset.edit;
        const type = btn.dataset.type;
        if (type === 'article') return (location.href = `/article-builder.html?editId=${id}`);
        if (type === 'test') return (location.href = `/test-builder.html?editId=${id}`);
      };
    });
    root.querySelectorAll('[data-del]').forEach((btn) => {
      btn.onclick = async () => {
        if (!confirm('Удалить материал?')) return;
        try {
          await api(`/material/${btn.dataset.del}`, { method: 'DELETE' });
          toast('Удалено');
          await renderMaterialsPage();
        } catch (e) {
          toast(e.message, true);
        }
      };
    });
  }

  async function renderById(idName, render) {
    const root = $(`#${idName}`);
    if (!root) return;
    const id = new URLSearchParams(location.search).get('id');
    const m = await api(`/material/${id}`);
    await render(root, m);
    await renderCommentsSection(root, m.id);
  }

  async function renderCommentsSection(root, materialId) {
    const box = document.createElement('div');
    box.className = 'form';
    box.style.marginTop = '18px';
    box.innerHTML = `
      <h3>Комментарии</h3>
      <div id="comments-list">Загрузка...</div>
      <div class="field" style="margin-top:10px">
        <textarea id="comment-text" class="input" placeholder="Написать комментарий"></textarea>
      </div>
      <button class="btn" id="comment-send">Отправить</button>
    `;
    root.appendChild(box);

    const load = async () => {
      const comments = await api(`/material/${materialId}/comments`);
      const listEl = box.querySelector('#comments-list');
      if (!comments.length) {
        listEl.innerHTML = '<p class="small">Комментариев пока нет</p>';
        return;
      }
      listEl.innerHTML = comments.map((c) => {
        const margin = c.parent_comment_id ? 'margin-left:20px' : '';
        return `<div class="comment-item" style="${margin}">
          <div class="small"><b>${esc(c.user_name)}</b> (${esc(c.user_role)}) · ${new Date(c.created_at).toLocaleString('ru-RU')}</div>
          <div>${esc(c.text)}</div>
          <button class="btn secondary" data-reply="${c.id}" style="margin-top:6px">Ответить</button>
        </div>`;
      }).join('');

      listEl.querySelectorAll('[data-reply]').forEach((btn) => {
        btn.onclick = () => {
          openOverlay({
            title: 'Ответ на комментарий',
            bodyHtml: '<div class="field"><textarea id="reply-text" class="input" placeholder="Ваш ответ"></textarea></div>',
            submitText: 'Отправить',
            onSubmit: async (overlay) => {
              const text = overlay.querySelector('#reply-text')?.value?.trim();
              if (!text) throw new Error('Введите текст ответа');
              await api(`/material/${materialId}/comments`, { method: 'POST', body: { text, parent_comment_id: btn.dataset.reply } });
              await load();
            },
          });
        };
      });
    };

    box.querySelector('#comment-send').onclick = async () => {
      const text = box.querySelector('#comment-text').value.trim();
      if (!text) return;
      try {
        await api(`/material/${materialId}/comments`, { method: 'POST', body: { text } });
        box.querySelector('#comment-text').value = '';
        await load();
      } catch (e) {
        toast(e.message, true);
      }
    };

    await load();
  }

  async function renderNotificationsPage() {
    const root = $('#notifications-root');
    if (!root) return;
    const items = await api('/notifications');
    root.innerHTML = `<h2>Уведомления</h2>${!items.length ? '<p>Уведомлений нет</p>' : `<div class="card-grid">${items.map((n) => `
      <div class="card ${n.is_read ? '' : 'notification-unread'}">
        <p><b>${esc(n.message)}</b></p>
        <p class="small">${new Date(n.created_at).toLocaleString('ru-RU')}</p>
        <div style="margin-top:8px;display:flex;gap:8px">
          ${n.link ? `<button class="btn secondary" data-open="${n.id}" data-link="${esc(n.link)}">Открыть</button>` : ''}
          ${!n.is_read ? `<button class="btn" data-read="${n.id}">Прочитано</button>` : ''}
        </div>
      </div>
    `).join('')}</div>`}`;
    root.querySelectorAll('[data-open]').forEach((btn) => {
      btn.onclick = async () => {
        const id = btn.dataset.open;
        if (id) await api(`/notifications/${id}/read`, { method: 'POST' });
        updateNotificationBadge().catch(() => {});
        location.href = btn.dataset.link;
      };
    });
    root.querySelectorAll('[data-read]').forEach((btn) => {
      btn.onclick = async () => {
        await api(`/notifications/${btn.dataset.read}/read`, { method: 'POST' });
        await renderNotificationsPage();
        updateNotificationBadge().catch(() => {});
      };
    });
  }

  async function renderSearchPage() {
    const root = $('#search-root');
    if (!root) return;
    const classes = await api('/classes');
    root.innerHTML = `
      <h2>Поиск материалов</h2>
      <div class="form">
        <div class="field"><input id="srch-query" class="input" placeholder="Текстовый запрос"></div>
        <div class="row">
          <select id="srch-class" class="input"><option value="">Все классы</option>${classes.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select>
          <select id="srch-subject" class="input"><option value="">Все предметы</option></select>
          <select id="srch-topic" class="input"><option value="">Все темы</option></select>
        </div>
        <div class="field" style="margin-top:10px"><button class="btn" id="srch-run">Найти</button></div>
      </div>
      <div id="srch-results" style="margin-top:16px"></div>
    `;
    const classSel = $('#srch-class', root);
    const subjectSel = $('#srch-subject', root);
    const topicSel = $('#srch-topic', root);
    const resEl = $('#srch-results', root);

    const loadSubjects = async () => {
      if (!classSel.value) {
        subjectSel.innerHTML = '<option value="">Все предметы</option>';
        topicSel.innerHTML = '<option value="">Все темы</option>';
        return;
      }
      const subs = await api(`/subjects/${classSel.value}`);
      subjectSel.innerHTML = `<option value="">Все предметы</option>${subs.map((s) => `<option value="${s.id}">${esc(s.name)}</option>`).join('')}`;
      topicSel.innerHTML = '<option value="">Все темы</option>';
    };
    const loadTopics = async () => {
      if (!subjectSel.value) {
        topicSel.innerHTML = '<option value="">Все темы</option>';
        return;
      }
      const topics = await api(`/topics/${subjectSel.value}`);
      topicSel.innerHTML = `<option value="">Все темы</option>${topics.map((t) => `<option value="${t.id}">${esc(t.name)}</option>`).join('')}`;
    };
    classSel.onchange = loadSubjects;
    subjectSel.onchange = loadTopics;

    $('#srch-run', root).onclick = async () => {
      const query = $('#srch-query', root).value.trim();
      const params = new URLSearchParams();
      if (query) params.set('query', query);
      if (classSel.value) params.set('class_id', classSel.value);
      if (subjectSel.value) params.set('subject_id', subjectSel.value);
      if (topicSel.value) params.set('topic_id', topicSel.value);
      const rows = await api(`/materials/search?${params.toString()}`);
      const map = { pdf: 'pdf', video: 'video', audio: 'audio', article: 'article', test: 'test', link: 'article', file: 'pdf' };
      resEl.innerHTML = !rows.length ? '<p>Ничего не найдено</p>' : `<div class="card-grid">${rows.map((m) => `
        <div class="card">
          <h3>${esc(m.title)}</h3>
          <p class="small">${esc(m.class_name)} → ${esc(m.subject_name)} → ${esc(m.topic_name)}</p>
          <div style="margin-top:10px"><a class="btn" href="/${map[m.type] || 'article'}.html?id=${m.id}">Открыть</a></div>
        </div>
      `).join('')}</div>`;
    };
  }

  async function initUploadPage() {
    const f = $('#upload-page-form');
    if (!f) return;
    const classSel = $('#upload-class');
    const subjSel = $('#upload-subject');
    const topicInput = $('#upload-topic');
    const params = new URLSearchParams(location.search);
    const preClass = params.get('classId');
    const preSubject = params.get('subjectId');

    const d = await getDashboard();
    if (d.role !== 'teacher') {
      f.closest('.form').innerHTML = '<h2>Доступ запрещен</h2><p>Загружать материалы может только учитель.</p>';
      return;
    }
    const classes = d.role === 'teacher' ? (d.classes || []) : await api('/classes');
    classSel.innerHTML = classes.map((c) => `<option value="${c.id}" ${String(preClass) === String(c.id) ? 'selected' : ''}>${esc(c.name)}</option>`).join('');
    if (preClass) classSel.value = preClass;

    const topicField = document.createElement('div');
    topicField.className = 'field';
    topicInput.parentElement.after(topicField);

    const loadSubjects = async () => {
      const cid = classSel.value;
      const subs = await api(`/subjects/${cid}`);
      subjSel.innerHTML = subs.map((s) => `<option value="${s.id}">${esc(s.name)}</option>`).join('');
      if (preSubject) subjSel.value = preSubject;
      const sid = Number(subjSel.value || 0);
      if (!sid) {
        topicField.innerHTML = '';
        topicInput.value = '';
        return;
      }
      await buildTeacherTopicPicker(topicField, sid, (value) => { topicInput.value = value; }, topicInput.value);
    };

    classSel.addEventListener('change', loadSubjects);
    subjSel.addEventListener('change', async () => {
      topicInput.value = '';
      const sid = Number(subjSel.value || 0);
      if (!sid) {
        topicField.innerHTML = '';
        return;
      }
      await buildTeacherTopicPicker(topicField, sid, (value) => { topicInput.value = value; }, '');
    });
    await loadSubjects();

    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const type = $('#upload-type').value;
      const title = f.querySelector('[name="title"]').value.trim();
      const topicId = topicInput.value.trim();
      if (!topicId) return showInfo('Выберите тему', 'Проверка');
      if (type === 'article') return (location.href = `/article-builder.html?topicId=${topicId}&title=${encodeURIComponent(title)}`);
      if (type === 'test') return (location.href = `/test-builder.html?topicId=${topicId}&title=${encodeURIComponent(title)}`);

      const fd = new FormData();
      fd.append('title', title);
      fd.append('type', type);
      fd.append('topicId', topicId);
      const file = $('#upload-file').files[0];
      if (file) fd.append('file', file);
      const url = $('#upload-url').value.trim();
      if (url) fd.append('url', url);

      try { await api('/upload', { method: 'POST', body: fd }); showInfo('Материал загружен', 'Успех'); setTimeout(() => { location.href = '/dashboard.html'; }, 400); } catch (e2) { showInfo(e2.message || 'Ошибка', 'Ошибка'); }
    });
  }

  async function initArticleBuilder() {
    const f = $('#article-builder-form');
    if (!f) return;
    const params = new URLSearchParams(location.search);
    const topicId = params.get('topicId') || '';
    const editId = params.get('editId');
    if (params.get('title')) $('#article-title').value = params.get('title');
    $('#article-topic').value = topicId;

    const d = await getDashboard();
    if (d.role !== 'teacher') {
      f.closest('.form').innerHTML = '<h2>Доступ запрещен</h2><p>Создавать статьи может только учитель.</p>';
      return;
    }
    const classes = d.role === 'teacher' ? (d.classes || []) : await api('/classes');
    $('#article-class').innerHTML = classes.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join('');
    const topicField = document.createElement('div');
    topicField.className = 'field';
    $('#article-topic').parentElement.after(topicField);
    const refreshSubjectsAndTopics = async (selectedTopic = '') => {
      $('#article-subject').innerHTML = (await api(`/subjects/${$('#article-class').value}`)).map((s) => `<option value="${s.id}">${esc(s.name)}</option>`).join('');
      const sid = Number($('#article-subject').value || 0);
      if (!sid) {
        topicField.innerHTML = '';
        $('#article-topic').value = '';
        return;
      }
      await buildTeacherTopicPicker(topicField, sid, (value) => { $('#article-topic').value = value; }, selectedTopic || $('#article-topic').value);
    };
    await refreshSubjectsAndTopics(topicId);

    if (editId) {
      const m = await api(`/material/${editId}`);
      if (m.type !== 'article') {
        f.closest('.form').innerHTML = '<h2>Неверный тип материала</h2>';
        return;
      }
      $('#article-title').value = m.title || '';
      $('#editor').innerHTML = m.content || '';
      if (m.class_id) $('#article-class').value = String(m.class_id);
      await refreshSubjectsAndTopics(m.topic_id || '');
      if (m.subject_id) $('#article-subject').value = String(m.subject_id);
      if (m.topic_id) $('#article-topic').value = String(m.topic_id);
    }
    $('#article-class').addEventListener('change', async () => {
      $('#article-topic').value = '';
      await refreshSubjectsAndTopics();
    });
    $('#article-subject').addEventListener('change', async () => {
      $('#article-topic').value = '';
      const sid = Number($('#article-subject').value || 0);
      if (!sid) return;
      await buildTeacherTopicPicker(topicField, sid, (value) => { $('#article-topic').value = value; }, '');
    });

    const editor = $('#editor');
    const toolbar = $('#editor-toolbar');
    let activeEditor = editor;
    const focusEditor = () => { activeEditor = editor; };
    const runCmd = (cmd, value = null) => {
      if (!activeEditor) return;
      activeEditor.focus();
      document.execCommand(cmd, false, value);
    };
    editor.addEventListener('focus', focusEditor);
    editor.addEventListener('click', focusEditor);

    const insertImageByUrl = () => {
      openOverlay({
        title: 'Вставка изображения',
        bodyHtml: `
          <div class="field"><input id="img-url" class="input" placeholder="URL изображения"></div>
          <div class="field"><input id="img-width" class="input" type="number" placeholder="Ширина (px), например 400"></div>
          <div class="field"><input id="img-height" class="input" type="number" placeholder="Высота (px), например 300"></div>
        `,
        submitText: 'Вставить',
        onSubmit: async (overlay) => {
          const url = overlay.querySelector('#img-url').value.trim();
          const width = overlay.querySelector('#img-width').value.trim();
          const height = overlay.querySelector('#img-height').value.trim();
          if (!url) throw new Error('Введите URL изображения');
          const style = [
            width ? `width:${Number(width)}px` : 'max-width:100%',
            height ? `height:${Number(height)}px` : 'height:auto',
          ].join(';');
          runCmd('insertHTML', `<img src="${esc(url)}" style="${style};" alt="image">`);
        },
      });
    };
    const insertLink = () => {
      openOverlay({
        title: 'Вставка ссылки',
        bodyHtml: '<div class="field"><input id="lnk-url" class="input" placeholder="URL"></div>',
        submitText: 'Вставить',
        onSubmit: async (overlay) => {
          const url = overlay.querySelector('#lnk-url').value.trim();
          if (!url) throw new Error('Введите URL');
          runCmd('createLink', url);
        },
      });
    };
    const insertVideo = () => {
      openOverlay({
        title: 'Вставка видео',
        bodyHtml: '<div class="field"><input id="vid-url" class="input" placeholder="Ссылка YouTube / VK / Vimeo / RuTube"></div>',
        submitText: 'Вставить',
        onSubmit: async (overlay) => {
          const raw = overlay.querySelector('#vid-url').value.trim();
          if (!raw) throw new Error('Введите ссылку на видео');
          const embed = getVideoEmbedUrl(raw);
          if (!embed) throw new Error('Ссылка не распознана');
          runCmd('insertHTML', `<div class="media-preview"><iframe src="${esc(embed)}" frameborder="0" allowfullscreen></iframe></div>`);
        },
      });
    };

    if (toolbar) {
      toolbar.querySelectorAll('[data-cmd]').forEach((btn) => {
        btn.onclick = () => {
          const cmd = btn.dataset.cmd;
          if (cmd === 'h1') return runCmd('formatBlock', 'H1');
          if (cmd === 'h2') return runCmd('formatBlock', 'H2');
          return runCmd(cmd);
        };
      });
      const sizeSel = toolbar.querySelector('#editor-font-size');
      if (sizeSel) {
        sizeSel.onchange = (e) => {
          const val = e.target.value;
          if (!val || !activeEditor) return;
          runCmd('insertHTML', `<span style="font-size:${Number(val)}px;">${document.getSelection()?.toString() || ''}</span>`);
          e.target.value = '';
        };
      }
      const linkBtn = toolbar.querySelector('#editor-link-btn');
      if (linkBtn) linkBtn.onclick = insertLink;
      const imgBtn = toolbar.querySelector('#editor-image-btn');
      if (imgBtn) imgBtn.onclick = insertImageByUrl;
      const vidBtn = toolbar.querySelector('#editor-video-btn');
      if (vidBtn) vidBtn.onclick = insertVideo;
    }

    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const body = { title: $('#article-title').value.trim(), content: $('#editor').innerHTML, topic_id: $('#article-topic').value.trim() };
      if (!body.title || !body.topic_id) return showInfo('Нужно название и тема', 'Проверка');
      try {
        if (editId) {
          await api(`/articles/${editId}`, { method: 'PUT', body });
          showInfo('Статья обновлена', 'Успех');
        } else {
          await api('/articles', { method: 'POST', body });
          showInfo('Статья сохранена', 'Успех');
        }
        setTimeout(() => { location.href = '/dashboard.html'; }, 400);
      } catch (e2) { showInfo(e2.message || 'Ошибка', 'Ошибка'); }
    });
  }

  async function initTestBuilder() {
    const root = $('#test-builder-root');
    if (!root) return;
    const p = new URLSearchParams(location.search);
    const editId = p.get('editId');
    root.innerHTML = `<div class="form"><h2>Создать тест</h2><form id="tb-form"><div class="field"><input class="input" name="title" placeholder="Название" value="${esc(p.get('title') || '')}"></div><div class="field"><select id="tb-class" class="input"></select></div><div class="field"><select id="tb-subject" class="input"></select></div><div class="field"><input class="input" name="topic" id="tb-topic" placeholder="ID темы" value="${esc(p.get('topicId') || '')}"></div><div id="tb-topic-picker-field" class="field"></div><div id="qs"></div><button type="button" class="btn secondary" id="addq">Добавить вопрос</button> <button class="btn" type="submit">Сохранить</button></form></div>`;
    const f = $('#tb-form');
    const qs = $('#qs');
    const classSel = $('#tb-class');
    const subjectSel = $('#tb-subject');
    const topicInput = $('#tb-topic');
    const topicField = $('#tb-topic-picker-field');
    const d = await getDashboard();
    if (d.role !== 'teacher') {
      root.innerHTML = '<div class="form"><h2>Доступ запрещен</h2><p>Создавать тесты может только учитель.</p></div>';
      return;
    }
    const classes = d.role === 'teacher' ? (d.classes || []) : await api('/classes');
    classSel.innerHTML = classes.map((c) => `<option value="${c.id}" ${String(p.get('classId') || '') === String(c.id) ? 'selected' : ''}>${esc(c.name)}</option>`).join('');
    const loadSubjectsAndTopics = async (selectedTopic = '') => {
      subjectSel.innerHTML = (await api(`/subjects/${classSel.value}`)).map((s) => `<option value="${s.id}" ${String(p.get('subjectId') || '') === String(s.id) ? 'selected' : ''}>${esc(s.name)}</option>`).join('');
      const sid = Number(subjectSel.value || 0);
      if (!sid) {
        topicField.innerHTML = '';
        topicInput.value = '';
        return;
      }
      await buildTeacherTopicPicker(topicField, sid, (v) => { topicInput.value = v; }, selectedTopic || topicInput.value);
    };
    await loadSubjectsAndTopics(p.get('topicId') || '');
    classSel.addEventListener('change', async () => {
      topicInput.value = '';
      await loadSubjectsAndTopics();
    });
    subjectSel.addEventListener('change', async () => {
      topicInput.value = '';
      const sid = Number(subjectSel.value || 0);
      if (!sid) return;
      await buildTeacherTopicPicker(topicField, sid, (v) => { topicInput.value = v; }, '');
    });

    let activeEditor = null;
    const focusEditor = (el) => { activeEditor = el; };
    const runCmd = (cmd, value = null) => {
      if (!activeEditor) return;
      activeEditor.focus();
      document.execCommand(cmd, false, value);
    };
    const insertImageByUrl = () => {
      if (!activeEditor) return;
      openOverlay({
        title: 'Вставка изображения',
        bodyHtml: `
          <div class="field"><input id="img-url" class="input" placeholder="URL изображения"></div>
          <div class="field"><input id="img-width" class="input" type="number" placeholder="Ширина (px), например 400"></div>
          <div class="field"><input id="img-height" class="input" type="number" placeholder="Высота (px), например 300"></div>
        `,
        submitText: 'Вставить',
        onSubmit: async (overlay) => {
          const url = overlay.querySelector('#img-url').value.trim();
          const width = overlay.querySelector('#img-width').value.trim();
          const height = overlay.querySelector('#img-height').value.trim();
          if (!url) throw new Error('Введите URL изображения');
          const style = [
            width ? `width:${Number(width)}px` : 'max-width:100%',
            height ? `height:${Number(height)}px` : 'height:auto',
          ].join(';');
          runCmd('insertHTML', `<img src="${esc(url)}" style="${style};" alt="image">`);
        },
      });
    };
    const insertLink = () => {
      if (!activeEditor) return;
      openOverlay({
        title: 'Вставка ссылки',
        bodyHtml: '<div class="field"><input id="lnk-url" class="input" placeholder="URL"></div>',
        submitText: 'Вставить',
        onSubmit: async (overlay) => {
          const url = overlay.querySelector('#lnk-url').value.trim();
          if (!url) throw new Error('Введите URL');
          runCmd('createLink', url);
        },
      });
    };
    const insertVideo = () => {
      if (!activeEditor) return;
      openOverlay({
        title: 'Вставка видео',
        bodyHtml: '<div class="field"><input id="vid-url" class="input" placeholder="Ссылка YouTube / VK / Vimeo / RuTube"></div>',
        submitText: 'Вставить',
        onSubmit: async (overlay) => {
          const raw = overlay.querySelector('#vid-url').value.trim();
          if (!raw) throw new Error('Введите ссылку на видео');
          const embed = getVideoEmbedUrl(raw);
          if (!embed) throw new Error('Ссылка не распознана');
          runCmd('insertHTML', `<div class="media-preview"><iframe src="${esc(embed)}" width="100%" height="320" frameborder="0" allowfullscreen></iframe></div>`);
        },
      });
    };

    const toolbar = document.createElement('div');
    toolbar.className = 'editor-toolbar';
    toolbar.innerHTML = `
      <button type="button" data-cmd="bold"><b>B</b></button>
      <button type="button" data-cmd="italic"><i>I</i></button>
      <button type="button" data-cmd="underline"><u>U</u></button>
      <button type="button" data-cmd="justifyLeft">←</button>
      <button type="button" data-cmd="justifyCenter">↔</button>
      <button type="button" data-cmd="justifyRight">→</button>
      <select id="tb-font-size" class="input" style="width:auto;min-width:120px">
        <option value="">Размер шрифта</option>
        <option value="14">14px</option>
        <option value="16">16px</option>
        <option value="18">18px</option>
        <option value="20">20px</option>
        <option value="24">24px</option>
        <option value="28">28px</option>
      </select>
      <button type="button" id="tb-link-btn">Ссылка</button>
      <button type="button" id="tb-image-btn">Картинка</button>
      <button type="button" id="tb-video-btn">Видео</button>
    `;
    qs.before(toolbar);
    toolbar.querySelectorAll('[data-cmd]').forEach((btn) => {
      btn.onclick = () => runCmd(btn.dataset.cmd);
    });
    toolbar.querySelector('#tb-link-btn').onclick = insertLink;
    toolbar.querySelector('#tb-image-btn').onclick = insertImageByUrl;
    toolbar.querySelector('#tb-video-btn').onclick = insertVideo;
    toolbar.querySelector('#tb-font-size').onchange = (e) => {
      const val = e.target.value;
      if (!val || !activeEditor) return;
      runCmd('insertHTML', `<span style="font-size:${Number(val)}px;">${document.getSelection()?.toString() || ''}</span>`);
      e.target.value = '';
    };

    const addQ = (data = null) => {
      const d = document.createElement('div');
      d.className = 'card test-q';
      d.style.margin = '8px 0';
      d.innerHTML = `
        <div class="space-between">
          <div class="small">Вопрос</div>
          <button type="button" class="btn secondary" data-remove>Удалить</button>
        </div>
        <div class="rich-edit" contenteditable="true" data-q style="min-height:80px;border:1px solid #e5e7eb;border-radius:8px;padding:8px"></div>
        <div class="field" style="margin-top:8px">
          <select class="input" data-qtype>
            <option value="test">Тип вопроса: Тест</option>
            <option value="number">Тип вопроса: Число</option>
            <option value="text">Тип вопроса: Текст</option>
          </select>
        </div>
        <div data-answers>
          <div class="small" style="margin-top:8px">Ответ 1</div>
          <div class="rich-edit" contenteditable="true" data-a="0" style="min-height:48px;border:1px solid #e5e7eb;border-radius:8px;padding:8px"></div>
          <div class="small" style="margin-top:8px">Ответ 2</div>
          <div class="rich-edit" contenteditable="true" data-a="1" style="min-height:48px;border:1px solid #e5e7eb;border-radius:8px;padding:8px"></div>
          <div class="small" style="margin-top:8px">Ответ 3</div>
          <div class="rich-edit" contenteditable="true" data-a="2" style="min-height:48px;border:1px solid #e5e7eb;border-radius:8px;padding:8px"></div>
          <div class="small" style="margin-top:8px">Ответ 4</div>
          <div class="rich-edit" contenteditable="true" data-a="3" style="min-height:48px;border:1px solid #e5e7eb;border-radius:8px;padding:8px"></div>
          <input class="input" data-correct type="number" min="1" max="4" placeholder="Правильный ответ 1-4" style="margin-top:8px">
        </div>
        <div data-number style="display:none">
          <input class="input" data-number-input type="number" step="any" placeholder="Правильное число" style="margin-top:8px">
        </div>
        <div data-text style="display:none">
          <input class="input" data-text-input placeholder="Правильный текст" style="margin-top:8px">
        </div>
        <textarea class="input" data-ccomment placeholder="Комментарий при правильном ответе" style="margin-top:8px"></textarea>
        <textarea class="input" data-wcomment placeholder="Комментарий при неправильном ответе" style="margin-top:8px"></textarea>
      `;
      d.querySelectorAll('.rich-edit').forEach((ed) => {
        ed.addEventListener('focus', () => focusEditor(ed));
        ed.addEventListener('click', () => focusEditor(ed));
      });
      const typeSel = d.querySelector('[data-qtype]');
      const answersWrap = d.querySelector('[data-answers]');
      const numberWrap = d.querySelector('[data-number]');
      const textWrap = d.querySelector('[data-text]');
      const syncType = () => {
        const t = typeSel.value;
        answersWrap.style.display = t === 'test' ? '' : 'none';
        numberWrap.style.display = t === 'number' ? '' : 'none';
        textWrap.style.display = t === 'text' ? '' : 'none';
      };
      typeSel.addEventListener('change', syncType);
      d.querySelector('[data-remove]').onclick = () => d.remove();
      if (data) {
        d.querySelector('[data-q]').innerHTML = data.question || '';
        typeSel.value = data.question_type || 'test';
        d.querySelector('[data-ccomment]').value = data.correct_comment || '';
        d.querySelector('[data-wcomment]').value = data.wrong_comment || '';
        if (typeSel.value === 'test') {
          const answers = Array.isArray(data.answers) ? data.answers : [];
          const correctIdx = answers.findIndex((a) => a.is_correct);
          d.querySelector('[data-correct]').value = correctIdx >= 0 ? String(correctIdx + 1) : '';
          d.querySelectorAll('[data-a]').forEach((aEl) => {
            const idx = Number(aEl.getAttribute('data-a'));
            aEl.innerHTML = answers[idx]?.answer || '';
          });
        } else if (typeSel.value === 'number') {
          d.querySelector('[data-number-input]').value = data.correct_number ?? '';
        } else if (typeSel.value === 'text') {
          d.querySelector('[data-text-input]').value = data.correct_text || '';
        }
      }
      syncType();
      qs.appendChild(d);
    };
    $('#addq').onclick = () => addQ();

    if (editId) {
      const m = await api(`/material/${editId}`);
      if (m.type !== 'test') {
        root.innerHTML = '<div class="form"><h2>Неверный тип материала</h2></div>';
        return;
      }
      const t = await api(`/test/${editId}`);
      f.querySelector('[name="title"]').value = t.title || m.title || '';
      if (m.class_id) classSel.value = String(m.class_id);
      await loadSubjectsAndTopics(m.topic_id || '');
      if (m.subject_id) subjectSel.value = String(m.subject_id);
      if (m.topic_id) topicInput.value = String(m.topic_id);
      qs.innerHTML = '';
      (t.questions || []).forEach((q) => addQ(q));
    } else {
      addQ();
    }

    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(f);
      const title = String(fd.get('title') || '').trim();
      const topic_id = String(fd.get('topic') || '').trim();
      const questions = [];
      const errors = [];
      const cards = Array.from(qs.querySelectorAll('.test-q'));
      cards.forEach((card, idx) => {
        const q = card.querySelector('[data-q]')?.innerHTML?.trim() || '';
        if (!q) return;
        const type = card.querySelector('[data-qtype]')?.value || 'test';
        const correct_comment = String(card.querySelector('[data-ccomment]')?.value || '').trim();
        const wrong_comment = String(card.querySelector('[data-wcomment]')?.value || '').trim();
        if (type === 'test') {
          const correctIndex = Number(card.querySelector('[data-correct]')?.value || '');
          const answers = [0, 1, 2, 3].map((n) => {
            const answerHtml = card.querySelector(`[data-a="${n}"]`)?.innerHTML?.trim() || '';
            return {
              text: answerHtml,
              correct: correctIndex === n + 1,
            };
          }).filter((a) => a.text);
          if (!answers.length || !answers.some((a) => a.correct)) {
            errors.push(`Вопрос ${idx + 1}: укажите ответы и правильный вариант`);
            return;
          }
          questions.push({ question: q, question_type: 'test', answers, correct_comment, wrong_comment });
        } else if (type === 'number') {
          const val = String(card.querySelector('[data-number-input]')?.value || '').trim();
          const num = Number(val);
          if (val === '' || Number.isNaN(num)) {
            errors.push(`Вопрос ${idx + 1}: укажите правильное число`);
            return;
          }
          questions.push({ question: q, question_type: 'number', correct_number: num, correct_comment, wrong_comment });
        } else {
          const text = String(card.querySelector('[data-text-input]')?.value || '').trim();
          if (!text) {
            errors.push(`Вопрос ${idx + 1}: укажите правильный текст`);
            return;
          }
          questions.push({ question: q, question_type: 'text', correct_text: text, correct_comment, wrong_comment });
        }
      });
      if (!title || !topic_id || !questions.length) return showInfo('Заполните форму', 'Проверка');
      if (errors.length) return showInfo(errors.join('\n'), 'Проверка');
      try {
        if (editId) {
          await api(`/tests/${editId}`, { method: 'PUT', body: { title, topic_id, questions } });
          showInfo('Тест обновлен', 'Успех');
        } else {
          await api('/tests', { method: 'POST', body: { title, topic_id, questions } });
          showInfo('Тест создан', 'Успех');
        }
        setTimeout(() => { location.href = '/dashboard.html'; }, 400);
      } catch (e2) { showInfo(e2.message || 'Ошибка', 'Ошибка'); }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    loginInit();
    initNav();
    initMobileMenu();
    if ($('#dashboard-root')) renderDashboard().catch((e) => ($('#dashboard-root').innerHTML = `<p style="color:red">${esc(e.message)}</p>`));
    if ($('#classes-root')) renderClassesPage().catch(console.error);
    if ($('#subjects-root')) renderSubjectsPage().catch(console.error);
    if ($('#topics-root')) renderTopicsPage().catch(console.error);
    if ($('#material-root')) renderMaterialsPage().catch(console.error);
    if ($('#pdf-root')) renderById('pdf-root', (r, m) => renderPdfViewer(r, m)).catch(console.error);
    if ($('#audio-root')) renderById('audio-root', async (r, m) => {
      r.innerHTML = `<h2>${esc(m.title)}</h2><audio id="audio-player-main" class="audio-player" controls src="${esc(m.file_url || '')}"></audio>`;
      await ensurePlyr();
      if (window.Plyr) new window.Plyr('#audio-player-main', { controls: ['play', 'progress', 'current-time', 'mute', 'volume', 'settings'] });
    }).catch(console.error);
    if ($('#video-root')) renderById('video-root', async (r, m) => {
      const u = String(m.file_url || '');
      const embed = getVideoEmbedUrl(u);
      const isDirect = /\.(mp4|webm|m3u8|ogg)(\?.*)?$/i.test(u);
      if (embed) {
        r.innerHTML = `<h2>${esc(m.title)}</h2><div class="media-preview"><iframe id="video-embed-main" width="100%" height="420" src="${esc(embed)}" frameborder="0" allowfullscreen></iframe></div>`;
      } else if (isDirect) {
        r.innerHTML = `<h2>${esc(m.title)}</h2><video id="video-player-main" class="video-player" controls src="${esc(u)}"></video>`;
        await ensurePlyr();
        if (window.Plyr) new window.Plyr('#video-player-main', { controls: ['play', 'progress', 'current-time', 'mute', 'volume', 'fullscreen'] });
      } else {
        r.innerHTML = `<h2>${esc(m.title)}</h2><div class="card"><p>Не удалось встроить плеер для этой ссылки.</p><a class="btn" target="_blank" rel="noopener" href="${esc(u)}">Открыть ссылку</a></div>`;
      }
    }).catch(console.error);
    if ($('#article-root')) renderById('article-root', (r, m) => { r.innerHTML = `<h2>${esc(m.title)}</h2>${m.type === 'link' ? `<div class="card"><a class="btn" target="_blank" rel="noopener" href="${esc(m.file_url || '')}">Открыть ссылку</a></div>` : `<div class="card">${m.content || '<p>Пусто</p>'}</div>`}`; }).catch(console.error);
    if ($('#test-root')) renderById('test-root', async (r, m) => {
      const t = await api(`/test/${m.id}`);
      const form = document.createElement('form');
      form.className = 'form';
      form.innerHTML = `<h2>${esc(t.title)}</h2>`;
      t.questions.forEach((q, i) => {
        const d = document.createElement('div');
        d.className = 'field';
        if (!q.question_type || q.question_type === 'test') {
          d.innerHTML = `<div><strong>${i + 1}.</strong> <span>${q.question}</span></div>${(q.answers || []).map((a) => `<label style="display:block"><input type="radio" name="q${q.id}" value="${a.id}"> <span>${a.answer}</span></label>`).join('')}`;
        } else if (q.question_type === 'number') {
          d.innerHTML = `<div><strong>${i + 1}.</strong> <span>${q.question}</span></div><input class="input" type="number" step="any" name="q${q.id}" placeholder="Ваш ответ">`;
        } else {
          d.innerHTML = `<div><strong>${i + 1}.</strong> <span>${q.question}</span></div><input class="input" type="text" name="q${q.id}" placeholder="Ваш ответ">`;
        }
        form.appendChild(d);
      });
      const b = document.createElement('button');
      b.className = 'btn'; b.type = 'submit'; b.textContent = 'Проверить';
      form.appendChild(b);
      form.onsubmit = (e) => {
        e.preventDefault();
        let ok = 0;
        const details = [];
        t.questions.forEach((q, idx) => {
          let isCorrect = false;
          let selectedAnswer = null;
          let correctAnswer = null;
          if (!q.question_type || q.question_type === 'test') {
            const selected = form.querySelector(`input[name="q${q.id}"]:checked`);
            correctAnswer = (q.answers || []).find((x) => x.is_correct);
            selectedAnswer = selected ? (q.answers || []).find((x) => Number(x.id) === Number(selected.value)) : null;
            if (selectedAnswer && selectedAnswer.is_correct) isCorrect = true;
          } else if (q.question_type === 'number') {
            const val = form.querySelector(`input[name="q${q.id}"]`)?.value;
            const num = Number(val);
            const correctNum = Number(q.correct_number);
            if (!Number.isNaN(num) && !Number.isNaN(correctNum) && Math.abs(num - correctNum) < 1e-9) isCorrect = true;
            selectedAnswer = { answer: val || 'не выбран' };
            correctAnswer = { answer: Number.isNaN(correctNum) ? 'не задан' : String(correctNum) };
          } else {
            const val = String(form.querySelector(`input[name="q${q.id}"]`)?.value || '').trim();
            const correctText = String(q.correct_text || '').trim();
            if (val && correctText && val.toLowerCase() === correctText.toLowerCase()) isCorrect = true;
            selectedAnswer = { answer: val || 'не выбран' };
            correctAnswer = { answer: correctText || 'не задан' };
          }
          if (isCorrect) ok += 1;
          details.push(`
            <div class="field">
              <div><b>${idx + 1}. ${q.question}</b></div>
              <div class="small">Ваш ответ: ${selectedAnswer ? selectedAnswer.answer : 'не выбран'}</div>
              <div class="small">Правильный ответ: ${correctAnswer ? correctAnswer.answer : 'не задан'}</div>
              ${isCorrect && q.correct_comment ? `<div style="margin-top:6px;padding:8px;border-left:3px solid #16a34a;background:#ecfdf5"><b>Комментарий учителя:</b><div>${esc(q.correct_comment)}</div></div>` : ''}
              ${!isCorrect && q.wrong_comment ? `<div style="margin-top:6px;padding:8px;border-left:3px solid #b91c1c;background:#fef2f2"><b>Комментарий учителя:</b><div>${esc(q.wrong_comment)}</div></div>` : ''}
            </div>
          `);
        });
        openOverlay({
          title: `Результат: ${ok} из ${t.questions.length}`,
          bodyHtml: details.join(''),
          hideSubmit: true,
        });
      };
      r.innerHTML = ''; r.appendChild(form);
    }).catch(console.error);
    if ($('#notifications-root')) renderNotificationsPage().catch(console.error);
    if ($('#search-root')) renderSearchPage().catch(console.error);
    if ($('#upload-page-form')) initUploadPage().catch(console.error);
    if ($('#article-builder-form')) initArticleBuilder().catch(console.error);
    if ($('#test-builder-root')) initTestBuilder().catch(console.error);
  });
})();

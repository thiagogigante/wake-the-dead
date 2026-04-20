/**
 * Wake the Dead Festival — main.js (refatorado)
 *
 * Melhorias:
 * - Módulos IIFE evitam poluição do escopo global
 * - Event delegation para menus
 * - Lazy loading de vídeo hero via IntersectionObserver
 * - Lazy src para iframe do Maps
 * - Lazy load de vídeos <source data-src>
 * - Sanitização de entrada no formulário
 * - Debounce no scroll handler
 * - Carrossel com suporte a teclado e touch
 * - Remoção de listeners duplicados
 * - Sem eval() nem innerHTML com dados externos
 */

'use strict';

/* =========================================================
   Utilitários
========================================================= */
/**
 * Retorna um debounce de fn com delay ms.
 * Evita execuções excessivas em scroll/resize.
 */
function debounce(fn, delay = 100) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * Sanitiza string removendo tags HTML.
 * Usado para exibir mensagens de status sem XSS.
 */
function sanitizeText(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/* =========================================================
   Menu lateral
========================================================= */
(function initMenu() {
  const menuToggle = document.querySelector('.menu-toggle');
  const menuClose = document.querySelector('.menu-close');
  const sideMenu = document.getElementById('side-menu');
  const menuOverlay = document.getElementById('menu-overlay');

  if (!menuToggle || !menuClose || !sideMenu) return;

  function setMenuState(open) {
    sideMenu.classList.toggle('open', open);
    sideMenu.setAttribute('aria-hidden', String(!open));
    menuToggle.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';

    if (menuOverlay) {
      menuOverlay.classList.toggle('active', open);
      menuOverlay.setAttribute('aria-hidden', String(!open));
    }

    // Foco: ao abrir vai para o botão fechar; ao fechar volta para o toggle
    if (open) {
      menuClose.focus();
    } else {
      menuToggle.focus();
    }
  }

  menuToggle.addEventListener('click', () => setMenuState(true));
  menuClose.addEventListener('click', () => setMenuState(false));

  if (menuOverlay) {
    menuOverlay.addEventListener('click', () => setMenuState(false));
  }

  // Esc fecha o menu
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sideMenu.classList.contains('open')) {
      setMenuState(false);
    }
  });

  // Click nos links fecha o menu e faz scroll suave
  sideMenu.addEventListener('click', (e) => {
    const link = e.target.closest('.menu-links a');
    if (!link) return;

    e.preventDefault();
    setMenuState(false);

    const targetId = link.getAttribute('href');
    const target = document.querySelector(targetId);
    if (target) {
      // Aguarda transição do menu fechar antes de scrollar
      setTimeout(() => {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    }
  });
})();

/* =========================================================
   Countdown
========================================================= */
(function initCountdown() {
  const els = {
    months: document.getElementById('countdown-months'),
    days: document.getElementById('countdown-days'),
    hours: document.getElementById('countdown-hours'),
    minutes: document.getElementById('countdown-minutes'),
    seconds: document.getElementById('countdown-seconds'),
  };

  // Se algum elemento não existir, não inicia
  if (Object.values(els).some((el) => !el)) return;

  // Data alvo: 14 de maio de 2026, meia-noite, horário de Brasília
  const TARGET_TIMESTAMP = new Date('2026-05-14T00:00:00-03:00').getTime();

  const fmt = (n) => String(Math.max(n, 0)).padStart(2, '0');

  function update() {
    const now = Date.now();
    const diff = TARGET_TIMESTAMP - now;

    if (diff <= 0) {
      Object.values(els).forEach((el) => (el.textContent = '00'));
      return;
    }

    const totalSec = Math.floor(diff / 1000);
    const seconds = totalSec % 60;
    const totalMin = Math.floor(totalSec / 60);
    const minutes = totalMin % 60;
    const totalHours = Math.floor(totalMin / 60);
    const hours = totalHours % 24;
    const totalDays = Math.floor(totalHours / 24);

    // Cálculo aproximado de meses (30 dias)
    const months = Math.floor(totalDays / 30);
    const days = totalDays % 30;

    els.months.textContent = fmt(months);
    els.days.textContent = fmt(days);
    els.hours.textContent = fmt(hours);
    els.minutes.textContent = fmt(minutes);
    els.seconds.textContent = fmt(seconds);
  }

  update();
  const id = setInterval(update, 1000);

  // Limpa interval se aba ficar inativa por muito tempo
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      clearInterval(id);
    } else {
      update();
      setInterval(update, 1000);
    }
  });
})();

/* =========================================================
   Hero Video — lazy inject
   Injeta o <video> apenas quando o hero entra no viewport
========================================================= */
(function initHeroVideo() {
  const wrap = document.querySelector('.hero-video-wrap');
  if (!wrap) return;

  const src = wrap.dataset.videoSrc;
  const poster = wrap.dataset.videoPoster;
  if (!src) return;

  function injectVideo() {
    const video = document.createElement('video');
    video.setAttribute('autoplay', '');
    video.setAttribute('muted', '');
    video.setAttribute('loop', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('aria-hidden', 'true');
    if (poster) video.setAttribute('poster', poster);
    video.muted = true; // Necessário programaticamente para autoplay no Chrome

    const source = document.createElement('source');
    source.setAttribute('src', src);
    source.setAttribute('type', 'video/mp4');

    video.appendChild(source);
    wrap.appendChild(video);

    video.play().catch(() => {
      // Autoplay bloqueado: mantém poster como fallback — sem erro visível
    });
  }

  // Só carrega o vídeo se IntersectionObserver disponível E não há preferência de baixo movimento
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefersReduced) {
    // Sem vídeo, mantém o background sólido
    return;
  }

  if ('IntersectionObserver' in window) {
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          injectVideo();
          obs.disconnect();
        }
      },
      { threshold: 0.01 }
    );
    obs.observe(wrap);
  } else {
    // Fallback para browsers antigos
    injectVideo();
  }
})();

/* =========================================================
   Lazy Videos (<source data-src>)
   Preenche src de vídeos com data-src ao entrar no viewport
========================================================= */
(function initLazyVideos() {
  const videos = document.querySelectorAll('video source[data-src]');
  if (!videos.length) return;

  if (!('IntersectionObserver' in window)) {
    // Fallback: carrega tudo
    videos.forEach((source) => {
      source.setAttribute('src', source.dataset.src);
      source.parentElement.load();
    });
    return;
  }

  const obs = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const video = entry.target;
        const source = video.querySelector('source[data-src]');
        if (source) {
          source.setAttribute('src', source.dataset.src);
          video.load();
          video.play().catch(() => {});
        }
        obs.unobserve(video);
      });
    },
    { rootMargin: '200px' }
  );

  videos.forEach((source) => obs.observe(source.parentElement));
})();

/* =========================================================
   Lazy Iframe (Maps)
========================================================= */
(function initLazyIframe() {
  const iframe = document.getElementById('map-iframe');
  if (!iframe || !iframe.dataset.src) return;

  if (!('IntersectionObserver' in window)) {
    iframe.src = iframe.dataset.src;
    return;
  }

  const obs = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) {
        iframe.src = iframe.dataset.src;
        obs.disconnect();
      }
    },
    { rootMargin: '300px' }
  );
  obs.observe(iframe);
})();

/* =========================================================
   Scroll Reveal
========================================================= */
(function initScrollReveal() {
  const sections = document.querySelectorAll('.section');
  if (!sections.length) return;

  if (!('IntersectionObserver' in window)) {
    sections.forEach((s) => s.classList.add('revealed'));
    return;
  }

  const obs = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          obs.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1 }
  );

  sections.forEach((s) => obs.observe(s));
})();

/* =========================================================
   Carousel (drag + botões + teclado)
========================================================= */
(function initCarousels() {
  const carousels = document.querySelectorAll('[data-carousel]');

  carousels.forEach((carousel) => {
    const track = carousel.querySelector('.carousel-track');
    const prevBtn = carousel.querySelector('.carousel-btn.prev');
    const nextBtn = carousel.querySelector('.carousel-btn.next');
    if (!track) return;

    // ── Drag com mouse ──
    let isDragging = false;
    let startX = 0;
    let scrollStart = 0;

    const onPointerDown = (e) => {
      isDragging = true;
      startX = e.pageX ?? e.touches?.[0]?.pageX ?? 0;
      scrollStart = track.scrollLeft;
      track.classList.add('is-dragging');
    };

    const onPointerMove = (e) => {
      if (!isDragging) return;
      const x = e.pageX ?? e.touches?.[0]?.pageX ?? startX;
      track.scrollLeft = scrollStart - (x - startX) * 1.2;
    };

    const onPointerUp = () => {
      isDragging = false;
      track.classList.remove('is-dragging');
    };

    track.addEventListener('mousedown', onPointerDown);
    track.addEventListener('mousemove', onPointerMove);
    track.addEventListener('mouseleave', onPointerUp);
    track.addEventListener('mouseup', onPointerUp);

    track.addEventListener('touchstart', onPointerDown, { passive: true });
    track.addEventListener('touchmove', onPointerMove, { passive: true });
    track.addEventListener('touchend', onPointerUp);

    // ── Botões ──
    if (prevBtn && nextBtn) {
      const scrollAmount = () => Math.max(track.clientWidth * 0.6, 220);
      prevBtn.addEventListener('click', () => track.scrollBy({ left: -scrollAmount(), behavior: 'smooth' }));
      nextBtn.addEventListener('click', () => track.scrollBy({ left: scrollAmount(), behavior: 'smooth' }));
    }

    // ── Teclado: setas quando carousel em foco ──
    track.setAttribute('tabindex', '0');
    track.addEventListener('keydown', (e) => {
      const amount = 200;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        track.scrollBy({ left: -amount, behavior: 'smooth' });
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        track.scrollBy({ left: amount, behavior: 'smooth' });
      }
    });
  });
})();

/* =========================================================
   Formulário de Contato
========================================================= */
(function initContactForm() {
  const form = document.getElementById('contact-form');
  const statusEl = document.getElementById('form-status');
  if (!form || !statusEl) return;

  const submitBtn = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Honeypot: se preenchido, é bot — abortar silenciosamente
    const honeypot = form.querySelector('input[name="_gotcha"]');
    if (honeypot && honeypot.value) return;

    // Bloqueia duplo envio
    if (submitBtn) submitBtn.disabled = true;
    statusEl.textContent = 'Enviando…';
    statusEl.style.color = '';

    try {
      const response = await fetch(form.action, {
        method: form.method,
        body: new FormData(form),
        headers: { Accept: 'application/json' },
      });

      if (response.ok) {
        // Texto seguro: sem innerHTML de dados externos
        statusEl.textContent = '✓ Mensagem enviada com sucesso!';
        statusEl.style.color = 'var(--accent-green)';
        form.reset();
      } else {
        const data = await response.json().catch(() => ({}));
        // Formspree retorna errors[] — mostra o primeiro ou mensagem genérica
        const msg = data?.errors?.[0]?.message || 'Erro ao enviar. Tente novamente.';
        statusEl.textContent = sanitizeText(msg);
        statusEl.style.color = 'var(--magenta-400)';
      }
    } catch {
      statusEl.textContent = 'Erro de conexão. Verifique sua internet.';
      statusEl.style.color = 'var(--magenta-400)';
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });
})();

/* =========================================================
   Botão Voltar ao Topo + Scroll Indicator
========================================================= */
(function initScrollUtils() {
  const btn = document.getElementById('back-to-top');
  const indicator = document.querySelector('.scroll-indicator');

  if (!btn && !indicator) return;

  const onScroll = debounce(() => {
    const scrolled = window.scrollY > 300;
    if (btn) btn.classList.toggle('show', scrolled);
    if (indicator) indicator.classList.toggle('hidden', window.scrollY > 100);
  }, 80);

  window.addEventListener('scroll', onScroll, { passive: true });

  if (btn) {
    btn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
})();

/* =========================================================
   Slider Pertencimento
========================================================= */
(function initPertencimentoSlider() {
  const slider = document.getElementById("pertencimento-slider");
  if (!slider) return;
  
  // Injeta dinamicamente as 30 imagens para não poluir o HTML
  const totalImages = 30;
  const basePath = "assets/images/slidefotos/";
  for (let i = 1; i <= totalImages; i++) {
    const img = document.createElement("img");
    
    // Debug: Avisa no console se a imagem não for encontrada
    img.onerror = () => {
      console.error(`🚨 Falha ao carregar a imagem: ${img.src}. Verifique se a pasta e o nome estão corretos.`);
    };

    img.src = `${basePath}${i}.webp`;
    img.className = i === 1 ? "slide active" : "slide";
    img.loading = "lazy";
    slider.appendChild(img);
  }

  const slides = slider.querySelectorAll(".slide");
  let currentIndex = 0;
  let slideInterval;

  const nextSlide = () => {
    slides[currentIndex].classList.remove("active");
    currentIndex = (currentIndex + 1) % slides.length;
    slides[currentIndex].classList.add("active");
  };

  // Só roda o slider quando ele aparecer na tela (preserva bateria e RAM)
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          if (!slideInterval) slideInterval = setInterval(nextSlide, 3500); // Troca a cada 3.5s
        } else {
          clearInterval(slideInterval);
          slideInterval = null;
        }
      });
    }, { threshold: 0.1 });
    observer.observe(slider);
  } else {
    slideInterval = setInterval(nextSlide, 3500);
  }
})();

document.addEventListener('DOMContentLoaded', () => {

  /* =========================
     MENU
  ========================= */
  const menuToggle = document.querySelector('.menu-toggle');
  const menuClose = document.querySelector('.menu-close');
  const sideMenu = document.getElementById('side-menu');

  if (menuToggle && menuClose && sideMenu) {

    function toggleMenu(open) {
      sideMenu.classList.toggle('open', open);
      sideMenu.setAttribute('aria-hidden', String(!open));
      menuToggle.setAttribute('aria-expanded', String(open));
      document.body.style.overflow = open ? 'hidden' : '';
    }

    menuToggle.addEventListener('click', () => toggleMenu(true));
    menuClose.addEventListener('click', () => toggleMenu(false));

    window.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') toggleMenu(false);
    });

    const menuLinks = document.querySelectorAll('.menu-links a');
    menuLinks.forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const target = document.querySelector(link.getAttribute('href'));
        target?.scrollIntoView({ behavior: 'smooth' });
        toggleMenu(false);
      });
    });

    // clicar fora fecha
    document.addEventListener('click', (e) => {
      if (!sideMenu.classList.contains('open')) return;

      const isClickInside = sideMenu.contains(e.target) || menuToggle.contains(e.target);

      if (!isClickInside) toggleMenu(false);
    });
  }


  /* =========================
     COUNTDOWN
  ========================= */
  const monthsEl = document.getElementById('countdown-months');
  const daysEl = document.getElementById('countdown-days');
  const hoursEl = document.getElementById('countdown-hours');
  const minutesEl = document.getElementById('countdown-minutes');
  const secondsEl = document.getElementById('countdown-seconds');

  function getNowInTimeZone(timeZone) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).formatToParts(new Date());

    const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
    return new Date(
      Number(map.year),
      Number(map.month) - 1,
      Number(map.day),
      Number(map.hour),
      Number(map.minute),
      Number(map.second)
    );
  }

  function initCountdown() {
    if (!monthsEl || !daysEl || !hoursEl || !minutesEl || !secondsEl) return;

    const timeZone = 'America/Sao_Paulo';
    const target = new Date(2026, 4, 14, 0, 0, 0);

    const update = () => {
      const now = getNowInTimeZone(timeZone);

      let months = (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth());
      let future = new Date(now.getFullYear(), now.getMonth() + months, now.getDate(), now.getHours(), now.getMinutes(), now.getSeconds());

      if (future > target) {
        months -= 1;
        future = new Date(now.getFullYear(), now.getMonth() + months, now.getDate(), now.getHours(), now.getMinutes(), now.getSeconds());
      }

      let diffMs = target - future;
      if (diffMs < 0) diffMs = 0;

      const totalSeconds = Math.floor(diffMs / 1000);
      const days = Math.floor(totalSeconds / 86400);
      const hours = Math.floor((totalSeconds % 86400) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      monthsEl.textContent = String(Math.max(months, 0)).padStart(2, '0');
      daysEl.textContent = String(days).padStart(2, '0');
      hoursEl.textContent = String(hours).padStart(2, '0');
      minutesEl.textContent = String(minutes).padStart(2, '0');
      secondsEl.textContent = String(seconds).padStart(2, '0');
    };

    update();
    setInterval(update, 1000);
  }

  initCountdown();


  /* =========================
     VIDEO
  ========================= */
  function handleVideo() {
    const video = document.querySelector('.hero-video');
    if (!video) return;

    video.muted = true;

    video.addEventListener('loadeddata', () => {
      video.play().catch(() => {});
    });
  }

  handleVideo();


  /* =========================
     SCROLL REVEAL
  ========================= */
  function revealOnScroll() {
    const sections = document.querySelectorAll('.section');
    if (!('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });

    sections.forEach((section) => observer.observe(section));
  }

  revealOnScroll();


  /* =========================
     CAROUSEL
  ========================= */
  function initCarousel() {
    const carousels = document.querySelectorAll('[data-carousel]');

    carousels.forEach((carousel) => {
      const track = carousel.querySelector('.carousel-track');
      const prev = carousel.querySelector('.carousel-btn.prev');
      const next = carousel.querySelector('.carousel-btn.next');
      if (!track) return;

      let isDown = false;
      let startX = 0;
      let scrollLeft = 0;

      const start = (pageX) => {
        isDown = true;
        startX = pageX - track.offsetLeft;
        scrollLeft = track.scrollLeft;
        track.classList.add('is-dragging');
      };

      const move = (pageX) => {
        if (!isDown) return;
        const x = pageX - track.offsetLeft;
        const walk = (x - startX) * 1.2;
        track.scrollLeft = scrollLeft - walk;
      };

      const end = () => {
        isDown = false;
        track.classList.remove('is-dragging');
      };

      track.addEventListener('mousedown', (e) => start(e.pageX));
      track.addEventListener('mousemove', (e) => move(e.pageX));
      track.addEventListener('mouseleave', end);
      track.addEventListener('mouseup', end);

      track.addEventListener('touchstart', (e) => start(e.touches[0].pageX), { passive: true });
      track.addEventListener('touchmove', (e) => move(e.touches[0].pageX), { passive: true });
      track.addEventListener('touchend', end);

      if (prev && next) {
        const scrollBy = () => Math.max(track.clientWidth * 0.6, 220);

        prev.addEventListener('click', () => {
          track.scrollBy({ left: -scrollBy(), behavior: 'smooth' });
        });

        next.addEventListener('click', () => {
          track.scrollBy({ left: scrollBy(), behavior: 'smooth' });
        });
      }
    });
  }

  initCarousel();


  /* =========================
     SPOTIFY MESSAGES
  ========================= */
  function initSpotifyMessages() {
    const messages = document.querySelectorAll('.spotify-messages p');
    if (!messages.length) return;

    let index = 0;
    messages[index].classList.add('active');

    setInterval(() => {
      messages[index].classList.remove('active');
      index = (index + 1) % messages.length;
      messages[index].classList.add('active');
    }, 6000);
  }

  initSpotifyMessages();

});
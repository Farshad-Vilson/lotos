/* =====================================================================
   چینی لوتوس — رفتارهای صفحه
   بدون هیچ کتابخانهٔ بیرونی؛ همهٔ بخش‌ها در صورت نبود جاوااسکریپت
   نیز قابل استفاده می‌مانند.
   ===================================================================== */
(function () {
  'use strict';

  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));
  const PHONE = '09138900700';

  /** ساخت پیوند واتساپ با متن آماده. */
  function waLink(text) {
    return `https://wa.me/98${PHONE.replace(/^0/, '')}?text=${encodeURIComponent(text)}`;
  }

  /* ---------------------------------------------------------------
     سرصفحهٔ چسبان
     --------------------------------------------------------------- */
  const head = $('#siteHead');
  if (head) {
    const onScroll = () => head.classList.toggle('is-stuck', window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---------------------------------------------------------------
     منوی موبایل
     --------------------------------------------------------------- */
  const drawer = $('#drawer');
  const burger = $('#burger');
  const drawerClose = $('#drawerClose');

  function openDrawer() {
    drawer.hidden = false;
    drawer.classList.add('is-open');
    document.body.classList.add('is-locked');
    burger.setAttribute('aria-expanded', 'true');
    if (drawerClose) drawerClose.focus();
  }

  function closeDrawer() {
    drawer.classList.remove('is-open');
    drawer.hidden = true;
    document.body.classList.remove('is-locked');
    burger.setAttribute('aria-expanded', 'false');
    burger.focus();
  }

  if (drawer && burger) {
    burger.addEventListener('click', openDrawer);
    if (drawerClose) drawerClose.addEventListener('click', closeDrawer);
    $$('.drawer__nav a', drawer).forEach((a) => a.addEventListener('click', closeDrawer));
  }

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (drawer && drawer.classList.contains('is-open')) closeDrawer();
    if (lightbox && lightbox.classList.contains('is-open')) closeLightbox();
  });

  /* ---------------------------------------------------------------
     پدیدار شدن هنگام اسکرول
     --------------------------------------------------------------- */
  const revealTargets = $$('.reveal');
  const reveal = (el) => el.classList.add('is-in');

  if (revealTargets.length) {
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            reveal(entry.target);
            io.unobserve(entry.target);
          });
        },
        { rootMargin: '0px 0px -9% 0px', threshold: 0.05 }
      );
      revealTargets.forEach((el) => io.observe(el));
    }

    /* شبکهٔ ایمنی: اگر به هر دلیلی observer از کار افتاد، هر عنصری که
       وارد میدان دید شده آشکار می‌شود تا محتوا پنهان نماند. */
    let ticking = false;
    const sweep = () => {
      ticking = false;
      const limit = window.innerHeight * 0.94;
      revealTargets.forEach((el) => {
        if (el.classList.contains('is-in')) return;
        if (el.getBoundingClientRect().top < limit) reveal(el);
      });
    };
    const requestSweep = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(sweep);
    };

    window.addEventListener('scroll', requestSweep, { passive: true });
    window.addEventListener('resize', requestSweep, { passive: true });
    window.addEventListener('load', requestSweep);
    sweep();
  }

  /* ---------------------------------------------------------------
     آکاردئون پرسش‌های متداول
     --------------------------------------------------------------- */
  $$('.faq__item').forEach((item) => {
    const button = $('.faq__q', item);
    if (!button) return;
    button.addEventListener('click', () => {
      const isOpen = item.classList.toggle('is-open');
      button.setAttribute('aria-expanded', String(isOpen));
    });
  });

  /* ---------------------------------------------------------------
     جعبهٔ نور (Lightbox)
     --------------------------------------------------------------- */
  const lightbox = $('#lightbox');
  const lightboxImg = $('#lightboxImg');
  const lightboxCap = $('#lightboxCap');
  const lightboxClose = $('#lightboxClose');
  let lastFocused = null;

  function openLightbox(src, caption) {
    if (!lightbox) return;
    lastFocused = document.activeElement;
    lightboxImg.src = src;
    lightboxImg.alt = caption || '';
    if (lightboxCap) lightboxCap.textContent = caption || '';
    lightbox.hidden = false;
    lightbox.classList.add('is-open');
    document.body.classList.add('is-locked');
    if (lightboxClose) lightboxClose.focus();
  }

  function closeLightbox() {
    if (!lightbox) return;
    lightbox.classList.remove('is-open');
    lightbox.hidden = true;
    lightboxImg.removeAttribute('src');
    if (lightboxCap) lightboxCap.textContent = '';
    document.body.classList.remove('is-locked');
    if (lastFocused && lastFocused.focus) lastFocused.focus();
  }

  if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
  if (lightbox) {
    lightbox.addEventListener('click', (event) => {
      if (event.target === lightbox) closeLightbox();
    });
  }

  /** گالری کارگاه */
  $$('.gallery__item').forEach((item) => {
    const activate = () => openLightbox(item.dataset.full, item.dataset.cap);
    item.addEventListener('click', activate);
    item.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        activate();
      }
    });
  });

  /* ---------------------------------------------------------------
     گالری صفحهٔ محصول
     --------------------------------------------------------------- */
  const pgallery = $('#pgallery');
  if (pgallery) {
    const main = $('#pgMainImg');
    const thumbs = $$('.pgallery__thumb', pgallery);
    const name = pgallery.dataset.name || '';

    thumbs.forEach((thumb) => {
      const show = () => {
        main.src = thumb.dataset.src;
        main.alt = `${name} — ${thumb.getAttribute('aria-label')}`;
        thumbs.forEach((t) => t.setAttribute('aria-current', String(t === thumb)));
      };
      thumb.addEventListener('click', show);
      thumb.addEventListener('mouseenter', show);
    });

    const mainWrap = $('#pgMain');
    if (mainWrap) {
      mainWrap.addEventListener('click', () => {
        const cap = `${name} — ${siteCaptionFromAlt(main.alt)}`;
        openLightbox(main.src, cap);
      });
    }
  }

  function siteCaptionFromAlt(alt) {
    const parts = String(alt || '').split('—');
    return (parts[1] || '').trim();
  }

  /* ---------------------------------------------------------------
     فرم‌ها → واتساپ
     --------------------------------------------------------------- */
  $$('form[data-inquiry]').forEach((form) => {
    form.addEventListener('submit', (event) => {
      event.preventDefault();

      const data = new FormData(form);
      const get = (key) => String(data.get(key) || '').trim();

      const name = get('name');
      const phone = get('phone');

      // اعتبارسنجی ساده
      let firstInvalid = null;
      form.querySelectorAll('[required]').forEach((field) => {
        const empty = !String(field.value || '').trim();
        field.setAttribute('aria-invalid', String(empty));
        if (empty && !firstInvalid) firstInvalid = field;
      });

      if (!name || !phone) {
        if (firstInvalid) {
          firstInvalid.focus();
          firstInvalid.style.borderColor = '#b4453c';
        }
        return;
      }

      const kind = form.dataset.inquiry;
      const lines = [];

      if (kind === 'wholesale') {
        lines.push('درخواست همکاری عمده — چینی لوتوس');
      } else if (kind === 'custom') {
        lines.push('درخواست تولید سفارشی — چینی لوتوس');
      } else {
        lines.push('پیام از وب‌سایت چینی لوتوس');
      }

      lines.push('');
      lines.push(`نام: ${name}`);
      lines.push(`شماره تماس: ${phone}`);

      const labels = {
        business: 'مجموعه',
        city: 'شهر',
        type: 'نوع همکاری',
        kind: 'نوع سفارش',
        quantity: 'تعداد تقریبی',
        when: 'زمان مورد نیاز',
        subject: 'موضوع',
        message: 'توضیحات',
      };

      Object.keys(labels).forEach((key) => {
        const value = get(key);
        if (value) lines.push(`${labels[key]}: ${value}`);
      });

      lines.push('');
      lines.push('— ارسال‌شده از وب‌سایت چینی لوتوس');

      window.open(waLink(lines.join('\n')), '_blank', 'noopener');
    });

    form.querySelectorAll('input, textarea').forEach((field) => {
      field.addEventListener('input', () => {
        field.removeAttribute('aria-invalid');
        field.style.borderColor = '';
      });
    });
  });

  /* ---------------------------------------------------------------
     فیلتر گالری کارگاه
     --------------------------------------------------------------- */
  const filterBar = $('#galleryFilters');
  if (filterBar) {
    const items = $$('.gallery__item');
    const buttons = $$('.filterbar__btn', filterBar);

    filterBar.addEventListener('click', (event) => {
      const button = event.target.closest('.filterbar__btn');
      if (!button) return;

      const filter = button.dataset.filter;
      buttons.forEach((b) => b.setAttribute('aria-selected', String(b === button)));

      items.forEach((item) => {
        const show = filter === 'all' || item.dataset.cat === filter;
        item.classList.toggle('is-hidden', !show);
        if (show) item.classList.add('is-in');
      });
    });
  }

  /* ---------------------------------------------------------------
     نشان‌دادن مرحلهٔ فعال در نوار مراحل
     --------------------------------------------------------------- */
  const stepNavLinks = $$('.stepnav__link');
  if (stepNavLinks.length && 'IntersectionObserver' in window) {
    const targets = stepNavLinks
      .map((link) => $(link.getAttribute('href')))
      .filter(Boolean);

    const setActive = (id) => {
      stepNavLinks.forEach((link) => {
        link.classList.toggle('is-active', link.getAttribute('href') === `#${id}`);
      });
    };

    const navObserver = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length) setActive(visible[0].target.id);
      },
      { rootMargin: '-25% 0px -60% 0px', threshold: 0 }
    );
    targets.forEach((t) => navObserver.observe(t));
  }

  /* ---------------------------------------------------------------
     کشیدن ریل فرآیند با چرخ ماوس
     --------------------------------------------------------------- */
  $$('.rail').forEach((rail) => {
    rail.addEventListener('wheel', (event) => {
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      const atStart = rail.scrollLeft <= 0;
      const atEnd = rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 1;
      if ((event.deltaY < 0 && atStart) || (event.deltaY > 0 && atEnd)) return;
      rail.scrollLeft += event.deltaY;
      event.preventDefault();
    }, { passive: false });
  });
})();

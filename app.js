(function () {
  // Адрес сервиса уведомлений. Пока пусто, копия в Telegram не уходит, WhatsApp работает.
  var NOTIFY_URL = '';
  var PHONE = '79174860151';
  var MAX_GUESTS = 30;

  // Занятые ночи: дата заезда, ночь с этого числа на следующее. Обновлять здесь.
  // Прислал Чингиз 21 ноя 2026, 31 дек и 1 янв это бронь на две ночи.
  var BUSY = [
    '2026-11-21', '2026-11-22', '2026-11-28',
    '2026-12-05', '2026-12-12', '2026-12-19', '2026-12-25', '2026-12-26', '2026-12-31',
    '2027-01-01'
  ];

  var GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  var NOM = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
  var WD = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
  var $ = function (id) { return document.getElementById(id); };

  function plural(n, one, few, many) {
    var m = n % 10, h = n % 100;
    if (m === 1 && h !== 11) return one;
    if (m >= 2 && m <= 4 && (h < 10 || h >= 20)) return few;
    return many;
  }
  function addDays(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function iso(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }

  var today = new Date(); today.setHours(0, 0, 0, 0);
  var monday = addDays(today, -((today.getDay() + 6) % 7));
  var phone = window.matchMedia('(max-width: 899px)').matches;
  var COUNT = phone ? 90 : 14;
  var page = 0;
  function isBusy(d) { return BUSY.indexOf(iso(d)) !== -1; }
  // Все ночи с a до b свободны (b это день выезда, его ночь не считается)
  function free(a, b) {
    for (var x = new Date(a); x < b; x = addDays(x, 1)) if (isBusy(x)) return false;
    return true;
  }
  // По умолчанию ближайшие свободные выходные: с пятницы две ночи, если суббота занята, одна
  var start = addDays(today, (5 - today.getDay() + 7) % 7 || 7); // ближайшая пятница
  while (isBusy(start)) start = addDays(start, 1);
  var end = addDays(start, isBusy(addDays(start, 1)) ? 1 : 2);
  var guests = 15;
  var touched = false;

  var box = $('days');

  function buildDays() {
    box.innerHTML = '';
    for (var i = 0; i < COUNT; i++) (function (i) {
      var d = addDays(monday, page * 14 + i);
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'day';
      b.style.setProperty('--i', Math.min(i, 13));
      b.dataset.t = +d;
      b.innerHTML = '<span class="wd">' + WD[d.getDay()] + '</span><span class="dn">' + d.getDate() + '</span>';
      b.setAttribute('aria-label', d.getDate() + ' ' + GEN[d.getMonth()]);
      if (d < today) { b.classList.add('is-past'); b.disabled = true; }
      else if (isBusy(d)) { b.classList.add('is-busy'); b.setAttribute('aria-label', d.getDate() + ' ' + GEN[d.getMonth()] + ', занято'); }
      if (+d === +today) b.classList.add('is-today');
      b.addEventListener('click', function () { pick(d); });
      box.appendChild(b);
    })(i);
    var first = addDays(monday, page * 14), last = addDays(first, COUNT - 1);
    $('month').textContent = first.getMonth() === last.getMonth() ? NOM[first.getMonth()] : NOM[first.getMonth()] + ' – ' + NOM[last.getMonth()];
    $('prev').disabled = page === 0;
  }

  // Занятый день можно взять только днем выезда
  function pick(d) {
    if (end === null && d > start && free(start, d)) end = d;
    else if (isBusy(d)) return;
    else { start = d; end = null; }
    touched = true;
    render();
  }

  function rangeText(a, b) {
    if (!b) return a.getDate() + ' ' + GEN[a.getMonth()];
    if (a.getMonth() === b.getMonth()) return a.getDate() + '–' + b.getDate() + ' ' + GEN[b.getMonth()];
    return a.getDate() + ' ' + GEN[a.getMonth()] + ' – ' + b.getDate() + ' ' + GEN[b.getMonth()];
  }

  function render() {
    [].forEach.call(box.children, function (el) {
      var t = +el.dataset.t;
      var isStart = t === +start, isEnd = end !== null && t === +end;
      el.classList.toggle('is-start', isStart);
      el.classList.toggle('is-end', isEnd);
      el.classList.toggle('is-in', end !== null && t > +start && t < +end);
      el.setAttribute('aria-pressed', isStart || isEnd ? 'true' : 'false');
    });
    var n = end === null ? 0 : Math.round((end - start) / 864e5);
    $('range').textContent = rangeText(start, end);
    $('nights').textContent = (n ? n + ' ' + plural(n, 'ночь', 'ночи', 'ночей') : 'выберите выезд') + (n && guests > 15 ? ' · с ночёвкой до 15' : '');
    var g = guests + ' ' + plural(guests, 'гость', 'гостя', 'гостей');
    $('guests').textContent = g;
    $('guests-m').textContent = g;
    $('minus').disabled = guests <= 1;
    $('plus').disabled = guests >= MAX_GUESTS;
  }

  $('minus').addEventListener('click', function () { touched = true; guests = Math.max(1, guests - 1); render(); });
  $('plus').addEventListener('click', function () { touched = true; guests = Math.min(MAX_GUESTS, guests + 1); render(); });
  function slide(dir) { box.scrollBy({ left: dir * box.clientWidth * 0.8, behavior: 'smooth' }); }
  $('prev').addEventListener('click', function () { if (phone) return slide(-1); if (page > 0) { page--; buildDays(); render(); } });
  $('next').addEventListener('click', function () { if (phone) return slide(1); page++; buildDays(); render(); });
  // На телефоне месяц над лентой показывает видимые даты
  box.addEventListener('scroll', function () {
    if (!phone) return;
    var els = box.children, left = box.scrollLeft, first = null, last = null;
    for (var k = 0; k < els.length; k++) {
      var x = els[k].offsetLeft - box.offsetLeft;
      if (x + els[k].offsetWidth > left && first === null) first = els[k];
      if (x < left + box.clientWidth) last = els[k];
    }
    if (!first || !last) return;
    var a = new Date(+first.dataset.t), b = new Date(+last.dataset.t);
    $('month').textContent = a.getMonth() === b.getMonth() ? NOM[a.getMonth()] : NOM[a.getMonth()] + ' – ' + NOM[b.getMonth()];
    $('prev').disabled = left < 4;
  }, { passive: true });

  buildDays();
  render();

  // Ширина окна поменялась: две недели на ПК, длинная лента на телефоне
  window.matchMedia('(max-width: 899px)').addEventListener('change', function (e) {
    phone = e.matches;
    COUNT = phone ? 90 : 14;
    page = 0;
    buildDays();
    render();
  });

  // На телефоне лента начинается с сегодняшнего дня
  if (phone) {
    var todayEl = box.querySelector('.is-today');
    if (todayEl) box.scrollLeft = todayEl.offsetLeft - 12;
  }

  // Номер заявки: пятиминутка от старта сайта плюс случайная цифра.
  function leadNumber() {
    var slot = Math.floor((Date.now() - Date.UTC(2026, 10, 1)) / 3e5);
    return String(slot) + Math.floor(Math.random() * 10);
  }

  function book(a, useDates) {
    var n = leadNumber();
    var dates = useDates || touched;
    var text = 'Здравствуйте! Заявка № ' + n + ' с сайта. ';
    text += dates
      ? 'Свободен ли Lake House ' + rangeText(start, end) + '? Нас ' + guests + '.'
      : 'Хочу узнать про свободные даты в Lake House.';
    a.href = 'https://wa.me/' + PHONE + '?text=' + encodeURIComponent(text);
    if (NOTIFY_URL && navigator.sendBeacon) {
      navigator.sendBeacon(NOTIFY_URL, new Blob([JSON.stringify({
        n: n,
        from: dates ? iso(start) : null,
        to: dates && end ? iso(end) : null,
        guests: dates ? guests : null
      })], { type: 'text/plain' }));
    }
  }

  $('cta').addEventListener('click', function () { book(this, true); });
  [].forEach.call(document.querySelectorAll('[data-wa]'), function (a) {
    a.addEventListener('click', function () { book(this, false); });
  });
  [].forEach.call(document.querySelectorAll('a[href^="https://wa.me"]'), function (a) {
    a.target = '_blank';
    a.rel = 'noopener';
  });

  // Меню на телефоне
  var nav = document.querySelector('.nav'), menu = document.querySelector('.menu');
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && nav.classList.contains('open')) menu.click(); });
  menu.addEventListener('click', function () {
    var open = nav.classList.toggle('open');
    menu.setAttribute('aria-expanded', open ? 'true' : 'false');
    document.documentElement.style.overflow = open ? 'hidden' : '';
  });
  [].forEach.call(nav.querySelectorAll('.links a'), function (a) {
    a.addEventListener('click', function () {
      nav.classList.remove('open');
      menu.setAttribute('aria-expanded', 'false');
      document.documentElement.style.overflow = '';
    });
  });

  // Просмотр фото
  if ($('lb')) (function () {
  var lb = $('lb'), lbImg = $('lb-img');
  var shots = [].slice.call(document.querySelectorAll('#gal a')), cur = 0;
  function show(i) {
    cur = (i + shots.length) % shots.length;
    lbImg.src = shots[cur].getAttribute('href');
    lbImg.alt = shots[cur].querySelector('img').alt;
  }
  shots.forEach(function (a, i) {
    a.addEventListener('click', function (e) { e.preventDefault(); show(i); lb.showModal(); });
  });
  $('lb-close').addEventListener('click', function () { lb.close(); });
  $('lb-prev').addEventListener('click', function () { show(cur - 1); });
  $('lb-next').addEventListener('click', function () { show(cur + 1); });
  lb.addEventListener('click', function (e) { if (e.target === lb || e.target === lbImg) lb.close(); });
  lb.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') show(cur - 1);
    if (e.key === 'ArrowRight') show(cur + 1);
  });

  })();

  // Закат над озером сегодня, по местному времени
  function sunsetHours(date, lat, lng) {
    var rad = Math.PI / 180;
    var n = Math.round((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(date.getFullYear(), 0, 0)) / 864e5);
    var t = n + (18 - lng / 15) / 24;
    var M = 0.9856 * t - 3.289;
    var L = (M + 1.916 * Math.sin(M * rad) + 0.020 * Math.sin(2 * M * rad) + 282.634 + 360) % 360;
    var RA = (Math.atan(0.91764 * Math.tan(L * rad)) / rad + 360) % 360;
    RA = (RA + Math.floor(L / 90) * 90 - Math.floor(RA / 90) * 90) / 15;
    var sinDec = 0.39782 * Math.sin(L * rad), cosDec = Math.cos(Math.asin(sinDec));
    var cosH = (Math.cos(90.833 * rad) - sinDec * Math.sin(lat * rad)) / (cosDec * Math.cos(lat * rad));
    var H = Math.acos(cosH) / rad / 15;
    var UT = (H + RA - 0.06571 * t - 6.622 - lng / 15 + 48) % 24;
    return (UT + 5) % 24;
  }
  var s = sunsetHours(today, 54.55, 55.95);
  var hh = Math.floor(s), mm = Math.round((s - hh) * 60);
  if (mm === 60) { hh++; mm = 0; }
  var sunEl = document.querySelector('[data-sunset]');
  if (sunEl) sunEl.textContent = 'Сегодня закат в ' + hh + ':' + (mm < 10 ? '0' : '') + mm;
})();

// --- Easter eggs: ice clink + raining cubes -------------------------------------------------
// Only the Nice Cubes logo in the menu clinks. Logo and lockups can rain cubes.

// Two glassy clinks, synthesised (no audio file). "ctx" is any AudioContext so it can be tested offline.
function scheduleClink(ctx, t0) {
  const hit = (start, base, gain) => {
    const master = ctx.createGain();
    master.gain.value = gain;
    master.connect(ctx.destination);

    // inharmonic partials give the "glass" ring
    [[1, 1, 0.55], [2.32, 0.6, 0.34], [4.25, 0.35, 0.22], [6.63, 0.2, 0.14]].forEach(([ratio, amp, decay]) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = base * ratio;
      g.gain.setValueAtTime(0, start);
      g.gain.linearRampToValueAtTime(amp, start + 0.002);
      g.gain.exponentialRampToValueAtTime(0.0001, start + decay);
      osc.connect(g);
      g.connect(master);
      osc.start(start);
      osc.stop(start + decay + 0.05);
    });

    // a tiny noise tick for the moment the cubes touch
    const len = Math.floor(ctx.sampleRate * 0.012);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 3500;
    const tick = ctx.createGain();
    tick.gain.value = 0.5;
    src.connect(hp);
    hp.connect(tick);
    tick.connect(master);
    src.start(start);
  };

  hit(t0, 1850, 0.22);
  hit(t0 + 0.11, 2350, 0.16);
}

let clinkContext;
function playClink() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    clinkContext = clinkContext || new AC();
    if (clinkContext.state === 'suspended') clinkContext.resume();
    scheduleClink(clinkContext, clinkContext.currentTime + 0.01);
  } catch (err) {
    // sound is a bonus, never block the click
  }
}

// mode "burst": cubes shake out of an element and fall. mode "shower": cubes fall across the whole screen.
function rainIce(mode, origin) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (document.querySelectorAll('.ice-bit').length > 160) return;

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const box = origin ? origin.getBoundingClientRect() : null;
  const count = mode === 'shower' ? 56 : 28;

  for (let i = 0; i < count; i++) {
    const bit = document.createElement('span');
    bit.className = 'ice-bit';
    bit.setAttribute('aria-hidden', 'true');
    const size = 8 + Math.random() * 14;
    bit.style.width = bit.style.height = `${size}px`;

    let x, y, dx, dy;
    if (mode === 'burst' && box) {
      x = box.left + Math.random() * box.width;
      y = box.top + box.height / 2;
      dx = (Math.random() - 0.5) * 240;
      dy = vh - y + 60;
    } else {
      x = Math.random() * vw;
      y = -30 - Math.random() * 120;
      dx = (Math.random() - 0.5) * 120;
      dy = vh + 80;
    }
    bit.style.left = `${x - size / 2}px`;
    bit.style.top = `${y - size / 2}px`;
    document.body.appendChild(bit);

    const rot = (Math.random() - 0.5) * 720;
    const duration = mode === 'shower' ? 1500 + Math.random() * 1500 : 1200 + Math.random() * 1100;
    const delay = Math.random() * (mode === 'shower' ? 1100 : 350);
    const anim = bit.animate(
      [
        { transform: 'translate(0, 0) rotate(0deg)', opacity: 1 },
        { transform: `translate(${dx * 0.45}px, ${dy * 0.3}px) rotate(${rot * 0.4}deg)`, opacity: 1, offset: 0.4 },
        { transform: `translate(${dx}px, ${dy}px) rotate(${rot}deg)`, opacity: 0 },
      ],
      { duration, delay, easing: 'cubic-bezier(0.35, 0, 0.9, 0.55)', fill: 'both' }
    );
    const remove = () => bit.remove();
    anim.onfinish = remove;
    setTimeout(remove, duration + delay + 400); // safety net if the tab is in the background
  }
}

// The menu logo: clink + a burst of ice, and it still takes you home.
const menuLogo = document.querySelector('.nav__brand');
if (menuLogo) {
  menuLogo.addEventListener('click', () => {
    playClink();
    rainIce('burst', menuLogo.querySelector('svg') || menuLogo);
  });
}

// Hidden extras: the footer logo and the blue lockup make it rain (no sound).
['.logo--footer', '.lockup'].forEach((sel) => {
  const el = document.querySelector(sel);
  if (el) el.addEventListener('click', () => rainIce('shower'));
});

// --- Image drop zones: local-only preview so you can drag in shots as you take them ---
document.querySelectorAll('.dropzone').forEach((zone) => {
  const input = zone.querySelector('.dropzone__input');

  const showFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    let img = zone.querySelector('.dropzone__img');
    if (!img) {
      img = document.createElement('img');
      img.className = 'dropzone__img';
      img.alt = zone.dataset.hint || 'Uploaded image';
      zone.prepend(img);
    }
    img.src = URL.createObjectURL(file);
    zone.classList.add('has-image');

    if (!zone.querySelector('.dropzone__replace')) {
      const tag = document.createElement('span');
      tag.className = 'dropzone__replace';
      tag.textContent = 'Replace';
      zone.appendChild(tag);
    }
  };

  input.addEventListener('change', () => showFile(input.files && input.files[0]));

  ['dragenter', 'dragover'].forEach((evt) =>
    zone.addEventListener(evt, (e) => {
      e.preventDefault();
      zone.classList.add('is-dragover');
    })
  );

  ['dragleave', 'drop'].forEach((evt) =>
    zone.addEventListener(evt, (e) => {
      e.preventDefault();
      zone.classList.remove('is-dragover');
    })
  );

  zone.addEventListener('drop', (e) => {
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    showFile(file);
  });
});

// --- Slim menu on phones: the links live behind a menu button ---
const siteNav = document.getElementById('site-nav');
const navToggle = siteNav.querySelector('.nav__toggle');

function setNavOpen(open) {
  siteNav.classList.toggle('is-open', open);
  navToggle.setAttribute('aria-expanded', String(open));
  navToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
}

navToggle.addEventListener('click', () => setNavOpen(!siteNav.classList.contains('is-open')));
siteNav.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setNavOpen(false)));
document.addEventListener('click', (e) => {
  if (siteNav.classList.contains('is-open') && !siteNav.contains(e.target)) setNavOpen(false);
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && siteNav.classList.contains('is-open')) {
    setNavOpen(false);
    navToggle.focus();
  }
});
window.matchMedia('(min-width: 901px)').addEventListener('change', (m) => {
  if (m.matches) setNavOpen(false);
});

// --- Page router: real addresses (/buy/, /events/, /become-a-member/), no page reload ---
// Each page also exists as its own file (built by build_pages.py), so the address works when
// pasted into Instagram, WhatsApp or search. Clicking around the site swaps pages instantly.
const PAGES = ['buy', 'events', 'apply', 'privacy'];
const PAGE_PATH = { buy: '/buy/', events: '/events/', apply: '/become-a-member/', privacy: '/privacy/' };
const PAGE_TITLE = {
  home: 'Nice Cubes | Ice is an ingredient.',
  buy: 'Buy Nice Cubes | Coming soon',
  events: 'A Nice Cubes Supper | 3rd October, East London',
  apply: 'Become a member | Nice Cubes',
  privacy: 'Privacy policy | Nice Cubes',
};

function pageFromPath() {
  const segment = location.pathname.replace(/index\.html$/, '').split('/').filter(Boolean).pop();
  return PAGES.find((p) => PAGE_PATH[p] === `/${segment}/`) || null;
}

function route() {
  const page = pageFromPath();

  document.getElementById('page-home').hidden = !!page;
  PAGES.forEach((p) => {
    document.getElementById(`page-${p}`).hidden = p !== page;
  });
  document.title = PAGE_TITLE[page || 'home'];
  setNavOpen(false);

  if (!page && location.hash === '#join') {
    const target = document.getElementById('join');
    if (target) target.scrollIntoView({ behavior: 'smooth' });
  } else {
    window.scrollTo(0, 0);
  }
}

// Old links like /#events still work: tidy them into the real address.
function upgradeLegacyHash() {
  const legacyPage = location.hash.replace('#', '');
  if (PAGES.includes(legacyPage)) {
    history.replaceState(null, '', PAGE_PATH[legacyPage]);
  }
}
upgradeLegacyHash();
window.addEventListener('hashchange', () => {
  upgradeLegacyHash();
  route();
});

// Internal links swap pages without reloading; everything else behaves normally.
document.addEventListener('click', (e) => {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const link = e.target.closest('a[href]');
  if (!link || link.target === '_blank' || link.hasAttribute('download')) return;

  const url = new URL(link.href, location.href);
  if (url.origin !== location.origin) return;
  const isSitePage = url.pathname === '/' || Object.values(PAGE_PATH).includes(url.pathname);
  if (!isSitePage) return;

  e.preventDefault();
  const target = url.pathname + url.search + url.hash;
  if (target !== location.pathname + location.search + location.hash) history.pushState({}, '', target);
  route();
});

window.addEventListener('popstate', route);
route();

// --- Waitlist forms -> Klaviyo ---
// Fill these in from your Klaviyo account, then both forms below go live.
//   KLAVIYO_COMPANY_ID: Account > Settings > API Keys > "Public API Key" (6 characters)
//   KLAVIYO_LIST_ID:    Lists & Segments > open your waitlist list > the ID in the URL
// This uses Klaviyo's public Client API, which is designed to be called straight
// from the browser with the public key only — never put a private API key here.
const KLAVIYO_COMPANY_ID = 'W6Nwiq';
const KLAVIYO_LIST_ID = 'UWAbvg';
const KLAVIYO_REVISION = '2026-07-15';
const KLAVIYO_CONFIGURED = KLAVIYO_COMPANY_ID !== 'YOUR_PUBLIC_API_KEY' && KLAVIYO_LIST_ID !== 'YOUR_LIST_ID';

function setNote(note, text, isError) {
  note.textContent = text;
  note.classList.toggle('form__note--error', !!isError);
}

// Spam protection: a hidden field only bots fill in, and a check that someone actually spent a moment
// on the form. Bots get the normal "thanks" message so they don't adapt, but nothing is sent.
const formFirstTouch = new WeakMap();
document.addEventListener('focusin', (e) => {
  const f = e.target.closest && e.target.closest('form');
  if (f && !formFirstTouch.has(f)) formFirstTouch.set(f, Date.now());
});

function looksLikeBot(f) {
  const trap = f.querySelector('input[name="nc_confirm_url"]');
  if (trap && trap.value.trim() !== '') return true;
  const touched = formFirstTouch.get(f);
  return !touched || Date.now() - touched < 600;
}

// Tell people what went wrong and what to do next. "blocked" means the request never reached Klaviyo
// (typically an ad-blocker or strict privacy setting).
const CONTACT_LINK = 'https://ig.me/m/drinknicecubes';

function showFailure(noteEl, err) {
  noteEl.classList.add('form__note--error');
  noteEl.textContent =
    err && err.kind === 'blocked'
      ? 'We could not save that. Some ad-blockers and privacy settings stop signups going through. Please try again, or '
      : 'Something went wrong on our side. Please try again in a moment, or ';
  const link = document.createElement('a');
  link.href = CONTACT_LINK;
  link.target = '_blank';
  link.rel = 'noopener';
  link.textContent = 'message us on Instagram';
  noteEl.append(link, '.');
}

async function postSubscription(body) {
  let res;
  try {
    res = await fetch(`https://a.klaviyo.com/client/subscriptions?company_id=${KLAVIYO_COMPANY_ID}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/vnd.api+json', revision: KLAVIYO_REVISION },
      body,
    });
  } catch (networkError) {
    const err = new Error('Request blocked or offline');
    err.kind = 'blocked';
    throw err;
  }
  // Klaviyo returns 202 Accepted with an empty body on success.
  if (!res.ok) {
    const err = new Error(`Klaviyo ${res.status}`);
    err.kind = res.status >= 500 || res.status === 429 ? 'server' : 'rejected';
    throw err;
  }
}

async function subscribeToKlaviyo({ email, firstName, lastName, zip, properties }, source) {
  const profileAttributes = {
    email,
    first_name: firstName,
    last_name: lastName,
    subscriptions: {
      email: { marketing: { consent: 'SUBSCRIBED' } },
    },
  };
  if (zip) profileAttributes.location = { zip };
  if (properties) profileAttributes.properties = properties;

  const body = JSON.stringify({
    data: {
      type: 'subscription',
      attributes: {
        custom_source: source,
        profile: { data: { type: 'profile', attributes: profileAttributes } },
      },
      relationships: { list: { data: { type: 'list', id: KLAVIYO_LIST_ID } } },
    },
  });

  try {
    await postSubscription(body);
  } catch (err) {
    if (err.kind !== 'server') throw err;
    await new Promise((r) => setTimeout(r, 800)); // one quiet retry for a temporary hiccup
    await postSubscription(body);
  }

  trackSignup(source);
}

// Records a successful signup as an Umami goal, tagged by which form it came from. Umami may be
// blocked by an ad-blocker or absent while testing locally, so this never breaks a real signup.
function trackSignup(source) {
  try {
    if (window.umami) window.umami.track('signup', { form: source });
  } catch (err) {
    /* analytics is a bonus, never block on it */
  }
}

// Main waitlist form (hero + #join section)
const form = document.getElementById('waitlist-form');
const note = form.querySelector('.form__note');
const submitBtn = form.querySelector('button[type="submit"]');
const joinFollowup = document.getElementById('join-followup');

// After a successful join, nudge toward membership instead of interrupting the form itself.
function showJoinSuccess(firstName) {
  setNote(note, `Thanks ${firstName}, you're on the list.`, false);
  joinFollowup.hidden = false;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const inputs = [...form.querySelectorAll('.field__input')];
  inputs.forEach((el) => el.classList.add('touched'));

  if (!form.checkValidity()) {
    setNote(note, 'Please fill in all fields with a valid email.', true);
    return;
  }

  const data = Object.fromEntries(new FormData(form).entries());

  if (looksLikeBot(form) || !KLAVIYO_CONFIGURED) {
    showJoinSuccess(data.firstName);
    form.reset();
    inputs.forEach((el) => el.classList.remove('touched'));
    return;
  }

  submitBtn.disabled = true;
  setNote(note, 'Joining…', false);

  try {
    await subscribeToKlaviyo({ email: data.email, firstName: data.firstName, lastName: data.lastName }, 'Nice Cubes waitlist form');
    showJoinSuccess(data.firstName);
    form.reset();
    inputs.forEach((el) => el.classList.remove('touched'));
  } catch (err) {
    console.error(err);
    showFailure(note, err);
  } finally {
    submitBtn.disabled = false;
  }
});

// Footer newsletter form (email only)
const footerForm = document.getElementById('footer-form');
const footerBtn = footerForm.querySelector('.footer__btn');
const footerBtnDefaultLabel = footerBtn.textContent;
const footerNote = document.querySelector('.footer__note');

footerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!footerForm.checkValidity()) return;

  const email = new FormData(footerForm).get('email');
  footerNote.textContent = '';

  if (looksLikeBot(footerForm) || !KLAVIYO_CONFIGURED) {
    footerBtn.textContent = "You're in";
    footerForm.reset();
    return;
  }

  footerBtn.disabled = true;
  try {
    await subscribeToKlaviyo({ email, firstName: '', lastName: '' }, 'Nice Cubes footer form');
    footerBtn.textContent = "You're in";
    footerForm.reset();
  } catch (err) {
    console.error(err);
    footerBtn.textContent = 'Try again';
    showFailure(footerNote, err);
    setTimeout(() => { footerBtn.textContent = footerBtnDefaultLabel; }, 2500);
  } finally {
    footerBtn.disabled = false;
  }
});

// --- Live membership card: mirrors the name and favourite flavour as they are typed ---
const cardName = document.getElementById('card-name');
const cardFlavour = document.getElementById('card-flavour');

function updateMemberCard() {
  const f = document.getElementById('apply-form');
  const name = `${f.firstName.value} ${f.lastName.value}`.trim().replace(/\s+/g, ' ');
  cardName.textContent = name || 'Your name';
  cardFlavour.textContent = f.flavour.value.trim() || 'Your pick';
}

document.getElementById('apply-form').addEventListener('input', updateMemberCard);
// clear the "only spaces" flag as soon as someone types again
document.getElementById('apply-form').addEventListener('input', (e) => {
  if (e.target.setCustomValidity) e.target.setCustomValidity('');
});

// --- Become a Member application -> same Klaviyo list, tagged so members can be segmented ---
// In Klaviyo, filter on the custom property "member_application" (is true), or on the
// source "Nice Cubes membership application". member_status starts as "pending"; move it to
// "member" (or whatever you choose) by hand once an application is accepted.
// Only name, email, flavour and age confirmation are required: the aim is hard to get in,
// not hard to apply, so the extra questions stay optional.
const applyForm = document.getElementById('apply-form');
const applyNote = applyForm.querySelector('.form__note');
const applySubmitBtn = applyForm.querySelector('button[type="submit"]');

applyForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const inputs = [...applyForm.querySelectorAll('.field__input, .field__checkbox')];
  inputs.forEach((el) => {
    el.classList.add('touched');
    // a required field of only spaces counts as empty; optional fields are left alone
    if (el.required && el.tagName !== 'SELECT' && el.type !== 'checkbox') {
      el.setCustomValidity(el.value.trim() ? '' : 'Please fill this in.');
    }
  });

  if (!applyForm.checkValidity()) {
    setNote(applyNote, 'Please fill in your name, email, flavour and age confirmation.', true);
    const firstBad = inputs.find((el) => !el.checkValidity());
    if (firstBad) firstBad.focus();
    return;
  }

  const data = Object.fromEntries(new FormData(applyForm).entries());
  const done = () => {
    setNote(applyNote, 'Application received. Stay cool, we review every Sunday and you’ll hear from us either way.', false);
    applySubmitBtn.disabled = true;
    applyForm.reset();
    inputs.forEach((el) => el.classList.remove('touched'));
    updateMemberCard();
  };

  if (looksLikeBot(applyForm) || !KLAVIYO_CONFIGURED) {
    done();
    return;
  }

  applySubmitBtn.disabled = true;
  setNote(applyNote, 'Sending…', false);

  try {
    await subscribeToKlaviyo(
      {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        properties: {
          member_application: true,
          member_status: 'pending',
          favourite_flavour: (data.flavour || '').trim(),
          drink_order: (data.drinkOrder || '').trim(),
          bar_recommendation: (data.bar || '').trim(),
          why_member: (data.whyMember || '').trim(),
          instagram_handle: (data.instagram || '').trim(),
          invite_code: (data.inviteCode || '').trim(),
          age_confirmed: Boolean(data.ageConfirm),
        },
      },
      'Nice Cubes membership application'
    );
    done();
  } catch (err) {
    console.error(err);
    showFailure(applyNote, err);
    applySubmitBtn.disabled = false;
  }
});

// Four Flavours: each card slides into shot the first time it scrolls into view.
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!('IntersectionObserver' in window)) return;

  const cards = document.querySelectorAll('.flavour-card');
  if (!cards.length) return;

  cards.forEach((card) => card.classList.add('reveal'));

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.2, rootMargin: '0px 0px -40px 0px' }
  );

  cards.forEach((card) => observer.observe(card));
})();

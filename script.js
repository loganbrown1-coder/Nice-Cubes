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

// --- Page router: real addresses (/buy/, /events/, /become-a-member/), no page reload ---
// Each page also exists as its own file (built by build_pages.py), so the address works when
// pasted into Instagram, WhatsApp or search. Clicking around the site swaps pages instantly.
const PAGES = ['buy', 'events', 'apply'];
const PAGE_PATH = { buy: '/buy/', events: '/events/', apply: '/become-a-member/' };
const PAGE_TITLE = {
  home: 'Nice Cubes | Ice is an ingredient.',
  buy: 'Buy Nice Cubes | Coming soon',
  events: 'A Nice Cubes Supper | 3rd October, East London',
  apply: 'Become a member | Nice Cubes',
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

  const res = await fetch(
    `https://a.klaviyo.com/client/subscriptions?company_id=${KLAVIYO_COMPANY_ID}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/vnd.api+json',
        revision: KLAVIYO_REVISION,
      },
      body: JSON.stringify({
        data: {
          type: 'subscription',
          attributes: {
            custom_source: source,
            profile: {
              data: {
                type: 'profile',
                attributes: profileAttributes,
              },
            },
          },
          relationships: {
            list: { data: { type: 'list', id: KLAVIYO_LIST_ID } },
          },
        },
      }),
    }
  );

  // Klaviyo returns 202 Accepted with an empty body on success.
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Klaviyo ${res.status}: ${body}`);
  }
}

// Main waitlist form (hero + #join section)
const form = document.getElementById('waitlist-form');
const note = form.querySelector('.form__note');
const submitBtn = form.querySelector('button[type="submit"]');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const inputs = [...form.querySelectorAll('.field__input')];
  inputs.forEach((el) => el.classList.add('touched'));

  if (!form.checkValidity()) {
    setNote(note, 'Please fill in all fields with a valid email.', true);
    return;
  }

  const data = Object.fromEntries(new FormData(form).entries());

  if (!KLAVIYO_CONFIGURED) {
    console.warn('Klaviyo not configured yet — set KLAVIYO_COMPANY_ID and KLAVIYO_LIST_ID in script.js.');
    setNote(note, `Thanks ${data.firstName}, you're on the list. (Klaviyo not yet connected, see script.js)`, false);
    form.reset();
    inputs.forEach((el) => el.classList.remove('touched'));
    return;
  }

  submitBtn.disabled = true;
  setNote(note, 'Joining…', false);

  try {
    await subscribeToKlaviyo({ email: data.email, firstName: data.firstName, lastName: data.lastName }, 'Nice Cubes waitlist form');
    setNote(note, `Thanks ${data.firstName}, you're on the list.`, false);
    form.reset();
    inputs.forEach((el) => el.classList.remove('touched'));
  } catch (err) {
    console.error(err);
    setNote(note, 'Something went wrong, please try again.', true);
  } finally {
    submitBtn.disabled = false;
  }
});

// --- Free membership nudge: appears when someone clicks into the first waitlist box ---
const memberPrompt = document.getElementById('member-prompt');
const waitlistFirstName = document.querySelector('#waitlist-form input[name="firstName"]');
const PROMPT_KEY = 'nc-member-prompt-dismissed';

function promptDismissed() {
  try { return sessionStorage.getItem(PROMPT_KEY) === '1'; } catch (err) { return false; }
}

function hideMemberPrompt() {
  memberPrompt.hidden = true;
  try { sessionStorage.setItem(PROMPT_KEY, '1'); } catch (err) { /* private mode: it just may show again */ }
}

if (memberPrompt && waitlistFirstName) {
  waitlistFirstName.addEventListener('focus', () => {
    if (!promptDismissed()) memberPrompt.hidden = false;
  });
  memberPrompt.querySelectorAll('[data-dismiss]').forEach((btn) => btn.addEventListener('click', hideMemberPrompt));
  memberPrompt.querySelector('a').addEventListener('click', hideMemberPrompt);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !memberPrompt.hidden) hideMemberPrompt();
  });
}

// Footer newsletter form (email only)
const footerForm = document.getElementById('footer-form');
const footerBtn = footerForm.querySelector('.footer__btn');
const footerBtnDefaultLabel = footerBtn.textContent;

footerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!footerForm.checkValidity()) return;

  const email = new FormData(footerForm).get('email');

  if (!KLAVIYO_CONFIGURED) {
    console.warn('Klaviyo not configured yet — set KLAVIYO_COMPANY_ID and KLAVIYO_LIST_ID in script.js.');
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
// source "Nice Cubes membership application".
const applyForm = document.getElementById('apply-form');
const applyNote = applyForm.querySelector('.form__note');
const applySubmitBtn = applyForm.querySelector('button[type="submit"]');

applyForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const inputs = [...applyForm.querySelectorAll('.field__input')];
  inputs.forEach((el) => {
    el.classList.add('touched');
    // a field of only spaces counts as empty
    if (el.tagName !== 'SELECT') el.setCustomValidity(el.value.trim() ? '' : 'Please fill this in.');
  });

  if (!applyForm.checkValidity()) {
    setNote(applyNote, 'Please fill in every field, with a valid email address.', true);
    const firstBad = inputs.find((el) => !el.checkValidity());
    if (firstBad) firstBad.focus();
    return;
  }

  const data = Object.fromEntries(new FormData(applyForm).entries());
  const done = () => {
    setNote(applyNote, 'Application received. Stay cool, we’ll be in touch.', false);
    applySubmitBtn.disabled = true;
    applyForm.reset();
    inputs.forEach((el) => el.classList.remove('touched'));
    updateMemberCard();
  };

  if (!KLAVIYO_CONFIGURED) {
    console.warn('Klaviyo not configured yet — set KLAVIYO_COMPANY_ID and KLAVIYO_LIST_ID in script.js.');
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
        zip: data.postcode.trim(),
        properties: {
          member_application: true,
          member_phone: data.phone.trim(),
          favourite_flavour: (data.flavour || '').trim(),
          member_suggestions: (data.suggestion || '').trim(),
        },
      },
      'Nice Cubes membership application'
    );
    done();
  } catch (err) {
    console.error(err);
    setNote(applyNote, 'Something went wrong, please try again.', true);
    applySubmitBtn.disabled = false;
  }
});

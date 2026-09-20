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

// --- Page router: home / buy / events / apply, driven by the URL hash ---
const PAGES = ['buy', 'events', 'apply'];

function route() {
  const hash = location.hash.replace('#', '');
  const page = PAGES.includes(hash) ? hash : null;

  document.getElementById('page-home').hidden = !!page;
  PAGES.forEach((p) => {
    document.getElementById(`page-${p}`).hidden = p !== page;
  });

  if (!page && hash === 'join') {
    const target = document.getElementById('join');
    if (target) target.scrollIntoView({ behavior: 'smooth' });
  } else {
    window.scrollTo(0, 0);
  }
}

window.addEventListener('hashchange', route);
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

// --- Become a Member application -> same Klaviyo list, tagged so members can be segmented ---
// In Klaviyo, filter on the custom property "member_application" (is true), or on the
// source "Nice Cubes membership application".
const applyForm = document.getElementById('apply-form');
const applyNote = applyForm.querySelector('.form__note');
const applySubmitBtn = applyForm.querySelector('button[type="submit"]');

applyForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const inputs = [...applyForm.querySelectorAll('.field__input')];
  inputs.forEach((el) => el.classList.add('touched'));

  if (!applyForm.checkValidity()) {
    setNote(applyNote, 'Please fill in the required fields with a valid email.', true);
    return;
  }

  const data = Object.fromEntries(new FormData(applyForm).entries());
  const done = () => {
    setNote(applyNote, 'Application received. Welcome to the community, we’ll be in touch.', false);
    applySubmitBtn.disabled = true;
    applyForm.reset();
    inputs.forEach((el) => el.classList.remove('touched'));
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

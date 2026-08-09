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

// --- Waitlist form -> Klaviyo ---
// Fill these in from your Klaviyo account, then this form is fully live.
//   KLAVIYO_COMPANY_ID: Account > Settings > API Keys > "Public API Key" (6 characters)
//   KLAVIYO_LIST_ID:    Lists & Segments > open your waitlist list > the ID in the URL
// This uses Klaviyo's public Client API, which is designed to be called straight
// from the browser with the public key only — never put a private API key here.
const KLAVIYO_COMPANY_ID = 'YOUR_PUBLIC_API_KEY';
const KLAVIYO_LIST_ID = 'YOUR_LIST_ID';
const KLAVIYO_REVISION = '2026-07-15';

const form = document.getElementById('waitlist-form');
const note = form.querySelector('.form__note');
const submitBtn = form.querySelector('button[type="submit"]');

function setNote(text, isError) {
  note.textContent = text;
  note.classList.toggle('form__note--error', !!isError);
}

async function subscribeToKlaviyo({ email, firstName, lastName }) {
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
            custom_source: 'Nice Cubes waitlist form',
            profile: {
              data: {
                type: 'profile',
                attributes: {
                  email,
                  first_name: firstName,
                  last_name: lastName,
                  subscriptions: {
                    email: { marketing: { consent: 'SUBSCRIBED' } },
                  },
                },
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

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const inputs = [...form.querySelectorAll('.field__input')];
  inputs.forEach((el) => el.classList.add('touched'));

  if (!form.checkValidity()) {
    setNote('Please fill in all fields with a valid email.', true);
    return;
  }

  const data = Object.fromEntries(new FormData(form).entries());

  if (KLAVIYO_COMPANY_ID === 'YOUR_PUBLIC_API_KEY' || KLAVIYO_LIST_ID === 'YOUR_LIST_ID') {
    console.warn('Klaviyo not configured yet — set KLAVIYO_COMPANY_ID and KLAVIYO_LIST_ID in script.js.');
    setNote(`Thanks ${data.firstName}, you're on the list. (Klaviyo not yet connected — see script.js)`, false);
    form.reset();
    inputs.forEach((el) => el.classList.remove('touched'));
    return;
  }

  submitBtn.disabled = true;
  setNote('Joining…', false);

  try {
    await subscribeToKlaviyo({ email: data.email, firstName: data.firstName, lastName: data.lastName });
    setNote(`Thanks ${data.firstName}, you're on the list.`, false);
    form.reset();
    inputs.forEach((el) => el.classList.remove('touched'));
  } catch (err) {
    console.error(err);
    setNote('Something went wrong — please try again.', true);
  } finally {
    submitBtn.disabled = false;
  }
});

// Download behaviour for the Lock Screen / Home Screen buttons.
//
// Every button is a normal link to the ORIGINAL file (href + download attribute),
// so it works with no JavaScript at all. This script only changes what happens on iPhone/iPad:
//
//   iPhone/iPad  -> fetch the original, share it as a real File (Web Share API) so the share sheet
//                   offers "Save Image" (straight into Photos).
//   Not supported / fails -> open the original full-size image and show how to save it manually.
//   Desktop/Android -> untouched: the browser's normal download.
//
// Note: a website cannot set the wallpaper itself; iOS only lets the user do that.

const FALLBACK_TIP = 'On iPhone: press and hold the image → Save to Photos.';

const isIOS =
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); // iPadOS reports as a Mac

const buttons = [...document.querySelectorAll('[data-download]')];
const statusBox = document.querySelector('[data-status]');
const iosTip = document.querySelector('[data-ios-tip]');

if (isIOS && iosTip) iosTip.hidden = false;

/** True when this browser can share image files (checked synchronously with a dummy file). */
function canShareFiles() {
  try {
    if (!navigator.share || !navigator.canShare) return false;
    return navigator.canShare({ files: [new File([''], 'test.jpg', { type: 'image/jpeg' })] });
  } catch {
    return false;
  }
}

const useShare = isIOS && canShareFiles();
const loading = new Map(); // url -> Promise<File>
const ready = new Map(); // url -> File (already downloaded, can be shared instantly)

function loadFile(button) {
  const url = button.href;
  if (!loading.has(url)) {
    const promise = fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        const file = new File([blob], button.dataset.filename || 'wallpaper.jpg', { type: blob.type || 'image/jpeg' });
        ready.set(url, file);
        return file;
      })
      .catch((err) => {
        loading.delete(url);
        throw err;
      });
    loading.set(url, promise);
  }
  return loading.get(url);
}

function setBusy(button, busy) {
  const label = button.querySelector('.btn-label');
  if (!label.dataset.original) label.dataset.original = label.textContent;
  button.setAttribute('aria-busy', String(busy));
  label.textContent = busy ? 'Preparing…' : label.dataset.original;
}

function showStatus(text, link) {
  if (!statusBox) return;
  statusBox.replaceChildren(document.createTextNode(text));
  if (link) {
    statusBox.append(' ');
    const a = document.createElement('a');
    a.href = link;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = 'Open full-size image';
    a.style.fontWeight = '600';
    a.style.textDecoration = 'underline';
    statusBox.append(a);
  }
  statusBox.hidden = false;
}

function hideStatus() {
  if (statusBox) statusBox.hidden = true;
}

/** Open the original image and explain how to save it. */
function fallback(button, { canOpen }) {
  if (canOpen) window.open(button.href, '_blank', 'noopener');
  showStatus(canOpen ? FALLBACK_TIP : `${FALLBACK_TIP} Or:`, canOpen ? undefined : button.href);
}

async function share(button, file, { afterWait }) {
  try {
    await navigator.share({ files: [file] });
    hideStatus();
  } catch (err) {
    if (err && err.name === 'AbortError') return hideStatus(); // user closed the share sheet
    if (afterWait && err && err.name === 'NotAllowedError') {
      // Safari only allows sharing right after a tap. The file is now cached, so the next tap works instantly.
      showStatus('Your wallpaper is ready. Tap the button again to save it.');
      return;
    }
    fallback(button, { canOpen: !afterWait });
  }
}

for (const button of buttons) {
  if (!useShare) {
    // iPhone without file sharing: send them to the image with instructions. Everyone else: normal download.
    if (isIOS) {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        fallback(button, { canOpen: true });
      });
    }
    continue;
  }

  // Start downloading as soon as a finger lands, so the share sheet can open quickly on the tap.
  const warm = () => loadFile(button).catch(() => {});
  button.addEventListener('pointerdown', warm);
  button.addEventListener('focus', warm);

  button.addEventListener('click', async (event) => {
    event.preventDefault();

    const cached = ready.get(button.href);
    if (cached) {
      // Must call share() synchronously inside the tap for Safari to allow it.
      if (navigator.canShare({ files: [cached] })) return share(button, cached, { afterWait: false });
      return fallback(button, { canOpen: true });
    }

    setBusy(button, true);
    try {
      const file = await loadFile(button);
      setBusy(button, false);
      if (!navigator.canShare({ files: [file] })) return fallback(button, { canOpen: false });
      await share(button, file, { afterWait: true });
    } catch {
      setBusy(button, false);
      fallback(button, { canOpen: false });
    }
  });
}

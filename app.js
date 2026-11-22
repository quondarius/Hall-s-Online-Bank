(() => {
  'use strict';

  const accounts = {
    checking: { name: 'Everyday Checking', balance: 428050 },
    savings: { name: 'Rainy Day Savings', balance: 1275000 }
  };

  const transactions = [
    { title: 'Coffee Corner', detail: 'Today · Everyday Checking', amount: -685, kind: 'expense', icon: '☕' },
    { title: 'Sample paycheck', detail: 'Yesterday · Everyday Checking', amount: 185000, kind: 'income', icon: '↙' },
    { title: 'Market Street Grocery', detail: 'Nov 20 · Everyday Checking', amount: -6248, kind: 'expense', icon: '⌑' },
    { title: 'Transfer to savings', detail: 'Nov 19 · Demo transfer', amount: -25000, kind: 'transfer', icon: '⇄' },
    { title: 'Savings interest', detail: 'Nov 18 · Rainy Day Savings', amount: 425, kind: 'income', icon: '↗' }
  ];

  const money = cents => new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', minimumFractionDigits: 2
  }).format(cents / 100);

  const byId = id => document.getElementById(id);
  const fromSelect = byId('from-account');
  const toSelect = byId('to-account');
  const amountInput = byId('transfer-amount');
  const message = byId('form-message');

  function paintBalances() {
    byId('checking-balance').textContent = money(accounts.checking.balance);
    byId('savings-balance').textContent = money(accounts.savings.balance);
    byId('total-balance').textContent = money(accounts.checking.balance + accounts.savings.balance);
    updateAvailable();
    [...fromSelect.options].forEach(option => {
      option.textContent = `${accounts[option.value].name} · ${money(accounts[option.value].balance)}`;
    });
    [...toSelect.options].forEach(option => {
      option.textContent = `${accounts[option.value].name} · ${money(accounts[option.value].balance)}`;
    });
  }

  function updateAvailable() {
    const source = accounts[fromSelect.value];
    byId('available-line').innerHTML = `Available to move: <strong>${money(source.balance)}</strong>`;
  }

  function paintTransactions() {
    const list = byId('transaction-list');
    list.replaceChildren();
    if (!transactions.length) {
      const empty = document.createElement('p');
      empty.className = 'empty-activity';
      empty.textContent = 'No sample activity to show.';
      list.append(empty);
      return;
    }
    transactions.forEach(tx => {
      const row = document.createElement('div');
      row.className = 'transaction-row';
      const icon = document.createElement('span');
      icon.className = `transaction-icon ${tx.kind}`;
      icon.setAttribute('aria-hidden', 'true');
      icon.textContent = tx.icon;
      const main = document.createElement('span');
      main.className = 'transaction-main';
      const title = document.createElement('strong');
      title.textContent = tx.title;
      const detail = document.createElement('small');
      detail.textContent = tx.detail;
      main.append(title, detail);
      const amount = document.createElement('span');
      const isPositive = tx.amount > 0;
      amount.className = `transaction-amount ${isPositive ? 'positive' : 'negative'}`;
      amount.textContent = `${isPositive ? '+' : '−'}${money(Math.abs(tx.amount))}`;
      row.append(icon, main, amount);
      list.append(row);
    });
  }

  function showMessage(text, isSuccess = false) {
    message.textContent = text;
    message.classList.toggle('success', isSuccess);
  }

  fromSelect.addEventListener('change', () => {
    updateAvailable();
    showMessage('');
  });
  toSelect.addEventListener('change', () => showMessage(''));

  byId('swap-accounts').addEventListener('click', () => {
    const previousFrom = fromSelect.value;
    fromSelect.value = toSelect.value;
    toSelect.value = previousFrom;
    updateAvailable();
    showMessage('');
  });

  byId('transfer-form').addEventListener('submit', event => {
    event.preventDefault();
    const sourceKey = fromSelect.value;
    const destinationKey = toSelect.value;
    const amountText = amountInput.value.trim();
    const amount = Number(amountText);
    const cents = Math.round(amount * 100);

    if (sourceKey === destinationKey) {
      showMessage('Choose two different demo accounts.');
      return;
    }
    if (!amountText || !Number.isFinite(amount) || cents < 1 || Math.abs(amount * 100 - cents) > 0.00001) {
      showMessage('Enter an amount of at least $0.01, with up to two decimals.');
      return;
    }
    if (cents > accounts[sourceKey].balance) {
      showMessage('That amount is more than the available demo balance.');
      return;
    }

    accounts[sourceKey].balance -= cents;
    accounts[destinationKey].balance += cents;
    transactions.unshift({
      title: `Transfer to ${accounts[destinationKey].name}`,
      detail: 'Just now · Demo transfer',
      amount: -cents,
      kind: 'transfer',
      icon: '⇄'
    });
    transactions.splice(8);
    paintBalances();
    paintTransactions();
    amountInput.value = '';
    showMessage(`${money(cents)} moved to ${accounts[destinationKey].name}. Demo balances updated.`, true);
  });

  byId('activity-filter').addEventListener('click', () => {
    showMessage('Showing all sample activity.', true);
  });

  const backgroundFile = byId('background-file');
  const importBackground = byId('import-background');
  const resetBackground = byId('reset-background');
  const backgroundStatus = byId('background-status');
  const themeRoot = document.documentElement;
  let activePhotoUrl = '';

  const themeProperties = [
    '--imported-photo', '--cyan', '--cyan-bright', '--violet', '--photo-sidebar',
    '--photo-panel', '--photo-panel-raised', '--photo-panel-deep', '--photo-total', '--photo-line'
  ];

  function dominantPhotoTone(image) {
    const limit = 72;
    const ratio = Math.min(limit / image.naturalWidth, limit / image.naturalHeight, 1);
    const width = Math.max(1, Math.round(image.naturalWidth * ratio));
    const height = Math.max(1, Math.round(image.naturalHeight * ratio));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return null;
    context.drawImage(image, 0, 0, width, height);

    const pixels = context.getImageData(0, 0, width, height).data;
    const buckets = new Map();
    for (let i = 0; i < pixels.length; i += 16) {
      const red = pixels[i];
      const green = pixels[i + 1];
      const blue = pixels[i + 2];
      const alpha = pixels[i + 3];
      if (alpha < 160) continue;
      const max = Math.max(red, green, blue);
      const min = Math.min(red, green, blue);
      const saturation = max ? (max - min) / max : 0;
      const brightness = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
      if (saturation < 0.18 || brightness < 20 || brightness > 248) continue;
      const key = `${red >> 5},${green >> 5},${blue >> 5}`;
      const bucket = buckets.get(key) || { count: 0, red: 0, green: 0, blue: 0 };
      bucket.count++;
      bucket.red += red;
      bucket.green += green;
      bucket.blue += blue;
      buckets.set(key, bucket);
    }
    if (!buckets.size) return null;

    const dominant = [...buckets.values()].sort((a, b) => b.count - a.count)[0];
    const red = dominant.red / dominant.count / 255;
    const green = dominant.green / dominant.count / 255;
    const blue = dominant.blue / dominant.count / 255;
    const max = Math.max(red, green, blue);
    const min = Math.min(red, green, blue);
    const difference = max - min;
    let hue = 0;
    if (difference) {
      if (max === red) hue = 60 * (((green - blue) / difference) % 6);
      else if (max === green) hue = 60 * ((blue - red) / difference + 2);
      else hue = 60 * ((red - green) / difference + 4);
    }
    if (hue < 0) hue += 360;
    const saturation = max === 0 ? 0 : difference / max;
    return { hue: Math.round(hue), saturation: Math.round(saturation * 100) };
  }

  function toneName(hue) {
    if (hue < 15 || hue >= 345) return 'red';
    if (hue < 45) return 'orange';
    if (hue < 70) return 'yellow';
    if (hue < 160) return 'green';
    if (hue < 195) return 'teal';
    if (hue < 255) return 'blue';
    if (hue < 290) return 'violet';
    return 'magenta';
  }

  function tintTheme(tone) {
    const hue = tone?.hue ?? 195;
    const colorSaturation = tone ? Math.max(58, Math.min(86, tone.saturation)) : 78;
    const surfaceSaturation = Math.max(14, Math.min(32, Math.round(colorSaturation * 0.36)));
    themeRoot.style.setProperty('--cyan', `hsl(${hue} ${colorSaturation}% 74%)`);
    themeRoot.style.setProperty('--cyan-bright', `hsl(${hue} ${colorSaturation}% 68%)`);
    themeRoot.style.setProperty('--violet', `hsl(${(hue + 36) % 360} ${Math.max(52, colorSaturation - 6)}% 75%)`);
    themeRoot.style.setProperty('--photo-sidebar', `hsl(${hue} ${surfaceSaturation}% 8%)`);
    themeRoot.style.setProperty('--photo-panel', `hsl(${hue} ${surfaceSaturation}% 13%)`);
    themeRoot.style.setProperty('--photo-panel-raised', `hsl(${hue} ${surfaceSaturation}% 16%)`);
    themeRoot.style.setProperty('--photo-panel-deep', `hsl(${hue} ${surfaceSaturation}% 10%)`);
    themeRoot.style.setProperty('--photo-total', `hsl(${hue} ${surfaceSaturation}% 18%)`);
    themeRoot.style.setProperty('--photo-line', `hsl(${hue} ${surfaceSaturation}% 29%)`);
  }

  function clearImportedBackground(announce = true) {
    if (activePhotoUrl) URL.revokeObjectURL(activePhotoUrl);
    activePhotoUrl = '';
    themeProperties.forEach(property => themeRoot.style.removeProperty(property));
    document.body.classList.remove('photo-background');
    backgroundFile.value = '';
    resetBackground.hidden = true;
    if (announce) backgroundStatus.textContent = 'Original space theme restored · photo was not uploaded';
  }

  importBackground.addEventListener('click', () => backgroundFile.click());
  resetBackground.addEventListener('click', () => clearImportedBackground());

  backgroundFile.addEventListener('change', () => {
    const file = backgroundFile.files && backgroundFile.files[0];
    if (!file) return;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp'];
    if (!allowedTypes.includes(file.type)) {
      backgroundStatus.textContent = 'Choose a JPEG, PNG, WebP, GIF, or BMP image.';
      backgroundFile.value = '';
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      backgroundStatus.textContent = 'Choose an image smaller than 20 MB.';
      backgroundFile.value = '';
      return;
    }

    backgroundStatus.textContent = 'Reading your photo locally…';
    const photoUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      try {
        const tone = dominantPhotoTone(image);
        if (activePhotoUrl) URL.revokeObjectURL(activePhotoUrl);
        activePhotoUrl = photoUrl;
        themeRoot.style.setProperty('--imported-photo', `url("${photoUrl}")`);
        tintTheme(tone);
        document.body.classList.add('photo-background');
        resetBackground.hidden = false;
        backgroundStatus.textContent = tone
          ? `Background added locally · ${toneName(tone.hue)} tones matched · never uploaded`
          : 'Background added locally · neutral colors kept the original cyan accents';
      } catch {
        URL.revokeObjectURL(photoUrl);
        backgroundStatus.textContent = 'Could not read that image; the current theme is unchanged.';
      }
      backgroundFile.value = '';
    };
    image.onerror = () => {
      URL.revokeObjectURL(photoUrl);
      backgroundStatus.textContent = 'Could not load that image; the current theme is unchanged.';
      backgroundFile.value = '';
    };
    image.src = photoUrl;
  });

  window.addEventListener('beforeunload', () => {
    if (activePhotoUrl) URL.revokeObjectURL(activePhotoUrl);
  });

  paintBalances();
  paintTransactions();
})();

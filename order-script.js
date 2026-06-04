// ═══════════════════════════════════════
//  NOVA POSHTA — автопідказка
// ═══════════════════════════════════════
const NP_KEY = 'dc90675288abe6dcfd4a723a5bb4c01a';
const NP_API = 'https://api.novaposhta.ua/v2.0/json/';

async function npRequest(modelName, calledMethod, props = {}) {
  try {
    const res = await fetch(NP_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey: NP_KEY,
        modelName,
        calledMethod,
        methodProperties: props
      })
    });
    const data = await res.json();
    if (!data.success) {
      console.error('NP API error:', data.errors);
      return [];
    }
    return data.data || [];
  } catch (err) {
    console.error('NP fetch error:', err);
    return [];
  }
}

function showDropdown(listEl, items, onSelect) {
  listEl.innerHTML = '';
  listEl.classList.remove('open');

  if (!items.length) {
    const li = document.createElement('li');
    li.className = 'np-loading';
    li.textContent = 'Нічого не знайдено';
    listEl.appendChild(li);
    listEl.classList.add('open');
    return;
  }

  items.forEach(item => {
    const li = document.createElement('li');
    li.textContent = item.label;
    li.addEventListener('mousedown', (e) => {
      e.preventDefault();
      onSelect(item);
      listEl.classList.remove('open');
    });
    listEl.appendChild(li);
  });
  listEl.classList.add('open');
}

function initNovaPoshta() {
  // ── елементи в HTML ──
  const cityInput = document.getElementById('cityInput');
  const cityRef   = document.getElementById('cityRef');
  const cityErr   = document.getElementById('city-err');
  const whInput   = document.getElementById('warehouseInput');
  const whRef     = document.getElementById('warehouseRef');
  const whErr     = document.getElementById('wh-err');

  // Знаходимо або створюємо дропдауни всередині .np-wrap
  let cityList = document.getElementById('npCityList');
  let whList   = document.getElementById('npWarehouseList');

  if (!cityInput) return;

  // Якщо <ul> ще не існує — створюємо і вставляємо після інпуту
  if (!cityList) {
    cityList = document.createElement('ul');
    cityList.id = 'npCityList';
    cityList.className = 'np-list';
    cityInput.parentNode.appendChild(cityList);
  }
  if (!whList) {
    whList = document.createElement('ul');
    whList.id = 'npWarehouseList';
    whList.className = 'np-list';
    whInput.parentNode.appendChild(whList);
  }

  // ── МІСТО ──
  let cityTimer;
  let warehouseCache = []; // кешуємо список відділень

  cityInput.addEventListener('input', () => {
    const q = cityInput.value.trim();
    cityRef.value = '';
    whInput.disabled = true;
    whInput.value = '';
    whRef.value = '';
    warehouseCache = [];
    whList.classList.remove('open');

    clearTimeout(cityTimer);
    if (q.length < 2) { cityList.classList.remove('open'); return; }

    cityList.innerHTML = '<li class="np-loading">Пошук...</li>';
    cityList.classList.add('open');

    cityTimer = setTimeout(async () => {
      const data = await npRequest('Address', 'searchSettlements', {
        CityName: q,
        Limit: '10'
      });

      const addresses = data[0]?.Addresses || [];
      const items = addresses.map(a => ({
        label: a.Present,
        ref: a.DeliveryCity || a.Ref
      }));

      showDropdown(cityList, items, (item) => {
        cityInput.value = item.label;
        cityRef.value   = item.ref;
        // очищуємо помилку
        if (cityErr) cityErr.classList.remove('show');
        cityInput.classList.remove('err');
        loadWarehouses(item.ref);
      });
    }, 400);
  });

  cityInput.addEventListener('blur', () => {
    setTimeout(() => cityList.classList.remove('open'), 200);
  });

  // ── ВІДДІЛЕННЯ ──
  async function loadWarehouses(ref) {
    whInput.disabled = false;
    whInput.placeholder = 'Завантаження відділень...';
    whRef.value = '';
    whList.classList.remove('open');

    const data = await npRequest('AddressGeneral', 'getWarehouses', {
      CityRef: ref,
      Limit: '200'
    });

    warehouseCache = data.map(w => ({
      label: w.Description,
      ref: w.Ref
    }));

    whInput.placeholder = 'Введіть номер або назву відділення...';
  }

  let whTimer;
  whInput.addEventListener('input', () => {
    const q = whInput.value.toLowerCase().trim();
    whRef.value = '';
    clearTimeout(whTimer);

    if (q.length < 1) { whList.classList.remove('open'); return; }

    whTimer = setTimeout(() => {
      const filtered = warehouseCache
        .filter(i => i.label.toLowerCase().includes(q))
        .slice(0, 15);

      showDropdown(whList, filtered, (item) => {
        whInput.value = item.label;
        whRef.value   = item.ref;
        if (whErr) whErr.classList.remove('show');
        whInput.classList.remove('err');
      });
    }, 200);
  });

  whInput.addEventListener('blur', () => {
    setTimeout(() => whList.classList.remove('open'), 200);
  });
}

// ── VALIDATION (перевизначаємо для правильних ID) ──
function npValidate() {
  const cityRef = document.getElementById('cityRef');
  const whRef   = document.getElementById('warehouseRef');
  const cityErr = document.getElementById('city-err');
  const whErr   = document.getElementById('wh-err');
  const cityInput = document.getElementById('cityInput');
  const whInput   = document.getElementById('warehouseInput');

  let ok = true;

  if (!cityRef || !cityRef.value) {
    if (cityInput) cityInput.classList.add('err');
    if (cityErr)   cityErr.classList.add('show');
    ok = false;
  } else {
    if (cityInput) cityInput.classList.remove('err');
    if (cityErr)   cityErr.classList.remove('show');
  }

  if (!whRef || !whRef.value) {
    if (whInput) whInput.classList.add('err');
    if (whErr)   whErr.classList.add('show');
    ok = false;
  } else {
    if (whInput) whInput.classList.remove('err');
    if (whErr)   whErr.classList.remove('show');
  }

  return ok;
}

// ── INIT ──
document.addEventListener('DOMContentLoaded', () => {
  initNovaPoshta();

  // Патчимо validate() в кожному order-файлі — замінюємо перевірку NP
  const origValidate = window.validate;
  if (typeof origValidate === 'function') {
    window.validate = function() {
      const baseOk = origValidate();
      const npOk   = npValidate();
      return baseOk && npOk;
    };
  }
});

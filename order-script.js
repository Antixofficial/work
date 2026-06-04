// ═══════════════════════════════════════
//  NOVA POSHTA — автопідказка
// ═══════════════════════════════════════
const NP_KEY = '15e3045ed439f12fb9a5d010c37b7b93';
const NP_API = 'https://api.novaposhta.ua/v2.0/json/';

async function npRequest(modelName, calledMethod, props = {}) {
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
  return data.data || [];
}

function showDropdown(list, items, onSelect) {
  list.innerHTML = '';
  if (!items.length) {
    list.innerHTML = '<li class="np-loading">Нічого не знайдено</li>';
    list.classList.add('open');
    return;
  }
  items.forEach(item => {
    const li = document.createElement('li');
    li.textContent = item.label;
    li.addEventListener('mousedown', (e) => {
      e.preventDefault();
      onSelect(item);
      list.classList.remove('open');
    });
    list.appendChild(li);
  });
  list.classList.add('open');
}

function initNovaPoshta() {
  const cityInput = document.getElementById('npCity');
  const cityList  = document.getElementById('npCityList');
  const cityRef   = document.getElementById('npCityRef');
  const whInput   = document.getElementById('npWarehouse');
  const whList    = document.getElementById('npWarehouseList');
  const whRef     = document.getElementById('npWarehouseRef');

  if (!cityInput) return;

  let cityTimer;

  cityInput.addEventListener('input', () => {
    const q = cityInput.value.trim();
    cityRef.value = '';
    whInput.disabled = true;
    whInput.value = '';
    whRef.value = '';
    whList.classList.remove('open');

    clearTimeout(cityTimer);
    if (q.length < 2) { cityList.classList.remove('open'); return; }

    cityList.innerHTML = '<li class="np-loading">Пошук...</li>';
    cityList.classList.add('open');

    cityTimer = setTimeout(async () => {
      const data = await npRequest('Address', 'searchSettlements', {
        CityName: q, Limit: 10
      });
      const addresses = data[0]?.Addresses || [];
      const items = addresses.map(a => ({
        label: `${a.Present}`,
        ref: a.DeliveryCity || a.Ref,
        name: a.MainDescription
      }));
      showDropdown(cityList, items, (item) => {
        cityInput.value = item.label;
        cityRef.value = item.ref;
        // Завантажуємо відділення
        loadWarehouses(item.ref);
      });
    }, 400);
  });

  cityInput.addEventListener('blur', () => {
    setTimeout(() => cityList.classList.remove('open'), 200);
  });

  async function loadWarehouses(ref) {
    whInput.disabled = false;
    whInput.value = '';
    whInput.placeholder = 'Завантаження...';
    whRef.value = '';

    const data = await npRequest('AddressGeneral', 'getWarehouses', {
      CityRef: ref, Limit: 100
    });
    const items = data.map(w => ({ label: w.Description, ref: w.Ref }));
    whInput.placeholder = 'Введіть номер відділення...';

    whInput.addEventListener('input', () => {
      const q = whInput.value.toLowerCase();
      whRef.value = '';
      const filtered = items.filter(i => i.label.toLowerCase().includes(q)).slice(0, 15);
      if (q.length < 1) { whList.classList.remove('open'); return; }
      showDropdown(whList, filtered, (item) => {
        whInput.value = item.label;
        whRef.value = item.ref;
      });
    });

    whInput.addEventListener('blur', () => {
      setTimeout(() => whList.classList.remove('open'), 200);
    });
  }
}

// ═══════════════════════════════════════
//  INIT on DOM ready
// ═══════════════════════════════════════
document.addEventListener('DOMContentLoaded', function() {
  initNovaPoshta();
});

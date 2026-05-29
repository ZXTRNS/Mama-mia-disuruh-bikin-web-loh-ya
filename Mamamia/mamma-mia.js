
  /* ===== PAGE NAVIGATION ===== */
  function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-' + pageId).classList.add('active');
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.toggle('active', link.dataset.page === pageId);
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // Invalidate map size when order page becomes visible
    if (pageId === 'order' && deliveryMap) {
      setTimeout(() => deliveryMap.invalidateSize(), 200);
    }
  }

  /* ===== HAMBURGER MENU ===== */
  function toggleMobileNav() {
    const nav = document.getElementById('mobile-nav');
    const btn = document.getElementById('hamburger');
    nav.classList.toggle('open');
    btn.classList.toggle('open');
  }
  function closeMobileNav() {
    document.getElementById('mobile-nav').classList.remove('open');
    document.getElementById('hamburger').classList.remove('open');
  }

  /* ===== MENU TABS ===== */
  function switchMenuTab(cat) {
    document.querySelectorAll('.menu-category').forEach(c => c.classList.remove('active'));
    document.getElementById('cat-' + cat).classList.add('active');
    document.querySelectorAll('.menu-tab').forEach((btn, i) => {
      const cats = ['antipasti','primi','secondi','dolci'];
      btn.classList.toggle('active', cats[i] === cat);
    });
  }

  /* ===== DELIVERY MAP ===== */
  let deliveryMap = null;
  let deliveryMarker = null;
  let pinnedLat = null;
  let pinnedLng = null;

  function initDeliveryMap() {
    if (deliveryMap) return; // already initialized

    // Default center: Jakarta, Indonesia
    deliveryMap = L.map('delivery-map', {
      center: [-6.2088, 106.8456],
      zoom: 13,
      zoomControl: true
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: 'Â© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    }).addTo(deliveryMap);

    // Custom red pin icon
    const pinIcon = L.divIcon({
      className: '',
      html: `<div style="
        width:32px;height:42px;position:relative;
        filter:drop-shadow(0 3px 6px rgba(0,0,0,0.35));
      ">
        <svg viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 0C7.163 0 0 7.163 0 16c0 10.5 16 26 16 26s16-15.5 16-26C32 7.163 24.837 0 16 0z" fill="#CE2B37"/>
          <circle cx="16" cy="16" r="7" fill="white"/>
          <circle cx="16" cy="16" r="4" fill="#CE2B37"/>
        </svg>
      </div>`,
      iconSize: [32, 42],
      iconAnchor: [16, 42],
      popupAnchor: [0, -44]
    });

    // Click on map to place / move pin
    deliveryMap.on('click', function(e) {
      placePin(e.latlng.lat, e.latlng.lng, pinIcon);
    });

    deliveryMap.invalidateSize();
  }

  function placePin(lat, lng, iconOverride) {
    pinnedLat = lat.toFixed(6);
    pinnedLng = lng.toFixed(6);

    const pinIcon = iconOverride || L.divIcon({
      className: '',
      html: `<div style="width:32px;height:42px;filter:drop-shadow(0 3px 6px rgba(0,0,0,0.35));">
        <svg viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 0C7.163 0 0 7.163 0 16c0 10.5 16 26 16 26s16-15.5 16-26C32 7.163 24.837 0 16 0z" fill="#CE2B37"/>
          <circle cx="16" cy="16" r="7" fill="white"/><circle cx="16" cy="16" r="4" fill="#CE2B37"/>
        </svg></div>`,
      iconSize: [32, 42],
      iconAnchor: [16, 42],
      popupAnchor: [0, -44]
    });

    if (deliveryMarker) {
      deliveryMarker.setLatLng([lat, lng]);
    } else {
      deliveryMarker = L.marker([lat, lng], { icon: pinIcon, draggable: true }).addTo(deliveryMap);
      deliveryMarker.on('dragend', function(ev) {
        const pos = ev.target.getLatLng();
        updateCoordsDisplay(pos.lat, pos.lng);
        reverseGeocode(pos.lat, pos.lng);
      });
    }

    deliveryMap.panTo([lat, lng]);
    updateCoordsDisplay(lat, lng);
    reverseGeocode(lat, lng);
    showError('err-pin', false);
  }

  function updateCoordsDisplay(lat, lng) {
    pinnedLat = parseFloat(lat).toFixed(6);
    pinnedLng = parseFloat(lng).toFixed(6);
    document.getElementById('coords-lat').textContent = pinnedLat;
    document.getElementById('coords-lng').textContent = pinnedLng;
    document.getElementById('map-coords-display').classList.add('visible');
  }

  function reverseGeocode(lat, lng) {
    fetch('https://nominatim.openstreetmap.org/reverse?format=json&lat=' + lat + '&lon=' + lng)
      .then(r => r.json())
      .then(data => {
        const label = data.display_name
          ? data.display_name.split(',').slice(0,3).join(', ')
          : '';
        document.getElementById('coords-address').textContent = label;
        // Auto-fill address field if empty
        const addrField = document.getElementById('delivery-address');
        if (!addrField.value.trim() && label) {
          addrField.value = label;
        }
      })
      .catch(() => {});
  }

  // Map search button
  document.getElementById('map-search-btn').addEventListener('click', function() {
    const q = document.getElementById('map-search-input').value.trim();
    if (!q) return;
    fetch('https://nominatim.openstreetmap.org/search?format=json&q=' + encodeURIComponent(q) + '&limit=1')
      .then(r => r.json())
      .then(results => {
        if (results && results.length > 0) {
          const lat = parseFloat(results[0].lat);
          const lng = parseFloat(results[0].lon);
          deliveryMap.setView([lat, lng], 15);
        } else {
          alert('Location not found. Try a different search term.');
        }
      })
      .catch(() => alert('Search failed. Please check your connection.'));
  });

  // Also allow Enter key in search
  document.getElementById('map-search-input').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') { e.preventDefault(); document.getElementById('map-search-btn').click(); }
  });

  /* ===== DELIVERY SECTION TOGGLE ===== */
  document.querySelectorAll('input[name="service"]').forEach(function(radio) {
    radio.addEventListener('change', function() {
      const section = document.getElementById('delivery-section');
      if (this.value === 'delivery') {
        section.classList.add('visible');
        // Init map after the element is visible (needs dimensions)
        setTimeout(function() {
          initDeliveryMap();
          if (deliveryMap) deliveryMap.invalidateSize();
        }, 100);
      } else {
        section.classList.remove('visible');
      }
    });
  });

  /* ===== ORDER FORM VALIDATION ===== */
  function showError(id, show) {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('visible', show);
  }
  function setFieldError(fieldId, hasError) {
    const field = document.getElementById(fieldId);
    if (field) field.classList.toggle('error', hasError);
  }
  function clearAllErrors() {
    document.querySelectorAll('.error-msg').forEach(e => e.classList.remove('visible'));
    document.querySelectorAll('.form-control').forEach(f => f.classList.remove('error'));
  }

  document.getElementById('order-form').addEventListener('submit', function(e) {
    e.preventDefault();
    clearAllErrors();
    let valid = true;

    // Name validation
    const name = document.getElementById('cust-name').value.trim();
    if (name.length < 3) {
      showError('err-name', true);
      setFieldError('cust-name', true);
      valid = false;
    }

    // Phone validation (10â€“13 digits, no regex)
    const phone = document.getElementById('cust-phone').value.trim();
    let isAllDigits = true;
    for (let i = 0; i < phone.length; i++) {
      if (isNaN(parseInt(phone[i], 10))) { isAllDigits = false; break; }
    }
    if (!phone || phone.length < 10 || phone.length > 13 || !isAllDigits) {
      showError('err-phone', true);
      setFieldError('cust-phone', true);
      valid = false;
    }

    // Menu item validation
    const menuVal = document.getElementById('menu-select').value;
    if (!menuVal) {
      showError('err-menu', true);
      setFieldError('menu-select', true);
      valid = false;
    }

    // Service option
    const serviceRadios = document.querySelectorAll('input[name="service"]');
    let serviceSelected = false;
    let serviceValue = '';
    serviceRadios.forEach(r => { if (r.checked) { serviceSelected = true; serviceValue = r.value; } });
    if (!serviceSelected) {
      showError('err-service', true);
      valid = false;
    }

    // Delivery-specific validations
    if (serviceValue === 'delivery') {
      // Address
      const addr = document.getElementById('delivery-address').value.trim();
      if (!addr) {
        showError('err-address', true);
        setFieldError('delivery-address', true);
        valid = false;
      }
      // Pin on map
      if (!pinnedLat || !pinnedLng) {
        showError('err-pin', true);
        valid = false;
      }
      // Toppings
      const toppings = document.querySelectorAll('input[name="topping"]:checked');
      if (toppings.length === 0) {
        showError('err-toppings', true);
        valid = false;
      }
    }

    // Payment method
    const paymentRadios = document.querySelectorAll('input[name="payment"]');
    let paymentSelected = false;
    paymentRadios.forEach(r => { if (r.checked) paymentSelected = true; });
    if (!paymentSelected) {
      showError('err-payment', true);
      valid = false;
    }

    if (valid) {
      // Build confirmation message
      let confirmExtra = '';
      if (serviceValue === 'delivery') {
        const addr = document.getElementById('delivery-address').value.trim();
        confirmExtra = '<br><small style="color:var(--green);">ðŸ“ Delivering to: ' + addr + ' (' + pinnedLat + ', ' + pinnedLng + ')</small>';
      }
      const successEl = document.getElementById('success-msg');
      successEl.querySelector('p').innerHTML = 'Your order has been received. We\'ll contact you shortly to confirm your order details.' + confirmExtra;
      successEl.classList.add('visible');
      document.getElementById('order-form').reset();
      // Reset map state
      if (deliveryMarker) { deliveryMarker.remove(); deliveryMarker = null; }
      pinnedLat = null; pinnedLng = null;
      document.getElementById('map-coords-display').classList.remove('visible');
      document.getElementById('delivery-section').classList.remove('visible');
      successEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => successEl.classList.remove('visible'), 8000);
    }
  });

  // Clear errors on input
  document.getElementById('cust-name').addEventListener('input', function() {
    showError('err-name', false); setFieldError('cust-name', false);
  });
  document.getElementById('cust-phone').addEventListener('input', function() {
    showError('err-phone', false); setFieldError('cust-phone', false);
  });
  document.getElementById('menu-select').addEventListener('change', function() {
    showError('err-menu', false); setFieldError('menu-select', false);
  });
  document.getElementById('delivery-address').addEventListener('input', function() {
    showError('err-address', false); setFieldError('delivery-address', false);
  });


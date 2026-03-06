document.addEventListener('DOMContentLoaded', () => {
  const elements = document.querySelectorAll('.fade-in, .fade-left, .fade-right, .fade-up');
  const observer = new IntersectionObserver(entries => {
      entries.forEach((entry, index) => {
          if (entry.isIntersecting) {
              setTimeout(() => entry.target.classList.add('show'), index * 120);
          }
      });
  }, { threshold: 0.15 });
  elements.forEach(el => observer.observe(el));

  // Cart state
  let cart = JSON.parse(localStorage.getItem('ms_cart') || '[]');

  const cartCountEl = document.getElementById('cartCount');
  const cartItemsList = document.getElementById('cartItemsList');
  const cartTotalEl = document.getElementById('cartTotal');
  const addToast = document.getElementById('addToast');

  function saveCart() {
    localStorage.setItem('ms_cart', JSON.stringify(cart));
  }

  function updateCartCount() {
    const count = cart.reduce((s, it) => s + it.qty, 0);
    cartCountEl.textContent = count;
  }

  function renderCart() {
    cartItemsList.innerHTML = '';
    if (cart.length === 0) {
      cartItemsList.innerHTML = '<div class="text-center text-muted">Cart is empty</div>';
      cartTotalEl.textContent = '₹0';
      return;
    }
    cart.forEach((item, idx) => {
      const li = document.createElement('div');
      li.className = 'list-group-item d-flex justify-content-between align-items-center';
      li.innerHTML = `
        <div class="d-flex gap-3 align-items-center">
          <strong>${item.name}</strong>
          <small class="text-muted">₹${item.price}</small>
        </div>
        <div class="d-flex gap-2 align-items-center">
          <input type="number" min="1" value="${item.qty}" data-idx="${idx}" class="form-control form-control-sm cart-item-qty">
          <button class="btn btn-sm btn-outline-light remove-item" data-idx="${idx}"><i class="fa fa-trash"></i></button>
        </div>
      `;
      cartItemsList.appendChild(li);
    });
    const total = cart.reduce((s, it) => s + it.price * it.qty, 0);
    cartTotalEl.textContent = `₹${total}`;
  }

  function showAddToast(text) {
    addToast.textContent = text;
    addToast.style.display = 'block';
    addToast.style.opacity = '1';
    setTimeout(() => { addToast.style.opacity = '0'; addToast.style.display = 'none'; }, 1500);
  }

  // Initialize
  updateCartCount();
  renderCart();

  // Add to cart buttons
  document.body.addEventListener('click', (e) => {
    if (e.target.closest('.add-cart')) {
      const btn = e.target.closest('.add-cart');
      const name = btn.dataset.name;
      const price = Number(btn.dataset.price || 0);
      const existing = cart.find(i => i.name === name);
      if (existing) existing.qty += 1; else cart.push({ name, price, qty: 1 });
      saveCart(); updateCartCount(); renderCart(); showAddToast(`${name} added to cart`);
    }

    if (e.target.closest('.view-btn')) {
      const btn = e.target.closest('.view-btn');
      const title = document.getElementById('productModalTitle');
      const img = document.getElementById('productModalImg');
      const price = document.getElementById('productModalPrice');
      const desc = document.getElementById('productModalDesc');
      const modal = new bootstrap.Modal(document.getElementById('productModal'));
      title.textContent = btn.dataset.name;
      img.src = btn.dataset.img || '';
      price.textContent = `₹${btn.dataset.price}`;
      desc.textContent = btn.dataset.desc || '';
      document.getElementById('productQty').value = 1;
      document.getElementById('modalAddCart').dataset.name = btn.dataset.name;
      document.getElementById('modalAddCart').dataset.price = btn.dataset.price;
      modal.show();
    }

    if (e.target.id === 'modalAddCart') {
      const name = e.target.dataset.name;
      const price = Number(e.target.dataset.price || 0);
      const qty = Number(document.getElementById('productQty').value || 1);
      const existing = cart.find(i => i.name === name);
      if (existing) existing.qty += qty; else cart.push({ name, price, qty });
      saveCart(); updateCartCount(); renderCart(); showAddToast(`${name} added`);
      const pm = bootstrap.Modal.getInstance(document.getElementById('productModal'));
      if (pm) pm.hide();
    }

    if (e.target.classList.contains('remove-item')) {
      const idx = Number(e.target.dataset.idx);
      cart.splice(idx, 1);
      saveCart(); updateCartCount(); renderCart();
    }

    if (e.target.id === 'checkoutBtn') {
      if (cart.length === 0) { showAddToast('Cart is empty'); return; }
      cart = []; saveCart(); updateCartCount(); renderCart(); showAddToast('Thank you! Order placed');
      const cm = bootstrap.Modal.getInstance(document.getElementById('cartModal'));
      if (cm) cm.hide();
    }
  });

  // Quantity changes
  cartItemsList.addEventListener('change', (e) => {
    if (e.target.classList.contains('cart-item-qty')) {
      const idx = Number(e.target.dataset.idx);
      const val = Math.max(1, Number(e.target.value || 1));
      cart[idx].qty = val;
      saveCart(); updateCartCount(); renderCart();
    }
  });

  // Search
  const search = document.getElementById('productSearch');
  const products = Array.from(document.querySelectorAll('.product'));
  if (search) {
    search.addEventListener('input', (e) => {
      const q = e.target.value.trim().toLowerCase();
      products.forEach(p => {
        const title = (p.querySelector('h5')?.textContent || '').toLowerCase();
        p.style.display = q === '' || title.includes(q) ? 'block' : 'none';
      });
    });
  }

  // Filtering
  const filterBtns = document.querySelectorAll('.filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.dataset.filter;
      products.forEach(product => {
        product.style.display = filter === 'all' || product.classList.contains(filter) ? 'block' : 'none';
      });
    });
  });

  /* ===== Featured slider behavior ===== */
  (function initFeaturedSlider(){
    const slider = document.querySelector('.slider');
    if (!slider) return;
    const track = slider.querySelector('.slider-track');
    const slides = Array.from(track.querySelectorAll('.slide'));
    const prevBtn = slider.querySelector('.slider-arrow.prev');
    const nextBtn = slider.querySelector('.slider-arrow.next');
    const dotsWrap = document.querySelector('.slider-dots');
    let active = 0;
    let autoPlayTimer = null;
    let isPaused = false;

    function updateSlides(){
      slides.forEach((s,i)=>{
        s.classList.remove('active','prev','next');
        s.setAttribute('aria-selected', i === active);
        if (i === active) s.classList.add('active');
        else if (i === (active - 1 + slides.length) % slides.length) s.classList.add('prev');
        else if (i === (active + 1) % slides.length) s.classList.add('next');
      });
      // Ensure active slide is scrolled into view nicely
      const activeSlide = slides[active];
      const offset = activeSlide.offsetLeft - (track.clientWidth - activeSlide.clientWidth) / 2;
      track.scrollTo({left: offset, behavior: 'smooth'});
      updateDots();
    }

    function go(to){
      active = (to + slides.length) % slides.length;
      updateSlides();
    }

    function prev(){ go(active - 1); }
    function next(){ go(active + 1); }

    // Dots
    function createDots(){
      dotsWrap.innerHTML = '';
      slides.forEach((_,i)=>{
        const d = document.createElement('button');
        d.className = 'slider-dot';
        d.setAttribute('aria-label', `Go to slide ${i+1}`);
        d.addEventListener('click', ()=>{ go(i); resetAutoPlay(); });
        dotsWrap.appendChild(d);
      });
    }
    function updateDots(){
      const dots = Array.from(dotsWrap.children);
      dots.forEach((d,i)=> d.classList.toggle('active', i === active));
    }

    prevBtn.addEventListener('click', ()=>{ prev(); resetAutoPlay(); });
    nextBtn.addEventListener('click', ()=>{ next(); resetAutoPlay(); });

    // Keyboard
    slider.addEventListener('keydown', (e)=>{
      if (e.key === 'ArrowLeft') { prev(); resetAutoPlay(); }
      if (e.key === 'ArrowRight') { next(); resetAutoPlay(); }
    });

    // Click on slide to make it active (helpful on mobile)
    slides.forEach((s,i)=> s.addEventListener('click', ()=>{ go(i); resetAutoPlay(); }));

    // Swipe support
    let startX = 0, dx = 0, isPointer = false;
    track.addEventListener('pointerdown', (e)=>{ isPointer=true; startX=e.clientX; track.setPointerCapture(e.pointerId); });
    track.addEventListener('pointermove', (e)=>{ if(!isPointer) return; dx = e.clientX - startX; });
    track.addEventListener('pointerup', (e)=>{ isPointer=false; if (dx > 40) prev(); else if (dx < -40) next(); dx = 0; });
    track.addEventListener('pointercancel', ()=>{ isPointer=false; dx=0; });

    // Autoplay
    function autoPlay(){
      autoPlayTimer = setInterval(()=>{ if(!isPaused) next(); }, 4500);
    }
    function resetAutoPlay(){ clearInterval(autoPlayTimer); autoPlay(); }

    // Pause on hover/focus
    slider.addEventListener('mouseenter', ()=> isPaused = true);
    slider.addEventListener('mouseleave', ()=> isPaused = false);
    slider.addEventListener('focusin', ()=> isPaused = true);
    slider.addEventListener('focusout', ()=> isPaused = false);

    createDots(); updateSlides(); autoPlay();
  })();

});

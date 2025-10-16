class ShowcaseProduct extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.productId = this.getAttribute('product-id');
    
    if (!this.productId) {
      return;
    }

    if (window.app?.status === 'ready') {
      this.onReady();
    } else {
      document.addEventListener('theme::ready', () => this.onReady());
    }
  }

  onReady() {
    this.placeholder = salla.url.asset(salla.config.get('theme.settings.placeholder'));
    this.fitImageHeight = salla.config.get('store.settings.product.fit_type');
    
    // Add translations
    salla.lang.add('showcase.view_product', {
      ar: 'عرض المنتج',
      en: 'View Product'
    });
    
    // Fetch product details (name and url are included by default)
    salla.product.getDetails(this.productId, ["images"])
      .then((response) => {
        this.product = response.data;
        this.viewProductText = salla.lang.get('showcase.view_product');
        this.render();
      })
      .catch((error) => {
        console.log('Failed to fetch product details:', error);
      });
  }

  render() {
    if (!this.product) {
      return;
    }

    this.innerHTML = `
      <a href="${this.product.url}" class="showcase-product-card flex flex-row gap-3 p-3 bg-white rounded-lg hover:shadow-md transition-shadow">
        <div class="showcase-product-image w-16 h-16 flex-shrink-0">
          <img 
            src="${this.product.image?.url || this.placeholder}"
            alt="${this.product.name}"
            class="w-full h-full object-${this.fitImageHeight || 'cover'} rounded"
          />
        </div>
        <div class="showcase-product-content flex flex-col justify-center">
          <h4 class="text-xs font-medium text-gray-900 line-clamp-2 mb-1">${this.product.name}</h4>
          <span class="text-xs text-primary underline">${this.viewProductText}</span>
        </div>
      </a>
    `;
  }
}

customElements.define('showcase-product', ShowcaseProduct);

// Position card based on viewport
function positionCard(wrapper, card) {
  const rect = wrapper.getBoundingClientRect();
  const cardWidth = 200;
  const cardHeight = 100;
  const spacing = 4;
  
  // Reset positioning
  card.style.left = '';
  card.style.right = '';
  card.style.top = '';
  card.style.bottom = '';
  
  // Check horizontal position
  const spaceOnRight = window.innerWidth - rect.right;
  const spaceOnLeft = rect.left;
  
  if (spaceOnRight >= cardWidth + spacing) {
    // Position to the right
    card.style.left = '100%';
    card.style.marginLeft = spacing + 'px';
  } else if (spaceOnLeft >= cardWidth + spacing) {
    // Position to the left
    card.style.right = '100%';
    card.style.marginRight = spacing + 'px';
  } else {
    // Center horizontally
    card.style.left = '50%';
    card.style.transform = 'translateX(-50%)';
  }
  
  // Check vertical position
  const spaceBelow = window.innerHeight - rect.bottom;
  const spaceAbove = rect.top;
  
  if (spaceBelow >= cardHeight + spacing) {
    // Position below
    card.style.top = '100%';
    card.style.marginTop = spacing + 'px';
  } else if (spaceAbove >= cardHeight + spacing) {
    // Position above
    card.style.bottom = '100%';
    card.style.marginBottom = spacing + 'px';
  } else {
    // Center vertically
    card.style.top = '50%';
    card.style.transform = card.style.transform ? card.style.transform + ' translateY(-50%)' : 'translateY(-50%)';
  }
}

// Setup hotspot hover functionality
document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('.hotspot-wrapper').forEach(wrapper => {
    const button = wrapper.querySelector('.product-hotspot');
    const card = wrapper.querySelector('.hotspot-card');
    
    if (!button || !card) return;
    
    let hideTimeout;
    
    const showCard = () => {
      clearTimeout(hideTimeout);
      
      // Close all other cards
      document.querySelectorAll('.hotspot-card.active').forEach(c => {
        if (c !== card) c.classList.remove('active');
      });
      
      // Position and show this card
      positionCard(wrapper, card);
      card.classList.add('active');
    };
    
    const hideCard = () => {
      hideTimeout = setTimeout(() => {
        card.classList.remove('active');
      }, 100);
    };
    
    wrapper.addEventListener('mouseenter', showCard);
    wrapper.addEventListener('mouseleave', hideCard);
    
    card.addEventListener('mouseenter', showCard);
    card.addEventListener('mouseleave', hideCard);
  });
});


import BasePage from '../base-page';
class ProductCard extends HTMLElement {
  constructor(){
    super()
  }
  
  connectedCallback(){
    // Parse product data
    this.product = this.product || JSON.parse(this.getAttribute('product')); 

    const needsOptions = this.product.has_options && (!this.product.options || this.product.options.length === 0);
        
        if (needsOptions) {
          this.fetchProductOptions();
        } else {
          // Use existing product data and render immediately
          this.render();
        }
    
    if (window.app?.status === 'ready') {
      this.onReady();
    } else {
      document.addEventListener('theme::ready', () => this.onReady() )
    }
  }

  fetchProductOptions() {
    // Fetch options only
    salla.product.getDetails(this.product.id, ["options"])
        .then((response) => {
            if (response.data?.options) {
                this.product.options = response.data.options;
            }
            this.render();
        })
        .catch(error => {
            // Fallback: use existing product data
            this.render();
        });
  }

  onReady(){
      this.fitImageHeight = salla.config.get('store.settings.product.fit_type');
      this.placeholder = salla.url.asset(salla.config.get('theme.settings.placeholder'));
      this.getProps()

	  this.source = salla.config.get("page.slug");
      // If the card is in the landing page, hide the add button and show the quantity
	  if (this.source == "landing-page") {
	  	this.hideAddBtn = true;
	  	this.showQuantity = window.showQuantity;
	  }

      // Fetch product images for hover effect
      if (!this.product.images) {
        salla.product.getDetails(this.product.id, ["images"])
          .then((response) => {
            this.product.images = response.data.images;
            // Re-render if we have multiple images
            if (this.product.images?.length > 1) {
              this.updateHoverImage();
            }
          })
          .catch((error) => {
            console.log('Failed to fetch product images:', error);
          });
      }

      salla.lang.onLoaded(() => {
        // Language
        this.remained = salla.lang.get('pages.products.remained');
        this.donationAmount = salla.lang.get('pages.products.donation_amount');
        this.startingPrice = salla.lang.get('pages.products.starting_price');
        this.addToCart = salla.lang.get('pages.cart.add_to_cart');
        this.outOfStock = salla.lang.get('pages.products.out_of_stock');
        salla.lang.add('pages.products.discount_percentage', {
            ar: 'خصم',
            en: 'off'
        });
        this.discountText = salla.lang.get('pages.products.discount_percentage');

        // re-render to update translations
        this.render();
      })
      
      this.render()
  }

  updateProductImage(imageUrl) {
    const mainImage = this.querySelector('.s-product-card-image-main');
    
    if (mainImage && imageUrl) {
      // Update the data-src attribute for lazy loading
      mainImage.setAttribute('data-src', imageUrl);
      // Also update the src directly for immediate change
      mainImage.src = imageUrl;
      // Update lazy load instance
      document.lazyLoadInstance?.update([mainImage]);
      
      // Disable hover effect by removing hover image and event listeners
      this.disableHoverEffect();
    }
  }

  disableHoverEffect() {
    // Remove hover image if it exists
    const hoverImage = this.querySelector('.s-product-card-image-hover');
    if (hoverImage) {
      hoverImage.remove();
    }
    
    // Remove hover event listeners
    this.removeEventListener('mouseenter', this.hoverEnterHandler);
    this.removeEventListener('mouseleave', this.hoverLeaveHandler);
    
    // Mark that hover effect is disabled
    this.hoverEffectDisabled = true;
  }

  updateHoverImage() {
    const imageContainer = this.querySelector('.s-product-card-image a, .s-product-card-image-full a');
    const mainImage = imageContainer?.querySelector('.s-product-card-image-main');
    
    if (!imageContainer || !mainImage || !this.product.images?.[1]) {
      return;
    }

    // Check if hover image already exists
    if (this.querySelector('.s-product-card-image-hover')) {
      return;
    }

    // Create and insert hover image
    const hoverImage = document.createElement('img');
    hoverImage.className = `s-product-card-image-${
      salla.url.is_placeholder(this.product.images[1]?.url)
        ? 'contain'
        : this.fitImageHeight
        ? this.fitImageHeight
        : 'cover'
    } lazy s-product-card-image-hover`;
    hoverImage.src = this.placeholder;
    hoverImage.alt = this.escapeHTML(this.product.images[1]?.alt || this.product.name);
    hoverImage.setAttribute('data-src', this.product.images[1]?.url || '');
    hoverImage.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0; transition: opacity 0.3s ease;';
    
    mainImage.after(hoverImage);
    
    // Update lazy load
    document.lazyLoadInstance?.update([hoverImage]);
    
    // Add hover listeners
    this.addEventListener('mouseenter', () => {
      hoverImage.style.opacity = '1';
    });
    this.addEventListener('mouseleave', () => {
      hoverImage.style.opacity = '0';
    });
  }

  initCircleBar() {
    let qty = this.product.quantity,
      total = this.product.quantity > 100 ? this.product.quantity * 2 : 100,
      roundPercent = (qty / total) * 100,
      bar = this.querySelector('.s-product-card-content-pie-svg-bar'),
      strokeDashOffsetValue = 100 - roundPercent;
    bar.style.strokeDashoffset = strokeDashOffsetValue;
  }

  formatDate(date) {
    let d = new Date(date);
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  } 

  getProductBadge() {
    if (this.product?.preorder?.label) {
      return `<div class="s-product-card-promotion-title">${this.product.preorder.label}</div>`
    }

    if (this.product.promotion_title) {
      return `<div class="s-product-card-promotion-title">${this.product.promotion_title}</div>`
    }
    if (this.showQuantity && this.product?.quantity) {
      return `<div
        class="s-product-card-quantity">${this.remained} ${salla.helpers.number(this.product?.quantity)}</div>`
    }
    if (this.showQuantity && this.product?.is_out_of_stock) {
      return `<div class="s-product-card-out-badge">${this.outOfStock}</div>`
    }
    return '';
  }

  getPriceFormat(price) {
    if (!price || price == 0) {
      return salla.config.get('store.settings.product.show_price_as_dash')?'-':'';
    }

    return salla.money(price);
  }

  getProductPrice() {
    let price = '';
    if (this.product.is_on_sale) {
      const discount_percentage = Math.round(((this.product.regular_price - this.product.sale_price) / this.product.regular_price) * 100);
      price = `<div class="s-product-card-sale-price">
                <h4>${this.getPriceFormat(this.product.sale_price)}</h4>
                <span>${this.getPriceFormat(this.product?.regular_price)}</span>
                </div>
                <span class="s-product-card-discount-percentage">${this.discountText} ${discount_percentage}%</span>
              `;
    }
    else if (this.product.starting_price) {
      price = `<div class="s-product-card-starting-price">
                  <p>${this.startingPrice}</p>
                  <h4> ${this.getPriceFormat(this.product?.starting_price)} </h4>
              </div>`
    }
    else{
      price = `<h4 class="s-product-card-price">${this.getPriceFormat(this.product?.price)}</h4>`
    }

    return price;
  }

  getAddButtonLabel() {
    if(this.product.has_preorder_campaign) {
        return salla.lang.get('pages.products.pre_order_now');
    }

    if (this.product.status === 'sale' && this.product.type === 'booking') {
      return salla.lang.get('pages.cart.book_now'); 
    }

    if (this.product.status === 'sale') {
      return salla.lang.get('pages.cart.add_to_cart');
    }

    if (this.product.type !== 'donating') {
      return salla.lang.get('pages.products.out_of_stock');
    }

    // donating
    return salla.lang.get('pages.products.donation_exceed');
  }

  getProps(){

    /**
     *  Horizontal card.
     */
    this.horizontal = this.hasAttribute('horizontal');
  
    /**
     *  Support shadow on hover.
     */
    this.shadowOnHover = this.hasAttribute('shadowOnHover');
  
    /**
     *  Hide add to cart button.
     */
    this.hideAddBtn = this.hasAttribute('hideAddBtn');
  
    /**
     *  Full image card.
     */
    this.fullImage = this.hasAttribute('fullImage');
  
    /**
     *  Minimal card.
     */
    this.minimal = this.hasAttribute('minimal');
  
    /**
     *  Special card.
     */
    this.isSpecial = this.hasAttribute('isSpecial');
  
    /**
     *  Show quantity.
     */
    this.showQuantity = this.hasAttribute('showQuantity');

    this.showSingleOption = this.hasAttribute('showSingleOption');
    
    this.showMultipleOption = this.hasAttribute('showMultipleOption');
  }


  renderProductOptions() {
    if (!this.product.has_options || !this.product.options || this.product.options.length === 0) {
      return '';
    }

    // Filter options to only show image/thumbnail types
    const imageOptions = this.product.options.filter(option => 
      option.type === 'thumbnail' || option.type === 'image'
    );

    if (imageOptions.length === 0) {
      return '';
    }

    // Get config from window variables passed from master.twig
    const showSingleOption = window.show_singleOption == '1' || window.show_singleOption === 'true' || window.show_singleOption === true;
    const showMultipleOption = window.show_multipleOption == '1' || window.show_multipleOption === 'true' || window.show_multipleOption === true;
    
    let config = {};
    if (showSingleOption) {
      config["single-option"] = { type: "button" };
    }
    if (showMultipleOption) {
      config["multiple-option"] = { type: "button" };
    }

    return `<salla-product-options class="tela-product-card-options" options='${JSON.stringify(imageOptions)}' product-id="${this.product.id}" config='${JSON.stringify(config)}'></salla-product-options>`;
  }

  escapeHTML(str = '') {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  }

  render(){
    this.classList.add('s-product-card-entry'); 
    this.setAttribute('id', this.product.id);
    !this.horizontal && !this.fullImage && !this.minimal? this.classList.add('s-product-card-vertical') : '';
    this.horizontal && !this.fullImage && !this.minimal? this.classList.add('s-product-card-horizontal') : '';
    this.fitImageHeight && !this.isSpecial && !this.fullImage && !this.minimal? this.classList.add('s-product-card-fit-height') : '';
    this.isSpecial? this.classList.add('s-product-card-special') : '';
    this.fullImage? this.classList.add('s-product-card-full-image') : '';
    this.minimal? this.classList.add('s-product-card-minimal') : '';
    this.product?.donation?  this.classList.add('s-product-card-donation') : '';
    this.shadowOnHover?  this.classList.add('s-product-card-shadow') : '';
    this.product?.is_out_of_stock?  this.classList.add('s-product-card-out-of-stock') : '';
    this.isInWishlist = !salla.config.isGuest() && salla.storage.get('salla::wishlist', []).includes(Number(this.product.id));
    const hasMultipleImages = this.product.images?.length > 1;
    this.innerHTML = `
        <div class="${!this.fullImage ? 's-product-card-image' : 's-product-card-image-full'}">
          <a href="${this.product?.url}" aria-label="${this.escapeHTML(this.product?.image?.alt || this.product.name)}">
           <img 
              class="s-product-card-image-${salla.url.is_placeholder(this.product?.image?.url)
                ? 'contain'
                : this.fitImageHeight
                ? this.fitImageHeight
                : 'cover'} lazy s-product-card-image-main"
              src="${this.placeholder}"
              alt="${this.escapeHTML(this.product?.image?.alt || this.product.name)}"
              data-src="${this.product?.image?.url || this.product?.thumbnail || ''}"
            />
            ${hasMultipleImages ? `
            <img 
              class="s-product-card-image-${salla.url.is_placeholder(this.product.images[1]?.url)
                ? 'contain'
                : this.fitImageHeight
                ? this.fitImageHeight
                : 'cover'} lazy s-product-card-image-hover"
              src="${this.placeholder}"
              alt="${this.escapeHTML(this.product.images[1]?.alt || this.product.name)}"
              data-src="${this.product.images[1]?.url || ''}"
              style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0; transition: opacity 0.3s ease;"
            />` : ''}
            ${!this.fullImage && !this.minimal ? this.getProductBadge() : ''}
          </a>
          ${this.fullImage ? `<a href="${this.product?.url}" aria-label=${this.product.name} class="s-product-card-overlay"></a>`:''}
        </div>
        <div class="s-product-card-content">
          ${this.isSpecial && this.product?.quantity ?
            `<div class="s-product-card-content-pie">
              <span>
                <b>${salla.helpers.number(this.product?.quantity)}</b>
                ${this.remained}
              </span>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="-2 -1 36 34" class="s-product-card-content-pie-svg">
                <circle cx="16" cy="16" r="15.9155" class="s-product-card-content-pie-svg-base" />
                <circle cx="16" cy="16" r="15.9155" class="s-product-card-content-pie-svg-bar" />
              </svg>
            </div>`
            : ``}

          <div class="s-product-card-content-main ${this.isSpecial ? 's-product-card-content-extra-padding' : ''}">
            <h3 class="s-product-card-content-title">
              <a href="${this.product?.url}">${this.product?.name}</a>
            </h3>
          </div>
          ${this.product?.donation && !this.minimal && !this.fullImage ?
          `<salla-progress-bar donation=${JSON.stringify(this.product?.donation)}></salla-progress-bar>
          <div class="s-product-card-donation-input">
            ${this.product?.donation?.can_donate ?
              `<label for="donation-amount-${this.product.id}">${this.donationAmount} <span>*</span></label>
              <input
                type="text"
                onInput="${e => {
                  salla.helpers.inputDigitsOnly(e.target);
                  this.addBtn.donatingAmount = (e.target).value;
                }}"
                id="donation-amount-${this.product.id}"
                name="donating_amount"
                class="s-form-control"
                placeholder="${this.donationAmount}" />`
              : ``}
          </div>`
            : ''}
          <div class="s-product-card-content-sub ${this.isSpecial ? 's-product-card-content-extra-padding' : ''}">
            ${this.product?.donation?.can_donate ? '' : this.getProductPrice()}

            ${this.product?.rating?.stars ?
              `<div class="s-product-card-rating">
                <i class="sicon-star2 before:text-orange-300"></i>
                <span>${this.product.rating.stars}</span>
              </div>`
               : ``}
          </div>

          ${this.isSpecial && this.product.discount_ends
            ? `<salla-count-down date="${this.formatDate(this.product.discount_ends)}" end-of-day=${true} boxed=${true}
              labeled=${true} />`
            : ``}

          ${this.product.has_options ? `
            <div class="s-product-card-options">
              ${this.renderProductOptions()}
            </div>
          ` : ``}
        </div>
      `


      this.querySelectorAll('[name="donating_amount"]').forEach((element)=>{
        element.addEventListener('input', (e) => {
          e.target
            .closest(".s-product-card-content")
            .querySelector("salla-add-product-button")
            .setAttribute("donating-amount", e.target.value); 
        });
      })

      document.lazyLoadInstance?.update(this.querySelectorAll('.lazy'));

      // Handle image hover effect (only if not disabled)
      if (!this.hoverEffectDisabled) {
        const hoverImage = this.querySelector('.s-product-card-image-hover');
        if (hoverImage) {
          // Store handlers so we can remove them later
          this.hoverEnterHandler = () => {
            hoverImage.style.opacity = '1';
          };
          this.hoverLeaveHandler = () => {
            hoverImage.style.opacity = '0';
          };
          
          this.addEventListener('mouseenter', this.hoverEnterHandler);
          this.addEventListener('mouseleave', this.hoverLeaveHandler);
        }
      }

      // Handle option change to update product image
      // Listen for input changes within the product options
      const optionsContainer = this.querySelector('.s-product-card-options');
      if (optionsContainer) {
        optionsContainer.addEventListener('change', (event) => {
          if (event.target.type === 'radio' && event.target.checked) {
            // Extract option ID from name attribute (e.g., "options[813323511]" -> "813323511")
            const optionId = event.target.name.match(/\[(\d+)\]/)?.[1];
            // Extract detail ID from value attribute
            const optionDetailId = event.target.value;
            
            // Find the option and its details
            const option = this.product.options.find(opt => opt.id == optionId);
            
            if (option && option.details) {
              const selectedDetail = option.details.find(detail => detail.id == optionDetailId);
              
              if (selectedDetail && selectedDetail.image) {
                this.updateProductImage(selectedDetail.image);
              }
            }
          }
        });
      }

      if (this.product?.quantity && this.isSpecial) {
        this.initCircleBar();
      }
    }
}

customElements.define('custom-salla-product-card', ProductCard);

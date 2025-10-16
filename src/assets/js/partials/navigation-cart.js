class NavCartMenu extends HTMLElement {
    constructor() {
        super();
        this.importantLinks = [];
    }

    connectedCallback() {
        salla.onReady()
            .then(() => salla.lang.onLoaded())
            .then(() => {
                this.addTranslations();
                this.menus = [];
                this.displayAllText = salla.lang.get('blocks.home.display_all');

                // Initialize all required functionality
                this.initializeCart();
                this.initializeCouponEvents();
                this.setupCartBackdrop();
            });
    }

    addTranslations() {
        const translations = {
            'common.total': {
                ar: 'المجموع',
                en: 'Total'
            },
            'common.subtotal': {
                ar: 'المجموع الفرعي',
                en: 'Subtotal'
            },
            'common.weight': {
                ar: 'الوزن',
                en: 'Weight'
            },
            'common.out_of_stock': {
                ar: 'نفذت الكمية',
                en: 'Out of Stock'
            },
            'cart.have_coupon': {
                ar: 'هل لديك كوبون؟',
                en: 'Have a Coupon?'
            },
            'cart.coupon_placeholder': {
                ar: 'كود الخصم',
                en: 'Discount code'
            },
            'cart.apply_coupon': {
                ar: 'تطبيق',
                en: 'Apply'
            },
            'cart.remove_coupon': {
                ar: 'إزالة الكوبون',
                en: 'Remove Coupon'
            },
            'common.discount': {
                ar: 'لقد وفرت',
                en: 'You saved'
            },
            'cart.view_cart': {
                ar: 'عرض السلة',
                en: 'View Cart'
            },
            'cart.checkout': {
                ar: 'إتمام الطلب',
                en: 'Checkout'
            },
            'cart.mayLike': {
                ar: 'قد يعجبك',
                en: 'You may like'
            }

        };

        Object.entries(translations).forEach(([key, value]) => {
            salla.lang.add(key, value);
        });
    }

    initializeCart() {
        salla.onReady(() => {
            this.fetchCartItems();

            // Add this new listener
            salla.cart.event.onCouponDeleted(() => {
                this.fetchCartItems();
            });

            // Listen for all cart update events
            salla.cart.event.onItemAdded((response) => {
                this.fetchCartItems();
            });

            salla.cart.event.onItemUpdated((response) => {
                this.fetchCartItems();
            });

            // Modified delete handler
            salla.cart.event.onItemDeleted(() => {
                // Only fetch cart items once after deletion
                this.fetchCartItems();
            });

            // Remove this listener since we're handling deletion specifically
            // salla.event.on('cart::updated', (response) => {
            //     this.updateCartItems(response);
            // });

            salla.event.cart.onLatestFetched((response) => {
                if (response?.data?.cart) {
                    this.updateCartItems(response.data.cart);
                }
            });

            salla.event.cart.onLatestFailed((error) => {
                console.error('Failed to fetch cart:', error);
            });
        });
    }

    initializeCouponEvents() {
        salla.onReady(() => {
            // When coupon is added successfully
            salla.event.on('cart::coupon.added', (response) => {
                if (response?.data?.cart) {
                    this.fetchCartItems();
                }
            });

            salla.event.on('cart::coupon.addition.succeeded', (response) => {
                if (response?.data?.cart) {
                    this.fetchCartItems();
                    const errorElement = document.getElementById('coupon-error');
                    if (errorElement) {
                        errorElement.textContent = '';
                    }
                }
            });

            // When coupon addition fails
            salla.event.on('cart::coupon.addition.failed', (error) => {
                const errorElement = document.getElementById('coupon-error');
                if (errorElement) {
                    errorElement.textContent = error.response?.data?.error?.message ||
                        error.response?.data?.message ||
                        'الكوبون غير صالح';
                }
            });

            // When coupon is removed successfully
            salla.event.on('cart::coupon.deletion.succeeded', (response) => {
                if (response?.data?.cart) {
                    const inputElement = document.getElementById('coupon-input');
                    const errorElement = document.getElementById('coupon-error');
                    if (inputElement) {
                        inputElement.value = '';
                        inputElement.disabled = false;
                    }
                    if (errorElement) {
                        errorElement.textContent = '';
                    }
                    this.fetchCartItems();
                }
            });

            // When coupon removal fails
            salla.event.on('cart::coupon.deletion.failed', (error) => {
                console.error('Failed to remove coupon:', error);
            });
        });
    }

    setupCartBackdrop() {
        // Create backdrop if it doesn't exist
        let backdrop = document.querySelector('.cart-backdrop');
        if (!backdrop) {
            backdrop = document.createElement('div');
            backdrop.className = 'cart-backdrop fixed inset-0 bg-black/50 z-[60] hidden transition-opacity duration-300';
            document.body.appendChild(backdrop);
        }

        // Function to close cart
        const closeCart = () => {
            const cartAside = document.querySelector('.tela-cart-aside');
            cartAside?.classList.remove('show');
            backdrop.classList.remove('show');
            backdrop.classList.add('hidden');
            document.body.style.overflow = '';
        };

        // Add click event to close cart when backdrop is clicked
        backdrop.addEventListener('click', closeCart);

        const closeButtons = document.querySelectorAll('.tela-cart-aside .close-cart-button');
        if (closeButtons.length > 0) {
            closeButtons.forEach(button => {
                button.addEventListener('click', closeCart);
            });
        }

        // Update the cart open logic
        const cartToggles = document.querySelectorAll('[onclick*="tela-cart-aside"]');
        cartToggles.forEach(toggle => {
            toggle.onclick = (e) => {
                e.preventDefault();
                const cartAside = document.querySelector('.tela-cart-aside');
                cartAside.classList.add('show');
                backdrop.classList.remove('hidden');
                backdrop.classList.add('show');

            };
        });

        // Add backdrop styles
        const styles = `
            .cart-backdrop {
                opacity: 0;
                pointer-events: none;
            }

            .cart-backdrop.show {
                opacity: 1;
                pointer-events: auto;
            }

            .tela-cart-aside {
                z-index: 70;
            }
        `;

        // Add styles to document if they don't exist
        if (!document.querySelector('#cart-backdrop-styles')) {
            const styleSheet = document.createElement('style');
            styleSheet.id = 'cart-backdrop-styles';
            styleSheet.textContent = styles;
            document.head.appendChild(styleSheet);
        }
    }

    fetchCartItems() {
        salla.cart.details(null, ['attachments', 'options'])
            .then(response => {
                if (response?.data?.cart) {
                    this.updateCartItems(response.data.cart);
                }
            })
            .catch(error => console.error('error', error));

        // Add event listeners for cart updates
        salla.cart.event.onDetailsFetched((response) => {
            if (response?.data?.cart) {
                this.updateCartItems(response.data.cart);
            }
        });

        salla.cart.event.onDetailsNotFetched((error) => {
        });
    }

    updateCartItems(cart) {
        const coupon = document.getElementById('coupon-input')?.value || '';
        const cartContainer = document.querySelector('.tela-cart-aside .flex-1.overflow-y-auto');
        if (!cartContainer) return;

        // Get user's currency
        const userCurrency = salla.config.get('user.currency_code') || 'SAR';

        // Format price with currency
        const formatPrice = (amount) => {
            return salla.money(amount);
        };

        // Show loading animation first
        cartContainer.innerHTML = `
            <div class="flex items-center justify-center h-full">
                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        `;

        setTimeout(() => {
            if (!cart?.items?.length) {
                cartContainer.innerHTML = `
                    <div class="flex flex-col items-center justify-center h-full space-y-6 py-8">
                        <div class="text-center">
                            <i class="sicon-shopping-bag text-gray-400 text-6xl mb-4"></i>
                            <p class="text-lg text-gray-500">السلة فارغة</p>
                        </div>
                        <a href="${salla.url.get('/')}"
                           class="inline-flex items-center justify-center px-6 py-2 border border-transparent text-base font-medium rounded-xl text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all duration-200">
                            تسوّق الآن
                        </a>
                    </div>
                `;
                return;
            }

            const itemsTemplate = cart.items.map(item => {
                // Get options if they exist
                const options = item.options?.map(option => {
                    // Find the selected detail
                    const selectedDetail = option.details?.find(detail => detail.is_selected);
                    return `
                        <div class="flex text-sm text-gray-500 gap-2">
                            <span>${option.name}:</span>
                            <span>${selectedDetail?.name || ''}</span>
                        </div>
                    `;
                }).join('') || '';

                // First, create a string of hidden inputs for the options
                const optionsInputs = item.options?.map(option => {
                    const selectedDetail = option.details?.find(detail => detail.is_selected);
                    return `<input type="hidden" name="options[${option.id}]" value="${selectedDetail?.id || ''}" />`;
                }).join('') || '';

                return `
                    <div class="relative mb-4">
                        <form onchange="salla.form.onChange('cart.updateItem', event)" id="item-${item.id}" class="p-4">
                            <section class="cart-item bg-[var(--store-product-bg)] relative">
                                <input type="hidden" name="id" value="${item.id}">
                                <div class="flex flex-col space-y-4">
                                    <div class="flex rtl:space-x-reverse space-x-4">
                                        <a href="${item.url}" class="shrink-0">
                                            <img src="${item.product_image}"
                                            alt="${item.product_name}"
                                            class="flex-none w-24 h-auto object-center object-contain">
                                        </a>
                                        <div class="flex-1 space-y-1">
                                            <div class="text-gray-900 leading-6 text-sm flex justify-between items-center gap-3">
                                                <a href="${item.url}">${item.product_name}</a>
                                                <div class="whitespace-nowrap">
                                                    <span class="text-sm text-gray-500 line-through item-regular-price ${item.special_price ? '' : 'hidden'}">${formatPrice(item.product_price)}</span>
                                                    <span class="item-price ${item.special_price ? 'text-red-800' : 'text-sm text-gray-500'}">${formatPrice(item.price)}</span>
                                                </div>
                                            </div>
                                            <!-- Product Options -->
                                            ${options ? `<div class="mt-2 space-y-1"> ${options}</div>`
                                                : ''}
                                                
                                            ${item.weight_label
                                            ? `<p class="text-sm text-gray-500">
                                            ${salla.lang.get('common.weight')} <span>${item.weight_label}</span>
                                                </p>`
                                                : ''}
                                            <div class="flex justify-between items-center">
                                                ${item.type === 'donating' ? '<span></span>' : item.is_hidden_quantity ? `<input type="hidden" value="${item.quantity}" name="quantity" aria-label="Quantity"/>
                                                    <span class="w-10 text-center">${item.quantity}</span>`
                                                    :
                                                    `<div class="flex items-center mt-12">
                                                        ${optionsInputs}
                                                        <salla-quantity-input cart-item-id="${item.id}"
                                                            max="${item.max_quantity}"
                                                            class="transtion transition-color duration-300 [&_.s-quantity-input-container]:rounded-none [&_.s-quantity-input-button]:w-8 [&_.s-quantity-input-input]:border-none"
                                                            aria-label="Quantity"
                                                            value="${item.quantity}"
                                                            name="quantity">
                                                        </salla-quantity-input>
                                                    </div>`
                                                }
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <span class="absolute bottom-1.5 rtl:left-1.5 ltr:right-1.5">
                                    <salla-button size="small" shape="icon" width="normal" color="danger" type="button"
                                            class="btn--delete inline-flex justify-center items-center"
                                            aria-label="Remove from the cart"
                                            onclick="event.preventDefault(); salla.cart.deleteItem('${item.id}')">
                                        <svg width="16" height="18" viewBox="0 0 16 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M5.96057 3.36421C6.2098 2.67157 6.88232 2.17676 7.67094 2.17676C8.45957 2.17676 9.13209 2.67157 9.38132 3.36421C9.49257 3.67338 9.83791 3.83543 10.1527 3.72615C10.4674 3.61687 10.6324 3.27765 10.5211 2.96848C10.1065 1.81622 8.98783 0.989258 7.67094 0.989258C6.35406 0.989258 5.23535 1.81622 4.82074 2.96848C4.70949 3.27765 4.87446 3.61687 5.18922 3.72615C5.50398 3.83543 5.84932 3.67338 5.96057 3.36421Z" fill="#fff"/>
                                            <path d="M0.21582 4.74967C0.21582 4.42176 0.48645 4.15592 0.820288 4.15592H14.5216C14.8555 4.15592 15.1261 4.42176 15.1261 4.74967C15.1261 5.07759 14.8555 5.34342 14.5216 5.34342H0.820288C0.48645 5.34342 0.21582 5.07759 0.21582 4.74967Z" fill="#fff"/>
                                            <path d="M2.1234 6.1364C2.4565 6.11459 2.74454 6.36215 2.76674 6.68934L3.13743 12.1511C3.20985 13.2182 3.26146 13.9606 3.37475 14.5192C3.48464 15.0611 3.63804 15.3479 3.8584 15.5504C4.07876 15.7529 4.38032 15.8842 4.93804 15.9559C5.51301 16.0297 6.27061 16.0309 7.35934 16.0309H7.98263C9.07135 16.0309 9.82896 16.0297 10.4039 15.9559C10.9617 15.8842 11.2632 15.7529 11.4836 15.5504C11.7039 15.3479 11.8573 15.0611 11.9672 14.5192C12.0805 13.9606 12.1321 13.2182 12.2045 12.1511L12.5752 6.68934C12.5974 6.36215 12.8855 6.11459 13.2186 6.1364C13.5517 6.15822 13.8037 6.44114 13.7815 6.76833L13.408 12.2718C13.3391 13.2873 13.2834 14.1076 13.1529 14.7513C13.0171 15.4205 12.7863 15.9794 12.3095 16.4176C11.8327 16.8558 11.2495 17.0448 10.5607 17.1333C9.8982 17.2185 9.06126 17.2184 8.02513 17.2184H7.31683C6.2807 17.2184 5.44376 17.2185 4.78124 17.1333C4.09242 17.0448 3.50928 16.8558 3.03248 16.4176C2.55568 15.9794 2.32483 15.4205 2.18911 14.7513C2.05857 14.1076 2.00291 13.2873 1.934 12.2718L1.56048 6.76833C1.53828 6.44114 1.79031 6.15822 2.1234 6.1364Z" fill="#fff"/>
                                        </svg>
                                    </salla-button>
                                </span>
                            </section>
                        </form>`;
                    }).join('');


            // Add cart footer with total and actions
            const cartFooter = `

                <div class="fixed bottom-0 left-0 right-0 bg-white border-t p-4 space-y-2 z-20">
                    <!-- Coupon Section -->
                    <div class="space-y-2">
                     <div class="flex gap-2 relative">
                                <input type="text" id="coupon-input" placeholder="${salla.lang.get(
                'cart.coupon_placeholder'
            )}"class="flex-1 p-4 border focus:outline-none focus:ring-2 focus:ring-primary"/>
                                <salla-button class="absolute !w-auto ltr:right-1 rtl:left-1 top-1 !rounded-none" onclick="salla.cart.addCoupon(document.getElementById('coupon-input').value)" width="wide" fill="solid" color="primary" loader-position="center">${salla.lang.get(
                'cart.apply_coupon'
            )}</salla-button>
                            </div>
                        <p id="coupon-error" class="text-sm text-red-500"></p>
                    </div>

                    <!-- Subtotal -->
                    ${cart.discount
                    ? `
                    <div class="flex gap-2">
                        <div onclick="salla.cart.deleteCoupon()" class="bg-[#ddd] rounded-full p-1 flex gap-1 items-center cursor-pointer my-1"><span>X</span>${cart.coupon}</div>
                        </div>
                        <div class="flex justify-between items-center text-sm text-gray-600">
                            <span>${salla.lang.get('common.subtotal')}:</span>
                            <span>${salla.money(cart.sub_total)}</span>
                        </div>
                        <div class="flex justify-between items-center text-sm">
                        <span class="text-[#ff001f] text-sm">${salla.lang.get('common.discount')}:</span>
                        <span class="text-[#ff001f] text-sm">- ${salla.money(cart.discount)}</span>
                        </div>
                    `
                    : ''
                }

                    <!-- Total -->
                    <div class="flex justify-between items-center text-lg font-bold">
                        <span>${salla.lang.get('common.total')}:</span>
                        <span>${salla.money(cart.total)}</span>
                    </div>

                    <!-- Action Buttons -->
                    <div class="flex gap-2 !mt-4">
                        <salla-button
                            href="${salla.url.get('cart')}"
                            width="wide"
                            fill="outline"
                            color="darker"
                            loader-position="center">
                            ${salla.lang.get('cart.view_cart')}
                        </salla-button>
                        <salla-button
                            id="cart-submit"
                            onclick="salla.config.get('user.type') == 'guest' ? salla.cart.submit() : this.load().then(() => salla.cart.submit())"
                            width="wide"
                            fill="solid"
                            color="primary"
                            loader-position="center">
                            ${salla.lang.get('cart.checkout')}
                        </salla-button>
                    </div>
                </div>
            `;

            cartContainer.innerHTML = `
            ${cart.free_shipping_bar ? `
            <div class="shadow-default bg-white p-5 xs:p-7 rounded-md mb-5 relative ${cart.free_shipping_bar ? '' : 'hidden'}" id="free-shipping">
                        <div class="flex rtl:space-x-reverse space-x-3 items-center">
                            <i class="bg-primary text-white rounded-icon sicon-shipping-fast {{ theme.is_rtl ? 'flip-x':'' }}"></i>
                            <div class="flex-1">
                                <h4 class="shipping-item font-bold text-sm mb-1.5">${freeShipping}</h4>
                                <p class="shipping-item text-sm font- text-gray-500">
                                        <span id="free-shipping-msg">
                                        ${
                                          cart.free_shipping_bar
                                            .has_free_shipping
                                            ? salla.lang.get(
                                                'pages.cart.has_free_shipping'
                                              )
                                            : salla.lang.get(
                                                'pages.cart.free_shipping_alert',
                                                {
                                                  amount: salla.money(
                                                    cart.free_shipping_bar
                                                      .remaining
                                                  )
                                                }
                                              )
                                        }</span>
                                    <span class="emoji ${cart.free_shipping_bar.has_free_shipping ? '' : 'hidden'}" id="free-shipping-applied">🎉</span>
                                </p>
                            </div>
                        </div>
                        <div class="mt-8 bg-border-color rounded-full ${cart.free_shipping_bar.has_free_shipping? ' hidden': ''}" id="free-shipping-bar">
                        <div class="progress-bg transition-all duration-500 h-2.5 bg-primary relative rounded-full flex justify-end" style="width:${cart.free_shipping_bar.percent}%">
                            <i class="inline-block sicon-shipping-fast absolute -top-5 rtl:left-0 ltr:right-0 {{ theme.is_rtl ? 'flip-x':'' }}"></i>
                            </div>
                        </div>
                    </div>
                    ` :''}
                <div class="pb-72 lg:pb-64">
                    ${itemsTemplate}
                    
                    </div>
                </div>
                ${cartFooter}
            `;
        }, 300);
    }
}

customElements.define('custom-navigation-cart', NavCartMenu);

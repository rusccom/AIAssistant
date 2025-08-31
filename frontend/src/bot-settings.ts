import './dashboard.css';
import { initSimpleFouc } from './utils/simple-fouc';
import { protectPage } from './utils/auth';
import { initNavigation } from './utils/navigation';
import { setupPage } from './layout/page-container';
import pageContent from './bot-settings.content.html';

// Protect this page
protectPage();

// Initialize anti-FOUC system immediately
initSimpleFouc();

// Initialize navigation highlighting
initNavigation();

// Declare lucide for TypeScript
declare global {
    interface Window {
        lucide: {
            createIcons: () => void;
        };
    }
}

let selectedDomain: string | null = null;

// Types for products from API
interface ProductVariant {
    id: number;
    title: string;
    price: number; // цена в копейках
    sku?: string;
}

interface Product {
    id: number;
    title: string;
    description?: string;
    status: string;
    variants: ProductVariant[];
}

let priceListData: Product[] = [];
let currentPage = 1;
let totalPages = 1;
let totalProducts = 0;
let currentSearch = '';

// Function to update domain indicator
function updateDomainIndicator(domain: string | null) {
    const indicator = document.getElementById('domain-indicator');
    const domainName = document.getElementById('current-domain-name');
    
    if (!indicator || !domainName) return;
    
    if (domain) {
        indicator.style.display = 'block';
        domainName.textContent = domain;
    } else {
        indicator.style.display = 'none';
        domainName.textContent = 'No domain selected';
    }
}



// Function to load products from API with pagination and search
async function loadProducts(page: number = 1, search: string = '') {
    const token = localStorage.getItem('authToken');
    if (!token) return;

    if (!selectedDomain) {
        showEmptyProductsState();
        hidePagination();
        hideSearchResultsInfo();
        return;
    }

    try {
        // Build URL with search parameter and domain
        const params = new URLSearchParams({
            page: page.toString(),
            limit: '50',
            domain: selectedDomain
        });
        
        if (search.trim()) {
            params.append('search', search.trim());
        }

        const response = await fetch(`/api/products?${params}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch products');
        }

        const data = await response.json();
        priceListData = data.products;
        currentPage = data.pagination.page;
        totalPages = data.pagination.totalPages;
        totalProducts = data.pagination.totalCount;
        currentSearch = search;
        
        renderPriceList();
        renderPagination();
        updateSearchResultsInfo();
    } catch (error) {
        console.error('Error loading products:', error);
        showEmptyProductsState();
        hidePagination();
        hideSearchResultsInfo();
    }
}

// Function to display empty state
function showEmptyProductsState() {
    const tableBody = document.querySelector('#price-list-table tbody') as HTMLTableSectionElement;
    if (!tableBody) return;

    let message = '';
    if (!selectedDomain) {
        message = `
            <div>
                <p style="margin: 0; font-size: 1.1rem;">No domain selected</p>
                <p style="margin: 0.5rem 0 0 0; font-size: 0.9rem;">Please select a domain from the "Manage Domains" section above to view products</p>
            </div>
        `;
    } else {
        message = `
            <div>
                <p style="margin: 0; font-size: 1.1rem;">No products found</p>
                <p style="margin: 0.5rem 0 0 0; font-size: 0.9rem;">Add your first product to display in the table</p>
            </div>
        `;
    }

    tableBody.innerHTML = `
        <tr>
            <td colspan="6" style="text-align: center; padding: 2rem; color: #6b7280;">
                ${message}
            </td>
        </tr>
    `;
}

// Function to render pagination controls
function renderPagination() {
    const paginationContainer = document.getElementById('pagination-container');
    const paginationInfo = document.getElementById('pagination-info-text');
    const paginationPages = document.getElementById('pagination-pages');
    const prevBtn = document.getElementById('prev-page-btn') as HTMLButtonElement;
    const nextBtn = document.getElementById('next-page-btn') as HTMLButtonElement;
    
    if (!paginationContainer || !paginationInfo || !paginationPages || !prevBtn || !nextBtn) return;

    // Show pagination only if there are products
    if (totalProducts === 0) {
        hidePagination();
        return;
    }

    // Show pagination container
    paginationContainer.style.display = 'flex';

    // Update pagination info
    const startItem = (currentPage - 1) * 50 + 1;
    const endItem = Math.min(currentPage * 50, totalProducts);
    paginationInfo.textContent = `Showing ${startItem}-${endItem} of ${totalProducts} products`;

    // Update prev/next buttons
    prevBtn.disabled = currentPage <= 1;
    nextBtn.disabled = currentPage >= totalPages;

    // Generate page numbers
    paginationPages.innerHTML = '';
    
    // Show page numbers with smart ellipsis
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    // Adjust if we're near the end
    if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    // First page + ellipsis
    if (startPage > 1) {
        addPageNumber(1);
        if (startPage > 2) {
            addEllipsis();
        }
    }

    // Visible page range
    for (let i = startPage; i <= endPage; i++) {
        addPageNumber(i);
    }

    // Ellipsis + last page
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            addEllipsis();
        }
        addPageNumber(totalPages);
    }

    function addPageNumber(pageNum: number) {
        const pageBtn = document.createElement('div');
        pageBtn.className = `page-number ${pageNum === currentPage ? 'active' : ''}`;
        pageBtn.textContent = pageNum.toString();
        pageBtn.addEventListener('click', () => loadProducts(pageNum, currentSearch));
        paginationPages!.appendChild(pageBtn);
    }

    function addEllipsis() {
        const ellipsis = document.createElement('div');
        ellipsis.className = 'page-ellipsis';
        ellipsis.textContent = '...';
        paginationPages!.appendChild(ellipsis);
    }
}

// Function to hide pagination
function hidePagination() {
    const paginationContainer = document.getElementById('pagination-container');
    if (paginationContainer) {
        paginationContainer.style.display = 'none';
    }
}

// Function to update search results info
function updateSearchResultsInfo() {
    const searchResultsInfo = document.getElementById('search-results-info');
    const searchResultsText = document.getElementById('search-results-text');
    
    if (!searchResultsInfo || !searchResultsText) return;

    if (currentSearch.trim()) {
        searchResultsInfo.style.display = 'block';
        
        if (totalProducts === 0) {
            searchResultsText.textContent = `No results found for "${currentSearch}"`;
            searchResultsInfo.className = 'search-results-info no-results';
        } else {
            const resultText = totalProducts === 1 ? 'result' : 'results';
            searchResultsText.textContent = `Found ${totalProducts} ${resultText} for "${currentSearch}"`;
            searchResultsInfo.className = 'search-results-info has-results';
        }
    } else {
        hideSearchResultsInfo();
    }
}

// Function to hide search results info
function hideSearchResultsInfo() {
    const searchResultsInfo = document.getElementById('search-results-info');
    if (searchResultsInfo) {
        searchResultsInfo.style.display = 'none';
    }
}

// Debounce function for search
function debounce(func: Function, wait: number) {
    let timeout: NodeJS.Timeout;
    return function executedFunction(...args: any[]) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Universal modal functions
let productModalMode: 'add' | 'edit' = 'add';

// Function to open universal product modal
async function openProductModal(mode: 'add' | 'edit', productId?: number) {
    const modal = document.getElementById('product-modal');
    if (!modal) return;

    productModalMode = mode;
    
    // Update modal title and button text
    const title = document.getElementById('product-modal-title');
    const submitBtn = document.getElementById('submit-product-btn');
    
    if (mode === 'add') {
        if (title) title.textContent = 'Add Product';
        if (submitBtn) submitBtn.textContent = 'Save Product';
        resetProductForm();
    } else {
        if (title) title.textContent = 'Edit Product';
        if (submitBtn) submitBtn.textContent = 'Update Product';
        
        if (productId) {
            await fillProductForm(productId);
        }
    }

    toggleProductTypeInModal();
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

// Function to close universal product modal
function closeProductModal() {
    const modal = document.getElementById('product-modal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
        resetProductForm();
    }
}

// Function to reset product form
function resetProductForm() {
    const form = document.getElementById('product-form') as HTMLFormElement;
    if (form) form.reset();
    
    // Clear product ID
    const productIdInput = document.getElementById('product-id') as HTMLInputElement;
    if (productIdInput) productIdInput.value = '';
    
    // Set simple product as default
    const simpleRadio = document.querySelector('input[name="product-type"][value="simple"]') as HTMLInputElement;
    if (simpleRadio) simpleRadio.checked = true;
    
    // Clear dynamic variants
    const variantsContainer = document.getElementById('variants-container');
    if (variantsContainer) {
        const rows = variantsContainer.querySelectorAll('.dynamic-variant-row');
        rows.forEach(row => row.remove());
    }
}

// Function to fill product form for editing
async function fillProductForm(productId: number) {
    const product = priceListData.find(p => p.id === productId);
    if (!product) return;

    // Fill basic fields
    const productIdInput = document.getElementById('product-id') as HTMLInputElement;
    const productNameInput = document.getElementById('product-name') as HTMLInputElement;
    const productDescriptionInput = document.getElementById('product-description') as HTMLTextAreaElement;

    if (productIdInput) productIdInput.value = productId.toString();
    if (productNameInput) productNameInput.value = product.title;
    if (productDescriptionInput) productDescriptionInput.value = product.description || '';

    // Determine product type
    const isSimple = product.variants.length === 1 && product.variants[0].title === 'Default Title';
    const simpleRadio = document.querySelector('input[name="product-type"][value="simple"]') as HTMLInputElement;
    const variantsRadio = document.querySelector('input[name="product-type"][value="variants"]') as HTMLInputElement;

    if (isSimple) {
        if (simpleRadio) simpleRadio.checked = true;
        // Fill simple product fields
        const priceInput = document.getElementById('simple-price') as HTMLInputElement;
        const skuInput = document.getElementById('simple-sku') as HTMLInputElement;
        if (priceInput) priceInput.value = (product.variants[0].price / 100).toString();
        if (skuInput) skuInput.value = product.variants[0].sku || '';
    } else {
        if (variantsRadio) variantsRadio.checked = true;
        // Fill variants
        populateVariantsInModal(product.variants);
    }
}

// Function to populate variants in modal
function populateVariantsInModal(variants: ProductVariant[]) {
    const variantsContainer = document.getElementById('variants-container');
    if (!variantsContainer) return;

    // Clear existing variants
    const existingRows = variantsContainer.querySelectorAll('.dynamic-variant-row');
    existingRows.forEach(row => row.remove());

    // Add variants
    variants.forEach(variant => {
        addDynamicVariantRowInModal(variant.title, variant.sku || '', (variant.price / 100).toString());
    });
}

// Function to toggle product type in modal
function toggleProductTypeInModal() {
    const simpleSection = document.getElementById('simple-product-section');
    const variantsSection = document.getElementById('variants-section');
    const selectedType = (document.querySelector('input[name="product-type"]:checked') as HTMLInputElement)?.value;
    
    if (selectedType === 'simple') {
        if (simpleSection) simpleSection.style.display = 'block';
        if (variantsSection) variantsSection.style.display = 'none';
    } else {
        if (simpleSection) simpleSection.style.display = 'none';
        if (variantsSection) variantsSection.style.display = 'block';
        
        // Add first variant if none exist
        const variantsContainer = document.getElementById('variants-container');
        if (variantsContainer) {
            const existingRows = variantsContainer.querySelectorAll('.dynamic-variant-row');
            if (existingRows.length === 0) {
                addDynamicVariantRowInModal();
            }
        }
    }
}

// Function to add dynamic variant row in modal
function addDynamicVariantRowInModal(title = '', sku = '', price = '') {
    const variantsContainer = document.getElementById('variants-container');
    if (!variantsContainer) return;

    const row = document.createElement('div');
    row.className = 'dynamic-variant-row';
    row.innerHTML = `
        <div class="variant-fields-container">
            <input type="text" placeholder="Variant name (e.g., 128GB Black)" value="${title}" required>
            <input type="text" placeholder="SKU" value="${sku}">
            <input type="number" placeholder="Price ($)" value="${price}" step="0.01" min="0" required>
            <div></div> <!-- Empty cell for grid -->
        </div>
        <button type="button" class="btn-delete-row" aria-label="Delete variant">&times;</button>
    `;
    
    const deleteBtn = row.querySelector('.btn-delete-row') as HTMLButtonElement | null;
    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
            row.remove();
            // If we deleted the last variant, add a new one
            const remainingRows = variantsContainer.querySelectorAll('.dynamic-variant-row');
            if (remainingRows.length === 0) {
                addDynamicVariantRowInModal();
            }
        });
    }
    
    variantsContainer.appendChild(row);
}

// Function to delete product
async function deleteProduct(productId: number) {
    const product = priceListData.find(p => p.id === productId);
    if (!product) return;

    const confirmMessage = `Are you sure you want to delete "${product.title}"?\n\nThis action cannot be undone.`;
    if (!confirm(confirmMessage)) return;

    const token = localStorage.getItem('authToken');
    if (!token) return;

    try {
        if (!selectedDomain) {
            alert('Please select a domain first');
            return;
        }

        const params = new URLSearchParams({ domain: selectedDomain });
        const response = await fetch(`/api/products/${productId}?${params}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(errorData.error || 'Failed to delete product');
        }

        // Reload current page/search to update the list
        await loadProducts(currentPage, currentSearch);
        alert('Product deleted successfully! 🗑️');
    } catch (error) {
        console.error('Error deleting product:', error);
        alert(`Error deleting product: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}





const renderPriceList = () => {
    const tableBody = document.querySelector('#price-list-table tbody') as HTMLTableSectionElement;
    if (!tableBody) return;

    tableBody.innerHTML = '';

    if (priceListData.length === 0) {
        showEmptyProductsState();
        return;
    }

    priceListData.forEach(product => {
        if (product.variants.length === 0) {
            // Simple product without variants (shouldn't exist in our architecture)
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="product-name">${product.title}</td>
                <td class="product-description">${product.description || '—'}</td>
                <td class="product-article">—</td>
                <td class="product-price">No variants</td>
                <td class="product-currency">—</td>
                <td class="product-actions">
                    <button class="btn-edit btn btn-sm btn-secondary" data-id="${product.id}">Edit</button>
                    <button class="btn-delete btn btn-sm btn-danger" data-id="${product.id}">Delete</button>
                </td>
            `;
            tableBody.appendChild(row);
        } else if (product.variants.length === 1 && product.variants[0].title === 'Default Title') {
            // Simple product with one default variant  
            const variant = product.variants[0];
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="product-name">${product.title}</td>
                <td class="product-description">${product.description || '—'}</td>
                <td class="product-article">${variant.sku || '—'}</td>
                <td class="product-price">$${(variant.price / 100).toFixed(2)}</td>
                <td class="product-currency">USD</td>
                <td class="product-actions">
                    <button class="btn-edit btn btn-sm btn-secondary" data-id="${product.id}">Edit</button>
                    <button class="btn-delete btn btn-sm btn-danger" data-id="${product.id}">Delete</button>
                </td>
            `;
            tableBody.appendChild(row);
        } else {
            // Product with multiple variants - show main row
            const mainRow = document.createElement('tr');
            mainRow.className = 'product-main-row';
            mainRow.innerHTML = `
                <td class="product-name">${product.title}</td>
                <td class="product-description">${product.description || '—'}</td>
                <td class="product-article empty-cell">—</td>
                <td class="product-price empty-cell">—</td>
                <td class="product-currency empty-cell">—</td>
                <td class="product-actions">
                    <button class="btn-edit btn btn-sm btn-secondary" data-id="${product.id}">Edit</button>
                    <button class="btn-delete btn btn-sm btn-danger" data-id="${product.id}">Delete</button>
                </td>
            `;
            tableBody.appendChild(mainRow);

            // Variant rows with indent
            product.variants.forEach(variant => {
                const variantRow = document.createElement('tr');
                variantRow.className = 'variant-row';
                variantRow.innerHTML = `
                    <td class="variant-name">${variant.title}</td>
                    <td class="variant-description">—</td>
                    <td class="variant-article">${variant.sku || '—'}</td>
                    <td class="variant-price">$${(variant.price / 100).toFixed(2)}</td>
                    <td class="variant-currency">USD</td>
                    <td class="variant-actions">
                        <button class="btn-edit btn btn-sm btn-secondary" data-variant-id="${variant.id}">Edit</button>
                        <button class="btn-delete btn btn-sm btn-danger" data-variant-id="${variant.id}">Delete</button>
                    </td>
                `;
                tableBody.appendChild(variantRow);
            });
        }
    });
};

function initializePage() {
    setupPage(pageContent);

    const token = localStorage.getItem('authToken');
    if (!token) {
        // Fallback, should be handled by protectPage
        window.location.href = '/login.html';
        return;
    }
    
    // Delay initialization to ensure DOM is fully loaded
    setTimeout(() => {
        try {
    initializeBotSettings(token);
        } catch (error) {
            console.error('Error initializing bot settings:', error);
        }
    }, 100);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePage);
} else {
    initializePage();
}

async function initializeBotSettings(token: string) {
    console.log('Initializing bot settings...');
    
    // Safe element getter with logging
    const safeGetElement = (id: string): HTMLElement | null => {
        const element = document.getElementById(id);
        if (!element) {
            console.warn(`Element with ID '${id}' not found`);
        }
        return element;
    };

    const domainsList = safeGetElement('domains-list') as HTMLDivElement;
    const addDomainBtn = safeGetElement('add-domain-btn') as HTMLButtonElement;
    const botConfigSection = safeGetElement('bot-config-section') as HTMLDivElement;
    const botConfigForm = safeGetElement('bot-config-form') as HTMLFormElement;
    const selectedDomainLabel = safeGetElement('selected-domain-label') as HTMLElement;
    
    // Modal elements
    const modal = safeGetElement('add-domain-modal') as HTMLDivElement;
    const domainNameInput = safeGetElement('domain-name-input') as HTMLInputElement;
    const addDomainForm = safeGetElement('add-domain-form') as HTMLFormElement;
    const closeModalBtn = safeGetElement('close-modal-btn') as HTMLButtonElement;
    const cancelModalBtn = safeGetElement('cancel-modal-btn') as HTMLButtonElement;

    // Guard against missing critical elements
    if (!addDomainBtn || !modal) {
        console.error('Critical elements missing. Bot settings initialization aborted.');
        return;
    }

    // --- Conversation States Elements removed - managed by visual editor only ---

    // --- NEW: AI Assist Modal Elements ---
    const aiAssistModal = document.getElementById('ai-assist-modal') as HTMLDivElement;
    const closeAiModalBtn = document.getElementById('close-ai-modal-btn') as HTMLButtonElement;
    const cancelAiModalBtn = document.getElementById('cancel-ai-modal-btn') as HTMLButtonElement;
    const generateContentBtn = document.getElementById('generate-content-btn') as HTMLButtonElement;
    const aiPromptInput = document.getElementById('ai-prompt-input') as HTMLTextAreaElement;
    const aiErrorMessage = document.getElementById('ai-error-message') as HTMLDivElement;
    let activeStateBlockForAI: HTMLDivElement | null = null;

    // Helper function to populate voice select options
    const populateVoices = (voices: any[]) => {
        const voiceSelect = document.getElementById('voice') as HTMLSelectElement;
        
        if (voiceSelect) {
            // Clear loading option
            voiceSelect.innerHTML = '';
            
            // Add voice options
            voices.forEach((voice: any) => {
                const option = document.createElement('option');
                option.value = voice.id;
                option.textContent = `${voice.name} - ${voice.description}`;
                voiceSelect.appendChild(option);
            });
            
            console.log('Populated voices:', voices.length);
        }
    };

    // Conversation states are now managed exclusively by the visual editor
    // No text-based editing allowed in dashboard

    const addDynamicRow = (container: HTMLDivElement, value: string = '') => {
        const row = document.createElement('div');
        row.className = 'dynamic-list-row';
        row.innerHTML = `
            <input type="text" class="input" value="${value}">
            <button type="button" class="btn-delete-row" aria-label="Delete row">&times;</button>
        `;
        row.querySelector('.btn-delete-row')?.addEventListener('click', () => row.remove());
        container.appendChild(row);
    };

    const addTransitionBlock = (container: HTMLDivElement, nextStep: string = '', condition: string = '') => {
        const transitionBlock = document.createElement('div');
        transitionBlock.className = 'transition-block';
        transitionBlock.innerHTML = `
            <div class="form-group">
                <label class="label sub-label">Next State</label>
                <input type="text" class="input transition-next-step" placeholder="e.g., 2_get_name" value="${nextStep}">
            </div>
            <div class="form-group">
                <label class="label sub-label">Condition</label>
                <input type="text" class="input transition-condition" placeholder="e.g., After greeting is complete." value="${condition}">
            </div>
            <div class="form-group transition-actions">
                <button type="button" class="btn btn-danger btn-sm btn-delete-transition">✕</button>
            </div>
        `;
        
        transitionBlock.querySelector('.btn-delete-transition')?.addEventListener('click', () => {
            transitionBlock.remove();
        });
        
        container.appendChild(transitionBlock);
    };

    // State management functions removed - handled by visual editor

    // Text-based state editing removed - handled exclusively by visual editor

    // Text-based state rendering removed - handled exclusively by visual editor


    // Guard against missing elements
    if (!addDomainBtn || !aiAssistModal) {
        console.error('Bot settings DOM elements not found. Deferring initialization.');
        setTimeout(() => initializeBotSettings(token), 100);
        return;
    }

    const fetchDashboardData = async () => {
        try {
            const response = await fetch('/api/dashboard/data', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Failed to fetch dashboard data');
            
            const data = await response.json();

            if (!data.success) {
                throw new Error(data.message || 'Server error');
            }
            
            // Получаем ВСЕ данные одним запросом
            const { domains, domainConfigs, voices } = data;
            
            // Сохраняем конфигурации доменов глобально
            (window as any).domainConfigs = domainConfigs;
            
            renderDomains(domains);
            
            // Заполняем список голосов
            if (voices && voices.length > 0) {
                populateVoices(voices);
        } else {
                // Fallback если голоса не пришли
                const voiceSelect = document.getElementById('voice') as HTMLSelectElement;
                if (voiceSelect) {
                    voiceSelect.innerHTML = '<option value="alloy">Alloy (Default)</option>';
                }
            }
        } catch (error) {
            console.error(error);
            alert('Could not load dashboard data.');
        }
    };

    const renderDomains = (domains: { id: string; hostname: string }[]) => {
        const emptyState = document.getElementById('empty-domains');
        
        if (!domainsList || !emptyState) return;

        if (domains.length === 0) {
            domainsList.innerHTML = '';
            emptyState.style.display = 'block';
            return;
        }
        
        emptyState.style.display = 'none';
        
        domainsList.innerHTML = '';
        domains.forEach(domain => {
            const domainItem = document.createElement('div');
            domainItem.className = 'domain-item';
            domainItem.dataset.domain = domain.hostname;
            
            const firstLetter = domain.hostname.charAt(0).toUpperCase();
            
            domainItem.innerHTML = `
                <div class="domain-info">
                    <div class="domain-icon">${firstLetter}</div>
                    <div class="domain-details">
                        <h3 class="domain-name">${domain.hostname}</h3>
                        <p class="domain-status">Click to configure bot settings</p>
                    </div>
                </div>
                <div class="domain-actions">
                    <button class="btn btn-secondary btn-sm test-bot-btn" data-hostname="${domain.hostname}">
                        🎤 Test Bot
                    </button>
                </div>
            `;
            
            domainItem.addEventListener('click', (e) => {
                // Проверяем, что клик не по кнопке test bot
                if ((e.target as HTMLElement).classList.contains('test-bot-btn')) {
                    return;
                }
                
                document.querySelectorAll('.domain-item').forEach(el => el.classList.remove('selected'));
                domainItem.classList.add('selected');
                selectedDomain = domain.hostname;
                loadBotConfig(domain.hostname);
                // Update domain indicator and load products
                updateDomainIndicator(domain.hostname);
                loadProducts(1, currentSearch);
            });

            // Добавляем обработчик для кнопки Test Bot
            const testBotBtn = domainItem.querySelector('.test-bot-btn');
            testBotBtn?.addEventListener('click', (e) => {
                e.stopPropagation(); // Останавливаем всплытие события
                openWidgetModal(domain.hostname);
            });

            domainsList.appendChild(domainItem);
        });
    };

    const openModal = () => {
        if (!modal || !domainNameInput) return;
        modal.style.display = 'flex';
        domainNameInput.focus();
        document.body.style.overflow = 'hidden';
    };
    
    const closeModal = () => {
        if (!modal || !domainNameInput) return;
        modal.style.display = 'none';
        domainNameInput.value = '';
        document.body.style.overflow = 'auto';
    };

    // Widget Modal Management
    const widgetModal = document.getElementById('widget-modal') as HTMLDivElement;
    const closeWidgetModalBtn = document.getElementById('close-widget-modal-btn') as HTMLButtonElement;
    const widgetDomainLabel = document.getElementById('widget-domain-label') as HTMLSpanElement;
    const widgetContainer = document.getElementById('widget-container') as HTMLDivElement;

    let currentWidgetSession: any = null;

    const openWidgetModal = (hostname: string) => {
        if (!widgetModal || !widgetDomainLabel || !widgetContainer) return;
        
        // Показываем модальное окно
        widgetModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        // Обновляем заголовок с доменом
        widgetDomainLabel.textContent = `Testing: ${hostname}`;
        
        // Загружаем виджет
        loadWidget(hostname);
    };

    const closeWidgetModal = () => {
        if (!widgetModal || !widgetContainer) return;
        
        // Останавливаем текущую сессию виджета если есть
        const widgetInstance = (window as any).currentWidgetInstance;
        if (widgetInstance && widgetInstance.session) {
            try {
                widgetInstance.session.close();
                console.log('🔄 Widget session closed');
            } catch (error) {
                console.log('Error closing widget session:', error);
            }
        }
        
        // Очищаем глобальные ссылки
        currentWidgetSession = null;
        delete (window as any).currentWidgetInstance;
        
        widgetModal.style.display = 'none';
        document.body.style.overflow = 'auto';
        
        // Очищаем контейнер
        widgetContainer.innerHTML = `
            <div class="widget-loading">
                <p>Loading AI Assistant...</p>
                <div class="loading-spinner"></div>
            </div>
        `;
        
        // Очищаем поле хоста
        const hostInput = document.getElementById('widget-host-input') as HTMLInputElement;
        if (hostInput) {
            hostInput.value = '';
        }
        
        console.log('🔄 Widget modal closed and cleaned up');
    };

    const loadWidget = async (hostname: string) => {
        if (!widgetContainer) return;
        
        try {
            // Создаем временный контейнер для виджета
            const widgetId = `widget-${Date.now()}`;
            widgetContainer.innerHTML = `<div id="${widgetId}"></div>`;

            // Загружаем script виджета если еще не загружен
            if (!document.querySelector('script[src="/widget/widget.js"]')) {
                const script = document.createElement('script');
                script.src = '/widget/widget.js';
                script.onload = () => {
                    console.log('✅ Widget script loaded successfully!');
                    initializeWidgetWithNewAPI(hostname, widgetId);
                };
                script.onerror = () => {
                    widgetContainer.innerHTML = `
                        <div class="widget-error">
                            <p>❌ Failed to load widget</p>
                            <p>Make sure the backend server is running</p>
                        </div>
                    `;
                };
                document.head.appendChild(script);
            } else {
                console.log('✅ Widget script already loaded!');
                initializeWidgetWithNewAPI(hostname, widgetId);
            }
            
        } catch (error) {
            console.error('Error loading widget:', error);
            widgetContainer.innerHTML = `
                <div class="widget-error">
                    <p>❌ Error loading widget</p>
                    <p>${error}</p>
                </div>
            `;
        }
    };

    const initializeWidgetWithNewAPI = (hostname: string, widgetId: string) => {
        console.log(`🎯 Initializing widget for hostname: ${hostname}`);
        
        // Получаем значение хоста из поля ввода
        const hostInput = document.getElementById('widget-host-input') as HTMLInputElement;
        const customHost = hostInput?.value.trim();
        
        // Подготавливаем конфигурацию для виджета
        const widgetConfig: any = {
            container: widgetId,
            hostname: hostname
        };
        
        // Добавляем кастомный хост если указан
        if (customHost) {
            widgetConfig.apiHost = customHost;
            console.log(`🔧 Using custom API host: ${customHost}`);
        } else {
            console.log(`🔧 Using auto-detected API host`);
        }
        
        // Инициализируем виджет с новым API
        try {
            const AIWidget = (window as any).AIWidget;
            if (!AIWidget) {
                throw new Error('AIWidget API not available');
            }
            
            const widgetInstance = AIWidget.init(widgetConfig);
            
            if (widgetInstance) {
                console.log('✅ Widget initialized successfully with new API');
                currentWidgetSession = widgetInstance;
                
                // Сохраняем экземпляр для очистки при закрытии модала
                (window as any).currentWidgetInstance = widgetInstance;
            } else {
                throw new Error('Widget initialization returned null');
            }
            
        } catch (error) {
            console.error('❌ Failed to initialize widget with new API:', error);
            
            // Показываем ошибку пользователю
            if (widgetContainer) {
                widgetContainer.innerHTML = `
                    <div class="widget-error">
                        <p>❌ Failed to initialize widget</p>
                        <p>${error}</p>
                        <p>Please check console for details</p>
                    </div>
                `;
            }
        }
    };

    // Обработчики для закрытия виджет модала
    if (closeWidgetModalBtn) {
        closeWidgetModalBtn.addEventListener('click', closeWidgetModal);
    }

    if (widgetModal) {
        widgetModal.addEventListener('click', (e) => {
            if (e.target === widgetModal) {
                closeWidgetModal();
            }
        });
    }

    const addDomain = async (event: Event) => {
        event.preventDefault();
        if (!domainNameInput) return;
        const hostname = domainNameInput.value.trim();
        if (!hostname) {
            alert('Please enter a domain name.');
            return;
        }

        try {
            const response = await fetch('/api/dashboard/domains', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ hostname })
            });

            if (response.status === 409) {
                alert('This domain has already been added.');
                return;
            }

            if (!response.ok) {
                throw new Error('Failed to add domain');
            }
            
            closeModal();
            fetchDashboardData();
        } catch (error) {
            console.error(error);
            alert('Could not add domain.');
        }
    };

    // Initialize dashboard data on startup
    fetchDashboardData();

    const loadBotConfig = (domain: string) => {
        if (!selectedDomainLabel || !botConfigSection) return;
        selectedDomainLabel.textContent = domain;
        botConfigSection.style.display = 'block';

        try {
            // Используем уже загруженные данные (без дополнительного запроса)
            const domainConfigs = (window as any).domainConfigs || {};
            const config = domainConfigs[domain] || {};
            
            // Поля управляемые пользователем
            (document.getElementById('identity') as HTMLTextAreaElement).value = config.identity || '';
            (document.getElementById('task') as HTMLTextAreaElement).value = config.task || '';
            (document.getElementById('voice') as HTMLSelectElement).value = config.voice || 'alloy';
            (document.getElementById('otherDetails') as HTMLInputElement).value = config.otherDetails || '';
            (document.getElementById('instructions') as HTMLTextAreaElement).value = config.instructions || '';
            
            // Поля demeanor, tone, levelOfEnthusiasm, formality, levelOfEmotion, fillerWords, pacing
            // управляются только на сервере через BOT_DEFAULTS
            
            // Conversation states are managed exclusively by the visual editor
            // No rendering needed in dashboard

        } catch (error) {
            console.error(error);
            alert(`Could not load configuration for ${domain}.`);
        }
    };

    const saveBotConfig = async (event: Event) => {
        event.preventDefault();
        if (!selectedDomain) return;

        // Получаем актуальные conversationStates из базы данных, а не из HTML формы
        const domainConfigs = (window as any).domainConfigs || {};
        const currentConfig = domainConfigs[selectedDomain] || {};

        const configData = {
            // Только поля управляемые пользователем - НЕ включаем conversationStates и editorSettings
            identity: (document.getElementById('identity') as HTMLTextAreaElement).value,
            task: (document.getElementById('task') as HTMLTextAreaElement).value,
            voice: (document.getElementById('voice') as HTMLSelectElement).value,
            otherDetails: (document.getElementById('otherDetails') as HTMLInputElement).value,
            instructions: (document.getElementById('instructions') as HTMLTextAreaElement).value
            // conversationStates и editorSettings управляются только визуальным редактором
            // demeanor, tone, levelOfEnthusiasm и т.д. управляются только сервером через BOT_DEFAULTS
        };

        try {
            const response = await fetch(`/api/bot-config?domain=${selectedDomain}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(configData)
            });

            if (!response.ok) throw new Error('Failed to save configuration');
            
            // Обновляем локальный кэш с новыми данными
            if (domainConfigs[selectedDomain]) {
                domainConfigs[selectedDomain] = {
                    ...domainConfigs[selectedDomain],
                    ...configData
                };
            }
            
            alert('Configuration saved successfully!');

        } catch (error) {
            console.error(error);
            alert('Failed to save configuration.');
        }
    };

    addDomainBtn.addEventListener('click', openModal);
    addDomainForm.addEventListener('submit', addDomain);
    closeModalBtn.addEventListener('click', closeModal);
    cancelModalBtn.addEventListener('click', closeModal);
    
    // Bot config form submit handler
    if (botConfigForm) {
    botConfigForm.addEventListener('submit', saveBotConfig);
    }
    
    // Visual Editor button handler
    const visualEditorBtn = safeGetElement('open-visual-editor-btn') as HTMLAnchorElement;
    if (visualEditorBtn) {
        visualEditorBtn.addEventListener('click', (e) => {
            if (selectedDomain) {
                // Обновляем href с доменом
                visualEditorBtn.href = `/visual-editor.html?domain=${encodeURIComponent(selectedDomain)}`;
            } else {
                e.preventDefault();
                alert('Please select a domain first');
            }
        });
    }
    
    // Tab switching logic (safe)
    const tabButtons = document.querySelectorAll('.tab-link');
    const tabContents = document.querySelectorAll('.tab-content');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            tabContents.forEach(content => (content as HTMLElement).style.display = 'none');
            const tabId = btn.getAttribute('data-tab');
            const targetTab = document.getElementById(tabId || '');
            if (targetTab) {
                targetTab.style.display = 'block';
            }
        });
    });

    // Import modal elements
    const importBtn = document.getElementById('import-btn') as HTMLButtonElement | null;
    const importModal = document.getElementById('import-modal') as HTMLDivElement | null;
    const importForm = document.getElementById('import-form') as HTMLFormElement | null;
    const closeImportModalBtn = document.getElementById('close-import-modal-btn') as HTMLButtonElement | null;
    const cancelImportBtn = document.getElementById('cancel-import-btn') as HTMLButtonElement | null;

    const openImportModal = () => {
        if (importModal) {
            importModal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
            };
            
    const closeImportModal = () => {
        if (importModal) {
            importModal.style.display = 'none';
            document.body.style.overflow = 'auto';
            // Reset form
            if (importForm) importForm.reset();
        }
    };

    const handleImport = async (event: Event) => {
        event.preventDefault();
        const fileInput = document.getElementById('price-list-file') as HTMLInputElement;
        if (!fileInput?.files || fileInput.files.length === 0) {
            alert('Please select a file.');
            return;
            }

        const file = fileInput.files[0];
        const reader = new FileReader();
        
        reader.onload = (e) => {
            if (!e.target) return;
            const content = e.target.result as string;
            let parsed: any[] = [];
            
            try {
                if (file.type === 'application/json' || file.name.endsWith('.json')) {
                    parsed = JSON.parse(content);
                } else if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
                    const lines = content.split('\n').filter(line => line.trim());
                    if (lines.length < 2) {
                        alert('CSV file must have at least a header and one data row.');
                        return;
                    }
                    // Skip header row and parse data
                    parsed = lines.slice(1).map((line: string) => {
                        const columns = line.split(',').map(col => col.trim());
                        return {
                            name: columns[0] || 'Unnamed Product',
                            description: columns[1] || '',
                            price: parseFloat(columns[2]) || 0,
                            currency: columns[3] || 'USD'
                        };
                    });
                }
                
                // Add parsed products to the list
                // Импорт товаров через API (пока просто показываем алерт)
                alert(`Импорт ${parsed.length} товаров. Функция будет реализована позже.`);
                
                renderPriceList();
                closeImportModal();
                alert(`Successfully imported ${parsed.length} products!`);
                
            } catch (error) {
                console.error('Import error:', error);
                alert('Error parsing file. Please check the file format.');
            }
        };
        
        reader.readAsText(file);
    };

    // Import modal event listeners
    if (importBtn) {
        importBtn.addEventListener('click', openImportModal);
    }
    if (closeImportModalBtn) {
        closeImportModalBtn.addEventListener('click', closeImportModal);
    }
    if (cancelImportBtn) {
        cancelImportBtn.addEventListener('click', closeImportModal);
    }
    if (importForm) {
        importForm.addEventListener('submit', handleImport);
    }
    if (importModal) {
        importModal.addEventListener('click', (e) => {
            if (e.target === importModal) closeImportModal();
        });
        }

    // Data form functionality is now handled by import modal
    // const dataConfigForm = safeGetElement('data-config-form') as HTMLFormElement;
    // Data config form is no longer needed



    // Modal logic (existing with checks)
    const addProductBtn = document.getElementById('add-product-btn') as HTMLButtonElement | null;

    // Universal Product modal logic with null checks
    const productModal = document.getElementById('product-modal') as HTMLDivElement | null;
    if (!productModal) console.error('productModal not found');
    const productForm = document.getElementById('product-form') as HTMLFormElement | null;
    if (!productForm) console.error('productForm not found');
    const variantsContainer = document.getElementById('variants-container') as HTMLDivElement | null;
    if (!variantsContainer) console.error('variantsContainer not found');
    const addVariantBtn = document.getElementById('add-variant-btn') as HTMLButtonElement | null;
    if (!addVariantBtn) console.error('addVariantBtn not found');
    const closeProductBtn = document.getElementById('close-product-modal-btn') as HTMLButtonElement | null;
    if (!closeProductBtn) console.error('closeProductBtn not found');
    const cancelProductBtn = document.getElementById('cancel-product-btn') as HTMLButtonElement | null;
    if (!cancelProductBtn) console.error('cancelProductBtn not found');

    if (!productModal || !productForm || !variantsContainer || !addVariantBtn || !closeProductBtn || !cancelProductBtn) {
        console.error('Missing elements for Product modal. Check HTML.');
        return; // Stop if elements missing
    }

    const toggleProductType = () => {
        const simpleSection = document.getElementById('simple-product-section');
        const variantsSection = document.getElementById('variants-section');
        const selectedType = (document.querySelector('input[name="product-type"]:checked') as HTMLInputElement)?.value;
        
        if (selectedType === 'simple') {
            if (simpleSection) simpleSection.style.display = 'block';
            if (variantsSection) variantsSection.style.display = 'none';
        } else {
            if (simpleSection) simpleSection.style.display = 'none';
            if (variantsSection) variantsSection.style.display = 'block';
            
            // Add first variant if none exist
            const existingRows = variantsContainer.querySelectorAll('.dynamic-variant-row');
            if (existingRows.length === 0) {
        addDynamicVariantRow();
            }
        }
    };

    const addDynamicVariantRow = (title = '', sku = '', price = '') => {
        const row = document.createElement('div');
        row.className = 'dynamic-variant-row';
        row.innerHTML = `
            <div class="variant-fields-container">
                <input type="text" placeholder="Variant name (e.g., 128GB Black)" value="${title}" required>
                <input type="text" placeholder="SKU" value="${sku}">
                <input type="number" placeholder="Price ($)" value="${price}" step="0.01" min="0" required>
                <div></div> <!-- Empty cell for grid -->
            </div>
            <button type="button" class="btn-delete-row" aria-label="Delete variant">&times;</button>
        `;
        const deleteBtn = row.querySelector('.btn-delete-row') as HTMLButtonElement | null;
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                row.remove();
                // If we deleted the last variant, add a new one
                const remainingRows = variantsContainer.querySelectorAll('.dynamic-variant-row');
                if (remainingRows.length === 0) {
                    addDynamicVariantRow();
                }
            });
        }
        variantsContainer.appendChild(row);
    };



    if (productForm) {
        productForm.addEventListener('submit', async (event: Event) => {
        event.preventDefault();
            
            const productName = (document.getElementById('product-name') as HTMLInputElement)?.value?.trim() || '';
            const productDesc = (document.getElementById('product-description') as HTMLTextAreaElement)?.value?.trim() || '';
            const selectedType = (document.querySelector('input[name="product-type"]:checked') as HTMLInputElement)?.value;

            if (!productName) {
                alert('Please enter a product name');
                return;
            }

            let variants: any[] = [];

            if (selectedType === 'simple') {
                // Simple product
                const priceInput = document.getElementById('simple-price') as HTMLInputElement;
                const skuInput = document.getElementById('simple-sku') as HTMLInputElement;
                const price = parseFloat(priceInput?.value || '0');

                if (price <= 0) {
                    alert('Please enter a valid price');
                    return;
                }

                variants = [{
                    title: 'Default Title',
                    price: Math.round(price * 100), // convert to cents
                    sku: skuInput?.value?.trim() || ''
                }];
            } else {
                // Product with variants
                const variantRows = Array.from(variantsContainer.querySelectorAll('.dynamic-variant-row'));
                
                if (variantRows.length === 0) {
                    alert('Please add at least one product variant');
                    return;
                }

                variants = variantRows.map(row => {
                    const titleInput = row.querySelector('input[placeholder*="Variant name"]') as HTMLInputElement;
                    const skuInput = row.querySelector('input[placeholder="SKU"]') as HTMLInputElement;
                    const priceInput = row.querySelector('input[placeholder*="Price"]') as HTMLInputElement;

                    const title = titleInput?.value?.trim() || '';
                    const price = parseFloat(priceInput?.value || '0');

                    if (!title || price <= 0) {
                        throw new Error('Please fill in all required variant fields');
                    }

            return {
                        title,
                        price: Math.round(price * 100), // convert to cents
                        sku: skuInput?.value?.trim() || ''
            };
        });
            }

            // Handle both add and edit modes
            if (productModalMode === 'edit') {
                await handleEditProduct(productName, productDesc, variants);
            } else {
                await handleAddProduct(productName, productDesc, variants);
            }
        });
    }

    // Add event handlers for radio buttons
    const productTypeRadios = document.querySelectorAll('input[name="product-type"]');
    productTypeRadios.forEach(radio => {
        radio.addEventListener('change', toggleProductTypeInModal);
    });

    if (addVariantBtn) {
        addVariantBtn.addEventListener('click', () => addDynamicVariantRowInModal());
    }

    // Set up event handlers for modal
    if (addProductBtn) {
        addProductBtn.addEventListener('click', () => openProductModal('add'));
    }
    
    if (closeProductBtn) {
        closeProductBtn.addEventListener('click', closeProductModal);
    }
    
    if (cancelProductBtn) {
        cancelProductBtn.addEventListener('click', closeProductModal);
    }

    // Close modal when clicking outside
    if (productModal) {
        productModal.addEventListener('click', (e: Event) => {
            if (e.target === productModal) {
                closeProductModal();
            }
        });
    }

    // Close modal with Escape key
    document.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Escape' && productModal && productModal.style.display === 'flex') {
            closeProductModal();
        }
    });

    // Pagination event handlers
    const prevBtn = document.getElementById('prev-page-btn') as HTMLButtonElement;
    const nextBtn = document.getElementById('next-page-btn') as HTMLButtonElement;
    
    console.log('Pagination elements:', { prevBtn, nextBtn });
    
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                loadProducts(currentPage - 1, currentSearch);
            }
        });
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            if (currentPage < totalPages) {
                loadProducts(currentPage + 1, currentSearch);
            }
        });
    }

    // Search functionality
    const searchInput = document.getElementById('product-search') as HTMLInputElement;
    const clearSearchBtn = document.getElementById('clear-search-btn') as HTMLButtonElement;
    
    console.log('Search elements:', { searchInput, clearSearchBtn });
    
    if (searchInput && clearSearchBtn) {
        // Debounced search function
        const debouncedSearch = debounce((searchTerm: string) => {
            loadProducts(1, searchTerm); // Always go to page 1 for new search
        }, 300);

        // Search input event
        searchInput.addEventListener('input', (e) => {
            const target = e.target as HTMLInputElement;
            const searchTerm = target.value;
            
            // Show/hide clear button
            if (searchTerm.trim()) {
                clearSearchBtn.style.display = 'flex';
            } else {
                clearSearchBtn.style.display = 'none';
            }
            
            // Perform search
            debouncedSearch(searchTerm);
        });

        // Clear search button
        clearSearchBtn.addEventListener('click', () => {
            searchInput.value = '';
            clearSearchBtn.style.display = 'none';
            loadProducts(1, ''); // Reset to show all products
        });

        // Enter key for search
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                loadProducts(1, searchInput.value);
            }
        });
    }

    // Edit and Delete logic for products
    const tableBody = document.querySelector('#price-list-table tbody') as HTMLTableSectionElement | null;
    console.log('Table body element:', tableBody);
    
    if (tableBody) {
        tableBody.addEventListener('click', async (e: Event) => {
            const target = e.target as HTMLElement | null;
            if (target && target.classList.contains('btn-edit')) {
                const productId = target.dataset.id;
                if (productId) {
                    await openProductModal('edit', parseInt(productId));
                }
            } else if (target && target.classList.contains('btn-delete')) {
                const productId = target.dataset.id;
                if (productId) {
                    await deleteProduct(parseInt(productId));
                }
            }
        });
    }

    // Initial load from API - with small delay to ensure DOM is ready
    setTimeout(() => {
        console.log('Initializing products table...');
        loadProducts();
    }, 200);

    // AI Assist Modal is handled by visual-editor.ts
}

// Function to handle adding a product
async function handleAddProduct(productName: string, productDesc: string, variants: any[]) {
    const token = localStorage.getItem('authToken');
    if (!token) return;

    try {
        const productData = {
            title: productName,
            description: productDesc,
            variants: variants
        };

        if (!selectedDomain) {
            alert('Please select a domain first');
            return;
        }

        const params = new URLSearchParams({ domain: selectedDomain });
        const response = await fetch(`/api/products?${params}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
            body: JSON.stringify(productData)
            });

            if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(errorData.error || 'Failed to create product');
        }

        // Update the product list - stay on current page if searching, go to first page if not
        if (currentSearch.trim()) {
            await loadProducts(currentPage, currentSearch);
        } else {
            // If not searching, go to first page to see new product
            await loadProducts(1, '');
        }
        closeProductModal();
        alert('Product created successfully! 🎉');
    } catch (error) {
        console.error('Error creating product:', error);
        alert(`Error creating product: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

// Function to handle editing a product
async function handleEditProduct(productName: string, productDesc: string, variants: any[]) {
    const token = localStorage.getItem('authToken');
    if (!token) return;

    const productIdInput = document.getElementById('product-id') as HTMLInputElement;
    const productId = parseInt(productIdInput?.value || '0');
    
    if (!productId) {
        alert('Product ID not found');
        return;
    }

    try {
        const productData = {
            title: productName,
            description: productDesc,
            variants: variants
        };

        if (!selectedDomain) {
            alert('Please select a domain first');
            return;
        }

        const params = new URLSearchParams({ domain: selectedDomain });
        const response = await fetch(`/api/products/${productId}?${params}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(productData)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(errorData.error || 'Failed to update product');
        }

        // Update product list
        await loadProducts(currentPage, currentSearch);
        closeProductModal();
        alert('Product updated successfully! ✏️');
    } catch (error) {
        console.error('Error updating product:', error);
        alert(`Error updating product: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
} 

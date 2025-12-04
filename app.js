// Crypto News App - Real-time news aggregator

class CryptoNewsApp {
    constructor() {
        this.newsContainer = document.getElementById('newsContainer');
        this.searchInput = document.getElementById('searchInput');
        this.refreshBtn = document.getElementById('refreshBtn');
        this.lastUpdateEl = document.getElementById('lastUpdate');
        this.articleCountEl = document.getElementById('articleCount');
        this.filterButtons = document.querySelectorAll('.filter-btn');
        
        this.allNews = [];
        this.currentFilter = 'all';
        this.isLoading = false;
        
        this.init();
    }
    
    init() {
        // Event listeners
        this.refreshBtn.addEventListener('click', () => this.fetchNews());
        this.searchInput.addEventListener('input', () => this.filterNews());
        
        this.filterButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.filterButtons.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentFilter = e.target.dataset.filter;
                this.filterNews();
            });
        });
        
        // Initial fetch
        this.fetchNews();
        
        // Auto-refresh every 5 minutes
        setInterval(() => this.fetchNews(), 5 * 60 * 1000);
    }
    
    async fetchNews() {
        if (this.isLoading) return;
        this.isLoading = true;
        
        this.showLoading();
        
        try {
            // Fetch from multiple sources
            const newsPromises = [
                this.fetchCryptoCompareNews(),
                this.fetchCoinGeckoNews(),
                this.fetchAlternativeNews()
            ];
            
            const results = await Promise.allSettled(newsPromises);
            
            // Combine all successful results
            this.allNews = [];
            results.forEach(result => {
                if (result.status === 'fulfilled' && result.value) {
                    this.allNews = [...this.allNews, ...result.value];
                }
            });
            
            // Sort by date (newest first)
            this.allNews.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
            
            // Remove duplicates based on title similarity
            this.allNews = this.removeDuplicates(this.allNews);
            
            this.updateLastUpdate();
            this.filterNews();
            
        } catch (error) {
            console.error('Error fetching news:', error);
            this.showError();
        }
        
        this.isLoading = false;
    }
    
    async fetchCryptoCompareNews() {
        try {
            const response = await fetch('https://min-api.cryptocompare.com/data/v2/news/?lang=EN&sortOrder=latest');
            const data = await response.json();
            
            if (data.Data) {
                return data.Data.map(article => ({
                    title: article.title,
                    description: article.body ? article.body.substring(0, 200) + '...' : '',
                    url: article.url,
                    imageUrl: article.imageurl || this.getPlaceholderImage(),
                    source: article.source_info?.name || article.source || 'CryptoCompare',
                    publishedAt: new Date(article.published_on * 1000).toISOString(),
                    categories: article.categories ? article.categories.split('|') : []
                }));
            }
            return [];
        } catch (error) {
            console.error('CryptoCompare API error:', error);
            return [];
        }
    }
    
    async fetchCoinGeckoNews() {
        // CoinGecko doesn't have a public news API, so we'll use their trending/status
        try {
            const response = await fetch('https://api.coingecko.com/api/v3/search/trending');
            const data = await response.json();
            
            // Convert trending coins to news-like format
            if (data.coins) {
                return data.coins.slice(0, 5).map(item => ({
                    title: `${item.item.name} (${item.item.symbol.toUpperCase()}) is Trending!`,
                    description: `${item.item.name} is currently trending on CoinGecko. Market Cap Rank: #${item.item.market_cap_rank || 'N/A'}`,
                    url: `https://www.coingecko.com/en/coins/${item.item.id}`,
                    imageUrl: item.item.large || item.item.thumb || this.getPlaceholderImage(),
                    source: 'CoinGecko Trending',
                    publishedAt: new Date().toISOString(),
                    categories: ['trending', 'market']
                }));
            }
            return [];
        } catch (error) {
            console.error('CoinGecko API error:', error);
            return [];
        }
    }
    
    async fetchAlternativeNews() {
        // Fetch from CoinPaprika news
        try {
            const response = await fetch('https://api.coingecko.com/api/v3/status_updates?per_page=20');
            const data = await response.json();
            
            if (data.status_updates) {
                return data.status_updates.map(update => ({
                    title: update.project?.name ? `${update.project.name}: ${update.description?.substring(0, 60) || 'Update'}...` : update.description?.substring(0, 80) || 'Crypto Update',
                    description: update.description || '',
                    url: update.project?.links?.homepage?.[0] || '#',
                    imageUrl: update.project?.image?.large || this.getPlaceholderImage(),
                    source: update.project?.name || 'Crypto Project',
                    publishedAt: update.created_at || new Date().toISOString(),
                    categories: [update.category || 'update']
                }));
            }
            return [];
        } catch (error) {
            console.error('Alternative news API error:', error);
            return [];
        }
    }
    
    getPlaceholderImage() {
        const placeholders = [
            'https://images.unsplash.com/photo-1518546305927-5a555bb7020d?w=400&h=200&fit=crop',
            'https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=400&h=200&fit=crop',
            'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=400&h=200&fit=crop',
            'https://images.unsplash.com/photo-1622630998477-20aa696ecb05?w=400&h=200&fit=crop',
            'https://images.unsplash.com/photo-1516245834210-c4c142787335?w=400&h=200&fit=crop'
        ];
        return placeholders[Math.floor(Math.random() * placeholders.length)];
    }
    
    removeDuplicates(news) {
        const seen = new Set();
        return news.filter(article => {
            const key = article.title.toLowerCase().substring(0, 50);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }
    
    filterNews() {
        let filtered = [...this.allNews];
        
        // Apply category filter
        if (this.currentFilter !== 'all') {
            filtered = filtered.filter(article => {
                const searchText = (article.title + ' ' + article.description + ' ' + article.categories.join(' ')).toLowerCase();
                return searchText.includes(this.currentFilter.toLowerCase());
            });
        }
        
        // Apply search filter
        const searchTerm = this.searchInput.value.toLowerCase().trim();
        if (searchTerm) {
            filtered = filtered.filter(article => {
                const searchText = (article.title + ' ' + article.description + ' ' + article.source).toLowerCase();
                return searchText.includes(searchTerm);
            });
        }
        
        this.renderNews(filtered);
    }
    
    renderNews(news) {
        this.articleCountEl.textContent = `${news.length} articles`;
        
        if (news.length === 0) {
            this.newsContainer.innerHTML = `
                <div class="no-results">
                    <h3>No articles found</h3>
                    <p>Try adjusting your search or filter criteria</p>
                </div>
            `;
            return;
        }
        
        this.newsContainer.innerHTML = news.map(article => this.createNewsCard(article)).join('');
    }
    
    createNewsCard(article) {
        const date = this.formatDate(article.publishedAt);
        const categoryTags = article.categories.slice(0, 2).map(cat => 
            `<span class="category-tag">${cat}</span>`
        ).join('');
        
        return `
            <article class="news-card" onclick="window.open('${article.url}', '_blank')">
                <img 
                    class="news-card-image" 
                    src="${article.imageUrl}" 
                    alt="${article.title}"
                    onerror="this.src='${this.getPlaceholderImage()}'"
                    loading="lazy"
                >
                <div class="news-card-content">
                    <span class="news-card-source">${article.source}</span>
                    ${categoryTags}
                    <h3 class="news-card-title">${this.escapeHtml(article.title)}</h3>
                    <p class="news-card-description">${this.escapeHtml(article.description)}</p>
                    <div class="news-card-meta">
                        <span class="news-card-date">📅 ${date}</span>
                        <a href="${article.url}" target="_blank" rel="noopener" class="news-card-link" onclick="event.stopPropagation()">
                            Read more →
                        </a>
                    </div>
                </div>
            </article>
        `;
    }
    
    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 60) {
            return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
        } else if (diffHours < 24) {
            return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
        } else if (diffDays < 7) {
            return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
        } else {
            return date.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric',
                year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
            });
        }
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    updateLastUpdate() {
        const now = new Date();
        this.lastUpdateEl.textContent = `Last updated: ${now.toLocaleTimeString()}`;
    }
    
    showLoading() {
        this.newsContainer.innerHTML = `
            <div class="loading" id="loadingSpinner">
                <div class="spinner"></div>
                <p>Loading latest crypto news...</p>
            </div>
        `;
    }
    
    showError() {
        this.newsContainer.innerHTML = `
            <div class="error-message">
                <h3>⚠️ Unable to load news</h3>
                <p>Please check your internet connection and try again.</p>
            </div>
        `;
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new CryptoNewsApp();
});

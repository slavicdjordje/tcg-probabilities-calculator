/**
 * CardDatabaseService - Manages Yu-Gi-Oh! card database API calls and local caching
 * Implements 7-day caching strategy to reduce API calls
 * Uses YGOPro API for card data and images
 */

const CardDatabaseService = {
  CACHE_KEY: 'yugioh_cards_cache',
  CACHE_DURATION: 7 * 24 * 60 * 60 * 1000,

  async fetchCards() {
    try {
      console.log('📡 Fetching cards from YGOPro API...');
      const response = await fetch('https://db.ygoprodeck.com/api/v7/cardinfo.php');
      console.log('API response status:', response.status);

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Loaded from YGOPro API:', data.data ? data.data.length : 0, 'cards');
      console.log('First card example:', data.data ? data.data[0] : 'No cards');

      return data.data || [];
    } catch (error) {
      console.error('❌ API fetch failed:', error);
      return [];
    }
  },

  loadFromCache() {
    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      if (!cached) return null;

      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp > this.CACHE_DURATION) {
        localStorage.removeItem(this.CACHE_KEY);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Cache load error:', error);
      return null;
    }
  },

  saveToCache(cards) {
    try {
      const cacheData = {
        data: cards,
        timestamp: Date.now()
      };
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Cache save error:', error);
    }
  },

  /**
   * Generate image URL using YGOPro API
   * @param {string} cardId - The card ID
   * @param {string} size - Image size ('full' or 'small')
   * @returns {string} The YGOPro image URL
   */
  getImageUrl(cardId, size = 'small') {
    if (!cardId) {
      console.log('❌ No card ID provided for image URL generation');
      return 'https://images.ygoprodeck.com/images/cards/card_back.jpg';
    }

    if (size === 'small') {
      return `https://images.ygoprodeck.com/images/cards_small/${cardId}.jpg`;
    }

    return `https://images.ygoprodeck.com/images/cards/${cardId}.jpg`;
  },

  /**
   * Generate image props for YGOPro API
   * @param {string} cardName - The card name (for alt text)
   * @param {string} cardId - The card ID
   * @param {string} size - Image size ('full' or 'small')
   * @returns {object} Props for HTML img element
   */
  getImageProps(cardName, cardId, size = 'small') {
    const imageUrl = this.getImageUrl(cardId, size);

    return {
      src: imageUrl,
      alt: cardName || 'Yu-Gi-Oh Card',
      loading: 'lazy'
    };
  }
};

export default CardDatabaseService;

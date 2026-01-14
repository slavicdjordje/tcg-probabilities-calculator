import React from 'react';

/**
 * Card image component using YGOPro API
 *
 * Features:
 * - Direct YGOPro API image loading
 * - Lazy loading for performance
 * - Multiple size options (full, small)
 * - Error handling with placeholder fallback
 * - Uses card ID for image URLs
 */

const CardImage = ({ 
  cardName, 
  cardId, 
  cardData,
  size = 'small', 
  className = '', 
  style = {},
  onClick = null,
  loading = 'lazy'
}) => {
  // Support both cardData object and individual props for backward compatibility
  const actualCardName = cardData?.cardName || cardName;
  const actualCardId = cardData?.cardId || cardId;
  const isBlank = !cardData || cardData.type === 'blank' || (!actualCardName && !actualCardId);
  
  // YGOPro API configuration
  const BLANK_CARD_URL = 'https://images.ygoprodeck.com/images/cards/card_back.jpg';

  /**
   * Generate image URL using YGOPro API
   */
  const getImageUrl = () => {
    if (!actualCardId) {
      return 'https://images.ygoprodeck.com/images/cards/card_back.jpg';
    }

    // Use small images for better performance when size is small
    if (size === 'small') {
      return `https://images.ygoprodeck.com/images/cards_small/${actualCardId}.jpg`;
    }

    // Use full-size images for larger displays
    return `https://images.ygoprodeck.com/images/cards/${actualCardId}.jpg`;
  };

  const imageUrl = getImageUrl();

  /**
   * Handle image loading errors
   */
  const handleError = (event) => {
    // Fallback to card back if image fails to load
    if (event.target.src !== BLANK_CARD_URL) {
      console.warn(`Failed to load image for card "${actualCardName}" (ID: ${actualCardId})`);
      event.target.src = BLANK_CARD_URL;
    }
  };
  
  // Size constraints based on size prop
  const sizeStyles = {
    width: size === 'small' ? '60px' : '120px',
    height: size === 'small' ? '87px' : '174px',
    objectFit: 'cover',
    borderRadius: '4px'
  };

  // Handle blank cards
  if (isBlank) {
    return (
      <img
        src={BLANK_CARD_URL}
        alt="Yu-Gi-Oh Card Back"
        loading={loading}
        className={className}
        style={{ ...sizeStyles, ...style }}
        onClick={onClick}
        title="Blank Card"
      />
    );
  }

  // Handle custom cards - black and white blank card with name overlay
  if (cardData?.isCustom) {
    return (
      <div
        className={className}
        style={{
          ...sizeStyles,
          position: 'relative',
          overflow: 'hidden',
          ...style
        }}
        onClick={onClick}
      >
        <img
          src={BLANK_CARD_URL}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            borderRadius: '4px',
            filter: 'grayscale(100%) brightness(0.7)'
          }}
          alt={`Custom Card: ${actualCardName}`}
          loading={loading}
          title={`Custom Card: ${actualCardName}`}
        />
        {/* Overlay custom card name */}
        <div
          style={{
            position: 'absolute',
            bottom: '2px',
            left: '2px',
            right: '2px',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: '#fff',
            fontSize: '7px',
            textAlign: 'center',
            padding: '1px 2px',
            borderRadius: '2px',
            maxHeight: '20px',
            overflow: 'hidden'
          }}
        >
          {actualCardName}
        </div>
      </div>
    );
  }

  // Common image props for regular cards
  const imageProps = {
    alt: actualCardName || `Yu-Gi-Oh card ${actualCardId || 'Unknown'}`,
    loading: loading,
    className: className,
    style: { ...sizeStyles, ...style },
    onClick: onClick,
    onError: handleError,
    title: actualCardName
  };

  // Render card image from YGOPro API
  return (
    <img
      src={imageUrl}
      {...imageProps}
    />
  );
};

export default CardImage;
import React, { useState, useRef } from 'react';
import Icon from './Icon';
import { TYPOGRAPHY } from '../constants/config';
import useYgoCardSearch from '../hooks/useYgoCardSearch';
import CardSearchContent from './CardSearchContent';

const CardSearchDrawer = ({ isOpen, onClose, onCardSelect, addCardToDeckZone, deckZones, typography }) => {
  // Drawer-specific state
  const [isDragging, setIsDragging] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const closeTimeoutRef = useRef(null);

  // Shared search logic
  const search = useYgoCardSearch({ isOpen });

  // Cleanup timeout on unmount is handled inline via the useEffect in the hook
  // We need the closeTimeoutRef cleanup here for the drawer-specific tooltip
  React.useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  if (!isOpen) return null;

  const resolvedTypography = typography || TYPOGRAPHY;

  return (
    <div>
      {/* Drawer Container */}
      <div
        className="w-full rounded-lg p-4"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-main)',
        }}
      >
        <CardSearchContent
          searchQuery={search.searchQuery}
          isSearching={search.isSearching}
          slowConnectionWarning={search.slowConnectionWarning}
          error={search.error}
          searchResults={search.searchResults}
          fuzzyMatchMessage={search.fuzzyMatchMessage}
          searchInputRef={search.searchInputRef}
          handleSearchInput={search.handleSearchInput}
          clearSearch={search.clearSearch}
          cancelSearch={search.cancelSearch}
          performSearch={search.performSearch}
          inputStyle={{ borderRadius: '999px', height: '40px' }}
        >
          {/* Horizontal scrollable results */}
          {search.searchResults.length > 0 && (
            <div
              className="flex gap-3 overflow-x-auto pb-4"
              style={{
                scrollBehavior: 'smooth',
                scrollbarWidth: 'thin',
                scrollbarColor: 'var(--border-main) var(--bg-secondary)',
              }}
            >
              {search.searchResults.map((card, index) => (
                <div
                  key={card.id}
                  onMouseEnter={(e) => {
                    if (!isDragging) {
                      if (closeTimeoutRef.current) {
                        clearTimeout(closeTimeoutRef.current);
                        closeTimeoutRef.current = null;
                      }

                      const rect = e.currentTarget.getBoundingClientRect();
                      const tooltipWidth = 440;
                      const tooltipHeight = 200;
                      const viewportWidth = window.innerWidth;
                      const viewportHeight = window.innerHeight;
                      const margin = 10;

                      let x = rect.left + rect.width / 2;
                      let y = rect.top - margin;

                      const tooltipLeft = x - tooltipWidth / 2;
                      const tooltipRight = x + tooltipWidth / 2;

                      if (tooltipLeft < margin) {
                        x = margin + tooltipWidth / 2;
                      } else if (tooltipRight > viewportWidth - margin) {
                        x = viewportWidth - margin - tooltipWidth / 2;
                      }

                      if (y - tooltipHeight < margin) {
                        y = rect.bottom + margin + tooltipHeight;
                      }

                      if (y > viewportHeight - margin) {
                        y = viewportHeight - margin;
                      }

                      setTooltipPosition({ x, y });
                      search.openCardModal(card, index);
                    }
                  }}
                  onMouseLeave={() => {
                    closeTimeoutRef.current = setTimeout(() => {
                      search.closeCardModal();
                    }, 50);
                  }}
                  onClick={() => {
                    if (addCardToDeckZone && !isDragging) {
                      const cardType = card.type.toLowerCase();
                      const targetZone =
                        cardType.includes('fusion') || cardType.includes('synchro') ||
                        cardType.includes('xyz') || cardType.includes('link') ||
                        cardType.includes('pendulum')
                          ? 'extra'
                          : 'main';
                      addCardToDeckZone(card, targetZone);
                    }
                  }}
                  onKeyDown={(e) => {
                    if ((e.key === 'Enter' || e.key === ' ') && addCardToDeckZone) {
                      e.preventDefault();
                      const cardType = card.type.toLowerCase();
                      const targetZone =
                        cardType.includes('fusion') || cardType.includes('synchro') ||
                        cardType.includes('xyz') || cardType.includes('link') ||
                        cardType.includes('pendulum')
                          ? 'extra'
                          : 'main';
                      addCardToDeckZone(card, targetZone);
                    }
                  }}
                  draggable={!!addCardToDeckZone}
                  onDragStart={(e) => {
                    if (addCardToDeckZone) {
                      setIsDragging(true);
                      e.dataTransfer.setData('application/json', JSON.stringify(card));
                      e.dataTransfer.effectAllowed = 'copy';
                    }
                  }}
                  onDragEnd={() => {
                    setTimeout(() => setIsDragging(false), 100);
                  }}
                  className="flex-shrink-0 cursor-pointer rounded-lg overflow-hidden hover:transform hover:scale-105 transition-transform"
                  style={{
                    backgroundColor: 'var(--bg-main)',
                    border: '1px solid var(--border-main)',
                    width: '60px',
                    cursor: addCardToDeckZone ? 'grab' : 'pointer',
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={`${card.name}, ${card.type}${card.atk !== undefined ? `, ATK ${card.atk}` : ''}${card.def !== undefined ? `, DEF ${card.def}` : ''}. ${addCardToDeckZone ? 'Drag to deck zone or click to add' : 'Click to view details'}`}
                >
                  <div className="aspect-[2/3] overflow-hidden relative">
                    <img
                      src={card.card_images?.[0]?.image_url_small || card.card_images?.[0]?.image_url || '/placeholder-card.jpg'}
                      alt={card.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      style={{ transition: 'opacity 0.3s ease' }}
                      onLoad={(e) => { e.target.style.opacity = '1'; }}
                      onError={(e) => {
                        e.target.src = '/placeholder-card.jpg';
                        e.target.style.backgroundColor = 'var(--bg-action-secondary)';
                      }}
                    />
                    {!card.card_images?.[0]?.image_url && (
                      <div
                        className="absolute inset-0 flex items-center justify-center"
                        style={{ backgroundColor: 'var(--bg-action-secondary)', color: 'var(--text-secondary)' }}
                      >
                        <div className="text-center">
                          <Icon name="image" size={24} />
                          <p className="text-xs mt-1">{card.name}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardSearchContent>
      </div>

      {/* Card Detail Tooltip (hover-driven, drawer-specific) */}
      {search.showCardModal && search.selectedCard && (
        <div
          className="fixed z-60 pointer-events-none"
          style={{
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y}px`,
            transform: 'translate(-50%, -100%)',
            width: '440px',
          }}
        >
          <div
            className="rounded-lg pointer-events-auto"
            style={{
              backgroundColor: 'var(--bg-main)',
              border: '1px solid #ffffff',
              boxShadow: '0 4px 12px rgba(255, 255, 255, 0.2), 0 8px 24px rgba(0, 0, 0, 0.4)',
              padding: '4px',
            }}
            onMouseEnter={() => {
              if (closeTimeoutRef.current) {
                clearTimeout(closeTimeoutRef.current);
                closeTimeoutRef.current = null;
              }
            }}
            onMouseLeave={() => { search.closeCardModal(); }}
          >
            {/* Tooltip Header */}
            <div className="p-2 border-b" style={{ borderColor: 'var(--border-main)' }}>
              <h3 style={{ fontSize: 'var(--font-body-size)', lineHeight: 'var(--font-body-line-height)', color: 'var(--text-main)', fontWeight: '600', margin: 0 }}>
                {search.selectedCard.name}
              </h3>
            </div>

            {/* Tooltip Content */}
            <div className="p-2">
              <div className="flex gap-2">
                <div className="flex-shrink-0">
                  <img
                    src={search.selectedCard.card_images?.[0]?.image_url_small || search.selectedCard.card_images?.[0]?.image_url || '/placeholder-card.jpg'}
                    alt={search.selectedCard.name}
                    className="rounded"
                    style={{ width: '60px', height: 'auto' }}
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <div>
                    <span style={{ fontSize: 'var(--font-body-size)', color: 'var(--text-main)', fontWeight: '600' }}>Type: </span>
                    <span style={{ fontSize: 'var(--font-body-size)', color: 'var(--text-secondary)' }}>
                      {(() => {
                        const cardType = search.selectedCard.type.toLowerCase();
                        if (cardType.includes('monster')) {
                          const monsterTypes = ['fiend','fairy','beast','spellcaster','warrior','dragon',
                            'machine','zombie','aqua','plant','insect','thunder','rock','pyro',
                            'winged beast','dinosaur','reptile','fish','sea serpent','beast-warrior',
                            'psychic','divine-beast','creator god','wyrm','cyberse'];
                          for (const t of monsterTypes) {
                            if (cardType.includes(t)) return t.charAt(0).toUpperCase() + t.slice(1);
                          }
                          return 'Monster';
                        }
                        if (cardType.includes('spell')) return 'Spell';
                        if (cardType.includes('trap'))  return 'Trap';
                        return search.selectedCard.type;
                      })()}
                    </span>
                  </div>
                  {search.selectedCard.attribute && (
                    <div>
                      <span style={{ fontSize: 'var(--font-body-size)', color: 'var(--text-main)', fontWeight: '600' }}>Attribute: </span>
                      <span style={{ fontSize: 'var(--font-body-size)', color: 'var(--text-secondary)' }}>{search.selectedCard.attribute}</span>
                    </div>
                  )}
                  {search.selectedCard.level && (
                    <div>
                      <span style={{ fontSize: 'var(--font-body-size)', color: 'var(--text-main)', fontWeight: '600' }}>Level: </span>
                      <span style={{ fontSize: 'var(--font-body-size)', color: 'var(--text-secondary)' }}>{search.selectedCard.level}</span>
                    </div>
                  )}
                  {(search.selectedCard.atk !== undefined || search.selectedCard.def !== undefined) && (
                    <div>
                      <span style={{ fontSize: 'var(--font-body-size)', color: 'var(--text-main)', fontWeight: '600' }}>ATK/DEF: </span>
                      <span style={{ fontSize: 'var(--font-body-size)', color: 'var(--text-secondary)' }}>
                        {search.selectedCard.atk !== undefined ? search.selectedCard.atk : '?'} / {search.selectedCard.def !== undefined ? search.selectedCard.def : '?'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {search.selectedCard.desc && (
                <div className="mt-2 pt-2 border-t" style={{ borderColor: 'var(--border-main)' }}>
                  <p style={{ fontSize: 'var(--font-body-size)', lineHeight: 'var(--font-body-line-height)', color: 'var(--text-secondary)', wordWrap: 'break-word' }}>
                    {search.selectedCard.desc}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CardSearchDrawer;

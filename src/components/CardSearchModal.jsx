import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Icon from './Icon';
import { Button } from './ui';
import { TYPOGRAPHY } from '../constants/config';
import useYgoCardSearch from '../hooks/useYgoCardSearch';
import CardSearchContent from './CardSearchContent';

const CardSearchModal = ({ isOpen, onClose, onCardSelect }) => {
  // Shared search logic
  const search = useYgoCardSearch({ isOpen });

  const handleClose = () => {
    search.clearSearch();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="relative w-full max-h-[90vh] overflow-auto rounded-lg"
            style={{
              backgroundColor: 'var(--bg-main)',
              border: '1px solid var(--border-main)',
              maxWidth: '520px',
            }}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          >
            {/* Modal Header */}
            <div
              className="flex justify-between items-center p-4 border-b"
              style={{ borderColor: 'var(--border-main)' }}
            >
              <h2 style={{ ...TYPOGRAPHY.h2, color: 'var(--text-main)' }}>Search Cards</h2>
              <Button
                onClick={handleClose}
                variant="secondary"
                size="small"
                style={{ padding: '8px' }}
                aria-label="Close search"
              >
                <Icon name="x-square" size={16} style={{ color: 'white' }} />
              </Button>
            </div>

            {/* Search Interface */}
            <div className="p-6">
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
                inputStyle={{ borderRadius: '8px', height: '48px', fontSize: '16px' }}
                inputClassName="px-4 py-3 pr-10"
              >
                {/* Grid results */}
                {search.searchResults.length > 0 && (
                  <div className="card-grid">
                    {search.searchResults.map((card, index) => (
                      <div
                        key={card.id}
                        onClick={() => search.openCardModal(card, index)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            search.openCardModal(card, index);
                          }
                        }}
                        className="card-item cursor-pointer rounded-lg overflow-hidden"
                        style={{
                          backgroundColor: 'var(--bg-secondary)',
                          border: '1px solid var(--border-main)',
                        }}
                        role="button"
                        tabIndex={0}
                        aria-label={`${card.name}, ${card.type}${card.atk !== undefined ? `, ATK ${card.atk}` : ''}${card.def !== undefined ? `, DEF ${card.def}` : ''}`}
                      >
                        <div className="aspect-[2/3] overflow-hidden relative">
                          <img
                            src={card.card_images?.[0]?.image_url || '/placeholder-card.jpg'}
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
                        <div className="p-3">
                          <h4
                            className="font-medium mb-1 line-clamp-2"
                            style={{ ...TYPOGRAPHY.body, color: 'var(--text-main)' }}
                          >
                            {card.name}
                          </h4>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1">
                              <div className="w-4 h-4 flex items-center justify-center">
                                {card.type.toLowerCase().includes('monster') && (
                                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#ff6b35' }} />
                                )}
                                {card.type.toLowerCase().includes('spell') && (
                                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#4ecdc4' }} />
                                )}
                                {card.type.toLowerCase().includes('trap') && (
                                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#c44569' }} />
                                )}
                              </div>
                              <span
                                className="text-xs px-2 py-1 rounded"
                                style={{ backgroundColor: 'var(--bg-action-secondary)', color: 'var(--text-main)' }}
                              >
                                {card.type.split(' ')[0]}
                              </span>
                            </div>
                            {card.atk !== undefined && card.def !== undefined && (
                              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                {card.atk}/{card.def}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardSearchContent>
            </div>

            {/* Card Detail Modal (click-driven, modal-specific) */}
            {search.showCardModal && search.selectedCard && (
              <div
                className="fixed inset-0 z-60 flex items-center justify-center p-4"
                style={{ backgroundColor: 'rgba(0,0,0,0.9)' }}
                onClick={(e) => { if (e.target === e.currentTarget) search.closeCardModal(); }}
              >
                <div
                  className="relative max-w-4xl w-full max-h-[90vh] overflow-auto rounded-lg"
                  style={{ backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-main)' }}
                >
                  {/* Header */}
                  <div
                    className="flex justify-between items-center p-4 border-b"
                    style={{ borderColor: 'var(--border-main)' }}
                  >
                    <h3 style={{ ...TYPOGRAPHY.h3, color: 'var(--text-main)' }}>
                      {search.selectedCard.name}
                    </h3>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => search.navigateCard('prev')}
                        disabled={search.currentCardIndex === 0}
                        variant="secondary"
                        size="small"
                        style={{ padding: '8px' }}
                      >
                        <Icon name="arrow-left" size={16} />
                      </Button>
                      <span style={{ ...TYPOGRAPHY.caption, color: 'var(--text-secondary)' }}>
                        {search.currentCardIndex + 1} of {search.searchResults.length}
                      </span>
                      <Button
                        onClick={() => search.navigateCard('next')}
                        disabled={search.currentCardIndex === search.searchResults.length - 1}
                        variant="secondary"
                        size="small"
                        style={{ padding: '8px' }}
                      >
                        <Icon name="arrow-right" size={16} />
                      </Button>
                      <Button
                        onClick={search.closeCardModal}
                        variant="secondary"
                        size="small"
                        style={{ padding: '8px' }}
                      >
                        <Icon name="x" size={16} />
                      </Button>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="flex justify-center">
                        <img
                          src={search.selectedCard.card_images?.[0]?.image_url || '/placeholder-card.jpg'}
                          alt={search.selectedCard.name}
                          className="max-w-full h-auto rounded-lg"
                          style={{ maxHeight: '500px' }}
                        />
                      </div>

                      <div className="space-y-4">
                        <div>
                          <h4 className="mb-2" style={{ ...TYPOGRAPHY.body, color: 'var(--text-main)', fontWeight: '600' }}>Card Type</h4>
                          <p style={{ ...TYPOGRAPHY.body, color: 'var(--text-secondary)' }}>{search.selectedCard.type}</p>
                        </div>

                        {search.selectedCard.attribute && (
                          <div>
                            <h4 className="mb-2" style={{ ...TYPOGRAPHY.body, color: 'var(--text-main)', fontWeight: '600' }}>Attribute</h4>
                            <p style={{ ...TYPOGRAPHY.body, color: 'var(--text-secondary)' }}>{search.selectedCard.attribute}</p>
                          </div>
                        )}

                        {search.selectedCard.level && (
                          <div>
                            <h4 className="mb-2" style={{ ...TYPOGRAPHY.body, color: 'var(--text-main)', fontWeight: '600' }}>Level</h4>
                            <p style={{ ...TYPOGRAPHY.body, color: 'var(--text-secondary)' }}>{search.selectedCard.level}</p>
                          </div>
                        )}

                        {(search.selectedCard.atk !== undefined || search.selectedCard.def !== undefined) && (
                          <div>
                            <h4 className="mb-2" style={{ ...TYPOGRAPHY.body, color: 'var(--text-main)', fontWeight: '600' }}>ATK/DEF</h4>
                            <p style={{ ...TYPOGRAPHY.body, color: 'var(--text-secondary)' }}>
                              {search.selectedCard.atk !== undefined ? search.selectedCard.atk : '?'} / {search.selectedCard.def !== undefined ? search.selectedCard.def : '?'}
                            </p>
                          </div>
                        )}

                        {search.selectedCard.desc && (
                          <div>
                            <h4 className="mb-2" style={{ ...TYPOGRAPHY.body, color: 'var(--text-main)', fontWeight: '600' }}>Effect</h4>
                            <p style={{ ...TYPOGRAPHY.body, color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                              {search.selectedCard.desc}
                            </p>
                          </div>
                        )}

                        <div className="pt-4 border-t" style={{ borderColor: 'var(--border-main)' }}>
                          <Button
                            onClick={() => {
                              onCardSelect(search.selectedCard);
                              search.closeCardModal();
                              handleClose();
                            }}
                            variant="primary"
                            size="medium"
                            style={{ width: '100%' }}
                          >
                            Select Card
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CardSearchModal;

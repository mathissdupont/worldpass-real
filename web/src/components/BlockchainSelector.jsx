import React, { useState, useEffect } from 'react';
import { ChevronDown, Check, Zap, Clock, Globe, TrendingDown } from 'lucide-react';

/**
 * BlockchainSelector Component
 * 
 * Allows users/issuers to choose which blockchain to use for credential anchoring
 * Displays chain characteristics: gas fees, finality time, network status
 */
export default function BlockchainSelector({ onSelect, defaultChain = 'polygon', showTestnets = false }) {
  const [chains, setChains] = useState([]);
  const [selectedChain, setSelectedChain] = useState(defaultChain);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [recommended, setRecommended] = useState(null);

  useEffect(() => {
    const fetchChains = async () => {
      try {
        const response = await fetch(
          `/api/blockchains/list?include_testnets=${showTestnets}`
        );
        const data = await response.json();
        
        if (data.success) {
          setChains(data.chains);
          setRecommended(data.recommended);
          
          // Set default to recommended if not already selected
          if (!selectedChain && data.recommended) {
            setSelectedChain(data.recommended);
            onSelect?.(data.recommended);
          }
        }
      } catch (error) {
        console.error('Failed to fetch blockchains:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchChains();
  }, [showTestnets, selectedChain, onSelect]);

  const handleSelect = (chainKey) => {
    setSelectedChain(chainKey);
    setIsOpen(false);
    onSelect?.(chainKey);
  };

  const getGasLevelColor = (level) => {
    switch (level) {
      case 'very_low': return 'text-green-600';
      case 'low': return 'text-green-500';
      case 'medium': return 'text-yellow-500';
      case 'high': return 'text-orange-500';
      case 'very_high': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getGasLevelText = (level) => {
    return level.replace('_', ' ').toUpperCase();
  };

  const selectedChainData = chains.find(c => c.key === selectedChain);

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-12 bg-gray-200 rounded"></div>
      </div>
    );
  }

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Select Blockchain
      </label>
      
      {/* Selected Chain Display */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-300 rounded-lg hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <div className="flex items-center gap-3">
          {selectedChainData && (
            <>
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900">{selectedChainData.name}</span>
                {selectedChainData.key === recommended && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                    Recommended
                  </span>
                )}
              </div>
              <span className={`text-xs ${getGasLevelColor(selectedChainData.gas_price)}`}>
                {getGasLevelText(selectedChainData.gas_price)} Gas
              </span>
            </>
          )}
        </div>
        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-10 mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto">
          {chains.map((chain) => (
            <button
              key={chain.key}
              type="button"
              onClick={() => handleSelect(chain.key)}
              className={`w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors ${
                selectedChain === chain.key ? 'bg-blue-50' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900">{chain.name}</span>
                    {chain.key === recommended && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                        Recommended
                      </span>
                    )}
                    {selectedChain === chain.key && (
                      <Check className="w-4 h-4 text-blue-600 ml-auto" />
                    )}
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-600">
                    {/* Gas Price */}
                    <div className="flex items-center gap-1">
                      <TrendingDown className={`w-3 h-3 ${getGasLevelColor(chain.gas_price)}`} />
                      <span className={getGasLevelColor(chain.gas_price)}>
                        {getGasLevelText(chain.gas_price)}
                      </span>
                    </div>
                    
                    {/* Finality Time */}
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{chain.finality}s finality</span>
                    </div>
                    
                    {/* Network */}
                    <div className="flex items-center gap-1">
                      <Globe className="w-3 h-3" />
                      <span className="text-gray-500">{chain.native_token}</span>
                    </div>
                  </div>
                  
                  {/* Explorer Link */}
                  <a
                    href={chain.explorer}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline mt-1 inline-block"
                    onClick={(e) => e.stopPropagation()}
                  >
                    View Explorer →
                  </a>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Info Text */}
      {selectedChainData && (
        <p className="mt-2 text-xs text-gray-500">
          <Zap className="w-3 h-3 inline mr-1" />
          Credentials will be anchored on <strong>{selectedChainData.name}</strong>.
          Gas fees: <span className={getGasLevelColor(selectedChainData.gas_price)}>
            {getGasLevelText(selectedChainData.gas_price)}
          </span>
          {selectedChainData.key === recommended && (
            <span className="ml-1 text-blue-600">
              (Recommended for low cost and fast confirmation)
            </span>
          )}
        </p>
      )}
    </div>
  );
}

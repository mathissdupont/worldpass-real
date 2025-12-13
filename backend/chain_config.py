"""
WorldPass Multi-Chain Configuration
====================================

Supported blockchains for credential hash anchoring.
User/Issuer can choose which chain to use based on:
- Gas costs
- Transaction speed
- Geographic preferences
- Regulatory requirements
"""

SUPPORTED_CHAINS = {
    # Ethereum Mainnet
    "ethereum": {
        "name": "Ethereum Mainnet",
        "chain_id": 1,
        "rpc": "https://eth.llamarpc.com",
        "explorer": "https://etherscan.io",
        "native_token": "ETH",
        "avg_gas_price": "high",
        "finality": "12-15 minutes",
        "recommended": False,  # Too expensive for credentials
    },
    
    # Polygon (MATIC) - RECOMMENDED
    "polygon": {
        "name": "Polygon Mainnet",
        "chain_id": 137,
        "rpc": "https://polygon-rpc.com",
        "explorer": "https://polygonscan.com",
        "native_token": "MATIC",
        "avg_gas_price": "very_low",
        "finality": "2-3 seconds",
        "recommended": True,  # Best for credentials
    },
    
    # Base (Coinbase L2)
    "base": {
        "name": "Base Mainnet",
        "chain_id": 8453,
        "rpc": "https://mainnet.base.org",
        "explorer": "https://basescan.org",
        "native_token": "ETH",
        "avg_gas_price": "low",
        "finality": "1-2 seconds",
        "recommended": True,
    },
    
    # Arbitrum One
    "arbitrum": {
        "name": "Arbitrum One",
        "chain_id": 42161,
        "rpc": "https://arb1.arbitrum.io/rpc",
        "explorer": "https://arbiscan.io",
        "native_token": "ETH",
        "avg_gas_price": "low",
        "finality": "1-2 seconds",
        "recommended": True,
    },
    
    # Optimism
    "optimism": {
        "name": "Optimism Mainnet",
        "chain_id": 10,
        "rpc": "https://mainnet.optimism.io",
        "explorer": "https://optimistic.etherscan.io",
        "native_token": "ETH",
        "avg_gas_price": "low",
        "finality": "1-2 seconds",
        "recommended": True,
    },
    
    # BSC (Binance Smart Chain)
    "bsc": {
        "name": "BNB Smart Chain",
        "chain_id": 56,
        "rpc": "https://bsc-dataseed.binance.org",
        "explorer": "https://bscscan.com",
        "native_token": "BNB",
        "avg_gas_price": "very_low",
        "finality": "3 seconds",
        "recommended": True,
    },
    
    # Avalanche C-Chain
    "avalanche": {
        "name": "Avalanche C-Chain",
        "chain_id": 43114,
        "rpc": "https://api.avax.network/ext/bc/C/rpc",
        "explorer": "https://snowtrace.io",
        "native_token": "AVAX",
        "avg_gas_price": "low",
        "finality": "1-2 seconds",
        "recommended": True,
    },
    
    # Gnosis Chain (formerly xDai)
    "gnosis": {
        "name": "Gnosis Chain",
        "chain_id": 100,
        "rpc": "https://rpc.gnosischain.com",
        "explorer": "https://gnosisscan.io",
        "native_token": "xDAI",
        "avg_gas_price": "very_low",
        "finality": "5 seconds",
        "recommended": True,
    },
    
    # Celo
    "celo": {
        "name": "Celo Mainnet",
        "chain_id": 42220,
        "rpc": "https://forno.celo.org",
        "explorer": "https://explorer.celo.org",
        "native_token": "CELO",
        "avg_gas_price": "very_low",
        "finality": "5 seconds",
        "recommended": True,
        "mobile_friendly": True,
    },
    
    # Testnets (for development)
    "polygon-mumbai": {
        "name": "Polygon Mumbai Testnet",
        "chain_id": 80001,
        "rpc": "https://rpc-mumbai.maticvigil.com",
        "explorer": "https://mumbai.polygonscan.com",
        "native_token": "MATIC",
        "testnet": True,
        "recommended": True,
    },
    
    "base-sepolia": {
        "name": "Base Sepolia Testnet",
        "chain_id": 84532,
        "rpc": "https://sepolia.base.org",
        "explorer": "https://sepolia.basescan.org",
        "native_token": "ETH",
        "testnet": True,
        "recommended": True,
    },
}

# Default chain selection logic
def get_recommended_chain(region=None, use_testnet=False):
    """
    Get recommended chain based on user preferences
    
    Args:
        region: User's region (for latency optimization)
        use_testnet: Whether to use testnet for development
    
    Returns:
        Chain key
    """
    if use_testnet:
        return "polygon-mumbai"
    
    # Regional optimization (optional)
    if region == "asia":
        return "bsc"  # Better latency in Asia
    elif region == "africa":
        return "celo"  # Mobile-friendly, stable
    
    # Default: Polygon for best balance
    return "polygon"


def get_chain_config(chain_key):
    """Get configuration for specific chain"""
    if chain_key not in SUPPORTED_CHAINS:
        raise ValueError(f"Unsupported chain: {chain_key}")
    
    return SUPPORTED_CHAINS[chain_key]


def list_available_chains(include_testnets=False):
    """List all available chains for UI selection"""
    chains = []
    for key, config in SUPPORTED_CHAINS.items():
        is_testnet = config.get("testnet", False)
        
        if not include_testnets and is_testnet:
            continue
        
        chains.append({
            "key": key,
            "name": config["name"],
            "native_token": config["native_token"],
            "gas_price": config.get("avg_gas_price", "medium"),
            "finality": config.get("finality", "unknown"),
            "recommended": config.get("recommended", False),
            "testnet": is_testnet,
        })
    
    return chains

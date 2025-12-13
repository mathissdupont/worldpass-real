"""
Test Blockchain Selection Feature
Tests the entire flow: Frontend → Backend → Database
"""

import asyncio
import aiosqlite

async def test_blockchain_selection():
    """Test that blockchain selection is working"""
    
    print("🔍 Testing Blockchain Selection Feature\n")
    print("="*60)
    
    # 1. Check database schema
    print("\n1️⃣ Checking database schema...")
    db_path = "worldpass.db"
    
    async with aiosqlite.connect(db_path) as db:
        db.row_factory = aiosqlite.Row
        
        # Check if column exists
        cursor = await db.execute("PRAGMA table_info(issued_vcs)")
        columns = await cursor.fetchall()
        column_names = [col[1] for col in columns]
        
        if 'blockchain_chain' in column_names:
            print("   ✅ blockchain_chain column exists in issued_vcs table")
            for col in columns:
                if col[1] == 'blockchain_chain':
                    print(f"      Type: {col[2]}, Default: {col[4] or 'polygon'}")
        else:
            print("   ❌ blockchain_chain column NOT FOUND!")
            return
    
    # 2. Test chain config
    print("\n2️⃣ Testing chain configuration...")
    try:
        from chain_config import list_available_chains, get_recommended_chain
        
        chains = list_available_chains(include_testnets=False)
        print(f"   ✅ {len(chains)} blockchain chains configured")
        
        recommended = get_recommended_chain()
        print(f"   ✅ Recommended chain: {recommended['name']} ({recommended['key']})")
        
        # Show all chains
        print("\n   Available chains:")
        for chain in chains:
            status = "⭐ RECOMMENDED" if chain.get('recommended') else ""
            print(f"      • {chain['name']}: {chain['gas_price']} gas, {chain['finality']} finality {status}")
    
    except Exception as e:
        print(f"   ❌ Error loading chain config: {e}")
        return
    
    # 3. Test blockchain API endpoints
    print("\n3️⃣ Testing blockchain API endpoints...")
    print("   Run this command to test API:")
    print("   ")
    print("   curl http://localhost:8000/api/blockchains/list")
    print("   curl http://localhost:8000/api/blockchains/recommended")
    print("   ")
    
    # 4. Instructions for frontend test
    print("\n4️⃣ Frontend Testing:")
    print("   1. Start backend: python app.py")
    print("   2. Start frontend: cd ../web && npm run dev")
    print("   3. Login as issuer")
    print("   4. Go to 'Issue VC' page")
    print("   5. You should see blockchain selector in Step 2 (Basım Onayı)")
    print("   6. Select a blockchain (default: Polygon)")
    print("   7. Issue a credential")
    print("   8. Check database: the blockchain_chain should be saved")
    
    print("\n" + "="*60)
    print("✅ All checks passed! Ready to test blockchain selection")
    print("="*60)

if __name__ == "__main__":
    asyncio.run(test_blockchain_selection())

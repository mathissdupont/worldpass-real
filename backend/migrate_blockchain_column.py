"""
Database Migration: Add blockchain_chain column to issued_vcs table
"""

import asyncio
import aiosqlite

async def migrate():
    """Add blockchain_chain column to issued_vcs table"""
    
    db_path = "worldpass.db"
    
    async with aiosqlite.connect(db_path) as db:
        db.row_factory = aiosqlite.Row
        
        # Check if column already exists
        cursor = await db.execute("PRAGMA table_info(issued_vcs)")
        columns = await cursor.fetchall()
        column_names = [col[1] for col in columns]
        
        if 'blockchain_chain' in column_names:
            print("✅ blockchain_chain column already exists")
            return
        
        # Add the column
        print("Adding blockchain_chain column to issued_vcs...")
        await db.execute(
            "ALTER TABLE issued_vcs ADD COLUMN blockchain_chain TEXT DEFAULT 'polygon'"
        )
        await db.commit()
        
        # Verify
        cursor = await db.execute("PRAGMA table_info(issued_vcs)")
        columns = await cursor.fetchall()
        column_names = [col[1] for col in columns]
        
        if 'blockchain_chain' in column_names:
            print("✅ Migration successful! blockchain_chain column added")
            
            # Show column info
            for col in columns:
                if col[1] == 'blockchain_chain':
                    print(f"   Column: {col[1]}, Type: {col[2]}, Default: {col[4]}")
        else:
            print("❌ Migration failed!")

if __name__ == "__main__":
    asyncio.run(migrate())

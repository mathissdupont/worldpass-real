import sqlite3

db = sqlite3.connect('worldpass.db')
cursor = db.cursor()

try:
    cursor.execute("ALTER TABLE issued_vcs ADD COLUMN blockchain_chain TEXT DEFAULT 'polygon'")
    db.commit()
    print("✅ Column added successfully!")
except sqlite3.OperationalError as e:
    if "duplicate column name" in str(e):
        print("✅ Column already exists!")
    else:
        print(f"❌ Error: {e}")

db.close()

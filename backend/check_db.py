#!/usr/bin/env python3
import sqlite3

conn = sqlite3.connect('worldpass.db')
cursor = conn.cursor()
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = cursor.fetchall()
print('Database tables:')
for table in tables:
    print(f'  {table[0]}')
conn.close()


from sqlalchemy import text
from database import engine

with engine.connect() as connection:

    # Insert a test security event
    connection.execute(text("""
        INSERT INTO security_events
        (identity, event_type, source_ip, description, severity)
        VALUES
        ('test-integration', 'LOGIN_TEST', '127.0.0.1',
         'Testing SENTINEL database integration', 'low')
    """))

    connection.commit()

    # Read the inserted event
    result = connection.execute(text("""
        SELECT id, identity, event_type, severity
        FROM security_events
        ORDER BY id DESC
        LIMIT 1
    """))

    for row in result:
        print(row)

print("Database read/write test successful!")

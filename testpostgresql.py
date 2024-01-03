import psycopg2

try:
    # Connect to PostgreSQL
    conn = psycopg2.connect(
        host="localhost",
        port=5432,
        user="possparse",  # Replace with your PostgreSQL username
        password="sspec",  # Replace with your PostgreSQL password
        database="speculate",
    )

    print("Connected to the database!")

except psycopg2.Error as e:
    print(f"Unable to connect to the database. Error: {e}")

finally:
    # Close the connection
    if conn:
        conn.close()

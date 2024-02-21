# test_create_cos.py  
from app import app, cos_store  # Import the Flask app instance and cos_store  
from speculate import create_cos  
  
def test_create_cos():  
    # Set up the application context  
    with app.app_context():  
        # Define your test data  
        ssol_id = 1  
        content = "Test COS content"  
        status = "Proposed"  
        accountable_party = "Test User"  
        completion_date = "2023-04-01"  # Example date in YYYY-MM-DD format  
          
        # Call create_cos with the test data  
        cos_id = create_cos(ssol_id, content, status, accountable_party, completion_date)  
          
        # Print the result  
        print(f"Created COS with ID: {cos_id}")  
          
        # Optionally, print the cos_store contents to verify  
        print(cos_store)  
  
if __name__ == "__main__":  
    test_create_cos()  

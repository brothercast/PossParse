import unittest  
from app import app, db  
from models import SSOL, COS, CE  
from flask import json  
  
class SSPECTests(unittest.TestCase):  
  
    def setUp(self):  
        self.app = app.test_client()  
        self.app.testing = True  
  
    def test_create_ssol(self):  
        response = self.app.post('/create_ssol', data=json.dumps({  
            'title': 'Test SSOL',  
            'description': 'This is a test SSOL.'  
        }), content_type='application/json')  
        self.assertEqual(response.status_code, 200)  
        data = json.loads(response.data.decode())  
        self.assertIn('ssol_id', data)  
  
    def test_get_ssol(self):  
        ssol = SSOL(title='Test SSOL', description='This is a test SSOL.')  
        db.session.add(ssol)  
        db.session.commit()  
        response = self.app.get(f'/get_ssol_by_id/{ssol.id}')  
        self.assertEqual(response.status_code, 200)  
        data = json.loads(response.data.decode())  
        self.assertEqual(data['ssol']['title'], 'Test SSOL')  
  
    def test_update_ssol(self):  
        ssol = SSOL(title='Test SSOL', description='This is a test SSOL.')  
        db.session.add(ssol)  
        db.session.commit()  
        response = self.app.put(f'/update_ssol/{ssol.id}', data=json.dumps({  
            'title': 'Updated SSOL',  
            'description': 'This is an updated test SSOL.'  
        }), content_type='application/json')  
        self.assertEqual(response.status_code, 200)  
        data = json.loads(response.data.decode())  
        self.assertEqual(data['ssol']['title'], 'Updated SSOL')  
  
    def tearDown(self):  
        db.session.remove()  
        db.drop_all()  
  
if __name__ == '__main__':  
    unittest.main()  

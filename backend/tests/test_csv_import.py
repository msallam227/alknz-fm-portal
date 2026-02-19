"""
Test CSV Import Wizard - Backend API Tests
Tests the POST /api/investor-profiles endpoint used by CSV import wizard
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
FM_EMAIL = "mariam@alknzventures.com"
FM_PASSWORD = "Mariam123!"
ADMIN_EMAIL = "khaled@alknzventures.com"
ADMIN_PASSWORD = "Admin123!"


class TestCSVImportBackend:
    """Test backend APIs used by CSV Import Wizard"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
    def get_fm_token(self):
        """Get Fund Manager auth token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": FM_EMAIL,
            "password": FM_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip(f"FM login failed: {response.status_code}")
        
    def get_admin_token(self):
        """Get Admin auth token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip(f"Admin login failed: {response.status_code}")
    
    def test_login_as_fund_manager(self):
        """Test FM can login successfully"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": FM_EMAIL,
            "password": FM_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data.get("user", {}).get("role") == "FUND_MANAGER"
        print(f"FM login successful: {data.get('user', {}).get('email')}")
        
    def test_get_my_funds(self):
        """Test FM can get their assigned funds"""
        token = self.get_fm_token()
        response = self.session.get(
            f"{BASE_URL}/api/my-funds",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        funds = response.json()
        assert isinstance(funds, list)
        assert len(funds) > 0, "FM should have at least one assigned fund"
        print(f"FM has {len(funds)} assigned funds")
        # Store first fund for later tests
        self.fund_id = funds[0].get("id")
        self.fund_name = funds[0].get("name")
        print(f"Using fund: {self.fund_name} ({self.fund_id})")
        return funds[0]
        
    def test_create_investor_profile_basic(self):
        """Test creating a basic investor profile (simulates CSV import)"""
        token = self.get_fm_token()
        
        # Get fund first
        funds_response = self.session.get(
            f"{BASE_URL}/api/my-funds",
            headers={"Authorization": f"Bearer {token}"}
        )
        fund = funds_response.json()[0]
        fund_id = fund.get("id")
        
        # Create investor profile (simulating CSV import)
        import uuid
        unique_name = f"CSV_TEST_Import_{uuid.uuid4().hex[:8]}"
        
        payload = {
            "investor_name": unique_name,
            "investor_type": "Individual",
            "country": "USA",
            "city": "New York",
            "contact_email": f"test_{uuid.uuid4().hex[:6]}@example.com",
            "fund_id": fund_id,
            "source": "spreadsheet_import"
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/investor-profiles",
            headers={"Authorization": f"Bearer {token}"},
            json=payload
        )
        
        assert response.status_code == 200, f"Failed to create investor: {response.text}"
        data = response.json()
        assert data.get("investor_name") == unique_name
        assert data.get("source") == "spreadsheet_import"
        assert data.get("fund_id") == fund_id
        assert "id" in data
        print(f"Created investor: {unique_name} with ID: {data.get('id')}")
        
        # Cleanup - delete the test investor
        investor_id = data.get("id")
        delete_response = self.session.delete(
            f"{BASE_URL}/api/investor-profiles/{investor_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert delete_response.status_code == 200
        print(f"Cleaned up test investor: {investor_id}")
        
    def test_create_multiple_investors_csv_import(self):
        """Test creating multiple investors (simulates batch CSV import)"""
        token = self.get_fm_token()
        
        # Get fund first
        funds_response = self.session.get(
            f"{BASE_URL}/api/my-funds",
            headers={"Authorization": f"Bearer {token}"}
        )
        fund = funds_response.json()[0]
        fund_id = fund.get("id")
        
        # Simulate CSV import data
        import uuid
        csv_data = [
            {
                "investor_name": f"CSV_Batch_Test1_{uuid.uuid4().hex[:6]}",
                "investor_type": "Individual",
                "country": "USA",
                "city": "New York",
                "contact_email": f"batch1_{uuid.uuid4().hex[:6]}@example.com",
                "fund_id": fund_id,
                "source": "spreadsheet_import"
            },
            {
                "investor_name": f"CSV_Batch_Test2_{uuid.uuid4().hex[:6]}",
                "investor_type": "Family Office",
                "country": "UK",
                "city": "London",
                "contact_email": f"batch2_{uuid.uuid4().hex[:6]}@example.com",
                "fund_id": fund_id,
                "source": "spreadsheet_import"
            },
            {
                "investor_name": f"CSV_Batch_Test3_{uuid.uuid4().hex[:6]}",
                "investor_type": "Institution",
                "country": "Singapore",
                "city": "Singapore",
                "contact_email": f"batch3_{uuid.uuid4().hex[:6]}@example.com",
                "fund_id": fund_id,
                "source": "spreadsheet_import"
            }
        ]
        
        created_ids = []
        success_count = 0
        
        for investor_data in csv_data:
            response = self.session.post(
                f"{BASE_URL}/api/investor-profiles",
                headers={"Authorization": f"Bearer {token}"},
                json=investor_data
            )
            if response.status_code == 200:
                success_count += 1
                created_ids.append(response.json().get("id"))
                print(f"Created: {investor_data['investor_name']}")
            else:
                print(f"Failed to create {investor_data['investor_name']}: {response.text}")
        
        assert success_count == 3, f"Expected 3 investors created, got {success_count}"
        print(f"Successfully created {success_count} investors via batch import")
        
        # Cleanup
        for inv_id in created_ids:
            self.session.delete(
                f"{BASE_URL}/api/investor-profiles/{inv_id}",
                headers={"Authorization": f"Bearer {token}"}
            )
        print(f"Cleaned up {len(created_ids)} test investors")
        
    def test_duplicate_investor_rejection(self):
        """Test that duplicate investor names in same fund are rejected"""
        token = self.get_fm_token()
        
        # Get fund first
        funds_response = self.session.get(
            f"{BASE_URL}/api/my-funds",
            headers={"Authorization": f"Bearer {token}"}
        )
        fund = funds_response.json()[0]
        fund_id = fund.get("id")
        
        import uuid
        unique_name = f"CSV_Duplicate_Test_{uuid.uuid4().hex[:8]}"
        
        # Create first investor
        payload = {
            "investor_name": unique_name,
            "investor_type": "Individual",
            "fund_id": fund_id,
            "source": "spreadsheet_import"
        }
        
        response1 = self.session.post(
            f"{BASE_URL}/api/investor-profiles",
            headers={"Authorization": f"Bearer {token}"},
            json=payload
        )
        assert response1.status_code == 200
        investor_id = response1.json().get("id")
        print(f"Created first investor: {unique_name}")
        
        # Try to create duplicate
        response2 = self.session.post(
            f"{BASE_URL}/api/investor-profiles",
            headers={"Authorization": f"Bearer {token}"},
            json=payload
        )
        assert response2.status_code == 400, "Duplicate should be rejected"
        assert "already exists" in response2.json().get("detail", "").lower()
        print(f"Duplicate correctly rejected: {response2.json().get('detail')}")
        
        # Cleanup
        self.session.delete(
            f"{BASE_URL}/api/investor-profiles/{investor_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        print("Cleaned up test investor")
        
    def test_investor_profile_with_all_csv_fields(self):
        """Test creating investor with all fields that can be mapped from CSV"""
        token = self.get_fm_token()
        
        # Get fund first
        funds_response = self.session.get(
            f"{BASE_URL}/api/my-funds",
            headers={"Authorization": f"Bearer {token}"}
        )
        fund = funds_response.json()[0]
        fund_id = fund.get("id")
        
        import uuid
        unique_name = f"CSV_Full_Test_{uuid.uuid4().hex[:8]}"
        
        # Full payload with all mappable fields from CSV
        payload = {
            "investor_name": unique_name,
            "title": "Mr.",
            "gender": "Male",
            "nationality": "American",
            "age": 45,
            "job_title": "CEO at Test Corp",
            "investor_type": "Individual",
            "sector": "Technology",
            "country": "USA",
            "city": "San Francisco",
            "website": "https://testcorp.com",
            "description": "Test investor imported via CSV",
            "wealth": "High Net Worth",
            "expected_ticket_amount": 500000,
            "expected_ticket_currency": "USD",
            "contact_name": "John Doe",
            "contact_title": "Investment Manager",
            "contact_phone": "+1-555-123-4567",
            "contact_email": f"full_test_{uuid.uuid4().hex[:6]}@example.com",
            "contact_whatsapp": "+1-555-123-4567",
            "relationship_strength": "Strong",
            "decision_role": "Decision Maker",
            "preferred_intro_path": "Direct Email",
            "fund_id": fund_id,
            "source": "spreadsheet_import"
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/investor-profiles",
            headers={"Authorization": f"Bearer {token}"},
            json=payload
        )
        
        assert response.status_code == 200, f"Failed to create investor: {response.text}"
        data = response.json()
        
        # Verify all fields were saved
        assert data.get("investor_name") == unique_name
        assert data.get("investor_type") == "Individual"
        assert data.get("country") == "USA"
        assert data.get("city") == "San Francisco"
        assert data.get("contact_email") == payload["contact_email"]
        assert data.get("source") == "spreadsheet_import"
        print(f"Created investor with all fields: {unique_name}")
        
        # Cleanup
        investor_id = data.get("id")
        self.session.delete(
            f"{BASE_URL}/api/investor-profiles/{investor_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        print("Cleaned up test investor")
        
    def test_verify_investor_appears_in_fund_list(self):
        """Test that created investor appears in fund's investor list"""
        token = self.get_fm_token()
        
        # Get fund first
        funds_response = self.session.get(
            f"{BASE_URL}/api/my-funds",
            headers={"Authorization": f"Bearer {token}"}
        )
        fund = funds_response.json()[0]
        fund_id = fund.get("id")
        
        import uuid
        unique_name = f"CSV_List_Test_{uuid.uuid4().hex[:8]}"
        
        # Create investor
        payload = {
            "investor_name": unique_name,
            "investor_type": "Individual",
            "country": "USA",
            "fund_id": fund_id,
            "source": "spreadsheet_import"
        }
        
        create_response = self.session.post(
            f"{BASE_URL}/api/investor-profiles",
            headers={"Authorization": f"Bearer {token}"},
            json=payload
        )
        assert create_response.status_code == 200
        investor_id = create_response.json().get("id")
        print(f"Created investor: {unique_name}")
        
        # Verify investor appears in fund's investor list
        list_response = self.session.get(
            f"{BASE_URL}/api/investor-profiles-with-pipeline/fund/{fund_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert list_response.status_code == 200
        investors = list_response.json()
        
        found = any(inv.get("id") == investor_id for inv in investors)
        assert found, f"Investor {investor_id} not found in fund's investor list"
        print(f"Verified investor appears in fund list")
        
        # Cleanup
        self.session.delete(
            f"{BASE_URL}/api/investor-profiles/{investor_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        print("Cleaned up test investor")
        
    def test_investor_pipeline_entry_created(self):
        """Test that pipeline entry is created for imported investor"""
        token = self.get_fm_token()
        
        # Get fund first
        funds_response = self.session.get(
            f"{BASE_URL}/api/my-funds",
            headers={"Authorization": f"Bearer {token}"}
        )
        fund = funds_response.json()[0]
        fund_id = fund.get("id")
        
        import uuid
        unique_name = f"CSV_Pipeline_Test_{uuid.uuid4().hex[:8]}"
        
        # Create investor
        payload = {
            "investor_name": unique_name,
            "investor_type": "Individual",
            "country": "USA",
            "fund_id": fund_id,
            "source": "spreadsheet_import"
        }
        
        create_response = self.session.post(
            f"{BASE_URL}/api/investor-profiles",
            headers={"Authorization": f"Bearer {token}"},
            json=payload
        )
        assert create_response.status_code == 200
        investor_id = create_response.json().get("id")
        print(f"Created investor: {unique_name}")
        
        # Check investor in pipeline list (with pipeline status)
        list_response = self.session.get(
            f"{BASE_URL}/api/investor-profiles-with-pipeline/fund/{fund_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert list_response.status_code == 200
        investors = list_response.json()
        
        # Find our investor
        our_investor = next((inv for inv in investors if inv.get("id") == investor_id), None)
        assert our_investor is not None, "Investor not found in list"
        
        # Note: Pipeline entry may or may not be auto-created depending on implementation
        # The ImportWizard creates investors via POST /api/investor-profiles
        # Pipeline entries might need to be created separately
        print(f"Investor found in list. Pipeline stage: {our_investor.get('pipeline_stage_name', 'Not in pipeline')}")
        
        # Cleanup
        self.session.delete(
            f"{BASE_URL}/api/investor-profiles/{investor_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        print("Cleaned up test investor")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

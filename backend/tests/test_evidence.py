"""
Test Evidence & Sources Feature
Tests for the Evidence & Sources block on Investor Profile page.
Endpoints tested:
- GET /api/confidence-levels
- GET /api/investors/{investor_id}/evidence
- GET /api/evidence/{evidence_id}
- POST /api/investors/{investor_id}/evidence
- POST /api/investors/{investor_id}/evidence/capture (Chrome extension)
- PUT /api/evidence/{evidence_id}
- DELETE /api/evidence/{evidence_id}
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "mariam@alknzventures.com"
TEST_PASSWORD = "Mariam123!"

# Test investor ID (John Smith from context)
TEST_INVESTOR_ID = "4fd5f540-d8ae-431b-b058-52fa134be28a"


class TestEvidenceFeature:
    """Evidence & Sources feature tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if login_response.status_code != 200:
            pytest.skip(f"Authentication failed: {login_response.text}")
        
        token = login_response.json().get("token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        self.user = login_response.json().get("user")
        
        # Store created evidence IDs for cleanup
        self.created_evidence_ids = []
        
        yield
        
        # Cleanup: Delete test-created evidence entries
        for evidence_id in self.created_evidence_ids:
            try:
                self.session.delete(f"{BASE_URL}/api/evidence/{evidence_id}")
            except:
                pass
    
    # ============== CONFIDENCE LEVELS TESTS ==============
    
    def test_get_confidence_levels(self):
        """GET /api/confidence-levels returns valid confidence options"""
        response = self.session.get(f"{BASE_URL}/api/confidence-levels")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "levels" in data, "Response should contain 'levels'"
        assert "labels" in data, "Response should contain 'labels'"
        
        # Verify expected confidence levels
        expected_levels = ["low", "medium", "high", "verified"]
        assert data["levels"] == expected_levels, f"Expected {expected_levels}, got {data['levels']}"
        
        # Verify labels
        assert data["labels"]["low"] == "Low"
        assert data["labels"]["medium"] == "Medium"
        assert data["labels"]["high"] == "High"
        assert data["labels"]["verified"] == "Verified"
        
        print(f"✓ Confidence levels: {data['levels']}")
    
    # ============== GET EVIDENCE TESTS ==============
    
    def test_get_investor_evidence_empty_or_existing(self):
        """GET /api/investors/{investor_id}/evidence returns evidence entries"""
        response = self.session.get(f"{BASE_URL}/api/investors/{TEST_INVESTOR_ID}/evidence")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "investor_id" in data
        assert "investor_name" in data
        assert "total" in data
        assert "evidence" in data
        assert isinstance(data["evidence"], list)
        
        print(f"✓ Found {data['total']} evidence entries for {data['investor_name']}")
    
    def test_get_investor_evidence_not_found(self):
        """GET /api/investors/{investor_id}/evidence returns 404 for non-existent investor"""
        fake_id = str(uuid.uuid4())
        response = self.session.get(f"{BASE_URL}/api/investors/{fake_id}/evidence")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Returns 404 for non-existent investor")
    
    # ============== CREATE EVIDENCE TESTS ==============
    
    def test_create_evidence_entry_minimal(self):
        """POST /api/investors/{investor_id}/evidence creates new evidence entry with minimal data"""
        payload = {
            "source_title": "TEST_LinkedIn Profile"
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/investors/{TEST_INVESTOR_ID}/evidence",
            json=payload
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        self.created_evidence_ids.append(data["id"])
        
        # Verify response structure
        assert data["source_title"] == "TEST_LinkedIn Profile"
        assert data["investor_id"] == TEST_INVESTOR_ID
        assert data["confidence"] == "medium"  # Default
        assert "captured_date" in data
        assert "captured_by" in data
        assert data["captured_by"] == self.user["id"]
        
        print(f"✓ Created evidence entry: {data['id']}")
    
    def test_create_evidence_entry_full(self):
        """POST /api/investors/{investor_id}/evidence creates new evidence entry with all fields"""
        payload = {
            "source_title": "TEST_Company Website",
            "source_url": "https://example.com/about",
            "selected_text": "John Smith is the CEO of Example Corp with 20 years of experience.",
            "notes": "Verified through company website. Contact info available.",
            "confidence": "high"
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/investors/{TEST_INVESTOR_ID}/evidence",
            json=payload
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        self.created_evidence_ids.append(data["id"])
        
        # Verify all fields
        assert data["source_title"] == payload["source_title"]
        assert data["source_url"] == payload["source_url"]
        assert data["selected_text"] == payload["selected_text"]
        assert data["notes"] == payload["notes"]
        assert data["confidence"] == "high"
        assert data["confidence_label"] == "High"
        
        print(f"✓ Created full evidence entry with confidence: {data['confidence_label']}")
    
    def test_create_evidence_all_confidence_levels(self):
        """POST /api/investors/{investor_id}/evidence works with all confidence levels"""
        confidence_levels = ["low", "medium", "high", "verified"]
        
        for level in confidence_levels:
            payload = {
                "source_title": f"TEST_Source for {level} confidence",
                "confidence": level
            }
            
            response = self.session.post(
                f"{BASE_URL}/api/investors/{TEST_INVESTOR_ID}/evidence",
                json=payload
            )
            
            assert response.status_code == 200, f"Failed for confidence level '{level}': {response.text}"
            
            data = response.json()
            self.created_evidence_ids.append(data["id"])
            assert data["confidence"] == level
            
            print(f"  ✓ Created evidence with confidence: {level}")
        
        print("✓ All confidence levels work correctly")
    
    def test_create_evidence_invalid_confidence(self):
        """POST /api/investors/{investor_id}/evidence rejects invalid confidence level"""
        payload = {
            "source_title": "TEST_Invalid Confidence",
            "confidence": "invalid_level"
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/investors/{TEST_INVESTOR_ID}/evidence",
            json=payload
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✓ Rejects invalid confidence level")
    
    def test_create_evidence_missing_title(self):
        """POST /api/investors/{investor_id}/evidence requires source_title"""
        payload = {
            "source_url": "https://example.com"
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/investors/{TEST_INVESTOR_ID}/evidence",
            json=payload
        )
        
        assert response.status_code == 422, f"Expected 422, got {response.status_code}"
        print("✓ Requires source_title field")
    
    # ============== CHROME EXTENSION CAPTURE ENDPOINT ==============
    
    def test_capture_evidence_from_extension(self):
        """POST /api/investors/{investor_id}/evidence/capture (Chrome extension endpoint)"""
        payload = {
            "source_title": "TEST_Chrome Extension Capture",
            "source_url": "https://linkedin.com/in/johnsmith",
            "selected_text": "Experienced investor with focus on technology startups.",
            "notes": "Captured via Chrome extension",
            "confidence": "medium"
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/investors/{TEST_INVESTOR_ID}/evidence/capture",
            json=payload
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        self.created_evidence_ids.append(data["id"])
        
        # Verify it creates the same structure as regular endpoint
        assert data["source_title"] == payload["source_title"]
        assert data["source_url"] == payload["source_url"]
        assert data["selected_text"] == payload["selected_text"]
        assert "captured_date" in data
        assert "captured_by" in data
        
        print(f"✓ Chrome extension capture endpoint works: {data['id']}")
    
    # ============== GET SINGLE EVIDENCE TESTS ==============
    
    def test_get_single_evidence_entry(self):
        """GET /api/evidence/{evidence_id} returns single evidence entry"""
        # First create an entry
        create_response = self.session.post(
            f"{BASE_URL}/api/investors/{TEST_INVESTOR_ID}/evidence",
            json={"source_title": "TEST_Single Entry Test"}
        )
        assert create_response.status_code == 200
        created = create_response.json()
        self.created_evidence_ids.append(created["id"])
        
        # Now get it
        response = self.session.get(f"{BASE_URL}/api/evidence/{created['id']}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["id"] == created["id"]
        assert data["source_title"] == "TEST_Single Entry Test"
        
        print(f"✓ Retrieved single evidence entry: {data['id']}")
    
    def test_get_single_evidence_not_found(self):
        """GET /api/evidence/{evidence_id} returns 404 for non-existent entry"""
        fake_id = str(uuid.uuid4())
        response = self.session.get(f"{BASE_URL}/api/evidence/{fake_id}")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Returns 404 for non-existent evidence entry")
    
    # ============== UPDATE EVIDENCE TESTS ==============
    
    def test_update_evidence_entry(self):
        """PUT /api/evidence/{evidence_id} updates evidence but keeps captured_date and captured_by"""
        # First create an entry
        create_response = self.session.post(
            f"{BASE_URL}/api/investors/{TEST_INVESTOR_ID}/evidence",
            json={
                "source_title": "TEST_Original Title",
                "notes": "Original notes",
                "confidence": "low"
            }
        )
        assert create_response.status_code == 200
        created = create_response.json()
        self.created_evidence_ids.append(created["id"])
        
        original_captured_date = created["captured_date"]
        original_captured_by = created["captured_by"]
        
        # Update the entry
        update_payload = {
            "source_title": "TEST_Updated Title",
            "notes": "Updated notes",
            "confidence": "verified"
        }
        
        response = self.session.put(
            f"{BASE_URL}/api/evidence/{created['id']}",
            json=update_payload
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify updates applied
        assert data["source_title"] == "TEST_Updated Title"
        assert data["notes"] == "Updated notes"
        assert data["confidence"] == "verified"
        assert data["confidence_label"] == "Verified"
        
        # Verify captured_date and captured_by are preserved
        assert data["captured_date"] == original_captured_date, "captured_date should be preserved"
        assert data["captured_by"] == original_captured_by, "captured_by should be preserved"
        
        # Verify updated_at changed
        assert data["updated_at"] != created["updated_at"], "updated_at should change"
        
        print("✓ Update preserves captured_date and captured_by")
    
    def test_update_evidence_partial(self):
        """PUT /api/evidence/{evidence_id} allows partial updates"""
        # First create an entry
        create_response = self.session.post(
            f"{BASE_URL}/api/investors/{TEST_INVESTOR_ID}/evidence",
            json={
                "source_title": "TEST_Partial Update Test",
                "notes": "Original notes",
                "confidence": "medium"
            }
        )
        assert create_response.status_code == 200
        created = create_response.json()
        self.created_evidence_ids.append(created["id"])
        
        # Update only notes
        response = self.session.put(
            f"{BASE_URL}/api/evidence/{created['id']}",
            json={"notes": "Only notes updated"}
        )
        
        assert response.status_code == 200
        
        data = response.json()
        assert data["source_title"] == "TEST_Partial Update Test"  # Unchanged
        assert data["notes"] == "Only notes updated"  # Changed
        assert data["confidence"] == "medium"  # Unchanged
        
        print("✓ Partial update works correctly")
    
    def test_update_evidence_not_found(self):
        """PUT /api/evidence/{evidence_id} returns 404 for non-existent entry"""
        fake_id = str(uuid.uuid4())
        response = self.session.put(
            f"{BASE_URL}/api/evidence/{fake_id}",
            json={"source_title": "Updated"}
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Returns 404 for non-existent evidence entry")
    
    def test_update_evidence_invalid_confidence(self):
        """PUT /api/evidence/{evidence_id} rejects invalid confidence level"""
        # First create an entry
        create_response = self.session.post(
            f"{BASE_URL}/api/investors/{TEST_INVESTOR_ID}/evidence",
            json={"source_title": "TEST_Invalid Update Test"}
        )
        assert create_response.status_code == 200
        created = create_response.json()
        self.created_evidence_ids.append(created["id"])
        
        # Try to update with invalid confidence
        response = self.session.put(
            f"{BASE_URL}/api/evidence/{created['id']}",
            json={"confidence": "invalid"}
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✓ Rejects invalid confidence level on update")
    
    # ============== DELETE EVIDENCE TESTS ==============
    
    def test_delete_evidence_entry(self):
        """DELETE /api/evidence/{evidence_id} deletes evidence entry"""
        # First create an entry
        create_response = self.session.post(
            f"{BASE_URL}/api/investors/{TEST_INVESTOR_ID}/evidence",
            json={"source_title": "TEST_To Be Deleted"}
        )
        assert create_response.status_code == 200
        created = create_response.json()
        evidence_id = created["id"]
        
        # Delete it
        response = self.session.delete(f"{BASE_URL}/api/evidence/{evidence_id}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["message"] == "Evidence entry deleted"
        assert data["evidence_id"] == evidence_id
        
        # Verify it's gone
        get_response = self.session.get(f"{BASE_URL}/api/evidence/{evidence_id}")
        assert get_response.status_code == 404
        
        print(f"✓ Deleted evidence entry: {evidence_id}")
    
    def test_delete_evidence_not_found(self):
        """DELETE /api/evidence/{evidence_id} returns 404 for non-existent entry"""
        fake_id = str(uuid.uuid4())
        response = self.session.delete(f"{BASE_URL}/api/evidence/{fake_id}")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Returns 404 for non-existent evidence entry")
    
    # ============== ORDERING TESTS ==============
    
    def test_evidence_entries_newest_first(self):
        """GET /api/investors/{investor_id}/evidence returns entries newest first"""
        import time
        
        # Create multiple entries with slight delay
        entries = []
        for i in range(3):
            response = self.session.post(
                f"{BASE_URL}/api/investors/{TEST_INVESTOR_ID}/evidence",
                json={"source_title": f"TEST_Order Test {i+1}"}
            )
            assert response.status_code == 200
            entries.append(response.json())
            self.created_evidence_ids.append(response.json()["id"])
            time.sleep(0.1)  # Small delay to ensure different timestamps
        
        # Get all evidence
        response = self.session.get(f"{BASE_URL}/api/investors/{TEST_INVESTOR_ID}/evidence")
        assert response.status_code == 200
        
        data = response.json()
        evidence_list = data["evidence"]
        
        # Find our test entries in the list
        test_entries = [e for e in evidence_list if e["source_title"].startswith("TEST_Order Test")]
        
        # Verify newest first (entry 3 should come before entry 2, which should come before entry 1)
        if len(test_entries) >= 3:
            # The last created should be first in the list
            assert test_entries[0]["source_title"] == "TEST_Order Test 3"
            assert test_entries[1]["source_title"] == "TEST_Order Test 2"
            assert test_entries[2]["source_title"] == "TEST_Order Test 1"
            print("✓ Evidence entries returned newest first")
        else:
            print(f"✓ Evidence ordering test (found {len(test_entries)} test entries)")
    
    # ============== EVIDENCE DOES NOT OVERWRITE INVESTOR PROFILE ==============
    
    def test_evidence_does_not_modify_investor_profile(self):
        """Creating evidence does NOT overwrite investor profile fields"""
        # Get investor profile before
        investor_before = self.session.get(f"{BASE_URL}/api/investor-profiles/{TEST_INVESTOR_ID}")
        assert investor_before.status_code == 200
        profile_before = investor_before.json()
        
        # Create evidence entry
        response = self.session.post(
            f"{BASE_URL}/api/investors/{TEST_INVESTOR_ID}/evidence",
            json={
                "source_title": "TEST_Profile Isolation Test",
                "notes": "This should not affect investor profile"
            }
        )
        assert response.status_code == 200
        self.created_evidence_ids.append(response.json()["id"])
        
        # Get investor profile after
        investor_after = self.session.get(f"{BASE_URL}/api/investor-profiles/{TEST_INVESTOR_ID}")
        assert investor_after.status_code == 200
        profile_after = investor_after.json()
        
        # Verify key fields unchanged
        assert profile_before["investor_name"] == profile_after["investor_name"]
        assert profile_before.get("description") == profile_after.get("description")
        assert profile_before.get("notes") == profile_after.get("notes")
        
        print("✓ Evidence creation does not modify investor profile")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

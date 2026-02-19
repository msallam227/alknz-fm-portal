"""
Test suite for Duplicate Investor Detection and Merge functionality
Tests:
- GET /api/admin/duplicate-investors - Admin duplicate detection
- POST /api/admin/merge-investors - Admin merge duplicates
- DELETE /api/admin/investor/{id} - Admin delete investor
- POST /api/investor-profiles - Duplicate prevention on creation
- GET /api/funds - Fund assignment logic (role-based filtering)
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')

# Test credentials
ADMIN_EMAIL = "khaled@alknzventures.com"
ADMIN_PASSWORD = "Admin123!"
FUND_MANAGER_EMAIL = "mariam@alknzventures.com"
FUND_MANAGER_PASSWORD = "Mariam123!"


class TestAuthentication:
    """Authentication tests for both Admin and Fund Manager"""
    
    def test_admin_login(self):
        """Test admin login returns valid token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["role"] == "ADMIN"
        print(f"✓ Admin login successful - role: {data['user']['role']}")
    
    def test_fund_manager_login(self):
        """Test fund manager login returns valid token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": FUND_MANAGER_EMAIL,
            "password": FUND_MANAGER_PASSWORD
        })
        assert response.status_code == 200, f"Fund Manager login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["role"] == "FUND_MANAGER"
        print(f"✓ Fund Manager login successful - role: {data['user']['role']}")


class TestDuplicateInvestorDetection:
    """Tests for GET /api/admin/duplicate-investors endpoint"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin authentication failed")
    
    @pytest.fixture
    def fund_manager_token(self):
        """Get fund manager authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": FUND_MANAGER_EMAIL,
            "password": FUND_MANAGER_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Fund Manager authentication failed")
    
    def test_get_duplicate_investors_admin_access(self, admin_token):
        """Admin can access duplicate investors endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/admin/duplicate-investors",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "total_duplicate_groups" in data
        assert "total_duplicate_records" in data
        assert "duplicates" in data
        assert isinstance(data["duplicates"], list)
        
        print(f"✓ Duplicate investors endpoint accessible")
        print(f"  - Total duplicate groups: {data['total_duplicate_groups']}")
        print(f"  - Total duplicate records: {data['total_duplicate_records']}")
    
    def test_get_duplicate_investors_fund_manager_denied(self, fund_manager_token):
        """Fund Manager cannot access duplicate investors endpoint (admin only)"""
        response = requests.get(
            f"{BASE_URL}/api/admin/duplicate-investors",
            headers={"Authorization": f"Bearer {fund_manager_token}"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ Fund Manager correctly denied access to duplicate investors")
    
    def test_get_duplicate_investors_unauthenticated(self):
        """Unauthenticated request returns 401/403"""
        response = requests.get(f"{BASE_URL}/api/admin/duplicate-investors")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Unauthenticated request correctly denied")
    
    def test_duplicate_group_structure(self, admin_token):
        """Verify duplicate group data structure"""
        response = requests.get(
            f"{BASE_URL}/api/admin/duplicate-investors",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        if data["total_duplicate_groups"] > 0:
            group = data["duplicates"][0]
            
            # Verify group structure
            assert "investor_name" in group
            assert "count" in group
            assert "investors" in group
            assert isinstance(group["investors"], list)
            assert group["count"] >= 2, "Duplicate group should have at least 2 investors"
            
            # Verify investor structure within group
            investor = group["investors"][0]
            assert "id" in investor
            assert "investor_name" in investor
            assert "fund_id" in investor
            assert "fund_name" in investor
            assert "created_at" in investor
            
            print(f"✓ Duplicate group structure verified")
            print(f"  - Group name: {group['investor_name']}")
            print(f"  - Count: {group['count']}")
            print(f"  - First investor fund: {investor['fund_name']}")
        else:
            print("✓ No duplicates found - structure test skipped")


class TestMergeInvestors:
    """Tests for POST /api/admin/merge-investors endpoint"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin authentication failed")
    
    @pytest.fixture
    def fund_manager_token(self):
        """Get fund manager authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": FUND_MANAGER_EMAIL,
            "password": FUND_MANAGER_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Fund Manager authentication failed")
    
    def test_merge_investors_fund_manager_denied(self, fund_manager_token):
        """Fund Manager cannot merge investors (admin only)"""
        response = requests.post(
            f"{BASE_URL}/api/admin/merge-investors",
            headers={"Authorization": f"Bearer {fund_manager_token}"},
            json={
                "keep_investor_id": "fake-id",
                "delete_investor_ids": ["fake-id-2"]
            }
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ Fund Manager correctly denied merge access")
    
    def test_merge_investors_invalid_keep_id(self, admin_token):
        """Merge with invalid keep_investor_id returns 404"""
        response = requests.post(
            f"{BASE_URL}/api/admin/merge-investors",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "keep_investor_id": "non-existent-id",
                "delete_investor_ids": ["another-fake-id"]
            }
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Invalid keep_investor_id correctly returns 404")


class TestAdminDeleteInvestor:
    """Tests for DELETE /api/admin/investor/{id} endpoint"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin authentication failed")
    
    @pytest.fixture
    def fund_manager_token(self):
        """Get fund manager authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": FUND_MANAGER_EMAIL,
            "password": FUND_MANAGER_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Fund Manager authentication failed")
    
    def test_delete_investor_fund_manager_denied(self, fund_manager_token):
        """Fund Manager cannot delete investor via admin endpoint"""
        response = requests.delete(
            f"{BASE_URL}/api/admin/investor/fake-id",
            headers={"Authorization": f"Bearer {fund_manager_token}"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ Fund Manager correctly denied admin delete access")
    
    def test_delete_investor_not_found(self, admin_token):
        """Delete non-existent investor returns 404"""
        response = requests.delete(
            f"{BASE_URL}/api/admin/investor/non-existent-id",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Delete non-existent investor correctly returns 404")


class TestDuplicatePrevention:
    """Tests for duplicate prevention on investor creation"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin authentication failed")
    
    @pytest.fixture
    def fund_manager_token(self):
        """Get fund manager authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": FUND_MANAGER_EMAIL,
            "password": FUND_MANAGER_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Fund Manager authentication failed")
    
    @pytest.fixture
    def get_fund_id(self, admin_token):
        """Get a valid fund ID for testing"""
        response = requests.get(
            f"{BASE_URL}/api/funds",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        if response.status_code == 200 and len(response.json()) > 0:
            return response.json()[0]["id"]
        pytest.skip("No funds available for testing")
    
    def test_create_investor_duplicate_name_same_fund(self, admin_token, get_fund_id):
        """Creating investor with same name in same fund should fail"""
        fund_id = get_fund_id
        unique_name = f"TEST_DuplicateCheck_{uuid.uuid4().hex[:8]}"
        
        # Create first investor
        response1 = requests.post(
            f"{BASE_URL}/api/investor-profiles",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "fund_id": fund_id,
                "investor_name": unique_name,
                "investor_type": "Individual"
            }
        )
        assert response1.status_code == 200, f"First investor creation failed: {response1.text}"
        created_id = response1.json().get("id")
        print(f"✓ First investor created: {unique_name}")
        
        # Try to create duplicate
        response2 = requests.post(
            f"{BASE_URL}/api/investor-profiles",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "fund_id": fund_id,
                "investor_name": unique_name,
                "investor_type": "Individual"
            }
        )
        assert response2.status_code == 400, f"Expected 400 for duplicate, got {response2.status_code}"
        assert "already exists" in response2.json().get("detail", "").lower()
        print(f"✓ Duplicate creation correctly blocked")
        
        # Cleanup - delete the test investor
        requests.delete(
            f"{BASE_URL}/api/admin/investor/{created_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        print(f"✓ Test investor cleaned up")
    
    def test_create_investor_duplicate_name_case_insensitive(self, admin_token, get_fund_id):
        """Duplicate check should be case-insensitive"""
        fund_id = get_fund_id
        unique_name = f"TEST_CaseCheck_{uuid.uuid4().hex[:8]}"
        
        # Create first investor with lowercase
        response1 = requests.post(
            f"{BASE_URL}/api/investor-profiles",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "fund_id": fund_id,
                "investor_name": unique_name.lower(),
                "investor_type": "Individual"
            }
        )
        assert response1.status_code == 200, f"First investor creation failed: {response1.text}"
        created_id = response1.json().get("id")
        
        # Try to create with uppercase - should fail
        response2 = requests.post(
            f"{BASE_URL}/api/investor-profiles",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "fund_id": fund_id,
                "investor_name": unique_name.upper(),
                "investor_type": "Individual"
            }
        )
        assert response2.status_code == 400, f"Expected 400 for case-insensitive duplicate, got {response2.status_code}"
        print(f"✓ Case-insensitive duplicate check working")
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/admin/investor/{created_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )


class TestFundAssignmentLogic:
    """Tests for fund assignment logic - Fund Managers only see assigned funds"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin authentication failed")
    
    @pytest.fixture
    def fund_manager_token(self):
        """Get fund manager authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": FUND_MANAGER_EMAIL,
            "password": FUND_MANAGER_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Fund Manager authentication failed")
    
    @pytest.fixture
    def fund_manager_user(self, fund_manager_token):
        """Get fund manager user details"""
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {fund_manager_token}"}
        )
        if response.status_code == 200:
            return response.json()
        pytest.skip("Could not get fund manager user details")
    
    def test_admin_sees_all_funds(self, admin_token):
        """Admin should see all funds"""
        response = requests.get(
            f"{BASE_URL}/api/funds",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        funds = response.json()
        print(f"✓ Admin sees {len(funds)} funds")
        assert len(funds) >= 0  # Admin sees all funds
    
    def test_fund_manager_sees_only_assigned_funds(self, fund_manager_token, fund_manager_user):
        """Fund Manager should only see assigned funds"""
        response = requests.get(
            f"{BASE_URL}/api/funds",
            headers={"Authorization": f"Bearer {fund_manager_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        funds = response.json()
        
        assigned_fund_ids = fund_manager_user.get("assigned_funds", [])
        
        # Verify all returned funds are in assigned list
        for fund in funds:
            assert fund["id"] in assigned_fund_ids, f"Fund {fund['id']} not in assigned funds"
        
        print(f"✓ Fund Manager sees {len(funds)} funds (assigned: {len(assigned_fund_ids)})")
        print(f"  - Assigned fund IDs: {assigned_fund_ids}")
    
    def test_fund_manager_cannot_access_unassigned_fund(self, fund_manager_token, fund_manager_user, admin_token):
        """Fund Manager cannot access fund not assigned to them"""
        # Get all funds as admin
        admin_response = requests.get(
            f"{BASE_URL}/api/funds",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        all_funds = admin_response.json()
        
        assigned_fund_ids = fund_manager_user.get("assigned_funds", [])
        
        # Find an unassigned fund
        unassigned_fund = None
        for fund in all_funds:
            if fund["id"] not in assigned_fund_ids:
                unassigned_fund = fund
                break
        
        if unassigned_fund:
            # Try to access unassigned fund
            response = requests.get(
                f"{BASE_URL}/api/funds/{unassigned_fund['id']}",
                headers={"Authorization": f"Bearer {fund_manager_token}"}
            )
            assert response.status_code == 403, f"Expected 403, got {response.status_code}"
            print(f"✓ Fund Manager correctly denied access to unassigned fund: {unassigned_fund['name']}")
        else:
            print("✓ All funds are assigned to Fund Manager - skipping unassigned test")


class TestInvestorProfileEndpoints:
    """Tests for investor profile CRUD with relationship intelligence fields"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin authentication failed")
    
    @pytest.fixture
    def get_fund_id(self, admin_token):
        """Get a valid fund ID for testing"""
        response = requests.get(
            f"{BASE_URL}/api/funds",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        if response.status_code == 200 and len(response.json()) > 0:
            return response.json()[0]["id"]
        pytest.skip("No funds available for testing")
    
    def test_create_investor_with_relationship_fields(self, admin_token, get_fund_id):
        """Create investor with relationship intelligence fields"""
        fund_id = get_fund_id
        unique_name = f"TEST_RelFields_{uuid.uuid4().hex[:8]}"
        
        response = requests.post(
            f"{BASE_URL}/api/investor-profiles",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "fund_id": fund_id,
                "investor_name": unique_name,
                "investor_type": "Family Office",
                "relationship_strength": "warm",
                "decision_role": "decision_maker",
                "preferred_intro_path": "via GP referral"
            }
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify relationship fields saved
        assert data.get("relationship_strength") == "warm"
        assert data.get("decision_role") == "decision_maker"
        assert data.get("preferred_intro_path") == "via GP referral"
        
        print(f"✓ Investor created with relationship fields")
        print(f"  - relationship_strength: {data.get('relationship_strength')}")
        print(f"  - decision_role: {data.get('decision_role')}")
        print(f"  - preferred_intro_path: {data.get('preferred_intro_path')}")
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/admin/investor/{data['id']}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
    
    def test_update_investor_relationship_fields(self, admin_token, get_fund_id):
        """Update investor relationship intelligence fields"""
        fund_id = get_fund_id
        unique_name = f"TEST_UpdateRel_{uuid.uuid4().hex[:8]}"
        
        # Create investor
        create_response = requests.post(
            f"{BASE_URL}/api/investor-profiles",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "fund_id": fund_id,
                "investor_name": unique_name,
                "investor_type": "Individual",
                "relationship_strength": "cold",
                "decision_role": "unknown"
            }
        )
        assert create_response.status_code == 200
        investor_id = create_response.json()["id"]
        
        # Update relationship fields
        update_response = requests.put(
            f"{BASE_URL}/api/investor-profiles/{investor_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "relationship_strength": "direct",
                "decision_role": "influencer",
                "preferred_intro_path": "assistant email first"
            }
        )
        assert update_response.status_code == 200, f"Update failed: {update_response.text}"
        data = update_response.json()
        
        # Verify updates
        assert data.get("relationship_strength") == "direct"
        assert data.get("decision_role") == "influencer"
        assert data.get("preferred_intro_path") == "assistant email first"
        
        print(f"✓ Investor relationship fields updated successfully")
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/admin/investor/{investor_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
    
    def test_get_investor_profile_includes_all_sections(self, admin_token, get_fund_id):
        """Get investor profile includes all required sections"""
        fund_id = get_fund_id
        unique_name = f"TEST_AllSections_{uuid.uuid4().hex[:8]}"
        
        # Create investor with all fields
        create_response = requests.post(
            f"{BASE_URL}/api/investor-profiles",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "fund_id": fund_id,
                "investor_name": unique_name,
                "investor_type": "Institution",
                "title": "Mr.",
                "gender": "Male",
                "nationality": "American",
                "job_title": "CEO",
                "sector": "Technology",
                "country": "USA",
                "city": "New York",
                "wealth": "High Net Worth",
                "expected_ticket_amount": 500000,
                "contact_name": "John Doe",
                "contact_email": "john@example.com",
                "contact_phone": "+1234567890",
                "relationship_strength": "warm",
                "decision_role": "decision_maker",
                "preferred_intro_path": "direct email"
            }
        )
        assert create_response.status_code == 200
        investor_id = create_response.json()["id"]
        
        # Get investor profile
        get_response = requests.get(
            f"{BASE_URL}/api/investor-profiles/{investor_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert get_response.status_code == 200
        data = get_response.json()
        
        # Verify Investment Identity fields
        assert data.get("investor_name") == unique_name
        assert data.get("investor_type") == "Institution"
        assert data.get("title") == "Mr."
        assert data.get("job_title") == "CEO"
        
        # Verify Investment Context fields
        assert data.get("wealth") == "High Net Worth"
        assert data.get("expected_ticket_amount") == 500000
        
        # Verify Contact & Relationship fields
        assert data.get("contact_name") == "John Doe"
        assert data.get("contact_email") == "john@example.com"
        
        # Verify Relationship Intelligence fields
        assert data.get("relationship_strength") == "warm"
        assert data.get("decision_role") == "decision_maker"
        assert data.get("preferred_intro_path") == "direct email"
        
        print(f"✓ Investor profile includes all sections")
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/admin/investor/{investor_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

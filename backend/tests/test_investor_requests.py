"""
Test suite for Investor Assignment Requests feature
- FM browses global investors with restricted preview
- FM requests investor assignment to their fund
- Admin approves/denies requests
- On approval, investor is added to fund's pipeline
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "khaled@alknzventures.com"
ADMIN_PASSWORD = "Admin123!"
FM_EMAIL = "mariam@alknzventures.com"
FM_PASSWORD = "Mariam123!"


class TestInvestorRequestsFeature:
    """Test the complete investor requests workflow"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
    def get_admin_token(self):
        """Get admin authentication token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        return response.json()["token"]
    
    def get_fm_token(self):
        """Get fund manager authentication token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": FM_EMAIL,
            "password": FM_PASSWORD
        })
        assert response.status_code == 200, f"FM login failed: {response.text}"
        return response.json()["token"]
    
    # ============== GLOBAL INVESTORS ENDPOINT ==============
    
    def test_global_investors_requires_auth(self):
        """GET /api/global-investors requires authentication"""
        response = self.session.get(f"{BASE_URL}/api/global-investors")
        assert response.status_code == 403 or response.status_code == 401
        print("✓ Global investors endpoint requires authentication")
    
    def test_global_investors_returns_restricted_preview(self):
        """GET /api/global-investors returns restricted preview (no notes/evidence/amounts)"""
        token = self.get_fm_token()
        response = self.session.get(
            f"{BASE_URL}/api/global-investors",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "investors" in data
        assert "total" in data
        assert "filter_options" in data
        
        # Check restricted preview fields
        if len(data["investors"]) > 0:
            investor = data["investors"][0]
            # Should have these fields
            assert "id" in investor
            assert "investor_name" in investor
            assert "investor_type" in investor
            assert "country" in investor or investor.get("country") is None
            assert "city" in investor or investor.get("city") is None
            assert "assigned_funds_count" in investor
            assert "assigned_fund_names" in investor
            
            # Should NOT have sensitive fields (notes, evidence, investment amounts)
            assert "notes" not in investor, "Notes should not be in restricted preview"
            assert "evidence" not in investor, "Evidence should not be in restricted preview"
            assert "investment_size" not in investor, "Investment size should not be in restricted preview"
            assert "expected_ticket_amount" not in investor, "Expected ticket should not be in restricted preview"
            assert "contact_email" not in investor, "Contact email should not be in restricted preview"
            assert "contact_phone" not in investor, "Contact phone should not be in restricted preview"
            
        print(f"✓ Global investors returns restricted preview ({data['total']} investors)")
    
    def test_global_investors_search_filter(self):
        """GET /api/global-investors supports search and filters"""
        token = self.get_fm_token()
        
        # Test search
        response = self.session.get(
            f"{BASE_URL}/api/global-investors?search=John",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        
        # Test type filter
        response = self.session.get(
            f"{BASE_URL}/api/global-investors?investor_type=Individual",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        
        print("✓ Global investors supports search and filters")
    
    # ============== CREATE REQUEST ENDPOINT ==============
    
    def test_create_request_requires_auth(self):
        """POST /api/investor-requests requires authentication"""
        response = self.session.post(f"{BASE_URL}/api/investor-requests", json={
            "investor_id": "test",
            "requested_fund_id": "test"
        })
        assert response.status_code == 403 or response.status_code == 401
        print("✓ Create request endpoint requires authentication")
    
    def test_create_request_validates_investor(self):
        """POST /api/investor-requests validates investor exists"""
        token = self.get_fm_token()
        response = self.session.post(
            f"{BASE_URL}/api/investor-requests",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "investor_id": "nonexistent-investor-id",
                "requested_fund_id": "test-fund"
            }
        )
        assert response.status_code == 404
        print("✓ Create request validates investor exists")
    
    def test_create_request_validates_fund_access(self):
        """POST /api/investor-requests validates FM has access to fund"""
        token = self.get_fm_token()
        
        # First get a valid investor
        investors_response = self.session.get(
            f"{BASE_URL}/api/global-investors",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert investors_response.status_code == 200
        investors = investors_response.json()["investors"]
        
        if len(investors) > 0:
            investor_id = investors[0]["id"]
            
            # Try to request for a fund FM doesn't have access to
            response = self.session.post(
                f"{BASE_URL}/api/investor-requests",
                headers={"Authorization": f"Bearer {token}"},
                json={
                    "investor_id": investor_id,
                    "requested_fund_id": "nonexistent-fund-id"
                }
            )
            assert response.status_code in [403, 404]
            print("✓ Create request validates fund access")
        else:
            pytest.skip("No investors available for testing")
    
    # ============== GET MY REQUESTS ENDPOINT ==============
    
    def test_get_my_requests_requires_auth(self):
        """GET /api/investor-requests requires authentication"""
        response = self.session.get(f"{BASE_URL}/api/investor-requests")
        assert response.status_code == 403 or response.status_code == 401
        print("✓ Get my requests endpoint requires authentication")
    
    def test_get_my_requests_returns_user_requests(self):
        """GET /api/investor-requests returns current user's requests"""
        token = self.get_fm_token()
        response = self.session.get(
            f"{BASE_URL}/api/investor-requests",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "requests" in data
        assert "total" in data
        
        # Each request should have required fields
        for req in data["requests"]:
            assert "id" in req
            assert "investor_id" in req
            assert "requested_fund_id" in req
            assert "status" in req
            assert "investor_name" in req
            assert "fund_name" in req
            
        print(f"✓ Get my requests returns {data['total']} requests")
    
    # ============== ADMIN GET ALL REQUESTS ENDPOINT ==============
    
    def test_admin_get_requests_requires_admin(self):
        """GET /api/admin/investor-requests requires admin role"""
        token = self.get_fm_token()
        response = self.session.get(
            f"{BASE_URL}/api/admin/investor-requests",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 403
        print("✓ Admin get requests requires admin role")
    
    def test_admin_get_requests_returns_all_with_counts(self):
        """GET /api/admin/investor-requests returns all requests with counts"""
        token = self.get_admin_token()
        response = self.session.get(
            f"{BASE_URL}/api/admin/investor-requests",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "requests" in data
        assert "total" in data
        assert "counts" in data
        assert "pending" in data["counts"]
        assert "approved" in data["counts"]
        assert "denied" in data["counts"]
        
        print(f"✓ Admin get requests returns all with counts: pending={data['counts']['pending']}, approved={data['counts']['approved']}, denied={data['counts']['denied']}")
    
    def test_admin_get_requests_filter_by_status(self):
        """GET /api/admin/investor-requests supports status filter"""
        token = self.get_admin_token()
        
        for status in ["pending", "approved", "denied"]:
            response = self.session.get(
                f"{BASE_URL}/api/admin/investor-requests?status={status}",
                headers={"Authorization": f"Bearer {token}"}
            )
            assert response.status_code == 200
            data = response.json()
            
            # All returned requests should have the filtered status
            for req in data["requests"]:
                assert req["status"] == status
                
        print("✓ Admin get requests supports status filter")
    
    # ============== ADMIN APPROVE REQUEST ENDPOINT ==============
    
    def test_approve_request_requires_admin(self):
        """PUT /api/admin/investor-requests/{id}/approve requires admin role"""
        token = self.get_fm_token()
        response = self.session.put(
            f"{BASE_URL}/api/admin/investor-requests/test-id/approve",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 403
        print("✓ Approve request requires admin role")
    
    def test_approve_request_validates_request_exists(self):
        """PUT /api/admin/investor-requests/{id}/approve validates request exists"""
        token = self.get_admin_token()
        response = self.session.put(
            f"{BASE_URL}/api/admin/investor-requests/nonexistent-id/approve",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 404
        print("✓ Approve request validates request exists")
    
    # ============== ADMIN DENY REQUEST ENDPOINT ==============
    
    def test_deny_request_requires_admin(self):
        """PUT /api/admin/investor-requests/{id}/deny requires admin role"""
        token = self.get_fm_token()
        response = self.session.put(
            f"{BASE_URL}/api/admin/investor-requests/test-id/deny",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 403
        print("✓ Deny request requires admin role")
    
    def test_deny_request_validates_request_exists(self):
        """PUT /api/admin/investor-requests/{id}/deny validates request exists"""
        token = self.get_admin_token()
        response = self.session.put(
            f"{BASE_URL}/api/admin/investor-requests/nonexistent-id/deny",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 404
        print("✓ Deny request validates request exists")
    
    # ============== FULL WORKFLOW TEST ==============
    
    def test_full_request_workflow(self):
        """Test complete workflow: FM requests -> Admin approves -> Investor in pipeline"""
        fm_token = self.get_fm_token()
        admin_token = self.get_admin_token()
        
        # Step 1: Get FM's assigned funds
        funds_response = self.session.get(
            f"{BASE_URL}/api/my-funds",
            headers={"Authorization": f"Bearer {fm_token}"}
        )
        assert funds_response.status_code == 200
        funds = funds_response.json()
        
        if len(funds) == 0:
            pytest.skip("FM has no assigned funds")
        
        fund_id = funds[0]["id"]
        fund_name = funds[0]["name"]
        print(f"  Using fund: {fund_name}")
        
        # Step 2: Get global investors
        investors_response = self.session.get(
            f"{BASE_URL}/api/global-investors",
            headers={"Authorization": f"Bearer {fm_token}"}
        )
        assert investors_response.status_code == 200
        investors = investors_response.json()["investors"]
        
        # Find an investor not already assigned to this fund
        available_investor = None
        for inv in investors:
            if fund_name not in (inv.get("assigned_fund_names") or []):
                available_investor = inv
                break
        
        if not available_investor:
            print("  No unassigned investors available - checking existing pending request")
            # Check if there's already a pending request we can use
            requests_response = self.session.get(
                f"{BASE_URL}/api/admin/investor-requests?status=pending",
                headers={"Authorization": f"Bearer {admin_token}"}
            )
            assert requests_response.status_code == 200
            pending_requests = requests_response.json()["requests"]
            
            if len(pending_requests) > 0:
                # Use existing pending request for approval test
                request_id = pending_requests[0]["id"]
                investor_name = pending_requests[0]["investor_name"]
                print(f"  Using existing pending request for: {investor_name}")
                
                # Approve the request
                approve_response = self.session.put(
                    f"{BASE_URL}/api/admin/investor-requests/{request_id}/approve",
                    headers={"Authorization": f"Bearer {admin_token}"}
                )
                assert approve_response.status_code == 200
                print(f"✓ Full workflow: Approved existing request for {investor_name}")
                return
            else:
                pytest.skip("No available investors or pending requests for testing")
        
        investor_id = available_investor["id"]
        investor_name = available_investor["investor_name"]
        print(f"  Requesting investor: {investor_name}")
        
        # Step 3: FM creates request
        create_response = self.session.post(
            f"{BASE_URL}/api/investor-requests",
            headers={"Authorization": f"Bearer {fm_token}"},
            json={
                "investor_id": investor_id,
                "requested_fund_id": fund_id,
                "reason": "Test request from automated testing"
            }
        )
        assert create_response.status_code == 200, f"Create request failed: {create_response.text}"
        request_data = create_response.json()
        request_id = request_data["request_id"]
        print(f"  Created request: {request_id}")
        
        # Step 4: Verify request appears in FM's requests
        my_requests_response = self.session.get(
            f"{BASE_URL}/api/investor-requests",
            headers={"Authorization": f"Bearer {fm_token}"}
        )
        assert my_requests_response.status_code == 200
        my_requests = my_requests_response.json()["requests"]
        found_request = next((r for r in my_requests if r["id"] == request_id), None)
        assert found_request is not None, "Request not found in FM's requests"
        assert found_request["status"] == "pending"
        print("  Request visible in FM's requests")
        
        # Step 5: Verify request appears in admin's requests
        admin_requests_response = self.session.get(
            f"{BASE_URL}/api/admin/investor-requests?status=pending",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert admin_requests_response.status_code == 200
        admin_requests = admin_requests_response.json()["requests"]
        found_admin_request = next((r for r in admin_requests if r["id"] == request_id), None)
        assert found_admin_request is not None, "Request not found in admin's requests"
        print("  Request visible in admin's requests")
        
        # Step 6: Admin approves request
        approve_response = self.session.put(
            f"{BASE_URL}/api/admin/investor-requests/{request_id}/approve",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert approve_response.status_code == 200, f"Approve failed: {approve_response.text}"
        print("  Admin approved request")
        
        # Step 7: Verify request status changed to approved
        updated_requests_response = self.session.get(
            f"{BASE_URL}/api/investor-requests",
            headers={"Authorization": f"Bearer {fm_token}"}
        )
        assert updated_requests_response.status_code == 200
        updated_requests = updated_requests_response.json()["requests"]
        updated_request = next((r for r in updated_requests if r["id"] == request_id), None)
        assert updated_request is not None
        assert updated_request["status"] == "approved"
        print("  Request status updated to approved")
        
        # Step 8: Verify investor now appears in fund's pipeline
        pipeline_response = self.session.get(
            f"{BASE_URL}/api/investor-profiles-with-pipeline/fund/{fund_id}",
            headers={"Authorization": f"Bearer {fm_token}"}
        )
        assert pipeline_response.status_code == 200
        pipeline_investors = pipeline_response.json()
        found_in_pipeline = next((i for i in pipeline_investors if i["id"] == investor_id), None)
        assert found_in_pipeline is not None, "Investor not found in fund's pipeline after approval"
        print(f"  Investor now in fund's pipeline (stage: {found_in_pipeline.get('pipeline_stage_name', 'Unknown')})")
        
        print(f"✓ Full workflow completed: {investor_name} -> {fund_name}")
    
    # ============== DUPLICATE REQUEST BLOCKING ==============
    
    def test_block_duplicate_pending_request(self):
        """POST /api/investor-requests blocks duplicate pending request for same investor+fund"""
        fm_token = self.get_fm_token()
        
        # Get existing pending requests
        requests_response = self.session.get(
            f"{BASE_URL}/api/investor-requests",
            headers={"Authorization": f"Bearer {fm_token}"}
        )
        assert requests_response.status_code == 200
        pending_requests = [r for r in requests_response.json()["requests"] if r["status"] == "pending"]
        
        if len(pending_requests) == 0:
            pytest.skip("No pending requests to test duplicate blocking")
        
        # Try to create duplicate request
        existing_request = pending_requests[0]
        response = self.session.post(
            f"{BASE_URL}/api/investor-requests",
            headers={"Authorization": f"Bearer {fm_token}"},
            json={
                "investor_id": existing_request["investor_id"],
                "requested_fund_id": existing_request["requested_fund_id"]
            }
        )
        assert response.status_code == 400
        assert "pending" in response.json().get("detail", "").lower() or "already" in response.json().get("detail", "").lower()
        print("✓ Duplicate pending request blocked")
    
    # ============== ALREADY ASSIGNED BLOCKING ==============
    
    def test_block_request_for_already_assigned_investor(self):
        """POST /api/investor-requests blocks request if investor already assigned to fund"""
        fm_token = self.get_fm_token()
        
        # Get FM's funds
        funds_response = self.session.get(
            f"{BASE_URL}/api/my-funds",
            headers={"Authorization": f"Bearer {fm_token}"}
        )
        assert funds_response.status_code == 200
        funds = funds_response.json()
        
        if len(funds) == 0:
            pytest.skip("FM has no assigned funds")
        
        fund_id = funds[0]["id"]
        fund_name = funds[0]["name"]
        
        # Get investors already in this fund
        pipeline_response = self.session.get(
            f"{BASE_URL}/api/investor-profiles-with-pipeline/fund/{fund_id}",
            headers={"Authorization": f"Bearer {fm_token}"}
        )
        assert pipeline_response.status_code == 200
        pipeline_investors = pipeline_response.json()
        
        if len(pipeline_investors) == 0:
            pytest.skip("No investors in fund to test already-assigned blocking")
        
        # Try to request an investor already in the fund
        existing_investor = pipeline_investors[0]
        response = self.session.post(
            f"{BASE_URL}/api/investor-requests",
            headers={"Authorization": f"Bearer {fm_token}"},
            json={
                "investor_id": existing_investor["id"],
                "requested_fund_id": fund_id
            }
        )
        assert response.status_code == 400
        assert "already" in response.json().get("detail", "").lower()
        print(f"✓ Request blocked for investor already assigned to {fund_name}")


class TestDenyRequestWorkflow:
    """Test the deny request workflow"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def get_admin_token(self):
        """Get admin authentication token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    def get_fm_token(self):
        """Get fund manager authentication token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": FM_EMAIL,
            "password": FM_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    def test_deny_request_with_reason(self):
        """PUT /api/admin/investor-requests/{id}/deny with denial reason"""
        admin_token = self.get_admin_token()
        
        # Get pending requests
        requests_response = self.session.get(
            f"{BASE_URL}/api/admin/investor-requests?status=pending",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert requests_response.status_code == 200
        pending_requests = requests_response.json()["requests"]
        
        if len(pending_requests) == 0:
            print("  No pending requests to deny - skipping")
            pytest.skip("No pending requests to test deny workflow")
        
        request_id = pending_requests[0]["id"]
        investor_name = pending_requests[0]["investor_name"]
        
        # Deny with reason
        deny_response = self.session.put(
            f"{BASE_URL}/api/admin/investor-requests/{request_id}/deny?denial_reason=Test%20denial%20reason",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert deny_response.status_code == 200
        
        # Verify status changed
        updated_response = self.session.get(
            f"{BASE_URL}/api/admin/investor-requests?status=denied",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert updated_response.status_code == 200
        denied_requests = updated_response.json()["requests"]
        denied_request = next((r for r in denied_requests if r["id"] == request_id), None)
        assert denied_request is not None
        assert denied_request["status"] == "denied"
        
        print(f"✓ Deny request workflow completed for {investor_name}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

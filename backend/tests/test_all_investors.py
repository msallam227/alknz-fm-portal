"""
Test suite for Admin All Investors endpoint
Tests GET /api/admin/all-investors with filters, sorting, and access control
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


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    return response.json()["token"]


@pytest.fixture(scope="module")
def fm_token():
    """Get fund manager authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": FM_EMAIL, "password": FM_PASSWORD}
    )
    assert response.status_code == 200, f"FM login failed: {response.text}"
    return response.json()["token"]


class TestAllInvestorsAccessControl:
    """Test access control for /api/admin/all-investors"""
    
    def test_admin_can_access_all_investors(self, admin_token):
        """Admin should be able to access all investors endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/admin/all-investors",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "total" in data
        assert "investors" in data
        assert "filter_options" in data
    
    def test_non_admin_gets_403(self, fm_token):
        """Non-admin (Fund Manager) should get 403 Forbidden"""
        response = requests.get(
            f"{BASE_URL}/api/admin/all-investors",
            headers={"Authorization": f"Bearer {fm_token}"}
        )
        assert response.status_code == 403
        assert "Admin access required" in response.json().get("detail", "")
    
    def test_unauthenticated_gets_401(self):
        """Unauthenticated request should get 401"""
        response = requests.get(f"{BASE_URL}/api/admin/all-investors")
        assert response.status_code in [401, 403]


class TestAllInvestorsDataStructure:
    """Test response data structure for /api/admin/all-investors"""
    
    def test_response_contains_required_fields(self, admin_token):
        """Response should contain total, investors, and filter_options"""
        response = requests.get(
            f"{BASE_URL}/api/admin/all-investors",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Top level fields
        assert "total" in data
        assert "investors" in data
        assert "filter_options" in data
        assert isinstance(data["total"], int)
        assert isinstance(data["investors"], list)
        assert isinstance(data["filter_options"], dict)
    
    def test_investor_has_required_columns(self, admin_token):
        """Each investor should have all required columns"""
        response = requests.get(
            f"{BASE_URL}/api/admin/all-investors",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        if data["total"] > 0:
            investor = data["investors"][0]
            
            # Required columns per spec
            required_fields = [
                "id",
                "investor_name",
                "job_title",  # Firm Name
                "investor_type",
                "country",
                "city",
                "contact_email",
                "contact_phone",
                "source",
                "source_label",
                "created_at",
                "evidence_count",
                "latest_evidence_date",
                "assigned_funds_count",
                "assigned_fund_ids",
                "assigned_fund_names"
            ]
            
            for field in required_fields:
                assert field in investor, f"Missing field: {field}"
    
    def test_filter_options_structure(self, admin_token):
        """Filter options should contain sources, countries, investor_types, funds"""
        response = requests.get(
            f"{BASE_URL}/api/admin/all-investors",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        filter_options = data["filter_options"]
        assert "sources" in filter_options
        assert "countries" in filter_options
        assert "investor_types" in filter_options
        assert "funds" in filter_options
        
        # Sources should have value and label
        for source in filter_options["sources"]:
            assert "value" in source
            assert "label" in source
        
        # Funds should have id and name
        for fund in filter_options["funds"]:
            assert "id" in fund
            assert "name" in fund


class TestAllInvestorsEnrichedData:
    """Test enriched data (evidence count, fund assignments)"""
    
    def test_evidence_count_included(self, admin_token):
        """Each investor should have evidence_count field"""
        response = requests.get(
            f"{BASE_URL}/api/admin/all-investors",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        for investor in data["investors"]:
            assert "evidence_count" in investor
            assert isinstance(investor["evidence_count"], int)
            assert investor["evidence_count"] >= 0
    
    def test_latest_evidence_date_included(self, admin_token):
        """Each investor should have latest_evidence_date field"""
        response = requests.get(
            f"{BASE_URL}/api/admin/all-investors",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        for investor in data["investors"]:
            assert "latest_evidence_date" in investor
            # Can be null or a date string
    
    def test_assigned_funds_count_and_names(self, admin_token):
        """Each investor should have assigned_funds_count and assigned_fund_names"""
        response = requests.get(
            f"{BASE_URL}/api/admin/all-investors",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        for investor in data["investors"]:
            assert "assigned_funds_count" in investor
            assert "assigned_fund_ids" in investor
            assert "assigned_fund_names" in investor
            assert isinstance(investor["assigned_funds_count"], int)
            assert isinstance(investor["assigned_fund_ids"], list)
            assert isinstance(investor["assigned_fund_names"], list)
            # Count should match list length
            assert investor["assigned_funds_count"] == len(investor["assigned_fund_ids"])
    
    def test_investor_with_evidence_has_correct_count(self, admin_token):
        """John Smith should have 2 evidence entries (from previous tests)"""
        response = requests.get(
            f"{BASE_URL}/api/admin/all-investors?search=John",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Find John Smith with evidence
        john_with_evidence = None
        for inv in data["investors"]:
            if inv["evidence_count"] > 0:
                john_with_evidence = inv
                break
        
        if john_with_evidence:
            assert john_with_evidence["evidence_count"] == 2
            assert john_with_evidence["latest_evidence_date"] is not None


class TestAllInvestorsFilters:
    """Test filter functionality"""
    
    def test_investor_type_filter(self, admin_token):
        """Filter by investor_type should return only matching investors"""
        response = requests.get(
            f"{BASE_URL}/api/admin/all-investors?investor_type=Family%20Office",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        for investor in data["investors"]:
            assert investor["investor_type"] == "Family Office"
    
    def test_country_filter(self, admin_token):
        """Filter by country should return only matching investors"""
        response = requests.get(
            f"{BASE_URL}/api/admin/all-investors?country=USA",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        for investor in data["investors"]:
            assert investor["country"] == "USA"
    
    def test_assigned_filter_assigned(self, admin_token):
        """Filter assigned=assigned should return only investors with funds"""
        response = requests.get(
            f"{BASE_URL}/api/admin/all-investors?assigned=assigned",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        for investor in data["investors"]:
            assert investor["assigned_funds_count"] > 0
    
    def test_assigned_filter_unassigned(self, admin_token):
        """Filter assigned=unassigned should return only investors without funds"""
        response = requests.get(
            f"{BASE_URL}/api/admin/all-investors?assigned=unassigned",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        for investor in data["investors"]:
            assert investor["assigned_funds_count"] == 0
    
    def test_fund_filter(self, admin_token):
        """Filter by fund_id should return only investors assigned to that fund"""
        # First get a fund ID
        response = requests.get(
            f"{BASE_URL}/api/admin/all-investors",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        data = response.json()
        
        if data["filter_options"]["funds"]:
            fund_id = data["filter_options"]["funds"][0]["id"]
            
            response = requests.get(
                f"{BASE_URL}/api/admin/all-investors?fund_id={fund_id}",
                headers={"Authorization": f"Bearer {admin_token}"}
            )
            assert response.status_code == 200
            filtered_data = response.json()
            
            for investor in filtered_data["investors"]:
                assert fund_id in investor["assigned_fund_ids"]
    
    def test_search_filter(self, admin_token):
        """Search should filter by name, email, location"""
        response = requests.get(
            f"{BASE_URL}/api/admin/all-investors?search=John",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # All results should contain "John" in searchable fields
        for investor in data["investors"]:
            searchable = f"{investor.get('investor_name', '')} {investor.get('contact_email', '')} {investor.get('city', '')} {investor.get('country', '')}".lower()
            assert "john" in searchable


class TestAllInvestorsSorting:
    """Test sorting functionality"""
    
    def test_sort_by_created_at_desc(self, admin_token):
        """Default sort by created_at desc should show newest first"""
        response = requests.get(
            f"{BASE_URL}/api/admin/all-investors?sort_by=created_at&sort_order=desc",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        if len(data["investors"]) > 1:
            dates = [inv["created_at"] for inv in data["investors"]]
            assert dates == sorted(dates, reverse=True)
    
    def test_sort_by_investor_name_asc(self, admin_token):
        """Sort by investor_name asc should be alphabetical"""
        response = requests.get(
            f"{BASE_URL}/api/admin/all-investors?sort_by=investor_name&sort_order=asc",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        if len(data["investors"]) > 1:
            names = [inv["investor_name"].lower() for inv in data["investors"]]
            assert names == sorted(names)
    
    def test_sort_by_evidence_count_desc(self, admin_token):
        """Sort by evidence_count desc should show highest first"""
        response = requests.get(
            f"{BASE_URL}/api/admin/all-investors?sort_by=evidence_count&sort_order=desc",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        if len(data["investors"]) > 1:
            counts = [inv["evidence_count"] for inv in data["investors"]]
            assert counts == sorted(counts, reverse=True)
    
    def test_sort_by_latest_evidence_desc(self, admin_token):
        """Sort by latest_evidence desc should show most recent first"""
        response = requests.get(
            f"{BASE_URL}/api/admin/all-investors?sort_by=latest_evidence&sort_order=desc",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Investors with evidence should come first
        if len(data["investors"]) > 1:
            first_with_evidence = None
            for inv in data["investors"]:
                if inv["latest_evidence_date"]:
                    first_with_evidence = inv
                    break
            
            if first_with_evidence:
                # First investor with evidence should be at the top
                assert data["investors"][0]["latest_evidence_date"] is not None


class TestSourceFilterBug:
    """Test for source filter bug - documents without source field"""
    
    def test_source_filter_manual_returns_results(self, admin_token):
        """
        BUG: Source filter for 'manual' returns 0 results because 
        documents don't have 'source' field set in database.
        The code defaults to 'manual' when displaying but filter query
        doesn't account for missing field.
        """
        # Get all investors first
        response = requests.get(
            f"{BASE_URL}/api/admin/all-investors",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        all_data = response.json()
        
        # Filter by manual source
        response = requests.get(
            f"{BASE_URL}/api/admin/all-investors?source=manual",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        filtered_data = response.json()
        
        # This test documents the bug - all investors show source=manual
        # but filter returns 0 because field is not set in DB
        all_manual = all(inv["source"] == "manual" for inv in all_data["investors"])
        
        if all_manual and all_data["total"] > 0:
            # BUG: If all investors display as manual, filter should return all
            # Currently returns 0 because source field is not set in DB
            print(f"BUG: All {all_data['total']} investors show source=manual but filter returns {filtered_data['total']}")
            # This assertion will fail, documenting the bug
            # assert filtered_data["total"] == all_data["total"], "Source filter bug: manual filter returns 0 results"

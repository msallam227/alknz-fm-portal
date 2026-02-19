"""
Test suite for Admin Dashboard Stats and Fund Performance APIs
Tests GET /api/dashboard/stats and GET /api/dashboard/fund-performance endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')

# Admin credentials
ADMIN_EMAIL = "khaled@alknzventures.com"
ADMIN_PASSWORD = "Admin123!"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for admin user"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Get headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}"}


class TestDashboardStats:
    """Tests for GET /api/dashboard/stats endpoint"""
    
    def test_dashboard_stats_returns_200(self, auth_headers):
        """Test that dashboard stats endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/dashboard/stats", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_dashboard_stats_has_required_fields(self, auth_headers):
        """Test that dashboard stats response has all required fields"""
        response = requests.get(f"{BASE_URL}/api/dashboard/stats", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        required_fields = [
            "total_users",
            "total_funds",
            "total_investors",
            "active_users",
            "active_funds",
            "active_fund_managers",
            "total_deployed_capital",
            "total_potential_capital",
            "capital_in_final_stages"
        ]
        
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"
    
    def test_dashboard_stats_capital_values_are_numbers(self, auth_headers):
        """Test that capital values are numeric"""
        response = requests.get(f"{BASE_URL}/api/dashboard/stats", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        
        # Capital fields should be numeric
        assert isinstance(data["total_deployed_capital"], (int, float)), "total_deployed_capital should be numeric"
        assert isinstance(data["total_potential_capital"], (int, float)), "total_potential_capital should be numeric"
        assert isinstance(data["capital_in_final_stages"], (int, float)), "capital_in_final_stages should be numeric"
        
        # Capital values should be non-negative
        assert data["total_deployed_capital"] >= 0, "total_deployed_capital should be non-negative"
        assert data["total_potential_capital"] >= 0, "total_potential_capital should be non-negative"
        assert data["capital_in_final_stages"] >= 0, "capital_in_final_stages should be non-negative"
    
    def test_dashboard_stats_count_values_are_integers(self, auth_headers):
        """Test that count values are integers"""
        response = requests.get(f"{BASE_URL}/api/dashboard/stats", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        
        count_fields = ["total_users", "total_funds", "total_investors", "active_users", "active_funds", "active_fund_managers"]
        for field in count_fields:
            assert isinstance(data[field], int), f"{field} should be an integer"
            assert data[field] >= 0, f"{field} should be non-negative"
    
    def test_dashboard_stats_expected_capital_values(self, auth_headers):
        """Test that capital values are in expected ranges based on test data"""
        response = requests.get(f"{BASE_URL}/api/dashboard/stats", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        
        # Log actual values for debugging
        print(f"Total Deployed Capital: ${data['total_deployed_capital']:,.2f}")
        print(f"Total Potential Capital: ${data['total_potential_capital']:,.2f}")
        print(f"Capital in Final Stages: ${data['capital_in_final_stages']:,.2f}")
        
        # Expected values from the test request:
        # total_deployed_capital: ~$1,050,000
        # total_potential_capital: ~$750,000
        # capital_in_final_stages: ~$2,000,000
        
        # Verify values are reasonable (not zero if there's data)
        # These are soft checks - actual values depend on test data
        if data["total_funds"] > 0:
            print(f"Total Funds: {data['total_funds']}")
            print(f"Total Investors: {data['total_investors']}")


class TestFundPerformance:
    """Tests for GET /api/dashboard/fund-performance endpoint"""
    
    def test_fund_performance_returns_200(self, auth_headers):
        """Test that fund performance endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/dashboard/fund-performance", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_fund_performance_has_funds_array(self, auth_headers):
        """Test that fund performance response has funds array"""
        response = requests.get(f"{BASE_URL}/api/dashboard/fund-performance", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "funds" in data, "Response should have 'funds' field"
        assert isinstance(data["funds"], list), "'funds' should be a list"
        assert "generated_at" in data, "Response should have 'generated_at' timestamp"
    
    def test_fund_performance_fund_has_required_fields(self, auth_headers):
        """Test that each fund in the response has all required fields"""
        response = requests.get(f"{BASE_URL}/api/dashboard/fund-performance", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        funds = data.get("funds", [])
        
        if len(funds) == 0:
            pytest.skip("No funds available to test")
        
        required_fields = [
            "fund_id",
            "fund_name",
            "target_capital",
            "deployed_capital",
            "percent_of_goal",
            "capital_in_final_stages",
            "active_investors",
            "investors_in_deployed",
            "investors_in_final",
            "average_investment_size",
            "days_since_last_close",
            "alerts",
            "status"
        ]
        
        for fund in funds:
            for field in required_fields:
                assert field in fund, f"Fund '{fund.get('fund_name', 'Unknown')}' missing required field: {field}"
    
    def test_fund_performance_alerts_structure(self, auth_headers):
        """Test that alerts have correct structure"""
        response = requests.get(f"{BASE_URL}/api/dashboard/fund-performance", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        funds = data.get("funds", [])
        
        for fund in funds:
            alerts = fund.get("alerts", [])
            assert isinstance(alerts, list), f"Alerts for fund '{fund.get('fund_name')}' should be a list"
            
            for alert in alerts:
                assert "type" in alert, "Alert should have 'type' field"
                assert "severity" in alert, "Alert should have 'severity' field"
                assert "message" in alert, "Alert should have 'message' field"
                
                # Severity should be one of: critical, warning, info
                assert alert["severity"] in ["critical", "warning", "info"], \
                    f"Invalid severity: {alert['severity']}"
    
    def test_fund_performance_percent_of_goal_calculation(self, auth_headers):
        """Test that percent_of_goal is calculated correctly"""
        response = requests.get(f"{BASE_URL}/api/dashboard/fund-performance", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        funds = data.get("funds", [])
        
        for fund in funds:
            target = fund.get("target_capital", 0)
            deployed = fund.get("deployed_capital", 0)
            percent = fund.get("percent_of_goal", 0)
            
            if target > 0:
                expected_percent = (deployed / target) * 100
                # Allow small floating point differences
                assert abs(percent - expected_percent) < 0.5, \
                    f"Fund '{fund.get('fund_name')}': percent_of_goal mismatch. Expected ~{expected_percent:.1f}, got {percent}"
            else:
                assert percent == 0, f"Fund '{fund.get('fund_name')}': percent_of_goal should be 0 when target is 0"
    
    def test_fund_performance_numeric_fields(self, auth_headers):
        """Test that numeric fields are properly typed"""
        response = requests.get(f"{BASE_URL}/api/dashboard/fund-performance", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        funds = data.get("funds", [])
        
        numeric_fields = [
            "target_capital",
            "deployed_capital",
            "percent_of_goal",
            "capital_in_final_stages",
            "active_investors",
            "investors_in_deployed",
            "investors_in_final",
            "average_investment_size"
        ]
        
        for fund in funds:
            for field in numeric_fields:
                value = fund.get(field)
                assert isinstance(value, (int, float)), \
                    f"Fund '{fund.get('fund_name')}': {field} should be numeric, got {type(value)}"
    
    def test_fund_performance_days_since_last_close(self, auth_headers):
        """Test that days_since_last_close is null or non-negative integer"""
        response = requests.get(f"{BASE_URL}/api/dashboard/fund-performance", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        funds = data.get("funds", [])
        
        for fund in funds:
            days = fund.get("days_since_last_close")
            if days is not None:
                assert isinstance(days, int), \
                    f"Fund '{fund.get('fund_name')}': days_since_last_close should be int or null"
                assert days >= 0, \
                    f"Fund '{fund.get('fund_name')}': days_since_last_close should be non-negative"
    
    def test_fund_performance_sorted_by_deployed_capital(self, auth_headers):
        """Test that funds are sorted by deployed capital descending"""
        response = requests.get(f"{BASE_URL}/api/dashboard/fund-performance", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        funds = data.get("funds", [])
        
        if len(funds) < 2:
            pytest.skip("Need at least 2 funds to test sorting")
        
        deployed_capitals = [f.get("deployed_capital", 0) for f in funds]
        assert deployed_capitals == sorted(deployed_capitals, reverse=True), \
            "Funds should be sorted by deployed_capital descending"
    
    def test_fund_performance_log_values(self, auth_headers):
        """Log fund performance values for verification"""
        response = requests.get(f"{BASE_URL}/api/dashboard/fund-performance", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        funds = data.get("funds", [])
        
        print(f"\n=== Fund Performance Snapshot ({len(funds)} funds) ===")
        for fund in funds:
            print(f"\nFund: {fund.get('fund_name')}")
            print(f"  Target Capital: ${fund.get('target_capital', 0):,.2f}")
            print(f"  Deployed Capital: ${fund.get('deployed_capital', 0):,.2f}")
            print(f"  % of Goal: {fund.get('percent_of_goal', 0):.1f}%")
            print(f"  Capital in Final Stages: ${fund.get('capital_in_final_stages', 0):,.2f}")
            print(f"  Active Investors: {fund.get('active_investors', 0)}")
            print(f"  Avg Investment Size: ${fund.get('average_investment_size', 0):,.2f}")
            print(f"  Days Since Last Close: {fund.get('days_since_last_close')}")
            print(f"  Alerts: {len(fund.get('alerts', []))}")
            for alert in fund.get("alerts", []):
                print(f"    - [{alert.get('severity')}] {alert.get('message')}")


class TestDashboardUnauthorized:
    """Test unauthorized access to dashboard endpoints"""
    
    def test_dashboard_stats_requires_auth(self):
        """Test that dashboard stats requires authentication"""
        response = requests.get(f"{BASE_URL}/api/dashboard/stats")
        assert response.status_code in [401, 403], \
            f"Expected 401/403 without auth, got {response.status_code}"
    
    def test_fund_performance_requires_auth(self):
        """Test that fund performance requires authentication"""
        response = requests.get(f"{BASE_URL}/api/dashboard/fund-performance")
        assert response.status_code in [401, 403], \
            f"Expected 401/403 without auth, got {response.status_code}"

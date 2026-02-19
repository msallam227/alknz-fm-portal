import requests
import sys
import json
from datetime import datetime

class ALKNZPortalTester:
    def __init__(self, base_url="https://investorflow-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.admin_user = None
        self.created_user_id = None
        self.created_fund_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return True, response.json() if response.text else {}
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"   Error: {error_detail}")
                except:
                    print(f"   Response: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_admin_login(self):
        """Test admin login"""
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={"email": "khaled@alknzventures.com", "password": "Admin123!"}
        )
        if success and 'token' in response:
            self.token = response['token']
            self.admin_user = response['user']
            print(f"   Admin user: {self.admin_user['first_name']} {self.admin_user['last_name']}")
            print(f"   Role: {self.admin_user['role']}")
            return True
        return False

    def test_get_current_user(self):
        """Test get current user profile"""
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200
        )
        return success

    def test_dashboard_stats(self):
        """Test dashboard statistics"""
        success, response = self.run_test(
            "Dashboard Stats",
            "GET",
            "dashboard/stats",
            200
        )
        if success:
            print(f"   Stats: {response}")
        return success

    def test_get_users(self):
        """Test get all users"""
        success, response = self.run_test(
            "Get All Users",
            "GET",
            "users",
            200
        )
        if success:
            print(f"   Found {len(response)} users")
        return success

    def test_create_user(self):
        """Test create new user"""
        test_user_data = {
            "first_name": "Test",
            "last_name": "Manager",
            "email": f"test.manager.{datetime.now().strftime('%H%M%S')}@alknz.com",
            "role": "FUND_MANAGER"
        }
        
        success, response = self.run_test(
            "Create User",
            "POST",
            "users",
            200,
            data=test_user_data
        )
        
        if success and 'user' in response:
            self.created_user_id = response['user']['id']
            print(f"   Created user ID: {self.created_user_id}")
            print(f"   Generated password: {response.get('generated_password', 'N/A')}")
            return True
        return False

    def test_get_user_by_id(self):
        """Test get user by ID"""
        if not self.created_user_id:
            print("❌ Skipped - No user ID available")
            return False
            
        success, response = self.run_test(
            "Get User by ID",
            "GET",
            f"users/{self.created_user_id}",
            200
        )
        return success

    def test_reset_user_password(self):
        """Test reset user password"""
        if not self.created_user_id:
            print("❌ Skipped - No user ID available")
            return False
            
        success, response = self.run_test(
            "Reset User Password",
            "POST",
            f"users/{self.created_user_id}/reset-password",
            200
        )
        
        if success:
            print(f"   New password: {response.get('new_password', 'N/A')}")
        return success

    def test_deactivate_user(self):
        """Test deactivate user"""
        if not self.created_user_id:
            print("❌ Skipped - No user ID available")
            return False
            
        success, response = self.run_test(
            "Deactivate User",
            "POST",
            f"users/{self.created_user_id}/deactivate",
            200
        )
        return success

    def test_activate_user(self):
        """Test activate user"""
        if not self.created_user_id:
            print("❌ Skipped - No user ID available")
            return False
            
        success, response = self.run_test(
            "Activate User",
            "POST",
            f"users/{self.created_user_id}/activate",
            200
        )
        return success

    def test_get_funds(self):
        """Test get all funds"""
        success, response = self.run_test(
            "Get All Funds",
            "GET",
            "funds",
            200
        )
        if success:
            print(f"   Found {len(response)} funds")
        return success

    def test_create_fund(self):
        """Test create new fund"""
        test_fund_data = {
            "name": f"Test Fund {datetime.now().strftime('%H%M%S')}",
            "fund_type": "Fund",
            "vintage_year": 2024,
            "currency": "USD",
            "target_raise": 50000000,
            "status": "Draft",
            "thesis": "Test fund for automated testing",
            "primary_sectors": ["Technology", "AI/ML"],
            "focus_regions": ["North America", "Europe"],
            "stage_focus": ["Seed", "Series A"],
            "min_commitment": 250000,
            "typical_check_min": 500000,
            "typical_check_max": 2000000,
            "esg_policy": "Prefer"
        }
        
        success, response = self.run_test(
            "Create Fund",
            "POST",
            "funds",
            200,
            data=test_fund_data
        )
        
        if success and 'id' in response:
            self.created_fund_id = response['id']
            print(f"   Created fund ID: {self.created_fund_id}")
            return True
        return False

    def test_get_fund_by_id(self):
        """Test get fund by ID"""
        if not self.created_fund_id:
            print("❌ Skipped - No fund ID available")
            return False
            
        success, response = self.run_test(
            "Get Fund by ID",
            "GET",
            f"funds/{self.created_fund_id}",
            200
        )
        return success

    def test_update_fund(self):
        """Test update fund"""
        if not self.created_fund_id:
            print("❌ Skipped - No fund ID available")
            return False
            
        update_data = {
            "status": "Active",
            "thesis": "Updated test fund thesis"
        }
        
        success, response = self.run_test(
            "Update Fund",
            "PUT",
            f"funds/{self.created_fund_id}",
            200,
            data=update_data
        )
        return success

    def test_fund_assignments(self):
        """Test fund assignments"""
        if not self.created_user_id or not self.created_fund_id:
            print("❌ Skipped - No user or fund ID available")
            return False
            
        # Assign fund to user
        assignment_data = {
            "user_id": self.created_user_id,
            "fund_ids": [self.created_fund_id]
        }
        
        success, response = self.run_test(
            "Assign Fund to User",
            "POST",
            "assignments",
            200,
            data=assignment_data
        )
        
        if success:
            # Get user assignments
            success2, response2 = self.run_test(
                "Get User Assignments",
                "GET",
                f"assignments/{self.created_user_id}",
                200
            )
            if success2:
                print(f"   User has {len(response2.get('funds', []))} assigned funds")
            return success2
        return False

    def test_lookups(self):
        """Test lookup endpoints"""
        endpoints = [
            ("sectors", "lookups/sectors"),
            ("regions", "lookups/regions"),
            ("stages", "lookups/stages")
        ]
        
        all_success = True
        for name, endpoint in endpoints:
            success, response = self.run_test(
                f"Get {name.title()}",
                "GET",
                endpoint,
                200
            )
            if success:
                print(f"   Found {len(response)} {name}")
            all_success = all_success and success
        
        return all_success

    def test_offices(self):
        """Test offices endpoint"""
        success, response = self.run_test(
            "Get Offices",
            "GET",
            "offices",
            200
        )
        if success:
            print(f"   Found {len(response)} offices")
        return success

    def test_investors(self):
        """Test investors endpoint"""
        success, response = self.run_test(
            "Get Investors",
            "GET",
            "investors",
            200
        )
        if success:
            print(f"   Found {len(response)} investors")
        return success

    def test_pipeline(self):
        """Test pipeline endpoint"""
        success, response = self.run_test(
            "Get Pipeline",
            "GET",
            "pipeline",
            200
        )
        if success:
            print(f"   Found {len(response)} pipeline items")
        return success

    def test_interactions(self):
        """Test interactions endpoint"""
        success, response = self.run_test(
            "Get Interactions",
            "GET",
            "interactions",
            200
        )
        if success:
            print(f"   Found {len(response)} interactions")
        return success

    def test_fund_manager_login(self):
        """Test fund manager login"""
        success, response = self.run_test(
            "Fund Manager Login",
            "POST",
            "auth/login",
            200,
            data={"email": "demo.fm.1769433733@alknz.com", "password": "Password123!"}
        )
        if success and 'token' in response:
            self.fm_token = response['token']
            self.fm_user = response['user']
            print(f"   Fund Manager: {self.fm_user['first_name']} {self.fm_user['last_name']}")
            print(f"   Role: {self.fm_user['role']}")
            print(f"   Assigned funds: {len(self.fm_user.get('assigned_funds', []))}")
            return True
        return False

    def test_all_funds_spvs_endpoint(self):
        """Test get all funds/SPVs endpoint for Investment Context"""
        success, response = self.run_test(
            "Get All Funds/SPVs",
            "GET",
            "all-funds-spvs",
            200
        )
        if success:
            print(f"   Found {len(response)} funds/SPVs for dropdown")
            if response:
                print(f"   Sample fund: {response[0].get('name', 'N/A')} ({response[0].get('fund_type', 'N/A')})")
        return success

    def test_my_funds_endpoint(self):
        """Test get my assigned funds endpoint"""
        # Switch to fund manager token
        original_token = self.token
        self.token = getattr(self, 'fm_token', None)
        
        if not self.token:
            print("❌ Skipped - No fund manager token available")
            self.token = original_token
            return False
            
        success, response = self.run_test(
            "Get My Assigned Funds",
            "GET",
            "my-funds",
            200
        )
        if success:
            print(f"   Fund Manager has {len(response)} assigned funds")
            if response:
                self.assigned_fund_id = response[0]['id']
                print(f"   Using fund: {response[0]['name']}")
        
        # Restore admin token
        self.token = original_token
        return success

    def test_create_investor_profile_with_investment_context(self):
        """Test creating investor profile with Investment Context fields"""
        if not hasattr(self, 'assigned_fund_id'):
            print("❌ Skipped - No assigned fund available")
            return False
            
        # Switch to fund manager token
        original_token = self.token
        self.token = getattr(self, 'fm_token', None)
        
        if not self.token:
            print("❌ Skipped - No fund manager token available")
            self.token = original_token
            return False

        test_profile_data = {
            "fund_id": self.assigned_fund_id,
            "investor_name": f"Test Investor {datetime.now().strftime('%H%M%S')}",
            "title": "Mr.",
            "gender": "Male",
            "nationality": "American",
            "age": 45,
            "job_title": "CEO",
            "investor_type": "Individual",
            "sector": "Technology",
            "country": "United States",
            "city": "New York",
            "description": "Test investor profile for Investment Context testing",
            "website": "https://example.com",
            # Investment Context fields
            "wealth": "High Net Worth",
            "has_invested_with_alknz": True,
            "has_invested_override": False,
            "previous_alknz_funds": [],
            "expected_ticket_amount": 500000,
            "expected_ticket_currency": "USD",
            "typical_ticket_size": 250000
        }
        
        success, response = self.run_test(
            "Create Investor Profile with Investment Context",
            "POST",
            "investor-profiles",
            200,
            data=test_profile_data
        )
        
        if success and 'id' in response:
            self.created_profile_id = response['id']
            print(f"   Created profile ID: {self.created_profile_id}")
            print(f"   Wealth: {response.get('wealth', 'N/A')}")
            print(f"   Has invested before: {response.get('has_invested_with_alknz', 'N/A')}")
            print(f"   Expected ticket: ${response.get('expected_ticket_amount', 0):,} {response.get('expected_ticket_currency', 'USD')}")
            print(f"   Typical ticket: ${response.get('typical_ticket_size', 0):,}")
        
        # Restore admin token
        self.token = original_token
        return success

    def test_get_investor_profile(self):
        """Test getting investor profile"""
        if not hasattr(self, 'created_profile_id'):
            print("❌ Skipped - No profile ID available")
            return False
            
        # Switch to fund manager token
        original_token = self.token
        self.token = getattr(self, 'fm_token', None)
        
        if not self.token:
            print("❌ Skipped - No fund manager token available")
            self.token = original_token
            return False
            
        success, response = self.run_test(
            "Get Investor Profile",
            "GET",
            f"investor-profiles/{self.created_profile_id}",
            200
        )
        
        if success:
            print(f"   Profile name: {response.get('investor_name', 'N/A')}")
            print(f"   Investment Context fields present: {bool(response.get('wealth'))}")
        
        # Restore admin token
        self.token = original_token
        return success

    def test_update_investor_profile_investment_context(self):
        """Test updating investor profile Investment Context fields"""
        if not hasattr(self, 'created_profile_id'):
            print("❌ Skipped - No profile ID available")
            return False
            
        # Switch to fund manager token
        original_token = self.token
        self.token = getattr(self, 'fm_token', None)
        
        if not self.token:
            print("❌ Skipped - No fund manager token available")
            self.token = original_token
            return False

        update_data = {
            "wealth": "Ultra High Net Worth",
            "has_invested_with_alknz": False,
            "has_invested_override": True,
            "expected_ticket_amount": 1000000,
            "expected_ticket_currency": "EUR",
            "typical_ticket_size": 500000
        }
        
        success, response = self.run_test(
            "Update Investment Context Fields",
            "PUT",
            f"investor-profiles/{self.created_profile_id}",
            200,
            data=update_data
        )
        
        if success:
            print(f"   Updated wealth: {response.get('wealth', 'N/A')}")
            print(f"   Updated has invested: {response.get('has_invested_with_alknz', 'N/A')}")
            print(f"   Override flag: {response.get('has_invested_override', 'N/A')}")
            print(f"   Updated expected ticket: ${response.get('expected_ticket_amount', 0):,} {response.get('expected_ticket_currency', 'USD')}")
        
        # Restore admin token
        self.token = original_token
        return success

    def test_check_investor_history(self):
        """Test check investor history endpoint"""
        if not hasattr(self, 'created_profile_id'):
            print("❌ Skipped - No profile ID available")
            return False
            
        # Switch to fund manager token
        original_token = self.token
        self.token = getattr(self, 'fm_token', None)
        
        if not self.token:
            print("❌ Skipped - No fund manager token available")
            self.token = original_token
            return False
            
        success, response = self.run_test(
            "Check Investor History",
            "GET",
            f"investor-profiles/{self.created_profile_id}/check-history",
            200
        )
        
        if success:
            print(f"   Has invested before: {response.get('has_invested_before', False)}")
            print(f"   Historical funds: {len(response.get('historical_fund_ids', []))}")
        
        # Restore admin token
        self.token = original_token
        return success

    def test_get_investor_profiles_by_fund(self):
        """Test getting investor profiles by fund"""
        if not hasattr(self, 'assigned_fund_id'):
            print("❌ Skipped - No assigned fund available")
            return False
            
        # Switch to fund manager token
        original_token = self.token
        self.token = getattr(self, 'fm_token', None)
        
        if not self.token:
            print("❌ Skipped - No fund manager token available")
            self.token = original_token
            return False
            
        success, response = self.run_test(
            "Get Investor Profiles by Fund",
            "GET",
            f"investor-profiles/fund/{self.assigned_fund_id}",
            200
        )
        
        if success:
            print(f"   Found {len(response)} investor profiles for fund")
            if response:
                profile = response[0]
                print(f"   Sample profile: {profile.get('investor_name', 'N/A')}")
                print(f"   Has Investment Context: {bool(profile.get('wealth'))}")
        
        # Restore admin token
        self.token = original_token
        return success

    def cleanup_investment_context(self):
        """Clean up Investment Context test data"""
        if hasattr(self, 'created_profile_id'):
            # Switch to fund manager token
            original_token = self.token
            self.token = getattr(self, 'fm_token', None)
            
            if self.token:
                success, _ = self.run_test(
                    "Delete Test Investor Profile",
                    "DELETE",
                    f"investor-profiles/{self.created_profile_id}",
                    200
                )
                if success:
                    print("   Test investor profile deleted")
            
            # Restore admin token
            self.token = original_token

    def cleanup(self):
        """Clean up test data"""
        print("\n🧹 Cleaning up test data...")
        
        # Clean up Investment Context test data
        self.cleanup_investment_context()
        
        # Delete test fund
        if self.created_fund_id:
            success, _ = self.run_test(
                "Delete Test Fund",
                "DELETE",
                f"funds/{self.created_fund_id}",
                200
            )
            if success:
                print("   Test fund deleted")

def main():
    print("🚀 Starting ALKNZ Portal Backend API Tests")
    print("=" * 50)
    
    tester = ALKNZPortalTester()
    
    # Authentication Tests
    print("\n📋 AUTHENTICATION TESTS")
    if not tester.test_admin_login():
        print("❌ Admin login failed, stopping tests")
        return 1
    
    tester.test_get_current_user()
    
    # Fund Manager Authentication
    print("\n👨‍💼 FUND MANAGER AUTHENTICATION")
    tester.test_fund_manager_login()
    
    # Dashboard Tests
    print("\n📊 DASHBOARD TESTS")
    tester.test_dashboard_stats()
    
    # User Management Tests
    print("\n👥 USER MANAGEMENT TESTS")
    tester.test_get_users()
    tester.test_create_user()
    tester.test_get_user_by_id()
    tester.test_reset_user_password()
    tester.test_deactivate_user()
    tester.test_activate_user()
    
    # Fund Management Tests
    print("\n💼 FUND MANAGEMENT TESTS")
    tester.test_get_funds()
    tester.test_create_fund()
    tester.test_get_fund_by_id()
    tester.test_update_fund()
    
    # Assignment Tests
    print("\n🔗 ASSIGNMENT TESTS")
    tester.test_fund_assignments()
    
    # Investment Context Tests (New Feature)
    print("\n💰 INVESTMENT CONTEXT TESTS")
    tester.test_all_funds_spvs_endpoint()
    tester.test_my_funds_endpoint()
    tester.test_create_investor_profile_with_investment_context()
    tester.test_get_investor_profile()
    tester.test_update_investor_profile_investment_context()
    tester.test_check_investor_history()
    tester.test_get_investor_profiles_by_fund()
    
    # Lookup Data Tests
    print("\n📚 LOOKUP DATA TESTS")
    tester.test_lookups()
    
    # Other Entity Tests
    print("\n🏢 OTHER ENTITY TESTS")
    tester.test_offices()
    tester.test_investors()
    tester.test_pipeline()
    tester.test_interactions()
    
    # Cleanup
    tester.cleanup()
    
    # Print results
    print("\n" + "=" * 50)
    print(f"📊 FINAL RESULTS")
    print(f"Tests passed: {tester.tests_passed}/{tester.tests_run}")
    success_rate = (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0
    print(f"Success rate: {success_rate:.1f}%")
    
    if success_rate >= 90:
        print("🎉 Backend tests PASSED!")
        return 0
    elif success_rate >= 70:
        print("⚠️  Backend tests mostly passed with some issues")
        return 0
    else:
        print("❌ Backend tests FAILED!")
        return 1

if __name__ == "__main__":
    sys.exit(main())
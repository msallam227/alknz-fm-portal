import "@/index.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import Login from "@/pages/Login";
import SetNewPassword from "@/pages/SetNewPassword";
import AdminLayout from "@/pages/admin/AdminLayout";
import Dashboard from "@/pages/admin/Dashboard";
import UsersPage from "@/pages/admin/UsersPage";
import FundsPage from "@/pages/admin/FundsPage";
import AssignmentsPage from "@/pages/admin/AssignmentsPage";
import AllInvestorsPage from "@/pages/admin/AllInvestorsPage";
import DuplicateInvestorsPage from "@/pages/admin/DuplicateInvestorsPage";
import InvestorRequestsPage from "@/pages/admin/InvestorRequestsPage";
import PersonasAnalyticsPage from "@/pages/admin/PersonasAnalyticsPage";
import FeedbackResponsesPage from "@/pages/admin/FeedbackResponsesPage";
import FundManagerDashboard from "@/pages/FundManagerDashboard";
import FeedbackPage from "@/pages/FeedbackPage";
import { AuthProvider, useAuth } from "@/context/AuthContext";

// Protected Route Component
const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const { user, token, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #02040A 0%, #0A0A1F 40%, #002D72 100%)' }}
      >
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#0047AB]"></div>
      </div>
    );
  }
  
  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }
  
  // Check if user needs to reset password
  if (user.must_reset_password) {
    return <Navigate to="/set-password" replace />;
  }
  
  if (requireAdmin && user.role !== "ADMIN") {
    return <Navigate to="/fm" replace />;
  }
  
  return children;
};

// Password Reset Route - only accessible if must_reset_password is true
const PasswordResetRoute = ({ children }) => {
  const { user, token, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #02040A 0%, #0A0A1F 40%, #002D72 100%)' }}
      >
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#0047AB]"></div>
      </div>
    );
  }
  
  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }
  
  // If password already reset, redirect to appropriate dashboard
  if (!user.must_reset_password) {
    if (user.role === 'ADMIN') {
      return <Navigate to="/admin" replace />;
    }
    return <Navigate to="/fm" replace />;
  }
  
  return children;
};

// Root redirect based on role and password status
const RootRedirect = () => {
  const { user, token, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #02040A 0%, #0A0A1F 40%, #002D72 100%)' }}
      >
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#0047AB]"></div>
      </div>
    );
  }
  
  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }
  
  // Check if user needs to reset password first
  if (user.must_reset_password) {
    return <Navigate to="/set-password" replace />;
  }
  
  if (user.role === "ADMIN") {
    return <Navigate to="/admin" replace />;
  }
  
  return <Navigate to="/fm" replace />;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route 
            path="/set-password" 
            element={
              <PasswordResetRoute>
                <SetNewPassword />
              </PasswordResetRoute>
            } 
          />
          <Route path="/" element={<RootRedirect />} />
          
          {/* Admin Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute requireAdmin>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="funds" element={<FundsPage />} />
            <Route path="assignments" element={<AssignmentsPage />} />
            <Route path="all-investors" element={<AllInvestorsPage />} />
            <Route path="duplicates" element={<DuplicateInvestorsPage />} />
            <Route path="investor-requests" element={<InvestorRequestsPage />} />
            <Route path="personas" element={<PersonasAnalyticsPage />} />
            <Route path="feedback" element={<FeedbackResponsesPage />} />
          </Route>

          {/* Feedback form — accessible to all authenticated users */}
          <Route
            path="/feedback"
            element={
              <ProtectedRoute>
                <FeedbackPage />
              </ProtectedRoute>
            }
          />

          {/* Fund Manager Routes */}
          <Route
            path="/fm"
            element={
              <ProtectedRoute>
                <FundManagerDashboard />
              </ProtectedRoute>
            }
          />
          
          {/* Legacy redirect */}
          <Route path="/dashboard" element={<Navigate to="/fm" replace />} />
          
          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster 
          position="top-right"
          toastOptions={{
            style: {
              background: '#0A1628',
              border: '1px solid #1A2744',
              color: '#FFFFFF',
            },
          }}
        />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

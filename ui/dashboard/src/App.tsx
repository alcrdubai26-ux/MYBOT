import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';

const AppRoutes = () => {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0a0e1a]">
                <div className="h-8 w-8 border-4 border-accent-blue border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <Routes>
            <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/" />} />
            <Route path="/" element={user ? <DashboardPage /> : <Navigate to="/login" />} />
        </Routes>
    );
};

function App() {
    return (
        <Router>
            <AuthProvider>
                <div className="min-h-screen bg-[#0a0e1a] text-steel-100 font-inter">
                    <AppRoutes />
                </div>
            </AuthProvider>
        </Router>
    );
}

export default App;

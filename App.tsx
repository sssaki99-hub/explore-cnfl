
import React, { useContext } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage.tsx';
import AuthPage from './pages/AuthPage.tsx';
import AdminDashboard from './pages/AdminDashboard.tsx';
import ParticipantDashboard from './pages/ParticipantDashboard.tsx';
import Layout from './components/Layout.tsx';
import { AuthContext } from './context/AuthContext.tsx';
import { UserRole } from './types.ts';

const App: React.FC = () => {
  const authContext = useContext(AuthContext);

  if (!authContext) {
    return <div>Loading...</div>;
  }
  const { user } = authContext;

  const AdminRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
    return user && user.role === UserRole.ADMIN ? children : <Navigate to="/auth" />;
  };

  const ParticipantRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
    return user && user.role === UserRole.PARTICIPANT ? children : <Navigate to="/auth" />;
  };

  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/auth" element={user ? <Navigate to="/" /> : <AuthPage />} />
          <Route 
            path="/admin" 
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            } 
          />
          <Route 
            path="/participant" 
            element={
              <ParticipantRoute>
                <ParticipantDashboard />
              </ParticipantRoute>
            } 
          />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
};

export default App;

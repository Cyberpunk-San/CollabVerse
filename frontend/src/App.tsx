import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './components/common/Toast';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ChatProvider } from './contexts/ChatContext';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Chat from './pages/Chat';
import Groups from './pages/Groups';
import Profile from './pages/Profile';
import Team from './pages/Team';
import Requests from './pages/Requests';
import VerifyGithub from './pages/VerifyGithub';
import NotFound from './pages/NotFound';
import PrivateRoute from './components/auth/PrivateRoute';
import './App.css';

const App: React.FC = () => {
  return (
    <div className="app-container">
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <ChatProvider>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />

                  <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
                    <Route index element={<Navigate to="/dashboard" replace />} />
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="chat" element={<Chat />} />
                    <Route path="chat/:userId" element={<Chat />} />
                    <Route path="groups" element={<Groups />} />
                    <Route path="groups/:groupId" element={<Groups />} />
                    <Route path="profile" element={<Profile />} />
                    <Route path="profile/:userId" element={<Profile />} />
                    <Route path="teams" element={<Team />} />
                    <Route path="requests" element={<Requests />} />
                    <Route path="verify" element={<VerifyGithub />} />
                  </Route>

                  <Route path="*" element={<NotFound />} />
                </Routes>
              </ChatProvider>
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
    </div>
  );
};

export default App;
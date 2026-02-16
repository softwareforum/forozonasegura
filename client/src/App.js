import React, { useState } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';

import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Layout/Navbar';

import Home from './pages/Home';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import CheckEmail from './pages/CheckEmail';
import VerifyEmail from './pages/VerifyEmail';

import Communities from './pages/Communities';
import City from './pages/City';
import Category from './pages/Category';
import ProvincePosts from './pages/ProvincePosts';
import PostDetail from './pages/PostDetail';
import CreatePost from './pages/CreatePost';
import Profile from './pages/Profile';
import Help from './pages/Help';
import ProfessionalHelp from './pages/ProfessionalHelp';
import ResourceSubmissionsAdmin from './pages/ResourceSubmissionsAdmin';
import Reports from './pages/Reports';
import ModerationPanel from './pages/ModerationPanel';
import Search from './pages/Search';

import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

import AgeGate from './components/AgeGate/AgeGate';
import RequireAuth from './components/RequireAuth';

import './App.css';

function App() {
  const [ageOk, setAgeOk] = useState(
    localStorage.getItem('age_gate_ok') === '1'
  );

  return (
    <AuthProvider>
      <Router>
        {/* ✅ AgeGate: aparece por encima de todo */}
        {!ageOk && <AgeGate onAccept={() => setAgeOk(true)} />}

        <div className="App">
          <Navbar />

          <main className="main-content">
            <Routes>
              {/* ✅ RUTAS PÚBLICAS */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/check-email" element={<CheckEmail />} />
              <Route path="/verify-email" element={<VerifyEmail />} />

              {/* 🔒 RUTAS PRIVADAS (solo logueados) */}
              <Route
                path="/"
                element={
                  <RequireAuth>
                    <Home />
                  </RequireAuth>
                }
              />

              <Route
                path="/communities"
                element={
                  <RequireAuth>
                    <Communities />
                  </RequireAuth>
                }
              />

              <Route
                path="/communities/:slug"
                element={
                  <RequireAuth>
                    <City />
                  </RequireAuth>
                }
              />

              <Route
                path="/communities/:slug/:provinciaSlug"
                element={
                  <RequireAuth>
                    <ProvincePosts />
                  </RequireAuth>
                }
              />

              <Route
                path="/communities/:slug/:citySlug/:category"
                element={
                  <RequireAuth>
                    <Category />
                  </RequireAuth>
                }
              />

              <Route
                path="/post/:id"
                element={
                  <RequireAuth>
                    <PostDetail />
                  </RequireAuth>
                }
              />

              <Route
                path="/create-post"
                element={
                  <RequireAuth>
                    <CreatePost />
                  </RequireAuth>
                }
              />

              <Route
                path="/profile/:id"
                element={
                  <RequireAuth>
                    <Profile />
                  </RequireAuth>
                }
              />

              <Route
                path="/help"
                element={
                  <RequireAuth>
                    <Help />
                  </RequireAuth>
                }
              />

              <Route
                path="/professional-help"
                element={
                  <RequireAuth>
                    <ProfessionalHelp />
                  </RequireAuth>
                }
              />

              <Route
                path="/professional-help/submissions"
                element={
                  <RequireAuth>
                    <ResourceSubmissionsAdmin />
                  </RequireAuth>
                }
              />

              <Route
                path="/reports"
                element={
                  <RequireAuth>
                    <Reports />
                  </RequireAuth>
                }
              />

              <Route
                path="/moderation"
                element={
                  <RequireAuth>
                    <ModerationPanel />
                  </RequireAuth>
                }
              />

              <Route
                path="/search"
                element={
                  <RequireAuth>
                    <Search />
                  </RequireAuth>
                }
              />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;

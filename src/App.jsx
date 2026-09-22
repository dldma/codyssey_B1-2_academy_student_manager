import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from 'react-router-dom'

import { AuthProvider } from './contexts/AuthContext'

import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'

import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import StudentDetailPage from './pages/StudentDetailPage'

import AdminPage from './pages/AdminPage'
import AdminStudentsPage from './pages/AdminStudentsPage'
import AdminStudentNewPage from './pages/AdminStudentNewPage'
import AdminStudentDetailPage from './pages/AdminStudentDetailPage'

import NotFoundPage from './pages/NotFoundPage'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route
            path="/"
            element={
              <Navigate
                to="/login"
                replace
              />
            }
          />

          <Route
            path="/login"
            element={<LoginPage />}
          />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/students/:id"
            element={
              <ProtectedRoute>
                <StudentDetailPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminRoute>
                  <AdminPage />
                </AdminRoute>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/students"
            element={
              <ProtectedRoute>
                <AdminRoute>
                  <AdminStudentsPage />
                </AdminRoute>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/students/new"
            element={
              <ProtectedRoute>
                <AdminRoute>
                  <AdminStudentNewPage />
                </AdminRoute>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/students/:id"
            element={
              <ProtectedRoute>
                <AdminRoute>
                  <AdminStudentDetailPage />
                </AdminRoute>
              </ProtectedRoute>
            }
          />

          <Route
            path="*"
            element={<NotFoundPage />}
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
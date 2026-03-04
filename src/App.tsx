import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { useAuthStore } from './lib/store';
import Layout from './components/Layout';
// Pages components that will be built soon
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import OrderWizard from './pages/OrderWizard';
import OrderReview from './pages/OrderReview';
import AdminDashboard from './pages/AdminDashboard';
import AdminOrderDetail from './pages/AdminOrderDetail';
import UpdatePassword from './pages/UpdatePassword';
import TemplateWorkflow from './pages/TemplateWorkflow';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuthStore();
  if (isLoading) return <div className="flex h-screen items-center justify-center">Loading...</div>;
  if (!user) {
    // If we're in the middle of a password recovery, don't immediately bounce to login
    if (window.location.hash.includes('type=recovery') || window.location.hash.includes('access_token=')) {
      return <div className="flex h-screen items-center justify-center">Authenticating...</div>;
    }
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, profile, isLoading } = useAuthStore();
  if (isLoading) return <div className="flex h-screen items-center justify-center">Loading...</div>;
  if (!user || profile?.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

function App() {
  const { setUser, setProfile, setLoading } = useAuthStore();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id, session.user.email || '');
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        window.location.hash = '/update-password';
      }
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id, session.user.email || '');
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string, email: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      // If error is PGRST116 (No rows found), insert a new profile
      if (error && error.code === 'PGRST116') {
        const { data: newData, error: insertError } = await supabase
          .from('profiles')
          .insert([{ id: userId, email: email }])
          .select()
          .single();

        if (!insertError && newData) {
          setProfile(newData);
        }
      } else if (!error && data) {
        setProfile(data);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<Auth />} />

        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/template-workflow" element={<TemplateWorkflow />} />
          <Route path="/order/:id?" element={<OrderWizard />} />
          <Route path="/review/:id" element={<OrderReview />} />
          <Route path="/update-password" element={<UpdatePassword />} />
        </Route>

        <Route element={<AdminRoute><Layout /></AdminRoute>}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/order/:id" element={<AdminOrderDetail />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}

export default App;

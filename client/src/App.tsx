import FrameShell from "@/components/FrameShell";
import { CheckoutModal } from "@/components/landing/modals/CheckoutModal";
import { DemoModal } from "@/components/landing/modals/DemoModal";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider } from "@/contexts/AppContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProjectProvider } from "@/contexts/ProjectContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import AdminDashboard from "@/pages/AdminDashboard";
import AdminUsers from "@/pages/AdminUsers";
import Analytics from "@/pages/Analytics";
import Clients from "@/pages/Clients";
import NewClient from "@/pages/NewClient";
import EditClient from "@/pages/EditClient";
import Collaborators from "@/pages/Collaborators";
import CompanySettings from "@/pages/CompanySettings";
import Dashboard from "@/pages/Dashboard";
import Documents from "@/pages/Documents";
import Files from "@/pages/Files";
import Interactions from "@/pages/Interactions";
import Landing from "@/pages/Landing";
import ForgotPassword from "@/pages/ForgotPassword";
import AuthCallback from "@/pages/AuthCallback";
import Login from "@/pages/Login";
import Pipeline from "@/pages/Pipeline";
import Proposals from "@/pages/Proposals";
import Profile from "@/pages/Profile";
import ProjectHub from "@/pages/ProjectHub";
import Register from "@/pages/Register";
import ResetPassword from "@/pages/ResetPassword";
import NotFound from "@/pages/NotFound";
import Studio from "@/pages/Studio";
import Success from "@/pages/Success";
import ToolDetail from "@/pages/ToolDetail";
import Tools from "@/pages/Tools";
import VideoReviews from "@/pages/VideoReviews";
import SharedReview from "@/pages/SharedReview";
import CommandPalette from "@/components/CommandPalette";
import ErrorBoundary from "./components/ErrorBoundary";
import { Route, Switch } from "wouter";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/login" component={Login} />
      <Route path="/auth/callback" component={AuthCallback} />
      <Route path="/register" component={Register} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/clients/new" component={NewClient} />
      <Route path="/clients/:id/editar" component={EditClient} />
      <Route path="/clients" component={Clients} />
      <Route path="/clients/:id" component={Clients} />
      <Route path="/pipeline" component={Pipeline} />
      <Route path="/proposals" component={Proposals} />
      <Route path="/interactions" component={Interactions} />
      <Route path="/documents" component={Documents} />
      <Route path="/company" component={CompanySettings} />
      <Route path="/files" component={Files} />
      <Route path="/files/:projectId" component={Files} />
      <Route path="/video-reviews" component={VideoReviews} />
      <Route path="/video-reviews/:projectId" component={VideoReviews} />
      <Route path="/review/:token" component={SharedReview} />
      <Route path="/collaborators" component={Collaborators} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/success" component={Success} />
      <Route path="/tools" component={Tools} />
      <Route path="/tools/:id" component={ToolDetail} />
      <Route path="/profile" component={Profile} />
      <Route path="/studio/:id" component={Studio} />
      <Route path="/project/:id" component={ProjectHub} />
      <Route path="/project/:projectId/studio/:id" component={Studio} />
      <Route path="/project/:projectId/files" component={Files} />
      <Route path="/project/:projectId/video-reviews" component={VideoReviews} />
      <Route path="/project/:projectId/collaborators" component={Collaborators} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/gerenciar" component={AdminUsers} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" switchable={true}>
        <AuthProvider>
          <ProjectProvider>
            <AppProvider>
              <TooltipProvider>
                <FrameShell>
                  <Toaster />
                  <CommandPalette />
                  <Router />
                  <CheckoutModal />
                  <DemoModal />
                </FrameShell>
              </TooltipProvider>
            </AppProvider>
          </ProjectProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

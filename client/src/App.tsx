import { lazy, Suspense } from "react";
import FrameShell from "@/components/FrameShell";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider } from "@/contexts/AppContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ProjectProvider } from "@/contexts/ProjectContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import CommandPalette from "@/components/CommandPalette";
import ErrorBoundary from "./components/ErrorBoundary";
import { Route, Switch } from "wouter";

const AdminDashboard = lazy(() => import("@/pages/AdminDashboard"));
const AdminUsers = lazy(() => import("@/pages/AdminUsers"));
const Analytics = lazy(() => import("@/pages/Analytics"));
const Clients = lazy(() => import("@/pages/Clients"));
const NewClient = lazy(() => import("@/pages/NewClient"));
const EditClient = lazy(() => import("@/pages/EditClient"));
const Collaborators = lazy(() => import("@/pages/Collaborators"));
const CompanySettings = lazy(() => import("@/pages/CompanySettings"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Documents = lazy(() => import("@/pages/Documents"));
const Files = lazy(() => import("@/pages/Files"));
const Interactions = lazy(() => import("@/pages/Interactions"));
const Landing = lazy(() => import("@/pages/Landing"));
const ForgotPassword = lazy(() => import("@/pages/ForgotPassword"));
const AuthCallback = lazy(() => import("@/pages/AuthCallback"));
const Login = lazy(() => import("@/pages/Login"));
const Pipeline = lazy(() => import("@/pages/Pipeline"));
const Proposals = lazy(() => import("@/pages/Proposals"));
const Profile = lazy(() => import("@/pages/Profile"));
const ProjectHub = lazy(() => import("@/pages/ProjectHub"));
const Register = lazy(() => import("@/pages/Register"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const Studio = lazy(() => import("@/pages/Studio"));
const Success = lazy(() => import("@/pages/Success"));
const ToolDetail = lazy(() => import("@/pages/ToolDetail"));
const Tools = lazy(() => import("@/pages/Tools"));
const VideoReviews = lazy(() => import("@/pages/VideoReviews"));
const SharedReview = lazy(() => import("@/pages/SharedReview"));
const CheckoutModal = lazy(() => import("@/components/landing/modals/CheckoutModal").then((module) => ({ default: module.CheckoutModal })));
const DemoModal = lazy(() => import("@/components/landing/modals/DemoModal").then((module) => ({ default: module.DemoModal })));

function PageFallback() {
  return (
    <div className="min-h-screen bg-frame-black text-frame-white flex items-center justify-center px-6">
      <div className="w-full max-w-sm border border-frame-gray-3 bg-frame-gray-1/70 p-5 shadow-[0_26px_90px_rgba(0,0,0,0.35)]">
        <div className="mb-5 flex items-center justify-between">
          <span className="font-frame-mono text-[0.62rem] uppercase tracking-[0.18em] text-frame-orange">Cena Studio</span>
          <span className="h-2 w-2 bg-frame-orange animate-pulse" />
        </div>
        <div className="space-y-2" aria-hidden="true">
          <div className="h-2 w-11/12 bg-frame-gray-3/70" />
          <div className="h-2 w-8/12 bg-frame-gray-3/50" />
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="h-12 border border-frame-gray-3 bg-frame-black/35" />
            <div className="h-12 border border-frame-gray-3 bg-frame-black/35" />
            <div className="h-12 border border-frame-gray-3 bg-frame-black/35" />
          </div>
        </div>
        <p className="mt-5 font-frame-mono text-[0.62rem] uppercase tracking-[0.16em] text-frame-gray-light">
          Carregando espaço de trabalho
        </p>
      </div>
    </div>
  );
}

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
      <Route path="/project/:projectId/documents" component={Documents} />
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
    <LanguageProvider>
      <ErrorBoundary>
        <ThemeProvider defaultTheme="dark" switchable={true}>
          <AuthProvider>
            <ProjectProvider>
              <AppProvider>
                <TooltipProvider>
                  <FrameShell>
                    <Toaster />
                    <CommandPalette />
                    <Suspense fallback={<PageFallback />}>
                      <Router />
                      <CheckoutModal />
                      <DemoModal />
                    </Suspense>
                  </FrameShell>
                </TooltipProvider>
              </AppProvider>
            </ProjectProvider>
          </AuthProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </LanguageProvider>
  );
}

export default App;

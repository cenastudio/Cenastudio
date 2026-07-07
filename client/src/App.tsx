import { lazy, Suspense } from "react";
import { Redirect, Route, Switch } from "wouter";
import FrameShell from "@/components/FrameShell";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider } from "@/contexts/AppContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { PlanProvider } from "@/contexts/PlanContext";
import { ProgressProvider } from "@/contexts/ProgressContext";
import { ProjectProvider } from "@/contexts/ProjectContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import CommandPalette from "@/components/CommandPalette";
import QuickActionsMenu from "@/components/QuickActionsMenu";
import { GlobalProgressBar } from "@/components/GlobalProgressBar";
import ErrorBoundary from "./components/ErrorBoundary";
import WorkspaceLoadingShell from "@/components/WorkspaceLoadingShell";
import { ForcePasswordReset } from "@/components/ForcePasswordReset";

const AdminDashboard = lazy(() => import("@/pages/AdminDashboard"));
const AdminUsers = lazy(() => import("@/pages/AdminUsers"));
const Analytics = lazy(() => import("@/pages/Analytics"));
const AnalyticsPremium = lazy(() => import("@/pages/AnalyticsPremium"));
const DashboardView = lazy(() => import("@/pages/DashboardView"));
const Clients = lazy(() => import("@/pages/Clients"));
const NewClient = lazy(() => import("@/pages/NewClient"));
const EditClient = lazy(() => import("@/pages/EditClient"));
const ClientDetail = lazy(() => import("@/pages/ClientDetail"));
const Collaborators = lazy(() => import("@/pages/Collaborators"));
const TeamPage = lazy(() => import("@/pages/Team"));
const CompanySettings = lazy(() => import("@/pages/CompanySettings"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Home = lazy(() => import("@/pages/Home"));
const Projects = lazy(() => import("@/pages/Projects"));
const ProductionShell = lazy(() => import("@/pages/ProductionShell"));
const CommercialHub = lazy(() => import("@/pages/CommercialHub"));
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
const ProjectChapter = lazy(() => import("@/pages/ProjectChapter"));
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
  return <WorkspaceLoadingShell />;
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
      <Route path="/home">{() => <Redirect to="/dashboard" />}</Route>
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/projects" component={ProductionShell} />
      <Route path="/tools" component={ProductionShell} />
      <Route path="/tools/:id" component={ToolDetail} />
      <Route path="/video-reviews" component={ProductionShell} />
      <Route path="/commercial" component={CommercialHub} />
      <Route path="/clients/new" component={NewClient} />
      <Route path="/clients/:id/editar" component={EditClient} />
      <Route path="/clients/:id" component={ClientDetail} />
      <Route path="/clients" component={CommercialHub} />
      <Route path="/pipeline" component={CommercialHub} />
      <Route path="/proposals" component={CommercialHub} />
      <Route path="/interactions" component={CommercialHub} />
      <Route path="/documents" component={Documents} />
      <Route path="/company" component={CompanySettings} />
      <Route path="/files" component={Files} />
      <Route path="/files/:projectId" component={Files} />
      <Route path="/video-reviews/:projectId" component={VideoReviews} />
      <Route path="/review/:token" component={SharedReview} />
      <Route path="/collaborators" component={Collaborators} />
      <Route path="/team" component={TeamPage} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/analytics-premium" component={AnalyticsPremium} />
      <Route path="/analytics-premium/dashboard/:id">{() => <Redirect to="/analytics" />}</Route>
      <Route path="/success" component={Success} />
      <Route path="/profile" component={Profile} />
      <Route path="/studio/:id" component={Studio} />
      <Route path="/project/:projectId/journey/:stage" component={ProjectChapter} />
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
            <PlanProvider>
              <ProgressProvider>
                <ProjectProvider>
                  <AppProvider>
                    <TooltipProvider>
                      <FrameShell>
                        <Toaster />
                        <GlobalProgressBar isLoading={false} />
                        <QuickActionsMenu />
                        <Suspense fallback={<PageFallback />}>
                          <Router />
                          <CheckoutModal />
                          <DemoModal />
                          <ForcePasswordReset />
                        </Suspense>
                      </FrameShell>
                    </TooltipProvider>
                  </AppProvider>
                </ProjectProvider>
              </ProgressProvider>
            </PlanProvider>
          </AuthProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </LanguageProvider>
  );
}

export default App;

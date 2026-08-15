import { lazy, Suspense, useEffect } from "react";
import { Redirect, Route, Switch, useLocation } from "wouter";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { AnimatePresence, motion, MotionConfig } from "framer-motion";
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
import { VisualPreferencesProvider, useVisualPreferences } from "@/contexts/VisualPreferencesContext";
import { BehaviorPreferencesProvider } from "@/contexts/BehaviorPreferencesContext";
import CommandPalette from "@/components/CommandPalette";
import QuickActionsMenu from "@/components/QuickActionsMenu";
import { GlobalProgressBar } from "@/components/GlobalProgressBar";
import ErrorBoundary from "./components/ErrorBoundary";
import WorkspaceLoadingShell from "@/components/WorkspaceLoadingShell";
import { ForcePasswordReset } from "@/components/ForcePasswordReset";
import { applyDocumentMetadata } from "@/lib/documentMetadata";

const AdminDashboard = lazy(() => import("@/pages/AdminDashboard"));
const AdminUsers = lazy(() => import("@/pages/AdminUsers"));
const Analytics = lazy(() => import("@/pages/Analytics"));
const DashboardView = lazy(() => import("@/pages/DashboardView"));
const Clients = lazy(() => import("@/pages/Clients"));
const NewClient = lazy(() => import("@/pages/NewClient"));
const EditClient = lazy(() => import("@/pages/EditClient"));
const ClientDetail = lazy(() => import("@/pages/ClientDetail"));

const TeamPage = lazy(() => import("@/pages/Team"));
const CompanySettings = lazy(() => import("@/pages/CompanySettings"));
const Assets = lazy(() => import("@/pages/Assets"));
const FilesUnified = lazy(() => import("@/pages/FilesUnified"));
const Webhooks = lazy(() => import("@/pages/Webhooks"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Projects = lazy(() => import("@/pages/Projects"));
const ProductionShell = lazy(() => import("@/pages/ProductionShell"));
const CommercialHub = lazy(() => import("@/pages/CommercialHub"));
const Documents = lazy(() => import("@/pages/Documents"));
const Budget = lazy(() => import("@/pages/Budget"));
const Dre = lazy(() => import("@/pages/Dre"));
const Equipment = lazy(() => import("@/pages/Equipment"));
const ShotList = lazy(() => import("@/pages/ShotList"));
const Timesheet = lazy(() => import("@/pages/Timesheet"));
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
const MeetingView = lazy(() => import("@/pages/MeetingView"));
const ProposalView = lazy(() => import("@/pages/ProposalView"));
const CheckoutModal = lazy(() => import("@/components/landing/modals/CheckoutModal").then((module) => ({ default: module.CheckoutModal })));
const DemoModal = lazy(() => import("@/components/landing/modals/DemoModal").then((module) => ({ default: module.DemoModal })));
const PortalApp = lazy(() => import("@/portal/PortalApp"));

function PageFallback() {
  return <WorkspaceLoadingShell />;
}

function PageTransition({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { preferences } = useVisualPreferences();
  const reduced = preferences.reduceAnimations;

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location}
        initial={reduced ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduced ? { opacity: 1 } : { opacity: 0, y: -10 }}
        transition={{ duration: reduced ? 0 : 0.15, ease: "easeInOut" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

function Router() {
  return (
    <PageTransition>
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/r/:code">{(params) => <Redirect to={`/register?ref=${params.code}`} />}</Route>
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
        <Route path="/assets">{() => <Redirect to="/files-unified?tab=all" />}</Route>
        <Route path="/files-unified" component={FilesUnified} />
        <Route path="/webhooks">{() => <Webhooks />}</Route>
        <Route path="/files">{() => <Redirect to="/files-unified?tab=project" />}</Route>
        <Route path="/files/:projectId">{() => <Redirect to="/files-unified?tab=project" />}</Route>
        <Route path="/video-reviews/:projectId">{() => <VideoReviews />}</Route>
        <Route path="/review/:token" component={SharedReview} />
        <Route path="/meeting/:token" component={MeetingView} />
        <Route path="/proposal/:token" component={ProposalView} />

        <Route path="/team" component={TeamPage} />
        <Route path="/analytics" component={Analytics} />
        <Route path="/success" component={Success} />
        <Route path="/profile" component={Profile} />
        <Route path="/studio/:id" component={Studio} />
        <Route path="/project/:projectId/journey/:stage" component={ProjectChapter} />
        <Route path="/project/:id" component={ProjectHub} />
        <Route path="/project/:projectId/studio/:id" component={Studio} />
        <Route path="/project/:projectId/documents" component={Documents} />
        <Route path="/project/:projectId/budget" component={Budget} />
        <Route path="/project/:projectId/dre" component={Dre} />
        <Route path="/equipment">{() => <Equipment />}</Route>
        <Route path="/project/:projectId/shotlist" component={ShotList} />
        <Route path="/timesheet">{() => <Timesheet />}</Route>
        <Route path="/project/:projectId/files">{() => <Files />}</Route>
        <Route path="/project/:projectId/video-reviews">{() => <VideoReviews />}</Route>

        <Route path="/admin" component={AdminDashboard} />
        <Route path="/admin/gerenciar" component={AdminUsers} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </PageTransition>
  );
}

function PreferenceMotion({ children }: { children: React.ReactNode }) {
  const { preferences } = useVisualPreferences();
  return <MotionConfig reducedMotion={preferences.reduceAnimations ? "always" : "user"}>{children}</MotionConfig>;
}

const PUBLIC_DARK_ROUTES = new Set([
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/auth/callback",
]);

const APP_NAME = import.meta.env.VITE_APP_NAME?.trim() || "Cena Studio";
const APP_SEO_TITLE = import.meta.env.VITE_APP_SEO_TITLE?.trim()
  || `${APP_NAME} — Software para Produtoras de Vídeo | Gestão com IA`;
const APP_SEO_DESCRIPTION = import.meta.env.VITE_APP_DESCRIPTION?.trim()
  || "Software para produtoras de vídeo: gerencie clientes, projetos, arquivos e aprovações em um só lugar. Gere documentos com IA e economize tempo operacional.";
const ROUTE_TITLES: Record<string, string> = {
  login: "Entrar",
  register: "Criar conta",
  dashboard: "Dashboard",
  projects: "Projetos",
  commercial: "Comercial",
  clients: "Clientes",
  profile: "Perfil",
  analytics: "Financeiro",
  team: "Equipe",
  admin: "Administração",
};

function App() {
  const [location] = useLocation();
  const path = location.split("?")[0] || "/";
  const forcePublicDarkTheme = PUBLIC_DARK_ROUTES.has(path) || path.startsWith("/r/");

  // Portal do Cliente (spec: portal-do-cliente): sub-árvore isolada, montada
  // ANTES de qualquer provider da produtora (AuthProvider/PlanProvider/etc).
  // O cliente final não é um User — reaproveitar esses providers vazaria
  // contexto de auth da produtora para uma sessão que não deve ter acesso a
  // ele, e vice-versa.
  if (path.startsWith("/portal")) {
    return (
      <LanguageProvider>
        <ErrorBoundary>
          <Suspense fallback={<PageFallback />}>
            <PortalApp />
          </Suspense>
        </ErrorBoundary>
      </LanguageProvider>
    );
  }

  useEffect(() => {
    const isLanding = path === "/";
    const routeSegment = path.split("/").filter(Boolean)[0] || "";
    applyDocumentMetadata({
      title: isLanding ? APP_SEO_TITLE : `${ROUTE_TITLES[routeSegment] || "Área segura"} | ${APP_NAME}`,
      description: isLanding ? APP_SEO_DESCRIPTION : `${APP_NAME} é o centro operacional da sua produtora.`,
      robots: isLanding ? "index, follow, max-image-preview:large" : "noindex, nofollow, noarchive",
      path,
    });
  }, [path]);

  return (
    <LanguageProvider>
      <ErrorBoundary>
        <AuthProvider>
          <VisualPreferencesProvider forcedTheme={forcePublicDarkTheme ? "dark" : undefined}>
            <BehaviorPreferencesProvider>
              <ThemeProvider defaultTheme="dark" switchable={true}>
                <PreferenceMotion>
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
                              <SpeedInsights />
                            </FrameShell>
                          </TooltipProvider>
                        </AppProvider>
                      </ProjectProvider>
                    </ProgressProvider>
                  </PlanProvider>
                </PreferenceMotion>
              </ThemeProvider>
            </BehaviorPreferencesProvider>
          </VisualPreferencesProvider>
        </AuthProvider>
      </ErrorBoundary>
    </LanguageProvider>
  );
}

export default App;

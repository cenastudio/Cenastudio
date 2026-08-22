import { Redirect, Route, Switch } from "wouter";
import { PortalAuthProvider } from "./PortalAuthContext";
import PortalProtectedRoute from "./PortalProtectedRoute";
import PortalLogin from "./pages/PortalLogin";
import PortalDashboard from "./pages/PortalDashboard";
import PortalProjectDetail from "./pages/PortalProjectDetail";
import PortalFiles from "./pages/PortalFiles";
import PortalProposals from "./pages/PortalProposals";
import PortalMeetings from "./pages/PortalMeetings";
import PortalAccount from "./pages/PortalAccount";
import PortalActivate from "./pages/PortalActivate";

/**
 * Portal do Cliente (spec: portal-do-cliente) — sub-árvore isolada montada
 * sob /portal/*. Deliberadamente NÃO usa AuthProvider/PlanProvider da
 * produtora (App.tsx) — auth, sessão e cookie são totalmente separados.
 */
export default function PortalApp() {
  return (
    <PortalAuthProvider>
      <Switch>
        <Route path="/portal/login" component={PortalLogin} />
        <Route path="/portal/activate" component={PortalActivate} />
        <Route path="/portal/dashboard">
          {() => (
            <PortalProtectedRoute>
              <PortalDashboard />
            </PortalProtectedRoute>
          )}
        </Route>
        <Route path="/portal/projects/:id">
          {() => (
            <PortalProtectedRoute>
              <PortalProjectDetail />
            </PortalProtectedRoute>
          )}
        </Route>
        <Route path="/portal/files">
          {() => (
            <PortalProtectedRoute>
              <PortalFiles />
            </PortalProtectedRoute>
          )}
        </Route>
        <Route path="/portal/proposals">
          {() => (
            <PortalProtectedRoute>
              <PortalProposals />
            </PortalProtectedRoute>
          )}
        </Route>
        <Route path="/portal/meetings">
          {() => (
            <PortalProtectedRoute>
              <PortalMeetings />
            </PortalProtectedRoute>
          )}
        </Route>
        <Route path="/portal/account">
          {() => (
            <PortalProtectedRoute>
              <PortalAccount />
            </PortalProtectedRoute>
          )}
        </Route>
        <Route path="/portal">{() => <Redirect to="/portal/dashboard" />}</Route>
        <Route>{() => <Redirect to="/portal/dashboard" />}</Route>
      </Switch>
    </PortalAuthProvider>
  );
}

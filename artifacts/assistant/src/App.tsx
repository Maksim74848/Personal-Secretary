import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme";
import AuthGate from "@/components/AuthGate";
import Layout from "@/components/Layout";
import AssistantPage from "@/pages/dashboard";
import CalendarPage from "@/pages/calendar";
import TasksPage from "@/pages/tasks";
import ContactsPage from "@/pages/contacts";
import FilesPage from "@/pages/files";
import SettingsPage from "@/pages/settings";
import PrivacyPage from "@/pages/privacy";
import TermsPage from "@/pages/terms";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/privacy" component={PrivacyPage} />
      <Route path="/terms" component={TermsPage} />
      <Route>
        <AuthGate>
          <Layout>
            <Switch>
              <Route path="/" component={AssistantPage} />
              <Route path="/calendar" component={CalendarPage} />
              <Route path="/tasks" component={TasksPage} />
              <Route path="/contacts" component={ContactsPage} />
              <Route path="/files" component={FilesPage} />
              <Route path="/settings" component={SettingsPage} />
              <Route component={NotFound} />
            </Switch>
          </Layout>
        </AuthGate>
      </Route>
    </Switch>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

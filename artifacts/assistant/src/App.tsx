import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/dashboard";
import Chat from "@/pages/chat";
import Calendar from "@/pages/calendar";
import Tasks from "@/pages/tasks";
import Contacts from "@/pages/contacts";
import Status from "@/pages/status";
import Telegram from "@/pages/telegram";
import Rules from "@/pages/rules";
import Memory from "@/pages/memory";
import Logs from "@/pages/logs";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/chat" component={Chat} />
        <Route path="/calendar" component={Calendar} />
        <Route path="/tasks" component={Tasks} />
        <Route path="/contacts" component={Contacts} />
        <Route path="/status" component={Status} />
        <Route path="/telegram" component={Telegram} />
        <Route path="/rules" component={Rules} />
        <Route path="/memory" component={Memory} />
        <Route path="/logs" component={Logs} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
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

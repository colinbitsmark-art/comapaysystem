import AppRoutes from "./routes/AppRoutes";
import { useApplyBranding } from "./hooks/useApplyBranding";

function App() {
  useApplyBranding();
  return <AppRoutes />;
}

export default App;



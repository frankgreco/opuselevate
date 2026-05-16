import { KineticPage } from "./components/KineticPage";
import { MonacoBackdrop } from "./components/MonacoBackdrop";

export default function Home() {
  return <KineticPage backdrop={<MonacoBackdrop />} />;
}

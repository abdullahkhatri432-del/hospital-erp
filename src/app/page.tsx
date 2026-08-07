import { ErpShell } from "@/components/erp-shell";
import { StoreProvider } from "@/lib/store";

export default function Home() {
  return (
    <StoreProvider>
      <ErpShell />
    </StoreProvider>
  );
}

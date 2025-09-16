import { FlaskConical } from "lucide-react";

export function DemoBanner() {
  return (
    <div className="demo-banner text-white p-3 text-center">
      <div className="flex items-center justify-center gap-2">
        <FlaskConical className="h-4 w-4" />
        <span className="font-medium" data-testid="text-demo-banner">
          DEMO MODE - All payments and external integrations are simulated
        </span>
      </div>
    </div>
  );
}

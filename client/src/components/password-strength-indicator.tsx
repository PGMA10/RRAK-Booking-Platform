import { validatePassword, type PasswordValidationResult } from "@/lib/password-validation";
import { Check, X } from "lucide-react";

interface PasswordStrengthIndicatorProps {
  password: string;
}

export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  const validation = validatePassword(password);

  if (!password) {
    return null;
  }

  const getStrengthColor = () => {
    switch (validation.strength) {
      case "strong":
        return "bg-green-500";
      case "good":
        return "bg-blue-500";
      case "fair":
        return "bg-yellow-500";
      default:
        return "bg-red-500";
    }
  };

  const getStrengthWidth = () => {
    return `${(validation.strengthScore / 5) * 100}%`;
  };

  const requirements = [
    { met: validation.hasMinLength, label: "At least 8 characters" },
    { met: validation.hasNumber, label: "Contains a number" },
    { met: validation.hasUppercase, label: "Contains uppercase letter" },
    { met: validation.hasLowercase, label: "Contains lowercase letter" },
    { met: validation.hasSpecialChar, label: "Contains special character (!@#$...)" },
  ];

  return (
    <div className="mt-2 space-y-3" data-testid="password-strength-indicator">
      <div className="space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Password strength:</span>
          <span className={`font-medium capitalize ${
            validation.strength === "strong" ? "text-green-600" :
            validation.strength === "good" ? "text-blue-600" :
            validation.strength === "fair" ? "text-yellow-600" :
            "text-red-600"
          }`}>
            {validation.strength}
          </span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${getStrengthColor()}`}
            style={{ width: getStrengthWidth() }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-1">
        {requirements.map((req, index) => (
          <div
            key={index}
            className={`flex items-center gap-2 text-sm ${
              req.met ? "text-green-600" : "text-muted-foreground"
            }`}
            data-testid={`password-requirement-${index}`}
          >
            {req.met ? (
              <Check className="h-4 w-4 flex-shrink-0" />
            ) : (
              <X className="h-4 w-4 flex-shrink-0" />
            )}
            <span>{req.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

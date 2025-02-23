import React, { useEffect, useState } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import Button from "@/components/Button";

// Email domain mapping
const emailProviders: Record<string, string> = {
  "gmail.com": "https://mail.google.com/",
  "outlook.com": "https://outlook.office.com/mail/",
  "hotmail.com": "https://outlook.office.com/mail/",
  "live.com": "https://outlook.office.com/mail/",
  "icloud.com": "https://www.icloud.com/",
  "yahoo.com": "https://mail.yahoo.com/",
  // ...
};

const SignUpRedirect: React.FC = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [emailServiceUrl, setEmailServiceUrl] = useState<string>("");

  useEffect(() => {
    // If there is no token OR there is no state with the email,
    // means we didn't get here after registering. Redirects to /signup
    if (!token || !location.state) {
      navigate("/signup");
      return;
    }

    // Retrieves the email from the state
    const { email } = location.state as { email: string };
    if (!email) {
      navigate("/signup");
      return;
    }

    // Identifies the email domain
    const domain = email.split("@")[1]?.toLowerCase() || "";

    // Search for the corresponding URL or generate a mailto
    const url = emailProviders[domain] || `mailto:${email}`;
    setEmailServiceUrl(url);

  }, [location.state, navigate, token]);

  const handleClick = () => {
    if (emailServiceUrl) {
      window.open(emailServiceUrl, "_blank");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-8 px-4">
      <div className="max-w-md w-full bg-white p-6 shadow-md rounded-md text-center">
        <h1 className="text-2xl font-semibold text-gray-800 mb-4">
          Cadastro realizado com sucesso!
        </h1>
        <p className="text-gray-600 mb-6">
          Verifique seu email para ativar sua conta.
        </p>

        {emailServiceUrl && (
          <Button
            variant="primary"
            onClick={handleClick}
            className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
          >
            Acessar meu email
          </Button>
        )}
      </div>
    </div>
  );
};

export default SignUpRedirect;

import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

import { useAuth, apiRequest } from "@/api";

import Snackbar from "@/components/Snackbar";
import Alert from "@/components/Alert";
import { InlineLoader } from "src/components/Loaders";

import "./styles.css";

interface PurchaseDetails {
  item: string;
  amount: string;
  date: string;
  transactionId: string;
}

const PurchaseConfirmation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [snackBarMessage, setSnackBarMessage] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [purchaseDetails, setPurchaseDetails] = useState<PurchaseDetails | null>(null);
  const [isFetching, setIsFetching] = useState<boolean>(true);

  // Using authentication hook to initialize user data
  const { handleInitUser } = useAuth();

  const query = new URLSearchParams(location.search);
  const sessionId = query.get("session_id");

  useEffect(() => {
    const fetchPurchaseDetails = async () => {
      if (!sessionId) {
        setSnackBarMessage("Invalid session.");
        setIsFetching(false);
        return;
      }

      try {
        const response = await apiRequest<{ purchase_details: PurchaseDetails }>(
          "payments/get-purchase-details/",
          "GET",
          { session_id: sessionId },
          true
        );

        if (response.detail) {
          setSnackBarMessage(response.detail);
        } else if (response.data) {
          setPurchaseDetails(response.data.purchase_details);

          // Call handleInitUser to update user subscription status
          await handleInitUser();
        } else {
          setSnackBarMessage("Could not retrieve purchase details.");
        }
      } catch (err) {
        console.error("Error fetching purchase details:", err);
        setSnackBarMessage("Could not retrieve purchase details.");
      } finally {
        setIsFetching(false);
      }
    };

    fetchPurchaseDetails();
  }, [sessionId, handleInitUser]);

  const handleRedirect = async () => {
    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      navigate("/subscription-management");
    } catch (err) {
      console.error("Redirection error:", err);
      setSnackBarMessage("An error occurred while redirecting. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Show a loading indicator while fetching data
  if (isFetching) {
    return <InlineLoader />;
  }

  // Show error message if purchase details are not available
  if (!purchaseDetails) {
    return (
      <div className="purchase-confirmation-page">
        <Snackbar
          className="purchase-confirmation__snackbar"
          open={snackBarMessage !== ""}
          autoHideDuration={6000}
          onClose={() => setSnackBarMessage("")}
        >
          <Alert className="purchase-confirmation__alert" severity="error">
            {snackBarMessage}
          </Alert>
        </Snackbar>
      </div>
    );
  }

  return (
    <div className="purchase-confirmation-page">
      <div className="purchase-confirmation-page__left">
        <div className="purchase-confirmation__container">
          <div className="purchase-confirmation__logo-container">
            <a href="https://spifex.com">
              <img
                className="purchase-confirmation__logo"
                alt="Logo"
                src="src/assets/Icons/Logo/logo-black.svg"
              />
            </a>
          </div>
          <div className="purchase-confirmation__content">
            <div className="purchase-confirmation__header">
              <h2>Purchase Confirmed!</h2>
            </div>
            <div className="purchase-confirmation__details">
              <div className="purchase-confirmation__item">
                <label>Item</label>
                <span>{purchaseDetails.item}</span>
              </div>
              <div className="purchase-confirmation__item">
                <label>Amount</label>
                <span>{purchaseDetails.amount}</span>
              </div>
              <div className="purchase-confirmation__item">
                <label>Date</label>
                <span>
                  {new Date(Number(purchaseDetails.date) * 1000).toLocaleDateString()}
                </span>
              </div>
              <div className="purchase-confirmation__item">
                <label>Transaction ID</label>
                <span>{purchaseDetails.transactionId}</span>
              </div>
            </div>
            <div className="purchase-confirmation__buttons-container">
              <button
                onClick={handleRedirect}
                disabled={isLoading}
                className="purchase-confirmation__button button-primary"
              >
                {isLoading ? <InlineLoader /> : "Go Back"}
              </button>
            </div>
          </div>
        </div>

        {/* Snackbar for displaying error messages */}
        <Snackbar
          className="purchase-confirmation__snackbar"
          open={snackBarMessage !== ""}
          autoHideDuration={6000}
          onClose={() => setSnackBarMessage("")}
        >
          <Alert className="purchase-confirmation__alert" severity="error">
            {snackBarMessage}
          </Alert>
        </Snackbar>
      </div>
      <div className="purchase-confirmation-page__right">
        <img
          className="purchase-confirmation-page__image"
          alt="Background"
          src="src/assets/Images/background/purchase-success.svg"
        />
      </div>
    </div>
  );
};

export default PurchaseConfirmation;

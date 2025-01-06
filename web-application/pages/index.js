import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { FaCog, FaClipboardList } from "react-icons/fa";

const Home = () => {
  const [mealPlans, setMealPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [expandedPlans, setExpandedPlans] = useState({});
  const [pollingActive, setPollingActive] = useState(false);
  const [toastMessage, setToastMessage] = useState({ message: "" });
  const [preferences, setPreferences] = useState({
    likes: "",
    dislikes: "",
    hardRequirements: "",
  });

  // Fetch Meal Plans
  useEffect(() => {
    const fetchMealPlans = async () => {
      try {
        const response = await fetch("/api/meal-plans");
        if (!response.ok) throw new Error("Failed to fetch meal plans");
        const data = await response.json();
        setMealPlans(data.meal_plans);
      } catch (error) {
        console.error("Error fetching meal plans:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchMealPlans();
  }, []);

  // Polling for Meal Plan Updates
  useEffect(() => {
    let intervalId;

    const pollForUpdates = async () => {
      try {
        const response = await fetch("/api/meal-plans");
        if (!response.ok) throw new Error("Failed to fetch updated meal plans");
        const data = await response.json();
        setMealPlans(data.meal_plans);

        // Stop polling if all meal plans are updated
        if (data.meal_plans.every((plan) => plan.status !== "Processing")) {
          clearInterval(intervalId);
          setPollingActive(false);
        }
      } catch (error) {
        console.error("Error polling for updates:", error);
      }
    };

    if (pollingActive) {
      intervalId = setInterval(pollForUpdates, 10000);
    }

    return () => clearInterval(intervalId);
  }, [pollingActive]);

  // Toast Message
  const showToastWithMessage = (message) => {
    setToastMessage({ message });
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  // Handle Deletion
  const handleDeleteMealPlan = async (id) => {
    if (confirm("Are you sure you want to delete this meal plan?")) {
      try {
        const response = await fetch(`/api/delete-meal-plan/${id}`, {
          method: "DELETE",
        });
        if (!response.ok) throw new Error("Failed to delete meal plan");

        setMealPlans((prev) => prev.filter((plan) => plan._id !== id));
        showToastWithMessage("Meal plan deleted successfully!");
      } catch (error) {
        console.error("Error deleting meal plan:", error);
        alert("Failed to delete meal plan. Please try again.");
      }
    }
  };

  // Handle Meal Plan Request
  const handleRequestMealPlan = async () => {
    try {
      const response = await fetch("/api/request-meal-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Failed to request meal plan");

      const data = await response.json();
      setMealPlans((prev) => [data.data, ...prev]);
      setPollingActive(true); // Start polling for updates
      showToastWithMessage("Meal plan request submitted!");
    } catch (error) {
      console.error("Error requesting meal plan:", error);
      alert("Failed to request meal plan. Please try again.");
    }
  };

  // Fetch Preferences
  const fetchPreferences = async () => {
    setSettingsLoading(true);
    try {
      const response = await fetch("/api/get-preferences");
      if (!response.ok) throw new Error("Failed to fetch preferences");
      const data = await response.json();
      setPreferences(data.settings);
    } catch (error) {
      console.error("Error fetching preferences:", error);
    } finally {
      setSettingsLoading(false);
      setShowSettings(true);
    }
  };

  // Save Preferences
  const handleSettingsSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/save-preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(preferences),
      });
      if (!response.ok) throw new Error("Failed to save preferences");

      showToastWithMessage("Meal plan settings saved!");
      setShowSettings(false);
    } catch (error) {
      console.error("Error saving preferences:", error);
      alert("Failed to save preferences. Please try again.");
    }
  };

  // Toggle Meal Plan Details
  const togglePlanDetails = (id) => {
    setExpandedPlans((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Render Meal Plans
  const renderMealPlans = () => {
    const groupedPlans = mealPlans.reduce((acc, plan) => {
      const month = new Date(plan.startDate).toLocaleString("default", {
        month: "long",
        year: "numeric",
      });
      if (!acc[month]) acc[month] = [];
      acc[month].push(plan);
      return acc;
    }, {});

    const sortedMonths = Object.keys(groupedPlans).sort(
      (a, b) => new Date(`${b} 01`) - new Date(`${a} 01`)
    );

    return sortedMonths.map((month) => (
      <div key={month} className="mb-4">
        <h5 className="text-secondary mb-3">{month}</h5>
        <div className="row g-3">
          {groupedPlans[month].map((plan) => (
            <div className="col-md-12" key={plan._id}>
              <div className="card border-light shadow-sm h-100">
                <div
                  className="card-body"
                  onClick={() => togglePlanDetails(plan._id)}
                  style={{ cursor: "pointer" }}
                >
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <h6 className="card-title">
                        Week of {new Date(plan.startDate).toLocaleDateString()}
                      </h6>
                      <p className="text-muted">{plan.meal_plan ? plan.meal_plan.summary : "Excuse me a minute while I work on a tasty meal plan."}</p>
                    </div>
                    <span
                      className={`badge bg-${
                        plan.status === "Available" ? "success" : "warning"
                      }`}
                    >
                      {plan.status}
                    </span>
                  </div>
                  {expandedPlans[plan._id] && plan.meal_plan && (
                    <div className="mt-3">
                      <h6>Meals for the Week:</h6>
                      <ul className="list-unstyled">
                        {plan.meal_plan.meals.map((meal, idx) => (
                          <li key={idx} className="mb-3">
                            <strong>{meal.title}</strong>
                            <p className="mb-1">
                              <em>Adult Version:</em> {meal.adultVersion}
                            </p>
                            <p className="mb-1">
                              <em>Kids Version:</em> {meal.kidsVersion}
                            </p>
                            <p>
                              <em>Core Ingredients:</em> {meal.coreIngredients.join(", ")}
                            </p>
                            <p>
                              {meal.recipe}
                            </p>
                          </li>
                        ))}
                      </ul>
                      <h6>Groceries for the Week:</h6>
                      <p><div dangerouslySetInnerHTML={{ __html: plan.meal_plan.groceryList }} /></p>
                      <a
                        href="#"
                        className="text-danger"
                        onClick={(e) => {
                          e.preventDefault();
                          handleDeleteMealPlan(plan._id);
                        }}
                      >
                        Delete Meal Plan
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    ));
  };

  return (
    <div className="container mt-5">
      {/* Toast Notification */}
      {showToast && (
        <div aria-live="polite" aria-atomic="true" className="toast-container">
          <div className="toast">
            <div className="toast-body">{toastMessage.message}</div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-primary text-white text-center py-4 mb-5 rounded shadow-sm">
        <h1 className="fw-bold">Meal Planner AI</h1>
        <p className="mb-0">Your personalized meal planning assistant</p>
      </header>

      <div className="row">
        {/* Sidebar */}
        <aside className="col-md-3">
          <div className="p-4 bg-light rounded shadow-sm">
            <h5 className="text-secondary mb-3">Options</h5>
            <a
              href="#"
              className="btn btn-primary btn-block mb-3"
              onClick={(e) => {
                e.preventDefault();
                handleRequestMealPlan();
              }}
            >
              <FaClipboardList className="me-2" />
              Request a Meal Plan
            </a>
            <a
              href="#"
              className="btn btn-outline-primary btn-block"
              onClick={(e) => {
                e.preventDefault();
                fetchPreferences();
              }}
            >
              <FaCog className="me-2" />
              Settings
            </a>
          </div>
        </aside>

        {/* Main Content */}
        <main className="col-md-9">
          {loading ? (
            <div className="text-center">
              <p className="text-muted">Loading meal plans...</p>
            </div>
          ) : mealPlans.length === 0 ? (
            <div className="no-meal-plans mx-auto p-4 bg-white rounded shadow-sm">
              <p className="text-muted fs-5 mb-4">
                It looks like you don't have any meal plans yet. Let's get started
                with a custom plan just for you!
              </p>
              <button
                className="btn btn-primary btn-md"
                onClick={handleRequestMealPlan}
              >
                Request a Meal Plan
              </button>
            </div>
          ) : (
            renderMealPlans()
          )}
        </main>
      </div>

      {showSettings && !settingsLoading && (
        <div className="settings-dialog">
          <div className="container py-5">
            <div className="card shadow-lg">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Meal Preferences</h5>
                <button
                  type="button"
                  className="btn-close"
                  aria-label="Close"
                  onClick={() => setShowSettings(false)}
                ></button>
              </div>
              <div className="card-body">
                <form onSubmit={handleSettingsSubmit}>
                  <div className="mb-3">
                    <label htmlFor="likes" className="form-label">Kids Likes</label>
                    <textarea
                      className="form-control"
                      id="likes"
                      rows="3"
                      placeholder="E.g., pasta, chicken, broccoli"
                      value={preferences.likes}
                      onChange={(e) => setPreferences({ ...preferences, likes: e.target.value })}
                    ></textarea>
                  </div>
                  <div className="mb-3">
                    <label htmlFor="dislikes" className="form-label">Kids Dislikes</label>
                    <textarea
                      className="form-control"
                      id="dislikes"
                      rows="3"
                      placeholder="E.g., spicy food, mushrooms"
                      value={preferences.dislikes}
                      onChange={(e) => setPreferences({ ...preferences, dislikes: e.target.value })}
                    ></textarea>
                  </div>
                  <div className="mb-3">
                    <label htmlFor="hardRequirements" className="form-label">Hard Requirements for Meals</label>
                    <textarea
                      className="form-control"
                      id="hardRequirements"
                      rows="3"
                      placeholder="E.g., gluten-free, nut-free"
                      value={preferences.hardRequirements}
                      onChange={(e) => setPreferences({ ...preferences, hardRequirements: e.target.value })}
                    ></textarea>
                  </div>
                  <div className="mb-3">
                    <label htmlFor="mealCount" className="form-label">Number of Meals to Plan For</label>
                    <input
                      type="number"
                      id="mealCount"
                      className="form-control"
                      min="1"
                      max="7"
                      value={preferences.mealCount || 1}
                      onChange={(e) => {
                        const value = Math.min(7, Math.max(1, parseInt(e.target.value) || 1));
                        setPreferences({ ...preferences, mealCount: value });
                      }}
                    />
                    <small className="text-muted">Enter a number between 1 and 7.</small>
                  </div>
                  <div className="text-end">
                    <button type="submit" className="btn btn-primary">Save Preferences</button>
                    <button
                      type="button"
                      className="btn btn-secondary ms-2"
                      onClick={() => setShowSettings(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default function MealPlannerApp() {
  return (
    <Layout title="Meal Planner AI">
      <Home />
    </Layout>
  );
}

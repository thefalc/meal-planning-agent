import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { FaCog, FaTrash, FaClipboardList } from 'react-icons/fa';

const Home = () => {
  const [mealPlans, setMealPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [expandedPlans, setExpandedPlans] = useState({});
  const [pollingActive, setPollingActive] = useState(false);
  const [toastMessage, setToastMessage] = useState({
    message: ''
  });
  const [preferences, setPreferences] = useState({
    likes: '',
    dislikes: '',
    hardRequirements: ''
  });

  useEffect(() => {
    const fetchMealPlans = async () => {
      try {
        const response = await fetch('/api/meal-plans'); // Replace with your server's endpoint
        if (!response.ok) {
          throw new Error('Failed to fetch meal plans');
        }
        const data = await response.json();
        setMealPlans(data.meal_plans);
      } catch (error) {
        console.error('Error fetching meal plans:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMealPlans();
  }, []);

  // Polling function
  useEffect(() => {
    let intervalId;

    const pollForUpdates = async () => {
      try {
        const response = await fetch('/api/meal-plans');
        if (!response.ok) {
          throw new Error('Failed to fetch updated meal plans');
        }
        const data = await response.json();
        setMealPlans(data.meal_plans);

        // Stop polling if updates are complete
        if (data.meal_plans.every((plan) => plan.status !== 'Processing')) {
          clearInterval(intervalId);
          setPollingActive(false);
        }
      } catch (error) {
        console.error('Error polling for updates:', error);
      }
    };

    if (pollingActive) {
      intervalId = setInterval(pollForUpdates, 10000);
    }

    return () => clearInterval(intervalId); // Cleanup polling on unmount
  }, [pollingActive]);

  const showToastWithMessage = async(message) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000); // Hide toast after 2 seconds
  };

  const handleDeleteMealPlan = async (id) => {
    if (confirm('Are you sure you want to delete this meal plan?')) {
      try {
        const response = await fetch(`/api/delete-meal-plan/${id}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error('Failed to delete meal plan');
        }

        setMealPlans((prev) => prev.filter((plan) => plan._id !== id));
        showToastWithMessage('Meal plan deleted successfully!');
      } catch (error) {
        console.error('Error deleting meal plan:', error);
        alert('Failed to delete meal plan. Please try again.');
      }
    }
  };

  const handleRequestMealPlan = async () => {
    try {
      const response = await fetch('/api/request-meal-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to request meal plan');
      }

      const data = await response.json();

      console.log(data);
  
      setMealPlans((prev) => [data.data, ...prev]);
      setPollingActive(true);
    } catch (error) {
      console.error('Error requesting meal plan:', error);
      alert('Failed to request meal plan. Please try again.');
    }
  };
  
  const fetchPreferences = async () => {
    setSettingsLoading(true);
    try {
      const response = await fetch('/api/get-preferences'); // Replace with your server's endpoint
      if (!response.ok) {
        throw new Error('Failed to fetch preferences');
      }
      const data = await response.json();
      setPreferences(data.settings);
    } catch (error) {
      console.error('Error fetching preferences:', error);
    } finally {
      setSettingsLoading(false);
      setShowSettings(true);
    }
  };

  const handleSettingsSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/save-preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preferences),
      });

      if (!response.ok) {
        throw new Error('Failed to save preferences');
      }

      showToastWithMessage('Meal plan settings saved!');

      setShowSettings(false);
    } catch (error) {
      console.error('Error saving preferences:', error);
      alert('Failed to save preferences. Please try again.');
    }
  };

  const togglePlanDetails = (id) => {
    setExpandedPlans((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const renderMealPlans = () => {
    const groupedPlans = mealPlans.reduce((acc, plan) => {
      const month = new Date(plan.startDate).toLocaleString('default', { month: 'long', year: 'numeric' });
      if (!acc[month]) acc[month] = [];
      acc[month].push(plan);
      return acc;
    }, {});

    const sortedMonths = Object.keys(groupedPlans).sort((a, b) => new Date(`${b} 01`) - new Date(`${a} 01`));

    return sortedMonths.map((month) => (
      <div key={month} className="mb-4">
        <h5 className="mb-3">{month}</h5>
        <ul className="list-group">
          {groupedPlans[month].map((plan, index) => (
            <li
              key={index}
              className="list-group-item d-flex flex-column"
            >
              <div
                className="d-flex justify-content-between align-items-start"
                onClick={() => togglePlanDetails(plan._id)}
                style={{ cursor: 'pointer' }}
              >
                <div className="flex-grow-1">
                  <strong>Week {plan.week}</strong>: Starting {new Date(plan.startDate).toLocaleDateString()}
                  {plan.status === 'Available' && (
                    <p className="text-muted mb-0">{plan.meal_plan.summary}</p>
                  )}
                </div>
                <div className="d-flex align-items-start">
                  <span
                    className={`badge bg-${plan.status === 'Available' ? 'success' : 'warning'}`}
                  >
                    {plan.status}
                  </span>
                </div>
              </div>
              {/* Expanded meal details */}
              {expandedPlans[plan._id] && (
                <div className="mt-3">
                  <h6>Meals for the Week:</h6>
                  <ul className="list-unstyled">
                    {plan.meal_plan.meals.map((meal, idx) => (
                      <li key={idx} className="mb-3">
                        <strong>{meal.title}</strong>
                        <p className="mb-1"><em>Adult Version:</em> {meal.adultVersion}</p>
                        <p className="mb-1"><em>Kids Version:</em> {meal.kidsVersion}</p>
                        <p><em>Core Ingredients:</em> {meal.coreIngredients.join(', ')}</p>
                        <p>{meal.recipe}</p>
                      </li>
                    ))}
                  </ul>
                  {/* Delete Meal Plan Link */}
                  <div className="mt-3">
                    <a
                      href="#"
                      className="text-primary"
                      onClick={(e) => {
                        e.preventDefault();
                        handleDeleteMealPlan(plan._id);
                      }}
                    >
                      Delete Meal Plan
                    </a>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    ));
  };

  return (
    <div className="container mt-5" style={{ maxWidth: '1000px' }}>
      {showToast && (
        <div aria-live="polite" aria-atomic="true" style={{ position: "relative", zIndex: 100000 }}>
        <div className="toast" style={{ position: "absolute", top: 10, right: 10, display: "flex" }}>
          <div className="toast-body">
            {toastMessage}
          </div>
        </div>
      </div>
      )}

      <div className="container mt-5" style={{ maxWidth: '1200px' }}>
        {/* Centered H1 */}
        <div className="text-center mb-4">
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0' }}>Meal Planner AI</h1>
        </div>

        {/* Layout with Sidebar Menu and Meal Plans */}
        <div className="row">
          {/* Sidebar Menu */}
          <div className="col-md-4">
            <div className="p-3 border bg-light">
              <h5 className="mb-3">Options</h5>
              <div className="d-flex flex-column">
                {/* Request a Meal Plan Link */}
                <a
                  href="#"
                  className="text-decoration-none text-primary mb-3"
                  onClick={(e) => {
                    e.preventDefault();
                    handleRequestMealPlan();
                  }}
                >
                  <FaClipboardList className="me-2" /> Request a Meal Plan
                </a>

                {/* Settings Link */}
                <a
                  href="#"
                  className="text-decoration-none text-primary"
                  onClick={(e) => {
                    e.preventDefault();
                    fetchPreferences();
                  }}
                >
                  <FaCog className="me-2" /> Settings
                </a>
              </div>
            </div>
          </div>

          {/* Meal Plans Section */}
          <div className="col-md-8">
            <div className="meal-plans">
              {loading ? (
                <p className="text-muted">Loading meal plans...</p>
              ) : mealPlans.length === 0 ? (
                <div
                  className="no-meal-plans mx-auto p-4"
                  style={{ maxWidth: '500px', paddingTop: "0px !important", backgroundColor: '#fff' }}
                >
                  <p className="text-muted fs-5 mb-4">
                    It looks like you don’t have any meal plans yet. Let’s get started
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
            </div>
          </div>
        </div>
      </div>


      {/* Settings Dialog */}
      {showSettings && !settingsLoading && (
        <div className="modal" style={{ display: 'block', backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Meal Preferences</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowSettings(false)}
                ></button>
              </div>
              <div className="modal-body">
                <form onSubmit={handleSettingsSubmit}>
                  <div className="mb-3">
                    <label htmlFor="likes" className="form-label">Kids Likes</label>
                    <textarea className="form-control" id="likes" rows="3" placeholder="E.g., pasta, chicken, broccoli" value={preferences.likes} onChange={(e) => setPreferences({ ...preferences, likes: e.target.value })}></textarea>
                  </div>
                  <div className="mb-3">
                    <label htmlFor="dislikes" className="form-label">Kids Dislikes</label>
                    <textarea className="form-control" id="dislikes" rows="3" placeholder="E.g., spicy food, mushrooms" value={preferences.dislikes} onChange={(e) => setPreferences({ ...preferences, dislikes: e.target.value })}></textarea>
                  </div>
                  <div className="mb-3">
                    <label htmlFor="hardRequirements" className="form-label">Hard Requirements for Meals</label>
                    <textarea className="form-control" id="hardRequirements" rows="3" placeholder="E.g., gluten-free, nut-free" value={preferences.hardRequirements} onChange={(e) => setPreferences({ ...preferences, hardRequirements: e.target.value })}></textarea>
                  </div>
                  <button type="submit" className="btn btn-primary">Save Preferences</button>
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
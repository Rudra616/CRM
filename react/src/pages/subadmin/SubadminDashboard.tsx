import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getUsersApi } from "../../api/authApi";
import { showError } from "../../utils/toast";
import { colors } from "../../theme/colors";

const SubadminDashboard: React.FC = () => {
  const [userCount, setUserCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await getUsersApi();
        setUserCount(Array.isArray(res.data) ? res.data.length : 0);
      } catch (err) {
        showError((err as { message?: string })?.message || "Failed to load");
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  return (
    <>
      <h2 className="mb-4">Subadmin Dashboard</h2>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="row g-3 mb-4">
          <div className="col-md-4">
            <div
              className="card border-primary h-100"
              style={{ borderWidth: 2, backgroundColor: colors.cardPrimaryBg }}
            >
              <div className="card-body">
                <h5 className="card-title" style={{ color: colors.primary }}>
                  Total Users
                </h5>
                <p className="card-text display-4 mb-0">{userCount}</p>
              </div>
            </div>
          </div>
        </div>
      )}
      <Link className="btn btn-primary" to="/users">
        Manage Users
      </Link>
    </>
  );
};

export default SubadminDashboard;

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSubadminsApi, getUsersApi } from "../../api/authApi";
import { showError } from "../../utils/toast";
import { colors } from "../../theme/colors";

const AdminDashboard = () => {
  const [subadminCount, setSubadminCount] = useState(0);
  const [userCount, setUserCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const [subRes, userRes] = await Promise.all([
          getSubadminsApi(),
          getUsersApi(),
        ]);
        setSubadminCount(Array.isArray(subRes.data) ? subRes.data.length : 0);
        setUserCount(Array.isArray(userRes.data) ? userRes.data.length : 0);
      } catch (err) {
        showError((err as { message?: string })?.message || "Failed to load");
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  if (loading) return <p>Loading dashboard...</p>;

  return (
    <>
      <h2 className="mb-4">Admin Dashboard</h2>
      <div className="row g-4">
        {/* Subadmins Card */}
        <div
          className="col-sm-6 col-md-4 col-lg-3"
          style={{ cursor: "pointer" }}
          onClick={() => navigate("/admin/subadmins")}
        >
          <div
            className="card shadow-sm hover-shadow"
            style={{
              backgroundColor: colors.cardPrimaryBg,
              borderLeft: `5px solid ${colors.primary}`,
              transition: "transform 0.2s",
            }}
          >
            <div className="card-body d-flex flex-column align-items-start">
              <h6 className="card-title mb-2" style={{ color: colors.primary }}>
                Subadmins
              </h6>
              <span className="display-6 fw-bold" style={{ color: colors.primary }}>
                {subadminCount}
              </span>
              <small className="text-muted mt-1">Total registered subadmins</small>
            </div>
          </div>
        </div>

        {/* Users Card */}
        <div
          className="col-sm-6 col-md-4 col-lg-3"
          style={{ cursor: "pointer" }}
          onClick={() => navigate("/admin/users")}
        >
          <div
            className="card shadow-sm hover-shadow"
            style={{
              backgroundColor: colors.cardPrimaryBg,
              borderLeft: `5px solid ${colors.primary}`,
              transition: "transform 0.2s",
            }}
          >
            <div className="card-body d-flex flex-column align-items-start">
              <h6 className="card-title mb-2" style={{ color: colors.primary }}>
                Users
              </h6>
              <span className="display-6 fw-bold" style={{ color: colors.primary }}>
                {userCount}
              </span>
              <small className="text-muted mt-1">Total registered users</small>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminDashboard;





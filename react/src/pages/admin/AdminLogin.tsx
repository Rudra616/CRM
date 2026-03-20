import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { adminLoginApi } from "../../api/authApi";
import AuthManager from "../../authManager";
import { useNavigate, useLocation } from "react-router-dom";
import { showError, showSuccess } from "../../utils/toast";
import { validateLoginFields } from "../../utils/validation";
import { useFormValidation } from "../../utils/useFormValidation";

const AdminLogin: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname;
  const { errors, setErrorsFromValidation, clearFieldError, resetErrors } =
    useFormValidation<{ username: string; password: string }>();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    const user = AuthManager.getUser();
    if (AuthManager.isAuthenticated() && user?.role === "admin") {
      navigate(from || "/admin/dashboard", { replace: true });
    }
  }, [navigate, from]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetErrors();

    const validation = validateLoginFields(username, password);
    const hasErrors = Object.values(validation).some((r) => !r.valid);
    if (hasErrors) {
      setErrorsFromValidation(validation);
      return;
    }

    try {
      const response = await adminLoginApi(username, password);

      if (!response.data) {
        showError(response.message || "Login failed");
        return;
      }

      const { token, admin } = response.data;

      AuthManager.setToken(token);
      AuthManager.setUser({
        id: admin.id,
        username: admin.username,
        email: admin.email,
        role: "admin",
      });

      showSuccess("Admin login successful");

      if (
        from &&
        [
          "/admin/dashboard",
          "/admin/subadmins",
          "/admin/create-subadmin",
          "/admin/users",
          "/admin/profile",
        ].includes(from)
      ) {
        navigate(from, { replace: true });
      } else {
        navigate("/admin/dashboard", { replace: true });
      }
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? "Login failed";
      const isWrongCreds =
        /invalid|credentials|not found/i.test(msg) || msg.includes("401");
      showError(isWrongCreds ? "Wrong username or password" : msg);
    }
  };

  return (
<div
  className="container d-flex justify-content-center align-items-center "
  style={styles.textContainer}>
<div className="card shadow-sm mx-auto" style={{ borderWidth: 2, maxWidth: 400, width: '100%' }}>
        <div className="card-body p-4">
          <h3 className="mb-4 text-primary">Admin Login</h3>
          <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="form-label">Username *</label>
          <input
            type="text"
            className={`form-control ${errors.username ? "is-invalid" : ""}`}
            placeholder="Admin username"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              clearFieldError("username");
            }}
          />
          {errors.username && <div className="invalid-feedback d-block">{errors.username}</div>}
        </div>
        <div className="mb-3">
          <label className="form-label">Password *</label>
          <input
            type="password"
            className={`form-control ${errors.password ? "is-invalid" : ""}`}
            placeholder="Required"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              clearFieldError("password");
            }}
          />
          {errors.password && <div className="invalid-feedback d-block">{errors.password}</div>}
        </div>

        <button type="submit" className="btn btn-primary w-100 mb-2">
          Admin Login
        </button>
        <Link to="/login" className="btn btn-outline-secondary w-100">
          User Login
        </Link>
      </form>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
const styles = {
  textContainer: {
    display: 'flex',          
    alignItems: 'center',
    height: '100vh',       
  },
};
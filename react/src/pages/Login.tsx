import React, { useState } from "react";
import { Link } from "react-router-dom";
import { loginApi } from "../api/authApi";
import AuthManager from "../authManager";
import { useNavigate, useLocation } from "react-router-dom";
import { showError, showSuccess } from "../utils/toast";
import { validateLoginFields } from "../utils/validation";
import { useFormValidation } from "../utils/useFormValidation";
import { roleIdToRole } from "../utils/roleUtils";

const Login: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { errors, setErrorsFromValidation, clearFieldError, resetErrors } = useFormValidation<{ username: string; password: string }>();
    const from = (location.state as { from?: { pathname: string } })?.from?.pathname;

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

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

            const response = await loginApi(username, password);

            if (!response.data) {
                showError(response.message);
                return;
            }

            const { token, user } = response.data;
            const role = roleIdToRole(user.role);

            AuthManager.setToken(token);
            AuthManager.setUser({ ...user, id: Number(user.id), role });
            showSuccess("Login successful");

            if (from && ["/users", "/profile", "/admin/dashboard", "/admin/subadmins", "/admin/create-subadmin", "/admin/users", "/admin/profile", "/subadmin/dashboard", "/user/dashboard"].includes(from)) {
                navigate(from, { replace: true });
            } else if (role === "admin") {
                navigate("/admin/dashboard", { replace: true });
            } else if (role === "subadmin") {
                navigate("/subadmin/dashboard", { replace: true });
            } else {
                navigate("/user/dashboard", { replace: true });
            }

        } catch (err: unknown) {
            const msg = (err as { message?: string })?.message ?? "Login failed";
            const isWrongCreds = /invalid password|user not found/i.test(msg);
            showError(isWrongCreds ? "Wrong username or password" : msg);
        }

    };

    return (
        <div className="container mt-5 mx-auto d-flex justify-content-center" style={styles.textContainer}>
            <div className="card shadow-sm mx-auto" style={{ borderWidth: 2, maxWidth: 400, width: '100%' }}>
                <div className="card-body p-4">
                    <h3 className="mb-4 text-primary">Sign In</h3>
                    <form onSubmit={handleSubmit}>

                <div className="mb-3">
                    <label className="form-label">Username *</label>
                    <input
                        type="text"
                        className={`form-control ${errors.username ? "is-invalid" : ""}`}
                        placeholder="Min 3 characters"
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
    Sign In
</button>

<div className="text-center mt-3">
    <span>Don't have an account? </span>
    <Link to="/register">Sign Up</Link>
</div>
            </form>
                </div>
            </div>
        </div>
    );
};

export default Login;

const styles = {
  textContainer: {
    display: 'flex',          
    alignItems: 'center',
    height: '100vh',       
  },
};
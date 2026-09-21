import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { StatusMessage } from '../components/StatusMessage';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // OTP 2FA State
  const [requiresOtp, setRequiresOtp] = useState(false);
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpMessage, setOtpMessage] = useState('');
  const [timerSeconds, setTimerSeconds] = useState(300); // 5 minutes countdown

  const inputRefs = useRef([]);
  const { login, verifyOtp, resendOtp } = useAuth();
  const navigate = useNavigate();

  // Timer countdown
  useEffect(() => {
    let interval = null;
    if (requiresOtp && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [requiresOtp, timerSeconds]);

  // Handle Initial Login (Email & Password check against PostgreSQL)
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await login(email, password);
      if (res && res.requiresOtp) {
        setRequiresOtp(true);
        setOtpMessage(`A 6-digit verification code has been sent to ${email}`);
        setTimerSeconds(300);
        setTimeout(() => {
          if (inputRefs.current[0]) inputRefs.current[0].focus();
        }, 100);
      } else {
        navigate('/resources');
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle OTP digit input auto-focus
  const handleDigitChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;

    const newDigits = [...otpDigits];
    newDigits[index] = value.substring(value.length - 1);
    setOtpDigits(newDigits);

    // Auto focus next box
    if (value && index < 5 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0 && inputRefs.current[index - 1]) {
      inputRefs.current[index - 1].focus();
    }
  };

  // Submit OTP Code for verification
  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    const fullOtp = otpDigits.join('');
    if (fullOtp.length !== 6) {
      setError('Please enter all 6 digits of the OTP code.');
      return;
    }

    setOtpLoading(true);
    setError(null);

    try {
      await verifyOtp(email, fullOtp);
      navigate('/resources');
    } catch (err) {
      setError(err.message || 'Invalid or expired OTP code.');
    } finally {
      setOtpLoading(false);
    }
  };

  // Resend OTP Code via SMTP
  const handleResendOtp = async () => {
    setError(null);
    try {
      await resendOtp();
      setOtpMessage(`A new 6-digit verification code was dispatched to ${email}`);
      setTimerSeconds(300);
      setOtpDigits(['', '', '', '', '', '']);
      if (inputRefs.current[0]) inputRefs.current[0].focus();
    } catch (err) {
      setError(err.message || 'Failed to resend OTP.');
    }
  };

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        {!requiresOtp ? (
          <>
            <div className="auth-header">
              <h2>Sign In to Campus Booking</h2>
              <p className="auth-subtitle">Verify your campus credentials (Gmail or @jit.ac.in)</p>
            </div>
            <StatusMessage type="error" message={error} onDismiss={() => setError(null)} />

            <form onSubmit={handleLoginSubmit} className="auth-form">
              <div className="form-group">
                <label htmlFor="email">Campus / Admin Email Address</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="kishorbala003@gmail.com"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>

              <button type="submit" disabled={submitting} className="btn-primary-full">
                {submitting ? 'Verifying Credentials...' : 'Sign In with Email & Password'}
              </button>
            </form>

            <p className="auth-footer">
              Don't have a student account? <Link to="/register">Register here</Link>
            </p>
          </>
        ) : (
          <>
            <div className="auth-header text-center">
              <span className="otp-icon">✉️</span>
              <h2>2-Factor Email Verification</h2>
              <p className="auth-subtitle">{otpMessage}</p>
            </div>

            <StatusMessage type="error" message={error} onDismiss={() => setError(null)} />

            <form onSubmit={handleOtpSubmit} className="otp-form">
              <div className="otp-inputs">
                {otpDigits.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (inputRefs.current[index] = el)}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className="otp-digit-box"
                    autoFocus={index === 0}
                  />
                ))}
              </div>

              <div className="timer-display">
                Code expires in: <span className="timer-count">{formatTimer(timerSeconds)}</span>
              </div>

              <button type="submit" disabled={otpLoading || otpDigits.join('').length !== 6} className="btn-primary-full">
                {otpLoading ? 'Verifying Code...' : 'Complete Sign In'}
              </button>
            </form>

            <div className="otp-footer">
              <button onClick={handleResendOtp} disabled={timerSeconds > 270} className="btn-link">
                Resend Verification Email
              </button>
              <button onClick={() => setRequiresOtp(false)} className="btn-link text-slate-400">
                &larr; Back to Login
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate, Link } from 'react-router-dom';
import { useToast } from '../components/common/Toast';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import {
  Mail,
  Lock,
  User,
  Github,
  CheckCircle,
  XCircle,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';

interface PasswordStrength {
  score: number;
  label: string;
  color: string;
  requirements: {
    length: boolean;
    uppercase: boolean;
    lowercase: boolean;
    number: boolean;
    special: boolean;
  };
}

export const Register = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    githubUsername: ''
  });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);

  const { register } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const calculatePasswordStrength = (password: string): PasswordStrength => {
    const requirements = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };

    const score = Object.values(requirements).filter(Boolean).length;

    const strengthMap: Record<number, { label: string; color: string }> = {
      0: { label: 'Very Weak', color: 'bg-red-500' },
      1: { label: 'Weak', color: 'bg-red-400' },
      2: { label: 'Fair', color: 'bg-yellow-500' },
      3: { label: 'Good', color: 'bg-blue-500' },
      4: { label: 'Strong', color: 'bg-green-500' },
      5: { label: 'Very Strong', color: 'bg-green-600' }
    };

    return {
      score,
      ...strengthMap[score],
      requirements
    };
  };

  const passwordStrength = calculatePasswordStrength(formData.password);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const validateEmail = (email: string) => {
    if (!email) return 'Email is required';
    if (!/^\S+@\S+\.\S+$/.test(email)) return 'Invalid email format';
    return undefined;
  };

  const validateGithubUsername = (username: string) => {
    if (!username) return 'GitHub username is required';
    if (!/^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/.test(username)) {
      return 'Invalid GitHub username format';
    }
    return undefined;
  };

  const validateForm = () => {
    if (!formData.email || !formData.password || !formData.confirmPassword || !formData.githubUsername) {
      showToast('All fields are required', { type: 'error' });
      return false;
    }

    if (!validateEmail(formData.email)) {
      return false;
    }

    if (passwordStrength.score < 3) {
      showToast('Please choose a stronger password', { type: 'error' });
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      showToast('Passwords do not match', { type: 'error' });
      return false;
    }

    if (!acceptTerms) {
      showToast('You must accept the terms and conditions', { type: 'error' });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const result = await register(
        formData.email,
        formData.password,
        formData.githubUsername
      );

      if (result.success) {
        showToast('Account created successfully!', { type: 'success' });
        navigate('/verify-github');
      } else {
        showToast(result.error || 'Registration failed', { type: 'error' });
      }
    } catch (err) {
      showToast('An unexpected error occurred', { type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-indigo-600 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to login
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Create your account
          </h1>
          <p className="text-gray-600">
            Join CollabVerse and start collaborating with fellow developers
          </p>
        </div>

        <Card className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <Input
              label="Email address"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              onBlur={() => handleBlur('email')}
              placeholder="you@example.com"
              leftIcon={<Mail className="w-4 h-4" />}
              error={touched.email ? validateEmail(formData.email) : undefined}
              required
              fullWidth
              autoComplete="email"
            />

            {/* GitHub Username */}
            <Input
              label="GitHub Username"
              type="text"
              name="githubUsername"
              value={formData.githubUsername}
              onChange={handleChange}
              onBlur={() => handleBlur('githubUsername')}
              placeholder="johndoe"
              leftIcon={<Github className="w-4 h-4" />}
              error={touched.githubUsername ? validateGithubUsername(formData.githubUsername) : undefined}
              helper="This will be used to fetch your repositories and verify ownership"
              required
              fullWidth
              autoComplete="username"
            />

            {/* Password Field */}
            <Input
              label="Password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              onBlur={() => handleBlur('password')}
              placeholder="Create a strong password"
              leftIcon={<Lock className="w-4 h-4" />}
              required
              fullWidth
              autoComplete="new-password"
            />

            {/* Password Strength Indicator */}
            {formData.password && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Password strength:</span>
                  <span className={`text-sm font-medium`} style={{
                    color: passwordStrength.color === 'bg-red-500' ? '#ef4444' :
                      passwordStrength.color === 'bg-red-400' ? '#f87171' :
                        passwordStrength.color === 'bg-yellow-500' ? '#eab308' :
                          passwordStrength.color === 'bg-blue-500' ? '#3b82f6' :
                            passwordStrength.color === 'bg-green-500' ? '#22c55e' : '#16a34a'
                  }}>
                    {passwordStrength.label}
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${passwordStrength.color} transition-all duration-300`}
                    style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    {passwordStrength.requirements.length ?
                      <CheckCircle className="w-4 h-4 text-green-500" /> :
                      <XCircle className="w-4 h-4 text-gray-300" />
                    }
                    <span className={passwordStrength.requirements.length ? 'text-green-600' : 'text-gray-400'}>
                      At least 8 characters
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {passwordStrength.requirements.uppercase ?
                      <CheckCircle className="w-4 h-4 text-green-500" /> :
                      <XCircle className="w-4 h-4 text-gray-300" />
                    }
                    <span className={passwordStrength.requirements.uppercase ? 'text-green-600' : 'text-gray-400'}>
                      Uppercase letter
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {passwordStrength.requirements.lowercase ?
                      <CheckCircle className="w-4 h-4 text-green-500" /> :
                      <XCircle className="w-4 h-4 text-gray-300" />
                    }
                    <span className={passwordStrength.requirements.lowercase ? 'text-green-600' : 'text-gray-400'}>
                      Lowercase letter
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {passwordStrength.requirements.number ?
                      <CheckCircle className="w-4 h-4 text-green-500" /> :
                      <XCircle className="w-4 h-4 text-gray-300" />
                    }
                    <span className={passwordStrength.requirements.number ? 'text-green-600' : 'text-gray-400'}>
                      Number
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {passwordStrength.requirements.special ?
                      <CheckCircle className="w-4 h-4 text-green-500" /> :
                      <XCircle className="w-4 h-4 text-gray-300" />
                    }
                    <span className={passwordStrength.requirements.special ? 'text-green-600' : 'text-gray-400'}>
                      Special character
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Confirm Password */}
            <Input
              label="Confirm Password"
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              onBlur={() => handleBlur('confirmPassword')}
              placeholder="Re-enter your password"
              leftIcon={<Lock className="w-4 h-4" />}
              error={touched.confirmPassword && formData.password !== formData.confirmPassword
                ? 'Passwords do not match'
                : undefined
              }
              success={touched.confirmPassword && formData.password === formData.confirmPassword
                ? 'Passwords match'
                : undefined
              }
              required
              fullWidth
              autoComplete="new-password"
            />

            {/* Terms and Conditions */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="mt-1 w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-600">
                I agree to the{' '}
                <a href="#" className="text-indigo-600 hover:text-indigo-500 font-medium">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="#" className="text-indigo-600 hover:text-indigo-500 font-medium">
                  Privacy Policy
                </a>
              </span>
            </label>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={isSubmitting}
              icon={<User className="w-4 h-4" />}
            >
              Create Account
            </Button>

            {/* Login Link */}
            <p className="text-center text-sm text-gray-600">
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-medium text-indigo-600 hover:text-indigo-500 inline-flex items-center gap-1"
              >
                Sign in
                <ArrowRight className="w-4 h-4" />
              </Link>
            </p>
          </form>
        </Card>
      </div>
    </div>
  );
};
export default Register;
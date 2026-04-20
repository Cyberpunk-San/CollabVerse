// frontend/src/pages/VerifyGithub.tsx
import { useState, useEffect } from 'react';
import { useAuthContext } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export const VerifyGithub = () => {
  const { user, requestGithubVerification, pollGithubVerification, isGithubVerified } = useAuthContext();
  const [code, setCode] = useState<string | null>(null);
  const [instructions, setInstructions] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    console.log('Verification Status in Page:', isGithubVerified);
    if (isGithubVerified) {
      console.log('🚀 Redirecting to Dashboard...');
      navigate('/dashboard');
    }
  }, [isGithubVerified, navigate]);

  const handleRequestVerification = async () => {
    if (!user) return;

    setIsVerifying(true);
    setError('');

    try {
      const result = await requestGithubVerification(user.githubUsername);
      if (result.success && result.data && result.data.success) {
        setCode(result.data.code || null);
        setInstructions(result.data.instructions || null);

        // Start polling
        pollGithubVerification(() => {
          console.log('Poll success callback triggered');
          setMessage('GitHub verified successfully!');
          setTimeout(() => {
              console.log('Moving to dashboard now...');
              navigate('/dashboard');
          }, 1500);
        });
      } else {
        setError(result.error || result.data?.message || 'Verification request failed');
        setIsVerifying(false);
      }
    } catch (err: any) {
      setError('An unexpected error occurred');
      setIsVerifying(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Verify GitHub Account</h1>

      {!isVerifying ? (
        <button
          onClick={handleRequestVerification}
          className="bg-indigo-600 text-white px-4 py-2 rounded"
        >
          Start Verification
        </button>
      ) : (
        <div className="space-y-4">
          <div className="bg-yellow-50 p-4 rounded">
            <h2 className="font-semibold mb-2">Follow these steps:</h2>
            <ol className="list-decimal list-inside space-y-2">
              <li>{instructions?.step1}</li>
              <li>{instructions?.step2}</li>
              <li className="font-mono bg-gray-100 p-2 rounded">
                {instructions?.step3}
              </li>
              <li>{instructions?.step4}</li>
            </ol>

            <div className="mt-4 p-3 bg-gray-100 rounded">
              <p className="text-sm">Your verification code:</p>
              <p className="text-2xl font-mono font-bold text-indigo-600">{code}</p>
            </div>
          </div>

          <p className="text-sm text-gray-600">
            Waiting for verification... This page will update automatically.
          </p>

          {message && (
            <div className="bg-green-100 text-green-700 p-3 rounded mb-4">
              {message}
            </div>
          )}

          {error && (
            <div className="bg-red-100 text-red-700 p-3 rounded mb-4">
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VerifyGithub;
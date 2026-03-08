import React, { useState, useEffect } from 'react';
import { verifyApi } from '../../api/verify';
import { Button, Card, Loading } from '../common';
import { Copy, CheckCircle, RefreshCw, AlertCircle, Github, Check } from 'lucide-react';

interface GitHubVerificationProps {
    studentId: string;
    githubUsername: string;
    onVerified: () => void;
    onCancel: () => void;
}

export const GitHubVerification: React.FC<GitHubVerificationProps> = ({
    studentId,
    githubUsername,
    onVerified,
    onCancel
}) => {
    const [verificationCode, setVerificationCode] = useState<string | null>(null);
    const [expiresIn, setExpiresIn] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isChecking, setIsChecking] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState<'idle' | 'code_generated' | 'checking' | 'verified' | 'expired'>('idle');
    const [copied, setCopied] = useState(false);
    const [countdown, setCountdown] = useState<number | null>(null);

    useEffect(() => {
        if (status === 'code_generated' && expiresIn) {
            setCountdown(expiresIn * 60);

            const timer = setInterval(() => {
                setCountdown(prev => {
                    if (prev === null || prev <= 1) {
                        clearInterval(timer);
                        setStatus('expired');
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);

            return () => clearInterval(timer);
        }
    }, [status, expiresIn]);

    const handleRequestCode = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await verifyApi.requestVerification(studentId, githubUsername);

            if (response.success && response.code) {
                setVerificationCode(response.code);
                setExpiresIn(response.expires_in || 15);
                setStatus('code_generated');
            }
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to generate verification code');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCheckVerification = async () => {
        setIsChecking(true);
        setError(null);
        setStatus('checking');

        try {
            const response = await verifyApi.checkVerification(studentId);

            if (response.verified) {
                setStatus('verified');
                setTimeout(() => onVerified(), 2000);
            } else {
                setError(response.message);
                setStatus('code_generated');
            }
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to check verification');
            setStatus('code_generated');
        } finally {
            setIsChecking(false);
        }
    };

    const handleCopyCode = () => {
        if (verificationCode) {
            navigator.clipboard.writeText(verificationCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="max-w-2xl mx-auto">
            <Card>
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Github className="w-8 h-8 text-indigo-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        Verify Your GitHub Account
                    </h2>
                    <p className="text-gray-600">
                        To verify that you own <span className="font-medium text-indigo-600">@{githubUsername}</span>
                    </p>
                </div>

                {status === 'idle' && (
                    <div className="space-y-4">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <p className="text-sm text-blue-800">
                                We'll generate a unique code that you need to place in a public GitHub repository.
                                This proves you own the GitHub account.
                            </p>
                        </div>

                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-red-600">{error}</p>
                            </div>
                        )}

                        <div className="flex gap-3">
                            <Button
                                onClick={handleRequestCode}
                                loading={isLoading}
                                icon={<Github className="w-4 h-4" />}
                                fullWidth
                            >
                                Generate Verification Code
                            </Button>
                            <Button variant="ghost" onClick={onCancel}>
                                Cancel
                            </Button>
                        </div>
                    </div>
                )}

                {status === 'code_generated' && verificationCode && (
                    <div className="space-y-6">
                        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6">
                            <p className="text-sm text-indigo-800 mb-3">Your verification code:</p>
                            <div className="flex items-center gap-3">
                                <code className="flex-1 text-2xl font-mono bg-white p-3 rounded-lg border border-indigo-200 text-center">
                                    {verificationCode}
                                </code>
                                <Button
                                    variant="outline"
                                    onClick={handleCopyCode}
                                    icon={copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                >
                                    {copied ? 'Copied!' : 'Copy'}
                                </Button>
                            </div>
                            {countdown !== null && (
                                <p className={`text-sm mt-3 ${countdown < 60 ? 'text-red-600' : 'text-gray-600'}`}>
                                    Code expires in: {formatTime(countdown)}
                                </p>
                            )}
                        </div>

                        <div className="space-y-4">
                            <h3 className="font-medium text-gray-900">Follow these steps:</h3>

                            <div className="space-y-3">
                                <div className="flex items-start gap-3">
                                    <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <span className="text-xs font-medium text-indigo-600">1</span>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-700">
                                            Create a <span className="font-medium">public repository</span> named{' '}
                                            <code className="bg-gray-100 px-2 py-1 rounded">CollabVerse-Verification</code>
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <span className="text-xs font-medium text-indigo-600">2</span>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-700">
                                            Create a file named{' '}
                                            <code className="bg-gray-100 px-2 py-1 rounded">verify.txt</code> in the repository
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <span className="text-xs font-medium text-indigo-600">3</span>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-700">
                                            Add the verification code to the file:
                                        </p>
                                        <pre className="mt-2 p-3 bg-gray-900 text-white rounded-lg text-sm overflow-x-auto">
                                            {verificationCode}
                                        </pre>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <span className="text-xs font-medium text-indigo-600">4</span>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-700">
                                            Click the verify button below to confirm
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-red-600">{error}</p>
                            </div>
                        )}

                        <div className="flex gap-3">
                            <Button
                                onClick={handleCheckVerification}
                                loading={isChecking}
                                icon={<CheckCircle className="w-4 h-4" />}
                                fullWidth
                            >
                                Verify Now
                            </Button>
                            <Button
                                variant="outline"
                                onClick={handleRequestCode}
                                icon={<RefreshCw className="w-4 h-4" />}
                            >
                                Resend Code
                            </Button>
                        </div>

                        <p className="text-xs text-gray-500 text-center">
                            Make sure the repository is public and the file contains exactly the code above
                        </p>
                    </div>
                )}

                {status === 'checking' && (
                    <div className="text-center py-8">
                        <Loading size="lg" text="Checking verification..." />
                    </div>
                )}

                {status === 'verified' && (
                    <div className="text-center py-8">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle className="w-8 h-8 text-green-600" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                            GitHub Verified Successfully!
                        </h3>
                        <p className="text-gray-600 mb-4">
                            Your GitHub account has been linked and verified.
                        </p>
                        <div className="animate-pulse text-sm text-gray-500">
                            Redirecting you back...
                        </div>
                    </div>
                )}

                {status === 'expired' && (
                    <div className="text-center py-8">
                        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                            Verification Code Expired
                        </h3>
                        <p className="text-gray-600 mb-6">
                            The verification code has expired. Please request a new one.
                        </p>
                        <Button onClick={handleRequestCode}>
                            Request New Code
                        </Button>
                    </div>
                )}
            </Card>
        </div>
    );
};
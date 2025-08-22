import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle, Mail, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { confirmEmail } from "@/lib/supabase";

export default function EmailConfirmation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleEmailConfirmation = async () => {
      try {
        // Get the token and type from URL parameters
        const token = searchParams.get('token');
        const type = searchParams.get('type');

        if (type === 'signup' && token) {
          // Confirm the email
          const { success, error } = await confirmEmail(token);
          
          if (!success) {
            setStatus('error');
            setMessage(error || 'Failed to confirm email. Please try again.');
          } else {
            setStatus('success');
            setMessage('Your email has been successfully confirmed! You can now sign in to your account.');
          }
        } else if (type === 'recovery' && token) {
          // Handle password recovery
          setStatus('success');
          setMessage('Password recovery link is valid. You can now reset your password.');
        } else {
          setStatus('error');
          setMessage('Invalid confirmation link. Please check your email and try again.');
        }
      } catch (error) {
        console.error('Email confirmation error:', error);
        setStatus('error');
        setMessage('An unexpected error occurred. Please try again.');
      }
    };

    handleEmailConfirmation();
  }, [searchParams]);

  const handleSignIn = () => {
    navigate('/login');
  };

  const handleGoHome = () => {
    navigate('/');
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="text-gray-600">Confirming your email...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {status === 'success' ? (
            <CheckCircle className="mx-auto h-16 w-16 text-green-600 mb-4" />
          ) : (
            <Mail className="mx-auto h-16 w-16 text-red-600 mb-4" />
          )}
          <CardTitle className="text-2xl">
            {status === 'success' ? 'Email Confirmed!' : 'Confirmation Failed'}
          </CardTitle>
          <CardDescription className="text-base">
            {message}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === 'success' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800 text-sm">
                🎉 Welcome to MediFlow! Your account is now active and ready to use.
              </p>
            </div>
          )}
          
          {status === 'error' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 text-sm">
                If you continue to have issues, please contact support or try signing up again.
              </p>
            </div>
          )}

          <div className="flex flex-col space-y-3">
            {status === 'success' && (
              <Button onClick={handleSignIn} className="w-full">
                Sign In to Your Account
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
            
            <Button 
              variant="outline" 
              onClick={handleGoHome}
              className="w-full"
            >
              Return to Home
            </Button>
          </div>

          {status === 'success' && (
            <div className="text-center text-sm text-gray-500 mt-4">
              <p>You can now access all the features of MediFlow</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

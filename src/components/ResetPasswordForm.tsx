import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from './ui/button.tsx';
import { Input } from './ui/input.tsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card.tsx';
import { Alert, AlertDescription } from './ui/alert.tsx';
import toast from 'react-hot-toast';

interface ResetPasswordFormProps {
  onSuccess: () => void;
}

export function ResetPasswordForm({ onSuccess }: ResetPasswordFormProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Password requirements
  const hasMinLength = newPassword.length >= 8;
  const hasUpperCase = /[A-Z]/.test(newPassword);
  const hasLowerCase = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);
  const passwordsMatch = newPassword === confirmPassword;

  const isPasswordValid = 
    hasMinLength && 
    hasUpperCase && 
    hasLowerCase && 
    hasNumber && 
    hasSpecialChar;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!isPasswordValid) {
      toast.error('Please meet all password requirements');
      setIsLoading(false);
      return;
    }

    if (!passwordsMatch) {
      toast.error('Passwords do not match');
      setIsLoading(false);
      return;
    }

    try {
      // First, get the current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) throw sessionError;
      
      if (!session) {
        throw new Error('No active session found');
      }

      // Then update the password
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast.success('Password updated successfully!');
      onSuccess();
    } catch (err) {
      console.error('Password reset error:', err);
      toast.error(err instanceof Error ? err.message : 'An error occurred while resetting your password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Reset Password</CardTitle>
        <CardDescription>
          Please enter your new password below.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="newPassword" className="text-sm font-medium">
              New Password
            </label>
            <Input
              type="password"
              id="newPassword"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="text-sm font-medium">
              Confirm New Password
            </label>
            <Input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2 text-sm text-slate-400">
            <h3 className="font-medium text-slate-300">Password Requirements:</h3>
            <ul className="space-y-1">
              <li className={hasMinLength ? "text-green-500" : ""}>
                • At least 8 characters
              </li>
              <li className={hasUpperCase ? "text-green-500" : ""}>
                • At least one uppercase letter
              </li>
              <li className={hasLowerCase ? "text-green-500" : ""}>
                • At least one lowercase letter
              </li>
              <li className={hasNumber ? "text-green-500" : ""}>
                • At least one number
              </li>
              <li className={hasSpecialChar ? "text-green-500" : ""}>
                • At least one special character
              </li>
              <li className={passwordsMatch ? "text-green-500" : ""}>
                • Passwords match
              </li>
            </ul>
          </div>

          <Button 
            type="submit" 
            className="w-full bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white shadow-lg" 
            disabled={isLoading}
          >
            {isLoading ? 'Resetting...' : 'Reset Password'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
} 
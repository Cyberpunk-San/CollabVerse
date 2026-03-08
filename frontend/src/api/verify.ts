import { apiClient } from './index';

export interface VerificationRequest {
  student_id: string;
  github_username: string;
}

export interface VerificationResponse {
  success: boolean;
  message: string;
  code?: string;
  instructions?: {
    step1: string;
    step2: string;
    step3: string;
    step4: string;
  };
  expires_in?: number;
}

export interface VerificationCheckResponse {
  success: boolean;
  verified: boolean;
  message: string;
}

export const verifyApi = {
  /**
   * Request GitHub verification code
   * @param studentId - Student ID
   * @param githubUsername - GitHub username to verify
   */
  requestVerification: async (studentId: string, githubUsername: string) => {
    const response = await apiClient.post<VerificationResponse>(
      '/verify/github/request',
      null,
      {
        params: {
          student_id: studentId,
          github_username: githubUsername
        }
      }
    );
    return response.data;
  },

  /**
   * Check if verification was successful
   * @param studentId - Student ID
   */
  checkVerification: async (studentId: string) => {
    const response = await apiClient.post<VerificationCheckResponse>(
      '/verify/github/check',
      null,
      {
        params: { student_id: studentId }
      }
    );
    return response.data;
  },

  /**
   * Resend verification code
   * @param studentId - Student ID
   * @param githubUsername - GitHub username
   */
  resendVerification: async (studentId: string, githubUsername: string) => {
    const response = await apiClient.post<VerificationResponse>(
      '/verify/github/resend',
      null,
      {
        params: {
          student_id: studentId,
          github_username: githubUsername
        }
      }
    );
    return response.data;
  },

  /**
   * Poll verification status (for use in components)
   * @param studentId - Student ID
   * @param interval - Polling interval in ms (default: 5000)
   * @param timeout - Max time to poll in ms (default: 300000 = 5 minutes)
   */
  pollVerification: async (
    studentId: string,
    interval: number = 5000,
    timeout: number = 300000
  ): Promise<VerificationCheckResponse> => {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const result = await verifyApi.checkVerification(studentId);
      
      if (result.verified) {
        return result;
      }
      
      // Wait for next poll
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    
    return {
      success: true,
      verified: false,
      message: 'Verification timeout. Please try again.'
    };
  }
};